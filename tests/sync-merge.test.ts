/** Abgleich auf dem Gerät: Zusammenführen ohne Datenverlust und der Ablauf gegen einen nachgebauten Server. */
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { CardState } from '../src/lib/db'
import { KotobaDB } from '../src/lib/db'
import type { Profile } from '../src/lib/progress'
import {
  compactCard, expandCard, mergeCards, mergeMissions, mergeProfile, syncNow, toSnapshot, type Fetcher, type Snapshot,
} from '../src/lib/sync'

const card = (id: string, lastReview: number, reps = 1): CardState => ({
  id, kind: id.split(':')[0] as CardState['kind'], refId: id.split(':')[1], due: lastReview + 1000, stability: 1.234567, difficulty: 5,
  elapsed_days: 0, scheduled_days: 1, learning_steps: 0, reps, lapses: 0, state: 2, last_review: lastReview, introducedAt: 1,
})
const profile = (p: Partial<Profile>): Profile => ({ id: 'me', xp: 0, streak: 0, bestStreak: 0, achievements: [], activeDays: {}, ...p })

describe('Zusammenführen', () => {
  it('Karten: die zuletzt bewertete gewinnt, nichts fällt weg', () => {
    const merged = mergeCards([card('wort:a', 10), card('wort:b', 50)], [card('wort:a', 20), card('quiz:c', 5)])
    expect(merged.map((c) => [c.id, c.last_review]).sort()).toEqual([['quiz:c', 5], ['wort:a', 20], ['wort:b', 50]])
  })

  it('Profil: Maxima, Erfolge vereinigt, Serie vom zuletzt aktiven Gerät', () => {
    const a = profile({ xp: 300, streak: 5, bestStreak: 9, lastActiveDay: '2026-11-16', achievements: ['w10'], activeDays: { '2026-11-16': 4 } })
    const b = profile({ xp: 200, streak: 1, bestStreak: 3, lastActiveDay: '2026-11-17', achievements: ['s3'], activeDays: { '2026-11-16': 7, '2026-11-17': 2 } })
    expect(mergeProfile(a, b)).toEqual({
      id: 'me', xp: 300, streak: 1, lastActiveDay: '2026-11-17', bestStreak: 9,
      achievements: ['w10', 's3'], activeDays: { '2026-11-16': 7, '2026-11-17': 2 },
    })
    expect(mergeProfile(a, null)).toBe(a)
  })

  it('Missionen: vereinigt, frühester Abschluss bleibt', () => {
    expect(mergeMissions([{ missionId: 'x', completedAt: 5 }], [{ missionId: 'x', completedAt: 3 }, { missionId: 'y', completedAt: 9 }]))
      .toEqual([{ missionId: 'x', completedAt: 3 }, { missionId: 'y', completedAt: 9 }])
  })

  it('kompaktes Format geht hin und zurück; unbekannte Arten werden verworfen', () => {
    const c = card('zeichen:あ', 10)
    expect(expandCard(compactCard(c))).toEqual({ ...c, stability: 1.2346 })
    expect(expandCard(['kaputt', 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0])).toBeUndefined()
  })
})

/** Nachgebauter Server mit Versionsnummer – wie worker/routes/sync.ts. */
function fakeServer() {
  const server: { snapshot?: Snapshot; version: number; raceOnce?: () => void } = { version: 0 }
  const fetcher: Fetcher = async (method, body) => {
    if (method === 'GET') return server.snapshot ? { status: 200, data: { version: server.version, data: server.snapshot } } : { status: 204 }
    server.raceOnce?.(); server.raceOnce = undefined
    const { data, baseVersion } = body as { data: Snapshot; baseVersion: number | null }
    if ((baseVersion ?? 0) !== server.version) return { status: 409 }
    server.snapshot = data; server.version++
    return { status: 200, data: { version: server.version } }
  }
  return { server, fetcher }
}

describe('Ablauf zwischen zwei Geräten', () => {
  it('Handy und PC lernen getrennt – danach haben beide alles', async () => {
    const { server, fetcher } = fakeServer()
    const phone = new KotobaDB(`phone-${Math.random()}`)
    const pc = new KotobaDB(`pc-${Math.random()}`)
    await phone.cards.bulkPut([card('wort:a', 10), card('wort:b', 10)])
    await pc.cards.bulkPut([card('wort:b', 30), card('wort:c', 30)])
    await syncNow('usr_1', { d: phone, fetcher })
    await syncNow('usr_1', { d: pc, fetcher })
    await syncNow('usr_1', { d: phone, fetcher })
    for (const d of [phone, pc]) {
      const cards = await d.cards.toArray()
      expect(cards.map((c) => c.id).sort()).toEqual(['wort:a', 'wort:b', 'wort:c'])
      expect(cards.find((c) => c.id === 'wort:b')!.last_review).toBe(30)
    }
    expect(server.version).toBe(3)
  })

  it('speichert ein anderes Gerät gleichzeitig, wird neu zusammengeführt statt überschrieben', async () => {
    const { server, fetcher } = fakeServer()
    const phone = new KotobaDB(`phone-${Math.random()}`)
    await phone.cards.put(card('wort:a', 10))
    server.raceOnce = () => {
      server.snapshot = toSnapshot({ cards: [card('wort:z', 99)], missions: [], profile: null })
      server.version++
    }
    await syncNow('usr_1', { d: phone, fetcher })
    expect((await phone.cards.toArray()).map((c) => c.id).sort()).toEqual(['wort:a', 'wort:z'])
    expect(server.snapshot!.cards.map((c) => c[0]).sort()).toEqual(['wort:a', 'wort:z'])
  })
})
