import { describe, expect, it } from 'vitest'
import { KotobaDB } from './db'
import { buildQueue, countNewToday, markKnown, previewIntervals, rate, Rating, State } from './srs'
import { learnedIds, newlyReached, situationStatus } from './progress'
import type { Word } from './types'

const DAY = 86_400_000
const w = (i: number, surface = `語${i}`): Word => ({
  id: `w${i}`, rank: i, lesson: Math.ceil(i / 6), surface, reading: 'ご', romaji: 'go', pos: 'Nomen',
  meaningsDe: ['Wort'], meaningSource: 'claude', kanji: [], sentenceIds: [],
})
const words = Array.from({ length: 20 }, (_, i) => w(i + 1))

describe('Karteikarten (FSRS)', () => {
  it('stellt fällige Wiederholungen vor neue Wörter und hält das Tageslimit ein', async () => {
    const d = new KotobaDB('srs-1')
    const now = Date.now()
    const c = await rate(words[4], undefined, Rating.Good, undefined, d, now - 10 * DAY)
    const q = buildQueue(words, [{ ...c, due: now - 1000 }], 6, 0, now)
    expect(q[0].word.id).toBe('w5')
    expect(q.length).toBe(7)
    expect(q.slice(1).map((x) => x.word.rank)).toEqual([1, 2, 3, 4, 6, 7])
    expect(buildQueue(words, [], 6, 4, now).length).toBe(2)
  })

  it('„Kenn ich schon“ plant die Karte genau 7 Tage später ein', async () => {
    const d = new KotobaDB('srs-2')
    const now = Date.now()
    const c = await markKnown(words[0], d, now)
    expect(c.due).toBe(now + 7 * DAY)
    expect(c.state).toBe(State.Review)
    expect(c.knownSkip).toBe(true)
    expect(await countNewToday(d, now)).toBe(1)
  })

  it('„Nochmal“ bei neuer Karte bleibt kurz, „Einfach“ springt Tage weiter', () => {
    const [again, , , easy] = previewIntervals(undefined)
    expect(again).toMatch(/Min/)
    expect(easy).toMatch(/T/)
  })

  it('Bewertung speichert Log und aktiven Tag', async () => {
    const d = new KotobaDB('srs-3')
    await rate(words[0], undefined, Rating.Good, 1200, d)
    expect(await d.reviewLog.count()).toBe(1)
    const p = await d.profile.get('me')
    expect(Object.values(p!.activeDays)[0]).toBe(1)
  })
})

describe('Ziele', () => {
  it('eine Situation gilt als geschafft, wenn alle Schlüsselwörter gelernt sind', async () => {
    const gruss = ['はい', 'いいえ', 'すみません', 'ありがとう', 'こんにちは', 'おはよう', 'こんばんは', 'さようなら'].map((s, i) => w(100 + i, s))
    const all = [...words, ...gruss]
    const d = new KotobaDB('ziele-1')
    for (const x of gruss) await markKnown(x, d)
    const after = learnedIds(await d.cards.toArray())
    expect(situationStatus(all, after).find((x) => x.s.id === 'gruessen')?.ready).toBe(true)
    expect(newlyReached(all, new Set(), after).situationen.map((s) => s.id)).toContain('gruessen')
  })
})
