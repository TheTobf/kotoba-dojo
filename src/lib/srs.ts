/**
 * Wiederholen mit Abständen (Spaced Repetition, Algorithmus FSRS).
 * Jede Karte hat einen eigenen Zustand; nach jeder Bewertung berechnet FSRS, wann sie wieder dran ist.
 *
 * Drei Arten von Karten teilen sich diese Logik: Wörter, Sätze aus Story-Folgen und Fehlerkarten aus KI-Gesprächen.
 * `StudyItem` ist die einheitliche Form, in der die Oberfläche eine Karte anzeigt.
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs'
import type { MistakeCard, Phrase } from '../../shared/api'
import { EPISODES, type Episode } from '../content/story'
import { api } from './api'
import type { LearnData, Token, Word } from './data'
import { db, FLASHCARD_KINDS, type CardKind, type CardState, type KotobaDB } from './db'

export { Rating }
export type { Grade }

const DAY = 86_400_000

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }))

export interface StudyItem extends Phrase {
  cardId: string
  kind: CardKind
  refId: string
  /** Herkunft, z. B. „Folge 1“ oder „Grundwortschatz“. */
  label: string
  /** Aufteilung mit Furigana (falls vorhanden). */
  tokens?: Token[]
  /** Beispielsatz (bei Wörtern). */
  example?: Phrase & { tokens?: Token[] }
  /** Erklärung auf Deutsch. */
  note?: string
}

export const cardId = (kind: CardKind, refId: string) => `${kind}:${refId}`

// ---------- Karten aus den drei Quellen ----------

export function itemsForEpisode(episode: Episode): StudyItem[] {
  return episode.sentences.map((sentence, index) => {
    const refId = `${episode.id}:${index}`
    return { ...sentence, cardId: cardId('satz', refId), kind: 'satz', refId, label: `Folge ${episode.number}` }
  })
}

export function itemForWord(word: Word, data: LearnData): StudyItem {
  const sentence = data.sentences.get(word.sentenceIds[0])
  return {
    cardId: cardId('wort', word.id),
    kind: 'wort',
    refId: word.id,
    label: 'Grundwortschatz',
    ja: word.surface,
    kana: word.reading,
    romaji: word.romaji,
    de: word.meaningsDe.join(', '),
    example: sentence && { ja: sentence.ja, kana: sentence.kana, romaji: sentence.romaji, de: sentence.de, tokens: sentence.tokens },
    note: sentence?.grammar,
  }
}

export function itemForMistake(card: MistakeCard): StudyItem {
  return {
    cardId: cardId('fehler', card.id), kind: 'fehler', refId: card.id, label: 'Aus deinem Gespräch',
    ja: card.ja, kana: card.kana, romaji: card.romaji, de: card.de, note: card.note,
  }
}

export interface Sources {
  data: LearnData
  mistakes: MistakeCard[]
}

/** Findet zu einem gespeicherten Kartenzustand den Inhalt. `undefined`, wenn es den Inhalt nicht mehr gibt. */
export function resolveItem(card: Pick<CardState, 'kind' | 'refId'>, sources: Sources): StudyItem | undefined {
  if (card.kind === 'wort') {
    const word = sources.data.wordsById.get(card.refId)
    return word && itemForWord(word, sources.data)
  }
  if (card.kind === 'satz') {
    const [episodeId, index] = card.refId.split(':')
    const episode = EPISODES.find((e) => e.id === episodeId)
    return episode && itemsForEpisode(episode)[Number(index)]
  }
  const mistake = sources.mistakes.find((m) => m.id === card.refId)
  return mistake && itemForMistake(mistake)
}

// ---------- Lernsitzung zusammenstellen ----------

/** Ein neuer Lerntag beginnt um 4 Uhr morgens – wer nach Mitternacht lernt, zählt noch zum Vortag. */
export function startOfDay(now = Date.now()): number {
  const day = new Date(now)
  day.setHours(4, 0, 0, 0)
  if (day.getTime() > now) day.setTime(day.getTime() - DAY)
  return day.getTime()
}

export interface SessionEntry {
  item: StudyItem
  /** Fehlt bei neuen Karten. */
  state?: CardState
}

export type Scope = { type: 'alles' } | { type: 'folge'; episodeId: string } | { type: 'fehler' }

export interface SessionInput extends Sources {
  cards: CardState[]
  scope: Scope
  newPerDay: number
  now?: number
}

/**
 * Reihenfolge einer Sitzung: zuerst fällige Wiederholungen (älteste zuerst), danach neue Karten.
 * - „alles“: neue Fehlerkarten + neue Wörter bis zum Tageslimit
 * - „folge“: alle noch ungesehenen Sätze dieser Folge (eine Lektion ist kurz, deshalb ohne Limit)
 */
export function buildSession({ cards, scope, newPerDay, data, mistakes, now = Date.now() }: SessionInput): SessionEntry[] {
  const sources = { data, mistakes }
  const inScope = (card: Pick<CardState, 'kind' | 'refId'>) =>
    scope.type === 'alles' ||
    (scope.type === 'fehler' && card.kind === 'fehler') ||
    (scope.type === 'folge' && card.kind === 'satz' && card.refId.startsWith(`${scope.episodeId}:`))

  const due: SessionEntry[] = cards
    .filter((card) => FLASHCARD_KINDS.includes(card.kind) && card.due <= now && inScope(card))
    .sort((a, b) => a.due - b.due)
    .flatMap((state) => {
      const item = resolveItem(state, sources)
      return item ? [{ item, state }] : []
    })

  const known = new Set(cards.map((card) => card.id))
  const fresh: StudyItem[] = []
  if (scope.type === 'folge') {
    const episode = EPISODES.find((e) => e.id === scope.episodeId)
    if (episode) fresh.push(...itemsForEpisode(episode).filter((item) => !known.has(item.cardId)))
  } else {
    fresh.push(...mistakes.map(itemForMistake).filter((item) => !known.has(item.cardId)))
    if (scope.type === 'alles') {
      const introducedToday = cards.filter((card) => card.kind === 'wort' && card.introducedAt >= startOfDay(now)).length
      const remaining = Math.max(0, newPerDay - introducedToday)
      fresh.push(...data.words.filter((word) => !known.has(cardId('wort', word.id))).slice(0, remaining).map((word) => itemForWord(word, data)))
    }
  }
  return [...due, ...fresh.map((item) => ({ item }))]
}

// ---------- Bewerten ----------

function toFsrs(state: CardState): Card {
  return {
    due: new Date(state.due), stability: state.stability, difficulty: state.difficulty,
    elapsed_days: state.elapsed_days, scheduled_days: state.scheduled_days, learning_steps: state.learning_steps,
    reps: state.reps, lapses: state.lapses, state: state.state,
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  }
}

/** Bewertet eine Karte (1 Nochmal … 4 Leicht), speichert den neuen Zustand und gibt ihn zurück. */
export async function rate(item: Pick<StudyItem, 'cardId' | 'kind' | 'refId'>, previous: CardState | undefined, grade: Grade, d: KotobaDB = db, now = Date.now()): Promise<CardState> {
  const before = previous ? toFsrs(previous) : createEmptyCard(new Date(now))
  const next = scheduler.next(before, new Date(now), grade).card
  const state: CardState = {
    id: item.cardId, kind: item.kind, refId: item.refId,
    due: next.due.getTime(), stability: next.stability, difficulty: next.difficulty,
    elapsed_days: next.elapsed_days, scheduled_days: next.scheduled_days, learning_steps: next.learning_steps,
    reps: next.reps, lapses: next.lapses, state: next.state, last_review: next.last_review?.getTime(),
    introducedAt: previous?.introducedAt ?? now,
  }
  await d.transaction('rw', [d.cards, d.reviewLog], async () => {
    await d.cards.put(state)
    await d.reviewLog.add({ cardId: state.id, rating: grade, at: now })
  })
  return state
}

export const GRADES: { grade: Grade; label: string }[] = [
  { grade: Rating.Again, label: 'Nochmal' },
  { grade: Rating.Hard, label: 'Schwer' },
  { grade: Rating.Good, label: 'Gut' },
  { grade: Rating.Easy, label: 'Leicht' },
]

/** Vorschau: Wann käme die Karte je nach Bewertung wieder? */
export function previewIntervals(state: CardState | undefined, now = Date.now()): string[] {
  const card = state ? toFsrs(state) : createEmptyCard(new Date(now))
  const preview = scheduler.repeat(card, new Date(now))
  return GRADES.map(({ grade }) => formatInterval(preview[grade].card.due.getTime() - now))
}

export function formatInterval(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return `${minutes} Min.`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} Std.`
  const days = Math.round(ms / DAY)
  if (days < 31) return days === 1 ? '1 Tag' : `${days} Tage`
  if (days < 365) return `${Math.round(days / 30)} Mon.`
  return `${(days / 365).toFixed(1).replace('.', ',')} J.`
}

// ---------- Überblick ----------

export interface Overview {
  dueNow: number
  learnedWords: number
  learnedSentences: number
  reviewedToday: number
}

export function overview(cards: CardState[], reviewedToday: number, now = Date.now()): Overview {
  const flashcards = cards.filter((card) => FLASHCARD_KINDS.includes(card.kind))
  return {
    dueNow: flashcards.filter((card) => card.due <= now).length,
    learnedWords: cards.filter((card) => card.kind === 'wort').length,
    learnedSentences: cards.filter((card) => card.kind === 'satz').length,
    reviewedToday,
  }
}

/** Anteil der Sätze einer Folge, die schon mindestens einmal gelernt wurden (0…1). */
export function episodeProgress(episode: Episode, cards: CardState[]): number {
  const learned = cards.filter((card) => card.kind === 'satz' && card.refId.startsWith(`${episode.id}:`)).length
  return episode.sentences.length ? learned / episode.sentences.length : 0
}

/** Holt neue Fehler-Karteikarten vom Server ab (nur angemeldet möglich) und legt sie lokal ab. */
export async function syncMistakes(d: KotobaDB = db): Promise<number> {
  const newest = await d.mistakes.orderBy('createdAt').last()
  const { cards } = await api.mistakes(newest?.createdAt ?? 0)
  if (cards.length) await d.mistakes.bulkPut(cards)
  return cards.length
}
