/**
 * Schrift üben: Hiragana → Katakana → Kanji. Jedes Zeichen ist eine eigene Karte (Art „zeichen“) im
 * Wiederholungs-System. Eine Stufe wird frei, wenn die vorige zu 80 % sicher sitzt – oder wenn man sie
 * selbst freischaltet („Kann ich schon“).
 */
import { State } from 'ts-fsrs'
import type { CardState } from './db'
import type { Kana, Kanji, WritingStage, Word } from './data'

/** Ein übbares Zeichen. `answer` = Romaji (Kana) bzw. deutsche Bedeutung (Kanji). */
export interface Glyph {
  char: string
  answer: string
  stage: WritingStage
  svg?: string
  /** Lesungen und Beispielwörter (nur Kanji). */
  hint?: string
}

export const STAGES: { id: WritingStage; label: string; ja: string; needs?: WritingStage }[] = [
  { id: 'hiragana', label: 'Hiragana', ja: 'ひらがな' },
  { id: 'hiragana-dakuten', label: 'Hiragana mit ゛゜', ja: 'が・ぱ', needs: 'hiragana' },
  { id: 'katakana', label: 'Katakana', ja: 'カタカナ', needs: 'hiragana' },
  { id: 'katakana-dakuten', label: 'Katakana mit ゛゜', ja: 'ガ・パ', needs: 'katakana' },
  { id: 'kanji', label: 'Kanji', ja: '漢字', needs: 'katakana' },
]

/** Ab diesem Anteil sicher gekonnter Zeichen wird die nächste Stufe frei. */
export const UNLOCK_AT = 0.8

export const glyphCardId = (char: string) => `zeichen:${char}`

export function kanaGlyphs(stage: Exclude<WritingStage, 'kanji'>, kana: Kana[]): Glyph[] {
  return kana.filter((k) => k.stage === stage).map((k) => ({ char: k.char, answer: k.romaji, stage, svg: k.svg }))
}

/** Kanji aus Wörtern, die man schon als Karteikarte gelernt hat – häufigste zuerst. */
export function kanjiGlyphs(kanji: Map<string, Kanji>, words: Map<string, Word>, learnedWords: Set<string>): Glyph[] {
  return [...kanji.values()]
    .filter((k) => k.meaningsDe.length > 0 && k.wordIds.some((id) => learnedWords.has(id)))
    .sort((a, b) => a.rank - b.rank)
    .map((k) => ({
      char: k.char,
      answer: k.meaningsDe[0],
      stage: 'kanji' as const,
      svg: k.svg,
      hint: [
        [...k.onyomi.slice(0, 2), ...k.kunyomi.slice(0, 2)].join('・'),
        k.wordIds.filter((id) => learnedWords.has(id)).slice(0, 3).map((id) => words.get(id)?.surface).filter(Boolean).join('、'),
      ].filter(Boolean).join(' · '),
    }))
}

/** Sicher gekonnt = Karte im Wiederholungsstadium (mindestens einmal über die Lernschritte hinaus). */
export const isMastered = (card?: CardState) => !!card && card.state === State.Review

export function stageProgress(glyphs: Glyph[], cards: Map<string, CardState>) {
  const mastered = glyphs.filter((g) => isMastered(cards.get(g.char))).length
  return { mastered, total: glyphs.length, ratio: glyphs.length ? mastered / glyphs.length : 0 }
}

/** Freie Stufen: die erste immer, weitere ab 80 % der vorigen – oder wenn selbst freigeschaltet. */
export function unlockedStages(progress: Record<WritingStage, number>, unlockedByUser: WritingStage[] = []): Set<WritingStage> {
  return new Set(
    STAGES.filter((s) => !s.needs || progress[s.needs] >= UNLOCK_AT || unlockedByUser.includes(s.id)).map((s) => s.id),
  )
}

/** Zeichen für eine Runde: fällige zuerst, dann bis zu `newMax` neue (in Lernreihenfolge), aufgefüllt mit bekannten. */
export function pickRound(glyphs: Glyph[], cards: Map<string, CardState>, size = 12, newMax = 5, now = Date.now(), random = Math.random): Glyph[] {
  const due = glyphs
    .filter((g) => { const c = cards.get(g.char); return c && c.due <= now })
    .sort((a, b) => cards.get(a.char)!.due - cards.get(b.char)!.due)
  const fresh = glyphs.filter((g) => !cards.get(g.char)).slice(0, newMax)
  const known = shuffle(glyphs.filter((g) => { const c = cards.get(g.char); return c && c.due > now }), random)
  const out: Glyph[] = []
  for (const g of [...due, ...fresh, ...known]) if (out.length < size && !out.includes(g)) out.push(g)
  return out
}

/** 3 Ablenker aus derselben Stufe plus die richtige Antwort, gemischt. */
export function optionsFor(target: Glyph, pool: Glyph[], random = Math.random, key: 'answer' | 'char' = 'answer'): Glyph[] {
  const others = shuffle(pool.filter((g) => g.char !== target.char && g[key] !== target[key]), random).slice(0, 3)
  return shuffle([target, ...others], random)
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ---------- Nachzeichnen ----------

export type Point = { x: number; y: number }

/** Grober Strichvergleich im 109er-Raster von KanjiVG: Start, Ende und Verlauf müssen ungefähr passen. */
export function strokeMatches(drawn: Point[], reference: Point[], tolerance = 22): boolean {
  if (drawn.length < 2 || reference.length < 2) return false
  const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
  const [drawnStart, drawnEnd] = [drawn[0], drawn[drawn.length - 1]]
  const [refStart, refEnd] = [reference[0], reference[reference.length - 1]]
  // Punkte und Häkchen (sehr kurze Striche): nur die Lage zählt
  if (distance(refStart, refEnd) < 15) {
    return distance(drawnStart, refStart) < tolerance * 1.3 && distance(drawnEnd, refEnd) < tolerance * 1.3
  }
  if (distance(drawnStart, refStart) > tolerance * 1.5 || distance(drawnEnd, refEnd) > tolerance * 1.5) return false
  const middle = drawn[Math.floor(drawn.length / 2)]
  return Math.min(...reference.map((p) => distance(p, middle))) < tolerance * 1.3
}
