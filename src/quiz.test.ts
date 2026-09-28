import { describe, expect, it } from 'vitest'
import { KotobaDB } from './db'
import { addResult, answerOf, checkTyped, choicesFor, rng, verdict } from './quiz'
import { markKnown, quizQueue, rate, Rating } from './srs'
import type { Sentence, Word } from './types'

const s = (id: string, wordId: string, target: { s: string; r?: string }): Sentence => ({
  id, wordId, ja: '', kana: '', romaji: '', de: '', grammar: '', chunks: [], source: 'claude',
  tokens: [
    { s: '毎日', f: [{ s: '毎日', r: 'まいにち' }] },
    target.r ? { s: target.s, f: [{ s: target.s, r: target.r }], target: true } : { s: target.s, target: true },
    { s: 'ます' },
  ],
})
const w = (i: number, surface: string, pos: Word['pos'] = 'Verb'): Word => ({
  id: `w${i}`, rank: i, lesson: 1, surface, reading: '', romaji: '', pos, meaningsDe: ['x'],
  meaningSource: 'claude', kanji: [], sentenceIds: [`s${i}`],
})

const words = [w(1, '飲む'), w(2, '食べる'), w(3, '見る'), w(4, '行く'), w(5, '水', 'Nomen'), w(6, '書く')]
const targets: Record<string, { s: string; r?: string }> = {
  s1: { s: '飲み', r: 'のみ' }, s2: { s: '食べ', r: 'たべ' }, s3: { s: '見', r: 'み' },
  s4: { s: '行き', r: 'いき' }, s5: { s: '水', r: 'みず' }, s6: { s: '書き', r: 'かき' },
}
const sentences = new Map(Object.entries(targets).map(([id, t], i) => [id, s(id, `w${i + 1}`, t)]))

describe('Quiz-Auswertung', () => {
  it('Lücke = Zielwort so, wie es im Satz steht', () => {
    expect(answerOf(sentences.get('s2')!)).toEqual({ surface: '食べ', kana: 'たべ' })
  })

  it('akzeptiert Romaji, Hiragana, Katakana und Kanji – mit Leerzeichen und Satzzeichen', () => {
    const x = sentences.get('s2')!
    for (const ok of ['tabe', 'たべ', 'タベ', '食べ', ' Tabe。']) expect(checkTyped(ok, x), ok).toBe(true)
    for (const bad of ['', 'taberu', 'nomi', 'たべる']) expect(checkTyped(bad, x), bad).toBe(false)
  })

  it('4 verschiedene Antworten, genau eine richtig, Ablenker bevorzugt gleiche Wortart', () => {
    const c = choicesFor(words[1], sentences.get('s2')!, words, sentences, new Set(), rng(1))
    expect(c).toHaveLength(4)
    expect(new Set(c).size).toBe(4)
    expect(c.filter((x) => x === '食べ')).toHaveLength(1)
    expect(c).not.toContain('水')
  })

  it('Statistik und Urteil', () => {
    let st = { total: 0, right: 0, bestCombo: 0, wrong: [] as Word[] }
    st = addResult(st, words[0], true, 1)
    st = addResult(st, words[1], true, 2)
    st = addResult(st, words[2], false, 0)
    expect(st).toMatchObject({ total: 3, right: 2, bestCombo: 2 })
    expect(st.wrong.map((x) => x.id)).toEqual(['w3'])
    expect(verdict(st).de).toBe('Gut gemacht!')
    expect(verdict({ ...st, right: 3 }).jp).toBe('完璧！')
  })
})

describe('Quiz im Spaced-Repetition-System', () => {
  it('fragt nur gelernte Wörter ab, fällige Quizkarten zuerst', async () => {
    const d = new KotobaDB('quiz-1')
    const now = Date.now()
    await markKnown(words[0], d, now)
    await markKnown(words[2], d, now)
    const q1 = quizQueue(words, await d.cards.toArray(), 10, now)
    expect(q1.map((x) => x.word.id)).toEqual(['w1', 'w3'])

    await rate(words[2], undefined, Rating.Again, undefined, d, now, 'quiz')
    const quizCard = await d.cards.get('quiz:w3')
    expect(quizCard?.kind).toBe('quiz')
    const q2 = quizQueue(words, await d.cards.toArray(), 10, now + 3_600_000)
    expect(q2.map((x) => x.word.id)).toEqual(['w3', 'w1'])
  })
})
