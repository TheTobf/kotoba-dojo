/**
 * Quiz mit Lückentext: Im Beispielsatz eines schon gelernten Wortes fehlt genau dieses Wort.
 * Drei Arten: auswählen (4 Möglichkeiten), eintippen (Romaji wird zu Kana) und hören (Satz nur als Ton).
 * Jedes Wort hat dafür eine eigene Karte (Art „quiz“) im Wiederholungs-System.
 */
import { toHiragana } from 'wanakana'
import type { CardState } from './db'
import type { LearnData, Sentence, Token, Word } from './data'
import { shuffle } from './writing'

export type QuizMode = 'auswahl' | 'tippen' | 'hoeren'

export const quizCardId = (wordId: string) => `quiz:${wordId}`

/** Kana-Lesung eines Satzteils (aus den Furigana, sonst die Schreibweise). */
const tokenKana = (t: Token) => (t.f ? t.f.map((f) => f.r ?? f.s).join('') : t.s)

/** Die gesuchte Lücke: Schreibweise und Lesung des Zielworts, so wie es im Satz steht (z. B. 食べ in 食べます). */
export function answerOf(sentence: Sentence) {
  const target = sentence.tokens.filter((t) => t.target)
  return { surface: target.map((t) => t.s).join(''), kana: toHiragana(target.map(tokenKana).join('')) }
}

const normalize = (text: string) =>
  toHiragana(text.normalize('NFKC').toLowerCase().replace(/[\s。、.,!?！？「」]/g, ''), { passRomaji: false })

/** Eingetippte Antwort prüfen: Romaji, Hiragana, Katakana und Kanji zählen. */
export function checkTyped(input: string, sentence: Sentence): boolean {
  const answer = answerOf(sentence)
  const given = normalize(input)
  return given !== '' && (given === normalize(answer.kana) || given === normalize(answer.surface))
}

/** 4 Möglichkeiten: die richtige + 3 Ablenker (gleiche Wortart, schon gelernt und im Rang nahe bevorzugt). */
export function choicesFor(word: Word, sentence: Sentence, data: LearnData, learned: Set<string>, random = Math.random): string[] {
  const right = answerOf(sentence).surface
  const candidates = data.words
    .filter((w) => w.id !== word.id)
    .map((w) => {
      const other = data.sentences.get(w.sentenceIds[0])
      if (!other) return undefined
      const score = (w.pos === word.pos ? 0 : 1000) + (learned.has(w.id) ? 0 : 300) + Math.abs(w.rank - word.rank) + random() * 200
      return { text: answerOf(other).surface, score }
    })
    .filter((c): c is { text: string; score: number } => !!c && !!c.text && c.text !== right && c.text !== word.surface)
    .sort((a, b) => a.score - b.score)
  const picked: string[] = []
  for (const c of candidates) {
    if (!picked.includes(c.text)) picked.push(c.text)
    if (picked.length === 3) break
  }
  return shuffle([right, ...picked], random)
}

export interface QuizItem {
  word: Word
  sentence: Sentence
  card?: CardState
}

/**
 * Eine Quiz-Runde: nur Wörter, die schon als Karteikarte gelernt wurden.
 * Zuerst fällige Quiz-Karten, dann gelernte Wörter, die noch nie im Quiz waren (in Lernreihenfolge).
 */
export function quizQueue(data: LearnData, cards: CardState[], size = 10, now = Date.now()): QuizItem[] {
  const learned = new Set(cards.filter((c) => c.kind === 'wort').map((c) => c.refId))
  const quizCards = cards.filter((c) => c.kind === 'quiz')
  const inQuiz = new Set(quizCards.map((c) => c.refId))
  const toItem = (word: Word | undefined, card?: CardState): QuizItem[] => {
    const sentence = word && data.sentences.get(word.sentenceIds[0])
    return word && sentence && answerOf(sentence).surface ? [{ word, sentence, card }] : []
  }
  const due = quizCards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due).flatMap((c) => toItem(data.wordsById.get(c.refId), c))
  const fresh = data.words.filter((w) => learned.has(w.id) && !inQuiz.has(w.id)).flatMap((w) => toItem(w))
  return [...due, ...fresh].slice(0, size)
}

export function verdict(right: number, total: number): { ja: string; de: string } {
  const share = total ? right / total : 0
  if (share === 1) return { ja: '完璧', de: 'Perfekt' }
  if (share >= 0.8) return { ja: 'すごい', de: 'Stark' }
  if (share >= 0.6) return { ja: 'いいね', de: 'Gut gemacht' }
  return { ja: '頑張って', de: 'Dranbleiben' }
}
