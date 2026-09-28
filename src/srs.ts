import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs'
import { db, type KotobaDB } from './db'
import type { CardKind, CardState, Word } from './types'

export { Rating, State }

const DAY = 86_400_000

export const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }))

export function toFsrs(c: CardState): Card {
  return {
    due: new Date(c.due), stability: c.stability, difficulty: c.difficulty,
    elapsed_days: c.elapsed_days, scheduled_days: c.scheduled_days, learning_steps: c.learning_steps,
    reps: c.reps, lapses: c.lapses, state: c.state as State,
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  }
}

export function fromFsrs(id: string, refId: string, c: Card, kind: CardKind = 'vokabel'): CardState {
  return {
    id, kind, refId,
    due: c.due.getTime(), stability: c.stability, difficulty: c.difficulty,
    elapsed_days: c.elapsed_days, scheduled_days: c.scheduled_days, learning_steps: c.learning_steps,
    reps: c.reps, lapses: c.lapses, state: c.state,
    last_review: c.last_review?.getTime(),
  }
}

export const cardId = (wordId: string, kind: CardKind = 'vokabel') => `${kind}:${wordId}`

/** Gilt als „gelernt“: mindestens einmal bewertet oder per „Kenn ich schon“ übersprungen. */
export const isLearned = (c: CardState) => c.reps > 0 || !!c.knownSkip

export function startOfDay(now = Date.now()) {
  const d = new Date(now)
  d.setHours(4, 0, 0, 0) // neuer Lerntag beginnt um 4 Uhr
  if (d.getTime() > now) d.setTime(d.getTime() - DAY)
  return d.getTime()
}

export interface QueueItem { word: Word; card?: CardState }

/** Fällige Wiederholungen zuerst, dann neue Wörter bis zum Tageslimit (in Lernreihenfolge). */
export function buildQueue(words: Word[], cards: CardState[], newPerDay: number, newToday: number, now = Date.now()): QueueItem[] {
  const byId = new Map(words.map((w) => [w.id, w]))
  const due = cards
    .filter((c) => c.kind === 'vokabel' && c.due <= now && byId.has(c.refId))
    .sort((a, b) => a.due - b.due)
    .map((c) => ({ word: byId.get(c.refId)!, card: c }))
  const seen = new Set(cards.filter((c) => c.kind === 'vokabel').map((c) => c.refId))
  const fresh = [...words].sort((a, b) => a.rank - b.rank)
    .filter((w) => !seen.has(w.id))
    .slice(0, Math.max(0, newPerDay - newToday))
    .map((word) => ({ word }))
  return [...due, ...fresh]
}

/** Wie viele neue Wörter heute schon eingeführt wurden (erste Bewertung heute). */
export async function countNewToday(d: KotobaDB = db, now = Date.now()) {
  const since = startOfDay(now)
  const cards = await d.cards.where('kind').equals('vokabel').toArray()
  return cards.filter((c) => (c.introducedAt ?? 0) >= since).length
}

/** Vorschau der nächsten Abstände für die vier Knöpfe. */
export function previewIntervals(card: CardState | undefined, now = Date.now()) {
  const c = card ? toFsrs(card) : createEmptyCard(new Date(now))
  const p = scheduler.repeat(c, new Date(now))
  const grades = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]
  return grades.map((g) => formatInterval(p[g].card.due.getTime() - now))
}

export function formatInterval(ms: number) {
  const min = Math.max(1, Math.round(ms / 60_000))
  if (min < 60) return `${min} Min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} Std`
  const d = Math.round(ms / DAY)
  if (d < 31) return `${d} T`
  if (d < 365) return `${Math.round(d / 30)} Mon`
  return `${(d / 365).toFixed(1).replace('.', ',')} J`
}

async function logDay(d: KotobaDB, now: number) {
  const day = new Date(now).toISOString().slice(0, 10)
  const p = await d.profile.get('me')
  const base = p ?? { id: 'me' as const, xp: 0, streak: 0, bestStreak: 0, achievements: [], unlockedThemes: ['sakura'], activeDays: {} }
  await d.profile.put({ ...base, activeDays: { ...base.activeDays, [day]: (base.activeDays[day] ?? 0) + 1 } })
}

/** Bewertet eine Karte, speichert Zustand + Log und gibt den neuen Zustand zurück. */
export async function rate(word: Word, card: CardState | undefined, grade: Grade, durationMs?: number, d: KotobaDB = db, now = Date.now(), kind: CardKind = 'vokabel') {
  const before = card ? toFsrs(card) : createEmptyCard(new Date(now))
  const next = scheduler.next(before, new Date(now), grade).card
  const state: CardState = { ...fromFsrs(cardId(word.id, kind), word.id, next, kind), introducedAt: card?.introducedAt ?? now }
  await d.transaction('rw', [d.cards, d.reviewLog, d.profile], async () => {
    await d.cards.put(state)
    await d.reviewLog.add({ cardId: state.id, kind, rating: grade, at: now, durationMs })
    await logDay(d, now)
  })
  return state
}

/** „Kenn ich schon“: Karte überspringt das Lernen und kommt in 7 Tagen zur Kontrolle wieder. */
export async function markKnown(word: Word, d: KotobaDB = db, now = Date.now()) {
  const good = scheduler.next(createEmptyCard(new Date(now)), new Date(now), Rating.Easy).card
  const state: CardState = {
    ...fromFsrs(cardId(word.id), word.id, good),
    state: State.Review, stability: Math.max(good.stability, 7), scheduled_days: 7,
    due: now + 7 * DAY, knownSkip: true, introducedAt: now,
  }
  await d.transaction('rw', [d.cards, d.reviewLog, d.profile], async () => {
    await d.cards.put(state)
    await d.reviewLog.add({ cardId: state.id, kind: 'vokabel', rating: 0, at: now })
    await logDay(d, now)
  })
  return state
}

/**
 * Quiz-Runde: nur Wörter, die schon als Karteikarte gelernt wurden.
 * Zuerst fällige Quiz-Karten, dann gelernte Wörter, die noch nie im Quiz waren (Lernreihenfolge).
 */
export function quizQueue(words: Word[], cards: CardState[], size = 10, now = Date.now()): QueueItem[] {
  const byId = new Map(words.map((w) => [w.id, w]))
  const learned = new Set(cards.filter((c) => c.kind === 'vokabel' && isLearned(c)).map((c) => c.refId))
  const quiz = cards.filter((c) => c.kind === 'quiz' && byId.has(c.refId))
  const due = quiz.filter((c) => c.due <= now).sort((a, b) => a.due - b.due)
    .map((c) => ({ word: byId.get(c.refId)!, card: c }))
  const inQuiz = new Set(quiz.map((c) => c.refId))
  const fresh = words.filter((w) => learned.has(w.id) && !inQuiz.has(w.id))
    .sort((a, b) => a.rank - b.rank).map((word) => ({ word }))
  return [...due, ...fresh].slice(0, size)
}
