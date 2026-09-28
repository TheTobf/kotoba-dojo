import type { LearnData } from './data'
import { State } from './srs'
import type { CardState, Kana, SchriftStufe } from './types'

/** Ein übbares Zeichen – Kana oder Kanji. `answer` = Romaji bzw. deutsche Bedeutung. */
export interface Glyph {
  char: string
  answer: string
  stage: SchriftStufe
  svg?: string
  audio?: string
  hint?: string         // Lesungen / Beispielwörter (Kanji)
}

export const STUFEN: { id: SchriftStufe; label: string; jp: string; needs?: SchriftStufe }[] = [
  { id: 'hiragana', label: 'Hiragana', jp: 'ひらがな' },
  { id: 'hiragana-dakuten', label: 'Hiragana mit ゛゜', jp: 'が・ぱ', needs: 'hiragana' },
  { id: 'katakana', label: 'Katakana', jp: 'カタカナ', needs: 'hiragana' },
  { id: 'katakana-dakuten', label: 'Katakana mit ゛゜', jp: 'ガ・パ', needs: 'katakana' },
  { id: 'kanji', label: 'Kanji', jp: '漢字', needs: 'katakana' },
]

/** Ab diesem Anteil sicher gekonnter Zeichen wird die nächste Stufe frei. */
export const UNLOCK_AT = 0.8

export function glyphsFor(stage: SchriftStufe, kana: Kana[], data: LearnData, learnedWords: Set<string>): Glyph[] {
  if (stage !== 'kanji') {
    return kana.filter((k) => k.stage === stage).map((k) => ({ char: k.char, answer: k.romaji, stage, svg: k.svg, audio: k.audio }))
  }
  // Kanji aus schon gelernten Wörtern, nach Häufigkeit
  const byId = new Map(data.words.map((w) => [w.id, w]))
  return [...data.kanji.values()]
    .filter((k) => k.meaningsDe.length && k.wordIds.some((id) => learnedWords.has(id)))
    .sort((a, b) => a.rank - b.rank)
    .map((k) => ({
      char: k.char, answer: k.meaningsDe[0], stage, svg: k.svg,
      hint: [
        [...k.onyomi.slice(0, 2), ...k.kunyomi.slice(0, 2)].join('・'),
        k.wordIds.filter((id) => learnedWords.has(id)).slice(0, 3).map((id) => byId.get(id)?.surface).join('、'),
      ].filter(Boolean).join(' · '),
    }))
}

/** Sicher gekonnt = Zeichenkarte im Wiederholungsstadium (mind. einmal über den Lernschritt hinaus). */
export const isMastered = (c?: CardState) => !!c && c.state === State.Review

export function stageProgress(glyphs: Glyph[], cards: Map<string, CardState>) {
  const mastered = glyphs.filter((g) => isMastered(cards.get(g.char))).length
  return { mastered, total: glyphs.length, ratio: glyphs.length ? mastered / glyphs.length : 0 }
}

export function unlockedStages(progress: Record<SchriftStufe, number>): Set<SchriftStufe> {
  return new Set(STUFEN.filter((s) => !s.needs || progress[s.needs] >= UNLOCK_AT).map((s) => s.id))
}

/**
 * Zeichen für eine Runde: fällige zuerst, dann bis zu `newMax` neue (in Lernreihenfolge),
 * aufgefüllt mit schon bekannten.
 */
export function pickRound(glyphs: Glyph[], cards: Map<string, CardState>, n = 12, newMax = 5, now = Date.now(), rand = Math.random) {
  const due = glyphs.filter((g) => { const c = cards.get(g.char); return c && c.due <= now }).sort((a, b) => cards.get(a.char)!.due - cards.get(b.char)!.due)
  const fresh = glyphs.filter((g) => !cards.get(g.char)).slice(0, newMax)
  const known = glyphs.filter((g) => { const c = cards.get(g.char); return c && c.due > now }).sort(() => rand() - 0.5)
  const out: Glyph[] = []
  for (const g of [...due, ...fresh, ...known]) if (out.length < n && !out.includes(g)) out.push(g)
  return out
}

/** 3 Ablenker aus derselben Stufe (bei Kana bevorzugt ähnliche Zeile), plus die richtige Antwort, gemischt. */
export function optionsFor(target: Glyph, pool: Glyph[], rand = Math.random, key: 'answer' | 'char' = 'answer') {
  const others = pool.filter((g) => g.char !== target.char && g[key] !== target[key])
  const picked = [...others].sort(() => rand() - 0.5).slice(0, 3)
  return [target, ...picked].sort(() => rand() - 0.5)
}

// ---------- Nachzeichnen ----------

export type Pt = { x: number; y: number }

/** Grober Strichvergleich im 109er-Raster: Start, Ende und Richtung müssen passen. */
export function strokeMatches(drawn: Pt[], ref: Pt[], tol = 22) {
  if (drawn.length < 2 || ref.length < 2) return false
  const d = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
  const [ds, de] = [drawn[0], drawn[drawn.length - 1]]
  const [rs, re] = [ref[0], ref[ref.length - 1]]
  const refLen = d(rs, re)
  // Punkte/Häkchen (sehr kurze Striche): nur die Lage zählt
  if (refLen < 15) return d(ds, rs) < tol * 1.3 && d(de, re) < tol * 1.3
  if (d(ds, rs) > tol * 1.5 || d(de, re) > tol * 1.5) return false
  // Mittelpunkt des Strichs ungefähr auf dem Referenzweg
  const mid = drawn[Math.floor(drawn.length / 2)]
  return Math.min(...ref.map((p) => d(p, mid))) < tol * 1.3
}
