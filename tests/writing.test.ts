/** Schrift-Bereich: Runden, Antwortauswahl, Freischalten und Strichvergleich. */
import { State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import type { Word } from '../src/lib/data'
import type { CardState } from '../src/lib/db'
import { kanjiGlyphs, optionsFor, pickRound, strokeMatches, unlockedStages, type Glyph } from '../src/lib/writing'

const glyph = (char: string, answer: string): Glyph => ({ char, answer, stage: 'hiragana' })
const pool = [glyph('あ', 'a'), glyph('い', 'i'), glyph('う', 'u'), glyph('え', 'e'), glyph('お', 'o'), glyph('か', 'ka'), glyph('き', 'ki')]
const card = (refId: string, due: number, state = State.Review): CardState => ({
  id: `zeichen:${refId}`, kind: 'zeichen', refId, due, stability: 5, difficulty: 5, elapsed_days: 0,
  scheduled_days: 1, learning_steps: 0, reps: 1, lapses: 0, state, introducedAt: 0,
})
const none = { hiragana: 0, 'hiragana-dakuten': 0, katakana: 0, 'katakana-dakuten': 0, kanji: 0 }

describe('Schrift', () => {
  it('Runde: fällige zuerst, dann höchstens 5 neue in Reihenfolge, dann bekannte', () => {
    const now = Date.now()
    const cards = new Map([['き', card('き', now - 1)], ['あ', card('あ', now + 1e9)]])
    const round = pickRound(pool, cards, 12, 5, now)
    expect(round[0].char).toBe('き')
    expect(round.slice(1, 6).map((g) => g.char)).toEqual(['い', 'う', 'え', 'お', 'か'])
    expect(round).toHaveLength(7)
  })

  it('4 verschiedene Antworten, genau eine richtig', () => {
    const options = optionsFor(pool[0], pool)
    expect(options).toHaveLength(4)
    expect(new Set(options.map((o) => o.char)).size).toBe(4)
    expect(options.filter((o) => o.char === 'あ')).toHaveLength(1)
  })

  it('Stufen werden ab 80 % frei – oder wenn man sie selbst freischaltet', () => {
    expect([...unlockedStages(none)]).toEqual(['hiragana'])
    expect(unlockedStages({ ...none, hiragana: 0.8 }).has('katakana')).toBe(true)
    expect(unlockedStages({ ...none, hiragana: 0.8 }).has('kanji')).toBe(false)
    expect(unlockedStages({ ...none, hiragana: 0.9, katakana: 0.85 }).has('kanji')).toBe(true)
    expect(unlockedStages(none, ['kanji']).has('kanji')).toBe(true)
  })

  it('Kanji kommen nur aus gelernten Wörtern, häufigste zuerst', () => {
    const kanji = new Map([
      ['日', { char: '日', rank: 1, strokes: 4, onyomi: ['ニチ'], kunyomi: ['ひ'], meaningsDe: ['Tag'], wordIds: ['w1'] }],
      ['本', { char: '本', rank: 5, strokes: 5, onyomi: ['ホン'], kunyomi: [], meaningsDe: ['Buch'], wordIds: ['w2'] }],
      ['山', { char: '山', rank: 3, strokes: 3, onyomi: ['サン'], kunyomi: ['やま'], meaningsDe: ['Berg'], wordIds: ['w3'] }],
    ])
    const words = new Map([['w1', { surface: '日本' }], ['w2', { surface: '本' }]]) as unknown as Map<string, Word>
    const result = kanjiGlyphs(kanji, words, new Set(['w1', 'w2']))
    expect(result.map((g) => g.char)).toEqual(['日', '本'])
    expect(result[0]).toMatchObject({ answer: 'Tag', stage: 'kanji' })
    expect(result[0].hint).toContain('日本')
  })

  it('Strichvergleich: richtige Richtung passt, umgekehrt oder verschoben nicht', () => {
    const reference = Array.from({ length: 10 }, (_, i) => ({ x: 20 + i * 7, y: 50 }))
    const wobbly = reference.map((p, i) => ({ x: p.x + 2, y: p.y + (i % 2 ? 4 : -3) }))
    expect(strokeMatches(wobbly, reference)).toBe(true)
    expect(strokeMatches([...wobbly].reverse(), reference)).toBe(false)
    expect(strokeMatches(reference.map((p) => ({ x: p.x, y: p.y + 40 })), reference)).toBe(false)
  })
})
