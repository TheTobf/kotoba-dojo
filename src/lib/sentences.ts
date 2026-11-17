/** Satzbau: Satzteile ordnen und Partikeln einsetzen. Grundlage sind die Beispielsätze gelernter Wörter. */
import type { Sentence, Word } from './data'
import { shuffle } from './writing'

/** Partikeln für die Einsetz-Übung. */
export const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'から', 'まで'] as const

/** Paare, die oft beide richtig sind – nie gemeinsam zur Auswahl stellen. */
const CONFUSABLE: Record<string, string[]> = {
  は: ['が', 'も'], が: ['は', 'も'], も: ['は', 'が'], に: ['へ'], へ: ['に'],
}

/** Sätze aus gelernten Wörtern, deren Teile sich zum Ordnen eignen (3–6 Teile, alle verschieden). */
export function orderingSentences(sentences: Sentence[], learnedWordIds: Set<string>): Sentence[] {
  return sentences.filter((s) => {
    const chunks = s.chunks ?? []
    return learnedWordIds.has(s.wordId) && chunks.length >= 3 && chunks.length <= 6 && new Set(chunks).size === chunks.length
  })
}

/** Teile mischen – garantiert nicht schon in der richtigen Reihenfolge. */
export function scramble(chunks: string[], random = Math.random): string[] {
  if (chunks.length < 2) return [...chunks]
  for (let n = 0; n < 20; n++) {
    const mixed = shuffle(chunks, random)
    if (mixed.join('') !== chunks.join('')) return mixed
  }
  return [...chunks].reverse()
}

export const orderIsCorrect = (placed: string[], sentence: Sentence) => placed.join('') === (sentence.chunks ?? []).join('')

export interface ParticleTask {
  sentence: Sentence
  /** Stelle der Lücke in `sentence.tokens`. */
  index: number
  answer: string
  options: string[]
}

/** Eine eindeutige Partikel-Lücke im Satz (oder keine, wenn der Satz sich nicht eignet). */
export function particleTask(sentence: Sentence, random = Math.random): ParticleTask | undefined {
  const candidates = sentence.tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token, index }) =>
      token.role === 'partikel' && (PARTICLES as readonly string[]).includes(token.s) && index > 0 &&
      sentence.tokens[index - 1].role !== 'partikel' && sentence.tokens[index + 1]?.role !== 'partikel')
  if (!candidates.length) return undefined
  const { token, index } = candidates[Math.floor(random() * candidates.length)]
  // は und も können zur Betonung fast jede Partikel ersetzen → nie als „falsche“ Möglichkeit anbieten
  const excluded = new Set([token.s, 'は', 'も', ...(CONFUSABLE[token.s] ?? [])])
  const others = shuffle(PARTICLES.filter((p) => !excluded.has(p)), random).slice(0, 3)
  return { sentence, index, answer: token.s, options: shuffle([token.s, ...others], random) }
}

/** Beispielsätze für eine Grammatik-Lektion: kurze Sätze, gelernte Wörter zuerst, dann häufige. */
export function examplesFor(pattern: RegExp, sentences: Sentence[], words: Map<string, Word>, learned: Set<string>, count = 3): Sentence[] {
  const score = (s: Sentence) => (learned.has(s.wordId) ? 0 : 1000) + (words.get(s.wordId)?.rank ?? 9999) / 10
  return sentences.filter((s) => pattern.test(s.ja) && s.ja.length <= 22).sort((a, b) => score(a) - score(b)).slice(0, count)
}
