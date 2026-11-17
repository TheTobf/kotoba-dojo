/** Motivation: Level, Lernserie (Tagesgrenze 4 Uhr), Tagesziel und Erfolge. */
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { EPISODES } from '../src/content/story'
import { KotobaDB } from '../src/lib/db'
import { completeMission, currentStreak, getProfile, levelInfo, rankFor, recordActivity, xpForLevel } from '../src/lib/progress'
import { itemsForEpisode, rate, Rating, xpForGrade } from '../src/lib/srs'

const at = (day: number, hour = 12) => new Date(2026, 10, day, hour, 0, 0).getTime()
const kana = { hiragana: ['あ', 'い'], katakana: ['ア', 'イ'] }
let d: KotobaDB
beforeEach(() => {
  d = new KotobaDB(`progress-${Math.random()}`)
})
const act = (xp: number, now: number, dailyGoal = 20) => recordActivity(xp, { d, now, dailyGoal, kana })

describe('Level', () => {
  it('jedes Level kostet 20 Punkte mehr als das vorige', () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 100, 220, 360])
    expect(levelInfo(0)).toMatchObject({ level: 1, into: 0, need: 100 })
    expect(levelInfo(230)).toMatchObject({ level: 3, into: 10, need: 140 })
    expect(rankFor(1).ja).toBe('見習い')
    expect(rankFor(12).ja).toBe('先輩')
  })

  it('meldet ein neues Level und einen neuen Rang', async () => {
    const { events } = await act(450, at(16))
    expect(events).toContainEqual({ type: 'level', level: 4, rank: undefined })
    const { events: more } = await act(100, at(16)) // 550 Punkte = Level 5
    expect(more).toContainEqual({ type: 'level', level: 5, rank: '学生 · Schüler' })
  })
})

describe('Lernserie', () => {
  it('wächst an aufeinanderfolgenden Tagen und reißt nach einem verpassten Tag', async () => {
    await act(5, at(16))
    expect((await getProfile(d)).streak).toBe(1)
    const { events } = await act(5, at(17))
    expect(events).toContainEqual({ type: 'streak', days: 2 })
    await act(5, at(17, 20)) // gleicher Tag zählt nicht doppelt
    expect((await getProfile(d)).streak).toBe(2)
    await act(5, at(19)) // 18. verpasst
    const p = await getProfile(d)
    expect(p.streak).toBe(1)
    expect(p.bestStreak).toBe(2)
  })

  it('der Lerntag beginnt um 4 Uhr: 2 Uhr nachts zählt zum Vortag', async () => {
    await act(5, at(16, 22))
    await act(5, at(17, 2))
    expect((await getProfile(d)).streak).toBe(1)
    await act(5, at(17, 9))
    expect((await getProfile(d)).streak).toBe(2)
  })

  it('angezeigt wird 0, wenn gestern und heute nicht gelernt wurde', async () => {
    await act(5, at(16))
    const p = await getProfile(d)
    expect(currentStreak(p, at(17))).toBe(1)
    expect(currentStreak(p, at(18))).toBe(0)
  })
})

describe('Tagesziel und Erfolge', () => {
  it('Tagesziel wird genau einmal pro Tag gemeldet', async () => {
    const goals: number[] = []
    for (let i = 0; i < 5; i++) {
      const { events } = await act(1, at(16), 3)
      if (events.some((e) => e.type === 'goal')) goals.push(i)
    }
    expect(goals).toEqual([2])
  })

  it('Bewerten von Karten zählt: Punkte, Tagesziel und Erfolg „Erste Schritte“ nach 10 Wörtern', async () => {
    for (let i = 0; i < 10; i++) {
      await rate({ cardId: `wort:w${i}`, kind: 'wort', refId: `w${i}` }, undefined, Rating.Good, d, at(16), { kana, dailyGoal: 20 })
    }
    const p = await getProfile(d)
    expect(p.xp).toBe(10 * xpForGrade('wort', Rating.Good))
    expect(p.activeDays['2026-11-16']).toBe(10)
    expect(p.achievements).toContain('w10')
  })

  it('Story-Sätze zählen nicht als Wörter', async () => {
    for (const item of itemsForEpisode(EPISODES[0])) await rate(item, undefined, Rating.Good, d, at(16), { kana })
    expect((await getProfile(d)).achievements).not.toContain('w10')
  })

  it('beide Probe-Missionen geschafft → Erfolg „Erste Worte“', async () => {
    await completeMission('probe-cafe', 20, d, at(16))
    const { events } = await completeMission('probe-weg', 20, d, at(16))
    expect(events.map((e) => e.type === 'achievement' && e.name)).toContain('Erste Worte')
  })
})
