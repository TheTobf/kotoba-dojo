import { describe, expect, it } from 'vitest'
import { optionsFor, pickRound, strokeMatches, unlockedStages, type Glyph } from './schrift'
import { State } from './srs'
import type { CardState } from './types'

const g = (char: string, answer: string): Glyph => ({ char, answer, stage: 'hiragana' })
const pool = [g('あ', 'a'), g('い', 'i'), g('う', 'u'), g('え', 'e'), g('お', 'o'), g('か', 'ka'), g('き', 'ki')]
const card = (refId: string, due: number, state = State.Review): CardState => ({
  id: `zeichen:${refId}`, kind: 'zeichen', refId, due, stability: 5, difficulty: 5, elapsed_days: 0,
  scheduled_days: 1, learning_steps: 0, reps: 1, lapses: 0, state,
})

describe('Schrift', () => {
  it('Runde: fällige zuerst, dann höchstens 5 neue in Reihenfolge', () => {
    const now = Date.now()
    const cards = new Map([['き', card('き', now - 1)], ['あ', card('あ', now + 1e9)]])
    const r = pickRound(pool, cards, 12, 5, now)
    expect(r[0].char).toBe('き')
    expect(r.slice(1, 6).map((x) => x.char)).toEqual(['い', 'う', 'え', 'お', 'か'])
    expect(r).toHaveLength(7)
  })

  it('4 Antworten, alle verschieden, eine richtig', () => {
    const o = optionsFor(pool[0], pool)
    expect(o).toHaveLength(4)
    expect(new Set(o.map((x) => x.char)).size).toBe(4)
    expect(o.filter((x) => x.char === 'あ')).toHaveLength(1)
  })

  it('Stufen werden ab 80 % freigeschaltet', () => {
    const base = { hiragana: 0, 'hiragana-dakuten': 0, katakana: 0, 'katakana-dakuten': 0, kanji: 0 }
    expect([...unlockedStages(base)]).toEqual(['hiragana'])
    expect(unlockedStages({ ...base, hiragana: 0.8 }).has('katakana')).toBe(true)
    expect(unlockedStages({ ...base, hiragana: 0.8 }).has('kanji')).toBe(false)
    expect(unlockedStages({ ...base, hiragana: 0.9, katakana: 0.85 }).has('kanji')).toBe(true)
  })

  it('Strichvergleich: richtige Richtung passt, umgekehrt nicht', () => {
    const ref = Array.from({ length: 10 }, (_, i) => ({ x: 20 + i * 7, y: 50 }))
    const wobbly = ref.map((p, i) => ({ x: p.x + 2, y: p.y + (i % 2 ? 4 : -3) }))
    expect(strokeMatches(wobbly, ref)).toBe(true)
    expect(strokeMatches([...wobbly].reverse(), ref)).toBe(false)
    expect(strokeMatches(ref.map((p) => ({ x: p.x, y: p.y + 40 })), ref)).toBe(false)
  })
})
