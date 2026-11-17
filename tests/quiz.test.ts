/** Quiz: Lücke bestimmen, Eingaben prüfen, Ablenker wählen, Runde zusammenstellen. */
import { State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import type { LearnData, Sentence, Word } from '../src/lib/data'
import type { CardState } from '../src/lib/db'
import { answerOf, checkTyped, choicesFor, quizQueue, verdict } from '../src/lib/quiz'

const sentence = (id: string, wordId: string, target: { s: string; r?: string }): Sentence => ({
  id, wordId, ja: '', kana: '', romaji: '', de: '', grammar: '', source: 'claude',
  tokens: [
    { s: '毎日', f: [{ s: '毎', r: 'まい' }, { s: '日', r: 'にち' }] },
    target.r ? { s: target.s, f: [{ s: target.s, r: target.r }], target: true } : { s: target.s, target: true },
    { s: 'ます' },
  ],
})
const word = (i: number, surface: string, pos = 'Verb'): Word => ({
  id: `w${i}`, rank: i, lesson: 1, surface, reading: '', romaji: '', pos, meaningsDe: ['x'], kanji: [], sentenceIds: [`s${i}`],
})
const words = [word(1, '飲む'), word(2, '食べる'), word(3, '見る'), word(4, '行く'), word(5, '水', 'Nomen'), word(6, '書く')]
const targets = [{ s: '飲み', r: 'のみ' }, { s: '食べ', r: 'たべ' }, { s: '見', r: 'み' }, { s: '行き', r: 'いき' }, { s: '水', r: 'みず' }, { s: '書き', r: 'かき' }]
const sentences = new Map(targets.map((t, i) => [`s${i + 1}`, sentence(`s${i + 1}`, `w${i + 1}`, t)]))
const data: LearnData = { words, wordsById: new Map(words.map((w) => [w.id, w])), sentences }
const card = (kind: CardState['kind'], refId: string, due: number): CardState => ({
  id: `${kind}:${refId}`, kind, refId, due, stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 1,
  learning_steps: 0, reps: 1, lapses: 0, state: State.Review, introducedAt: 0,
})

describe('Quiz', () => {
  it('Lücke = Zielwort, so wie es im Satz steht', () => {
    expect(answerOf(sentences.get('s2')!)).toEqual({ surface: '食べ', kana: 'たべ' })
  })

  it('akzeptiert Romaji, Hiragana, Katakana und Kanji – mit Leer- und Satzzeichen', () => {
    const s = sentences.get('s2')!
    for (const ok of ['tabe', 'たべ', 'タベ', '食べ', ' Tabe。']) expect(checkTyped(ok, s), ok).toBe(true)
    for (const bad of ['', 'taberu', 'nomi', 'たべる']) expect(checkTyped(bad, s), bad).toBe(false)
  })

  it('4 verschiedene Antworten, genau eine richtig, Ablenker mit gleicher Wortart', () => {
    const choices = choicesFor(words[1], sentences.get('s2')!, data, new Set())
    expect(choices).toHaveLength(4)
    expect(new Set(choices).size).toBe(4)
    expect(choices).toContain('食べ')
    expect(choices).not.toContain('水')
  })

  it('Runde: nur gelernte Wörter, fällige Quiz-Karten zuerst', () => {
    const now = Date.now()
    const cards = [card('wort', 'w1', now + 1e9), card('wort', 'w3', now + 1e9), card('quiz', 'w3', now - 1)]
    expect(quizQueue(data, cards, 10, now).map((i) => i.word.id)).toEqual(['w3', 'w1'])
    expect(quizQueue(data, [], 10, now)).toEqual([])
  })

  it('Bewertung am Ende', () => {
    expect(verdict(10, 10).ja).toBe('完璧')
    expect(verdict(4, 10).de).toBe('Dranbleiben')
  })
})
