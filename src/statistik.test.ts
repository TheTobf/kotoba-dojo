import { describe, expect, it } from 'vitest'
import { heatmap, prognose, trefferquote } from './statistik'
import type { CardState } from './types'

const DAY = 86_400_000

describe('Statistik', () => {
  it('Trefferquote ignoriert „Kenn ich schon“ und trennt nach Bereich', () => {
    const q = trefferquote([
      { cardId: 'a', kind: 'vokabel', rating: 3, at: 0 },
      { cardId: 'b', kind: 'vokabel', rating: 1, at: 0 },
      { cardId: 'c', kind: 'vokabel', rating: 0, at: 0 },
      { cardId: 'd', kind: 'quiz', rating: 3, at: 0 },
    ])
    expect(q.gesamt).toBeCloseTo(2 / 3)
    expect(q.proArt).toEqual({ vokabel: 0.5, quiz: 1 })
  })

  it('Heatmap: Wochen × 7 Tage, heutiger Wert steht drin', () => {
    const now = new Date(2026, 9, 7, 15).getTime() // Mittwoch
    const h = heatmap({ '2026-10-07': 12 }, 4, now)
    expect(h).toHaveLength(4)
    expect(h.every((w) => w.length === 7)).toBe(true)
    expect(h[3][2]).toMatchObject({ tag: '2026-10-07', anzahl: 12, zukunft: false })
    expect(h[3][6].zukunft).toBe(true)
  })

  it('Prognose: Überfällige zählen zu heute', () => {
    const now = new Date(2026, 9, 7, 15).getTime()
    const c = (due: number) => ({ due } as CardState)
    const p = prognose([c(now - 5 * DAY), c(now), c(now + DAY), c(now + 30 * DAY)], 7, now)
    expect(p[0].anzahl).toBe(2)
    expect(p[1].anzahl).toBe(1)
    expect(p.reduce((s, x) => s + x.anzahl, 0)).toBe(3)
  })
})
