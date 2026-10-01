import { isRomaji, toHiragana, toKatakana } from 'wanakana'
import type { Word } from './types'

const klein = (s: string) => s.toLowerCase().normalize('NFKC').trim()

/**
 * Wortsuche auf Deutsch und Japanisch (Kanji, Kana, Romaji).
 * Rangfolge: exakter Treffer → Anfang → irgendwo enthalten; danach Lernreihenfolge.
 */
export function sucheWoerter(words: Word[], eingabe: string, max = 60): Word[] {
  const q = klein(eingabe)
  if (!q) return []
  const kana = isRomaji(q) ? toHiragana(q) : toHiragana(q, { passRomaji: true })
  const kata = toKatakana(kana)
  const varianten = [...new Set([q, kana, kata])]

  const punkte = (w: Word) => {
    const ja = [w.surface, w.reading]
    const de = w.meaningsDe.map(klein)
    const rom = klein(w.romaji)
    let best = 0
    for (const v of varianten) {
      for (const t of ja) best = Math.max(best, t === v ? 100 : t.startsWith(v) ? 70 : t.includes(v) ? 40 : 0)
    }
    best = Math.max(best, rom === q ? 100 : rom.startsWith(q) ? 65 : 0)
    for (const m of de) {
      // Bedeutungen wie „essen (Speisen)“: Wortgrenzen zählen mehr als Teilstrings
      const woerter = m.split(/[\s,;/()（）・-]+/).filter(Boolean)
      best = Math.max(best, m === q ? 95 : woerter.includes(q) ? 85 : woerter.some((x) => x.startsWith(q)) ? 60 : q.length >= 3 && m.includes(q) ? 30 : 0)
    }
    return best
  }

  return words
    .map((w) => ({ w, p: punkte(w) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || a.w.rank - b.w.rank)
    .slice(0, max)
    .map((x) => x.w)
}
