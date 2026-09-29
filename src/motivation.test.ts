import { describe, expect, it } from 'vitest'
import { KotobaDB } from './db'
import { aktuellerStreak, belohnen, comboXp, dayKey, levelInfo, nextStreak, rangFuer, xpForLevel } from './motivation'
import { DEFAULT_PROFILE } from './types'

const DAY = 86_400_000
const mittag = new Date(2026, 9, 1, 12).getTime()

describe('Level & Ränge', () => {
  it('Level steigen mit wachsendem Abstand', () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(100)
    expect(xpForLevel(3)).toBe(220)
    expect(levelInfo(0).level).toBe(1)
    expect(levelInfo(99).level).toBe(1)
    expect(levelInfo(100).level).toBe(2)
    expect(levelInfo(160)).toMatchObject({ level: 2, into: 60, need: 120 })
  })
  it('Ränge im japanischen Stil', () => {
    expect(rangFuer(1).jp).toBe('見習い')
    expect(rangFuer(5).jp).toBe('学生')
    expect(rangFuer(40).jp).toBe('達人')
  })
  it('Combo-Bonus erst ab 3, gedeckelt', () => {
    expect(comboXp(2)).toBe(0)
    expect(comboXp(3)).toBe(6)
    expect(comboXp(50)).toBe(20)
  })
})

describe('Streak', () => {
  const p = (last?: string, streak = 0) => ({ ...DEFAULT_PROFILE, lastActiveDay: last, streak })
  it('zählt hoch an Folgetagen, bleibt am selben Tag, reißt nach Pause', () => {
    expect(nextStreak(p(dayKey(mittag - DAY), 4), mittag)).toMatchObject({ streak: 5, erhoeht: true })
    expect(nextStreak(p(dayKey(mittag), 5), mittag)).toMatchObject({ streak: 5, erhoeht: false })
    expect(nextStreak(p(dayKey(mittag - 3 * DAY), 9), mittag)).toMatchObject({ streak: 1, erhoeht: true })
  })
  it('Anzeige: gestern gelernt zählt noch, vorgestern nicht', () => {
    expect(aktuellerStreak(p(dayKey(mittag - DAY), 4), mittag)).toBe(4)
    expect(aktuellerStreak(p(dayKey(mittag - 2 * DAY), 4), mittag)).toBe(0)
  })
  it('Lerntag beginnt um 4 Uhr – 1 Uhr nachts zählt noch zum Vortag', () => {
    expect(dayKey(new Date(2026, 9, 2, 1).getTime())).toBe('2026-10-01')
  })
})

describe('Belohnen', () => {
  it('parallel zu einer Bewertung geht der Tageszähler nicht verloren', async () => {
    const { rate, Rating } = await import('./srs')
    const d = new KotobaDB('mot-2')
    const w = { id: 'w1' }
    await Promise.all([rate(w, undefined, Rating.Good, undefined, d), belohnen(10, { d })])
    await Promise.all([rate({ id: 'w2' }, undefined, Rating.Good, undefined, d), belohnen(10, { d })])
    const p = await d.profile.get('me')
    expect(Object.values(p!.activeDays)[0]).toBe(2)
    expect(p!.xp).toBe(20)
  })

  it('vergibt XP, meldet Level-Up und Streak', async () => {
    const d = new KotobaDB('mot-1')
    await d.profile.put({ ...DEFAULT_PROFILE, xp: 95, streak: 2, lastActiveDay: dayKey(mittag - DAY) })
    const { profile, events } = await belohnen(10, { d, now: mittag })
    expect(profile.xp).toBe(105)
    expect(profile.streak).toBe(3)
    expect(events.map((e) => e.typ)).toEqual(expect.arrayContaining(['xp', 'level', 'streak']))
    expect(profile.achievements).toContain('s3')
  })
})
