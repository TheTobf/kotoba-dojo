import { describe, expect, it } from 'vitest'
import { abdeckung, hochrechnung, stufe, tempo, wortAnteil } from './coverage'
import type { CardState, Word } from './types'

const DAY = 86_400_000
const w = (rank: number, freqRank?: number) => ({ id: `w${rank}`, rank, freqRank, surface: `x${rank}` } as Word)
const karte = (refId: string, introducedAt: number) =>
  ({ kind: 'vokabel', refId, reps: 1, introducedAt } as CardState)

describe('Abdeckung', () => {
  it('häufige Wörter zählen mehr als seltene, unbekannte Ränge nichts', () => {
    expect(wortAnteil(1)).toBeGreaterThan(wortAnteil(100))
    expect(wortAnteil(100)).toBeGreaterThan(wortAnteil(3000))
    expect(wortAnteil(undefined)).toBe(0)
    expect(wortAnteil(90_000)).toBe(0)
  })

  it('die Top-2000 ergeben ungefähr die Kurvenwerte (~84 %)', () => {
    const top = Array.from({ length: 2000 }, (_, i) => w(i + 1, i + 1))
    const a = abdeckung(top, new Set(top.map((x) => x.id)))
    expect(a.mid).toBeGreaterThanOrEqual(82)
    expect(a.mid).toBeLessThanOrEqual(86)
    expect(a.low).toBeLessThan(a.mid)
    expect(a.high).toBeGreaterThan(a.mid)
    expect(a.high).toBeLessThan(100)
  })

  it('Partikel & Endungen (häufigste Ränge fehlen im Kurs) zählen schrittweise mit', () => {
    // Kurs ohne die Ränge 1–100: nur Wörter ab Rang 101
    const kurs = Array.from({ length: 300 }, (_, i) => w(i + 1, i + 101))
    const ids = (n: number) => new Set(kurs.slice(0, n).map((x) => x.id))
    const mitGrammatik = abdeckung(kurs, ids(150)).mid
    const reinWoerter = kurs.slice(0, 150).reduce((s, x) => s + wortAnteil(x.freqRank), 0)
    expect(mitGrammatik).toBeGreaterThan(Math.round(reinWoerter) + 30) // Partikel-Block ≈ 49 % der Top-100
    expect(abdeckung(kurs, ids(30)).mid).toBeLessThan(abdeckung(kurs, ids(150)).mid)
    expect(abdeckung(kurs, ids(300)).high).toBeLessThan(100)
  })

  it('ohne gelernte Wörter 0 %; Reise-Wörter mit hohem Rang bringen weniger als Top-Wörter', () => {
    const words = [w(1, 5), w(2, 4000)]
    expect(abdeckung(words, new Set()).mid).toBe(0)
    expect(abdeckung(words, new Set(['w1'])).mid).toBeGreaterThan(abdeckung(words, new Set(['w2'])).mid)
  })

  it('Stufen werden nüchtern formuliert und steigen mit der Abdeckung', () => {
    expect(stufe(10)).not.toBe(stufe(60))
    expect(stufe(60)).not.toBe(stufe(90))
  })
})

describe('Tempo & Hochrechnung', () => {
  const now = new Date(2026, 9, 14, 12).getTime()

  it('nimmt das Tageslimit, solange weniger als 3 Lerntage gemessen sind', () => {
    expect(tempo([], 6, now)).toEqual({ proTag: 6, gemessen: false })
    expect(tempo([karte('a', now - DAY)], 6, now).gemessen).toBe(false)
  })

  it('misst die echte Geschwindigkeit über die Lerntage', () => {
    const cards = Array.from({ length: 20 }, (_, i) => karte(`w${i}`, now - (i % 5) * DAY))
    const t = tempo(cards, 6, now)
    expect(t.gemessen).toBe(true)
    expect(t.proTag).toBe(4) // 20 Wörter über 5 Tage
  })

  it('Hochrechnung lernt in Kursreihenfolge weiter und verändert den Bestand nicht', () => {
    const words = Array.from({ length: 10 }, (_, i) => w(i + 1, (i + 1) * 10))
    const learned = new Set(['w1', 'w2'])
    const h = hochrechnung(words, learned, 2, 3) // +6 Wörter → w3…w8
    expect(h.woerter).toBe(8)
    expect(learned.size).toBe(2)
    expect(h.abdeckung.mid).toBeGreaterThan(abdeckung(words, learned).mid)
    expect(hochrechnung(words, learned, 0, 100).woerter).toBe(2)
  })
})
