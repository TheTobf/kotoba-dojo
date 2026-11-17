/** Nachsprechen: Satzauswahl und Tonkurven. */
import { describe, expect, it } from 'vitest'
import type { LearnData, Word } from '../src/lib/data'
import { envelope, shadowSentences, spokenSeconds } from '../src/lib/shadowing'

const word = (i: number): Word => ({ id: `w${i}`, rank: i, lesson: 1, surface: 'x', reading: 'x', romaji: 'x', pos: 'Nomen', meaningsDe: ['x'], kanji: [], sentenceIds: [`s${i}`] })
const words = Array.from({ length: 30 }, (_, i) => word(i))
const data: LearnData = {
  words, wordsById: new Map(words.map((w) => [w.id, w])),
  sentences: new Map(words.map((w, i) => [`s${i}`, { id: `s${i}`, wordId: w.id, tokens: [], ja: 'あ'.repeat(3 + (i % 20)), kana: '', romaji: '', de: '', grammar: '', source: 'claude' as const }])),
}

describe('Nachsprechen', () => {
  it('nimmt gelernte Wörter zuerst und sortiert kurze Sätze nach vorn', () => {
    const round = shadowSentences(data, new Set(['w25', 'w26', 'w27']), 8)
    expect(round).toHaveLength(8)
    expect(round.map((s) => s.wordId)).toEqual(expect.arrayContaining(['w25', 'w26', 'w27']))
    for (let i = 1; i < round.length; i++) expect(round[i].ja.length).toBeGreaterThanOrEqual(round[i - 1].ja.length)
  })

  it('Tonkurve: Stille wird abgeschnitten, Werte zwischen 0 und 1', () => {
    const samples = new Float32Array(48_000)
    for (let i = 12_000; i < 36_000; i++) samples[i] = Math.sin(i / 10) * (i < 24_000 ? 0.2 : 0.6)
    const curve = envelope(samples, 10)
    expect(curve).toHaveLength(10)
    expect(Math.max(...curve)).toBeCloseTo(1)
    expect(curve[0]).toBeLessThan(curve[9])
    expect(spokenSeconds(samples, 48_000)).toBeCloseTo(0.5, 1)
  })
})
