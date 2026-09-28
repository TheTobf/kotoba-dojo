import { toHiragana } from 'wanakana'
import type { Sentence, Token, Word } from './types'

export type QuizMode = 'auswahl' | 'tippen' | 'hoeren'

/** Kana-Lesung eines Tokens (Furigana, sonst Oberfläche). */
const tokenKana = (t: Token) => (t.f ? t.f.map((f) => f.r ?? f.s).join('') : t.s)

/** Die gesuchte Lücke: Oberfläche und Lesung der Zielwort-Tokens, wie sie im Satz stehen. */
export function answerOf(s: Sentence) {
  const ts = s.tokens.filter((t) => t.target)
  return { surface: ts.map((t) => t.s).join(''), kana: toHiragana(ts.map(tokenKana).join('')) }
}

const norm = (x: string) =>
  toHiragana(x.normalize('NFKC').toLowerCase().replace(/[\s。、.,!?「」]/g, ''), { passRomaji: false })

/** Tipp-Auswertung: Romaji, Kana oder Kanji werden akzeptiert. */
export function checkTyped(input: string, s: Sentence) {
  const a = answerOf(s)
  const x = norm(input)
  if (!x) return false
  return x === norm(a.kana) || x === norm(a.surface)
}

/** Einfacher, wiederholbarer Zufall (für Tests). */
export function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(arr: T[], rand = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 4 Antwortmöglichkeiten: die richtige + 3 plausible Ablenker.
 * Ablenker = Lückenwörter anderer Sätze mit gleicher Wortart, bevorzugt schon gelernte und im Rang nahe.
 */
export function choicesFor(word: Word, s: Sentence, words: Word[], sentences: Map<string, Sentence>, learned: Set<string>, rand = Math.random) {
  const right = answerOf(s).surface
  const pool = words
    .filter((w) => w.id !== word.id)
    .map((w) => {
      const ws = sentences.get(w.sentenceIds[0])
      if (!ws) return undefined
      const score = (w.pos === word.pos ? 0 : 1000) + (learned.has(w.id) ? 0 : 300) + Math.abs(w.rank - word.rank) + rand() * 200
      return { text: answerOf(ws).surface, score }
    })
    .filter((x): x is { text: string; score: number } => !!x && !!x.text && x.text !== right && x.text !== word.surface)
    .sort((a, b) => a.score - b.score)
  const picked: string[] = []
  for (const p of pool) {
    if (!picked.includes(p.text)) picked.push(p.text)
    if (picked.length === 3) break
  }
  return shuffle([right, ...picked], rand)
}

export interface QuizStats { total: number; right: number; bestCombo: number; wrong: Word[] }

export function addResult(st: QuizStats, word: Word, ok: boolean, combo: number): QuizStats {
  return {
    total: st.total + 1,
    right: st.right + (ok ? 1 : 0),
    bestCombo: Math.max(st.bestCombo, combo),
    wrong: ok ? st.wrong : [...st.wrong, word],
  }
}

/** Note der Auswertung auf Japanisch-Deutsch. */
export function verdict(st: QuizStats) {
  const p = st.total ? st.right / st.total : 0
  if (p === 1) return { jp: '完璧！', de: 'Perfekt!' }
  if (p >= 0.8) return { jp: 'すごい！', de: 'Stark!' }
  if (p >= 0.6) return { jp: 'いいね！', de: 'Gut gemacht!' }
  return { jp: 'がんばって！', de: 'Dranbleiben!' }
}
