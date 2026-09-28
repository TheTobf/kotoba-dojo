import type { Sentence, Word } from './types'

/** Partikeln für die Einsetz-Übung. */
export const PARTIKELN = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'から', 'まで'] as const

/** Paare, die oft beide grammatisch gehen – nie gemeinsam als Auswahl anbieten. */
const VERWECHSELBAR: Record<string, string[]> = {
  は: ['が', 'も'], が: ['は', 'も'], も: ['は', 'が'], に: ['へ'], へ: ['に'],
}

/** Sätze aus gelernten Wörtern, deren Satzbau-Kacheln sich zum Ordnen eignen (3–6 Teile, alle verschieden). */
export function ordnenSaetze(sentences: Sentence[], learnedWordIds: Set<string>) {
  return sentences.filter((s) =>
    learnedWordIds.has(s.wordId) && s.chunks.length >= 3 && s.chunks.length <= 6 && new Set(s.chunks).size === s.chunks.length)
}

/** Kacheln mischen – garantiert nicht in der Lösungsreihenfolge. */
export function mischen(chunks: string[], rand = Math.random) {
  if (chunks.length < 2) return [...chunks]
  for (let n = 0; n < 20; n++) {
    const a = [...chunks].sort(() => rand() - 0.5)
    if (a.join('') !== chunks.join('')) return a
  }
  return [...chunks].reverse()
}

export const ordnungRichtig = (gelegt: string[], s: Sentence) => gelegt.join('') === s.chunks.join('')

export interface PartikelAufgabe {
  sentence: Sentence
  index: number        // Token-Index der Lücke
  answer: string
  options: string[]
}

/** Eine Partikel-Lücke pro Satz: nur eindeutige Partikel-Tokens aus der Liste. */
export function partikelAufgabe(s: Sentence, rand = Math.random): PartikelAufgabe | undefined {
  const idx = s.tokens
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => t.role === 'partikel' && (PARTIKELN as readonly string[]).includes(t.s) && i > 0
      && s.tokens[i - 1].role !== 'partikel' && !s.tokens[i + 1]?.role?.startsWith('partikel'))
  if (!idx.length) return undefined
  const { t, i } = idx[Math.floor(rand() * idx.length)]
  // は/も können zur Betonung fast jede Partikel ersetzen → nie als falsche Auswahl
  const verboten = new Set([t.s, 'は', 'も', ...(VERWECHSELBAR[t.s] ?? [])])
  const andere = PARTIKELN.filter((p) => !verboten.has(p)).sort(() => rand() - 0.5).slice(0, 3)
  return { sentence: s, index: i, answer: t.s, options: [t.s, ...andere].sort(() => rand() - 0.5) }
}

/** Beispielsätze für eine Grammatik-Lektion: gelernte Wörter zuerst, dann nach Kürze. */
export function beispiele(pattern: RegExp, sentences: Sentence[], words: Map<string, Word>, learned: Set<string>, n = 3) {
  return sentences
    .filter((s) => pattern.test(s.ja) && s.ja.length <= 22)
    .sort((a, b) =>
      (learned.has(a.wordId) ? 0 : 1000) - (learned.has(b.wordId) ? 0 : 1000)
      + (words.get(a.wordId)?.rank ?? 9999) / 10 - (words.get(b.wordId)?.rank ?? 9999) / 10)
    .slice(0, n)
}
