import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mischen, ordnungRichtig, partikelAufgabe, beispiele } from '../src/satzbau'
import { GRAMMATIK } from '../src/content/grammatik'
import { rng } from '../src/quiz'
import type { Sentence, Word } from '../src/types'

const sentences: Sentence[] = JSON.parse(readFileSync(join(import.meta.dirname, '../public/data/sentences.json'), 'utf8'))
const words: Word[] = JSON.parse(readFileSync(join(import.meta.dirname, '../public/data/words.json'), 'utf8'))

describe('Satzbau', () => {
  it('gemischte Kacheln sind nie schon die Lösung, Lösung wird erkannt', () => {
    const s = sentences.find((x) => x.chunks.length >= 3)!
    for (let n = 0; n < 20; n++) expect(mischen(s.chunks, rng(n)).join('')).not.toBe(s.chunks.join(''))
    expect(ordnungRichtig(s.chunks, s)).toBe(true)
    expect(ordnungRichtig([...s.chunks].reverse(), s)).toBe(false)
  })

  it('Partikel-Lücke: Antwort ist dabei, verwechselbare Partner (は/が, に/へ) nicht', () => {
    let n = 0
    for (const s of sentences.slice(0, 400)) {
      const a = partikelAufgabe(s, rng(n++))
      if (!a) continue
      expect(a.options).toHaveLength(4)
      expect(a.options).toContain(a.answer)
      expect(s.tokens[a.index].s).toBe(a.answer)
      if (a.answer === 'は') expect(a.options).not.toContain('が')
      if (a.answer === 'に') expect(a.options).not.toContain('へ')
    }
  })

  it('jede Grammatik-Lektion findet Beispielsätze in den Daten', () => {
    const byId = new Map(words.map((w) => [w.id, w]))
    for (const l of GRAMMATIK) expect(beispiele(l.muster, sentences, byId, new Set()).length, l.id).toBeGreaterThan(0)
  })
})
