import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mischen, ordnenSaetze, ordnungRichtig, partikelAufgabe, beispiele } from '../src/satzbau'
import { chunkTeile } from './lib/audio-manifest'
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

  it('Satzteile: Lesung aus den Tokens, Stimme des Satzes, eine Datei je Text + Lesung + Stimme', () => {
    const s = {
      id: 's1', chunks: ['人が', '来た。'], audioCredit: 'VOICEVOX:青山龍星',
      tokens: [{ s: '人', f: [{ s: '人', r: 'ひと' }] }, { s: 'が' }, { s: '来', f: [{ s: '来', r: 'き' }] }, { s: 'た' }, { s: '。' }],
    } as Sentence
    const t = chunkTeile(s)
    expect(t.map((c) => [c.text, c.kana, c.stimme])).toEqual([['人が', 'ひとが', '青山龍星'], ['来た。', 'きた。', '青山龍星']])
    expect(chunkTeile({ ...s, id: 's2' })[0].file).toBe(t[0].file)                       // gleicher Teil, andere Sätze
    expect(chunkTeile({ ...s, audioCredit: 'VOICEVOX:四国めたん' })[0].file).not.toBe(t[0].file)
    expect(chunkTeile({ ...s, chunks: ['食', 'べる'], tokens: [{ s: '食べる' }] })).toEqual([])  // zerschneidet ein Token
    // Tatoeba-Aufnahme (echter Sprecher): feste VOICEVOX-Stimme je Satz
    const tat = { ...s, audioCredit: 'xyz (Tatoeba, CC BY 2.0 FR)' }
    expect(chunkTeile(tat)[0].stimme).toBe(chunkTeile(tat)[1].stimme)
  })

  it('alle Sätze für „Sätze bauen“ lassen sich in Satzteile mit Lesung zerlegen', () => {
    const pool = ordnenSaetze(sentences, new Set(sentences.map((s) => s.wordId)))
    for (const s of pool) expect(chunkTeile(s).map((c) => c.text), s.id).toEqual(s.chunks)
  })
})
