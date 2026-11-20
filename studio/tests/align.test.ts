import { describe, expect, it } from 'vitest'
import { matchScript, norm, wordTimes, type TWord } from '../scripts/lib/align'

/** erzeugt erkannte Wörter mit fortlaufenden Zeiten */
function heard(text: string, start = 0, gap = 0.6): TWord[] {
  let t = start
  return text.split(' ').map((w) => { const word = { text: w, start: t, end: t + 0.3 }; t += 0.35; return word }).map((w, i, a) => (i === a.length - 1 ? { ...w, end: w.end + gap * 0 } : w))
}

describe('Skript ↔ Aufnahme', () => {
  const script = [
    { n: 1, text: 'Tokio. Passkontrolle.' },
    { n: 2, text: 'Oles Akku: ein Prozent.' },
    { n: 3, text: 'Und Ole kann genau null Wörter Japanisch.' },
  ]

  it('vereinfacht Wörter (Umlaute, Zahlen, Satzzeichen)', () => {
    expect(norm('Wörter,')).toBe('woerter')
    expect(norm('ein')).toBe('1')
    expect(norm('1')).toBe('1')
  })

  it('nimmt bei Versprechern die letzte gute Fassung', () => {
    const words = [
      ...heard('Tokio Passkontrolle', 0),
      ...heard('Oles Akku ein Pro', 2),        // abgebrochen
      ...heard('Oles Akku ein Prozent', 4),    // gut
      ...heard('Und Ole kann genau null Wörter Japanisch', 7),
    ]
    const m = matchScript(script, words)
    expect(m.map((x) => !!x.take)).toEqual([true, true, true])
    expect(m[1].takes.length).toBe(2)
    expect(m[1].take!.start).toBe(4)
    expect(m[2].take!.start).toBe(7)
  })

  it('erkennt doppelt gesprochene Sätze und Füllwörter', () => {
    const words = [
      ...heard('Tokio Passkontrolle', 0),
      ...heard('Tokio Passkontrolle', 1.5),
      ...heard('äh Oles Akku ein Prozent', 3),
      ...heard('Und Ole kann genau null Wörter Japanisch', 6),
    ]
    const m = matchScript(script, words)
    expect(m[0].take!.start).toBe(1.5)
    expect(m[1].take!.start).toBeCloseTo(3.35, 2)
    expect(m[1].take!.score).toBeGreaterThan(0.9)
  })

  it('meldet fehlende Sätze', () => {
    const m = matchScript(script, [...heard('Tokio Passkontrolle', 0), ...heard('Und Ole kann genau null Wörter Japanisch', 3)])
    expect(m[1].take).toBeUndefined()
    expect(m[2].take).toBeDefined()
  })

  it('übernimmt Skript-Schreibweise mit Zeiten der Erkennung', () => {
    const w = wordTimes('Oles Akku: ein Prozent.', heard('Oles Akku 1 %', 0))
    expect(w.map((x) => x.text)).toEqual(['Oles', 'Akku:', 'ein', 'Prozent.'])
    expect(w[0].start).toBe(0)
    expect(w[3].start).toBeGreaterThan(w[2].start)
  })
})
