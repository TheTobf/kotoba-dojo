import { describe, expect, it } from 'vitest'
import { sucheWoerter } from './suche'
import { huellkurve, shadowSaetze } from './shadowing'
import type { Sentence, Word } from './types'

const wort = (id: string, rank: number, surface: string, reading: string, romaji: string, de: string[]) =>
  ({ id, rank, lesson: 1, surface, reading, romaji, pos: 'Nomen', meaningsDe: de, meaningSource: 'claude', kanji: [], sentenceIds: [`s${id}`] }) as unknown as Word

const W = [
  wort('1', 1, '水', 'みず', 'mizu', ['Wasser']),
  wort('2', 2, '食べる', 'たべる', 'taberu', ['essen']),
  wort('3', 3, '大丈夫', 'だいじょうぶ', 'daijoubu', ['in Ordnung', 'okay']),
  wort('4', 4, 'コーヒー', 'コーヒー', 'koohii', ['Kaffee']),
  wort('5', 5, '食べ物', 'たべもの', 'tabemono', ['Essen, Lebensmittel']),
]

describe('Wortsuche', () => {
  it('findet auf Deutsch, Kanji, Kana und Romaji', () => {
    expect(sucheWoerter(W, 'wasser')[0].surface).toBe('水')
    expect(sucheWoerter(W, '水')[0].id).toBe('1')
    expect(sucheWoerter(W, 'みず')[0].id).toBe('1')
    expect(sucheWoerter(W, 'mizu')[0].id).toBe('1')
    expect(sucheWoerter(W, 'koohii')[0].id).toBe('4')   // Romaji → Katakana
    expect(sucheWoerter(W, 'Ordnung')[0].id).toBe('3')
  })
  it('exakte Treffer vor Teiltreffern', () => {
    expect(sucheWoerter(W, 'essen').map((w) => w.id)).toEqual(['2', '5'])
    expect(sucheWoerter(W, 'たべ').map((w) => w.id)).toEqual(['2', '5'])
  })
  it('leer und unsinnig', () => {
    expect(sucheWoerter(W, '  ')).toEqual([])
    expect(sucheWoerter(W, 'xyzq')).toEqual([])
  })
})

describe('Shadowing', () => {
  it('Hüllkurve ohne Stille am Rand, normiert', () => {
    const s = new Float32Array([0, 0, 0.5, -1, 0.5, 0, 0])
    const k = huellkurve(s, 3)
    expect(k).toHaveLength(3)
    expect(Math.max(...k)).toBe(1)
  })
  it('Runde: gelernte zuerst, sortiert nach Länge', () => {
    const satz = (id: string, ja: string) => ({ id, ja, audio: 'a.mp3' }) as unknown as Sentence
    const sentences = new Map([['s1', satz('s1', 'みずをください。')], ['s2', satz('s2', 'たべます。')], ['s3', satz('s3', 'だいじょうぶです。')]])
    const r = shadowSaetze(W.slice(0, 3), sentences, new Set(['3']), 2, () => 0.5)
    expect(r).toHaveLength(2)
    expect(r.map((s) => s.id)).toContain('s3')
    expect(r[0].ja.length).toBeLessThanOrEqual(r[1].ja.length)
  })
})
