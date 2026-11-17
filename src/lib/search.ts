/**
 * Wortsuche auf Deutsch und Japanisch (Kanji, Kana oder Romaji).
 * Reihenfolge: genauer Treffer → Anfang → irgendwo enthalten; bei Gleichstand nach Lernreihenfolge.
 */
import { isRomaji, toHiragana, toKatakana } from 'wanakana'
import type { Word } from './data'

const clean = (text: string) => text.toLowerCase().normalize('NFKC').trim()

export function searchWords(words: Word[], input: string, max = 60): Word[] {
  const query = clean(input)
  if (!query) return []
  const kana = isRomaji(query) ? toHiragana(query) : toHiragana(query, { passRomaji: true })
  const variants = [...new Set([query, kana, toKatakana(kana)])]

  const score = (w: Word) => {
    let best = 0
    for (const v of variants) {
      for (const text of [w.surface, w.reading]) best = Math.max(best, text === v ? 100 : text.startsWith(v) ? 70 : text.includes(v) ? 40 : 0)
    }
    const romaji = clean(w.romaji)
    best = Math.max(best, romaji === query ? 100 : romaji.startsWith(query) ? 65 : 0)
    for (const meaning of w.meaningsDe.map(clean)) {
      // Bedeutungen wie „essen (Speisen)“: ganze Wörter zählen mehr als Teile davon
      const parts = meaning.split(/[\s,;/()（）・-]+/).filter(Boolean)
      best = Math.max(best, meaning === query ? 95 : parts.includes(query) ? 85 : parts.some((p) => p.startsWith(query)) ? 60 : query.length >= 3 && meaning.includes(query) ? 30 : 0)
    }
    return best
  }

  return words
    .map((word) => ({ word, points: score(word) }))
    .filter((x) => x.points > 0)
    .sort((a, b) => b.points - a.points || a.word.rank - b.word.rank)
    .slice(0, max)
    .map((x) => x.word)
}
