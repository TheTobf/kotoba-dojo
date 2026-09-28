import { MEDIEN, SITUATIONEN, type Medium, type Situation } from './content/ziele'
import { isLearned } from './srs'
import type { CardState, Word } from './types'

export interface SituationStatus {
  s: Situation
  known: number
  total: number
  missing: Word[]
  ready: boolean
  pct: number
}

/** Gelernte Wörter (IDs) aus den Vokabelkarten. */
export function learnedIds(cards: CardState[]) {
  return new Set(cards.filter((c) => c.kind === 'vokabel' && isLearned(c)).map((c) => c.refId))
}

export function situationStatus(words: Word[], learned: Set<string>): SituationStatus[] {
  const bySurface = new Map(words.map((w) => [w.surface, w]))
  return SITUATIONEN.map((s) => {
    const list = s.words.map((x) => bySurface.get(x)).filter((w): w is Word => !!w)
    const missing = list.filter((w) => !learned.has(w.id)).sort((a, b) => a.rank - b.rank)
    const wordPart = list.length ? (list.length - missing.length) / list.length : 1
    const totalPart = s.minWords ? Math.min(1, learned.size / s.minWords) : 1
    const pct = Math.round(100 * Math.min(wordPart, totalPart))
    return { s, known: list.length - missing.length, total: list.length, missing, ready: pct >= 100, pct }
  })
}

export function unlockedMedien(learnedCount: number): Medium[] {
  return MEDIEN.filter((m) => learnedCount >= m.minWords)
}

/** Was durch eine Lerneinheit neu erreicht wurde (für die Abschlussanzeige). */
export function newlyReached(words: Word[], before: Set<string>, after: Set<string>) {
  const b = situationStatus(words, before)
  const a = situationStatus(words, after)
  return {
    situationen: a.filter((x, i) => x.ready && !b[i].ready).map((x) => x.s),
    medien: MEDIEN.filter((m) => after.size >= m.minWords && before.size < m.minWords),
  }
}
