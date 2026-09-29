import { describe, expect, it } from 'vitest'
import { merge, mergeCards, mergeLog, mergeProfile } from './sync'
import { DEFAULT_PROFILE, type CardState } from './types'

const karte = (id: string, last: number, reps = 1) =>
  ({ id, kind: 'vokabel', refId: id, due: 0, stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 1,
    learning_steps: 0, reps, lapses: 0, state: 2, last_review: last }) as CardState

describe('Geräte-Abgleich', () => {
  it('Karten: die zuletzt wiederholte Fassung gewinnt, nichts geht verloren', () => {
    const r = mergeCards([karte('a', 100), karte('b', 300)], [karte('a', 200, 5), karte('c', 50)])
    expect(Object.fromEntries(r.map((c) => [c.id, c.last_review]))).toEqual({ a: 200, b: 300, c: 50 })
  })

  it('Wiederholungen: vereinigt ohne Doppelte, alte fallen raus', () => {
    const now = 100 * 86_400_000
    const e = (cardId: string, at: number, id?: number) => ({ id, cardId, kind: 'vokabel' as const, at, rating: 3 })
    const r = mergeLog([e('a', now - 1000, 1), e('a', 1, 2)], [e('a', now - 1000, 7), e('b', now - 500)], now)
    expect(r.map((x) => x.cardId)).toEqual(['a', 'b'])
    expect(r[0].id).toBeUndefined()
  })

  it('Profil: Maximum der Zähler, Streak vom neueren Gerät', () => {
    const a = { ...DEFAULT_PROFILE, xp: 500, streak: 3, lastActiveDay: '2026-10-02', activeDays: { x: 5 }, achievements: ['s3'], seasonXp: { herbst: 400 } }
    const b = { ...DEFAULT_PROFILE, xp: 300, streak: 9, bestStreak: 9, lastActiveDay: '2026-09-30', activeDays: { x: 2, y: 4 }, achievements: ['w10'], seasonXp: { herbst: 100, winter: 20 } }
    expect(mergeProfile(a, b)).toMatchObject({
      xp: 500, streak: 3, bestStreak: 9, activeDays: { x: 5, y: 4 },
      seasonXp: { herbst: 400, winter: 20 }, achievements: ['s3', 'w10'],
    })
    expect(mergeProfile(undefined, b)).toBe(b)
  })

  it('ohne entfernten Stand bleibt der lokale unverändert', () => {
    const r = merge({ app: 'kotoba-dojo', version: 1, cards: [karte('a', 1)], reviewLog: [], profile: DEFAULT_PROFILE })
    expect(r.cards).toHaveLength(1)
    expect(r.profile).toEqual(DEFAULT_PROFILE)
  })
})
