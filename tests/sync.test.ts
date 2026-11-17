/** Abgleich zwischen Geräten und Konto löschen (Server-Seite). */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { buildSubscriptionEvent, newSimulatedSubscription } from '../worker/payments/simulator'
import { MAX_SYNC_BYTES } from '../worker/routes/sync'
import { disposeDatabase, json, TestApp } from './helpers'

let t: TestApp
beforeEach(async () => {
  t = await TestApp.create()
})
afterAll(disposeDatabase)

const snapshot = (cards: unknown[] = []) => ({ app: 'kotoba-dojo', version: 1, cards, missions: [], profile: null })
const put = (cookie: string | undefined, data: unknown, baseVersion: number | null) =>
  t.request('PUT', '/api/sync', { cookie, body: { data, baseVersion } })

describe('Abgleich', () => {
  it('nur mit Konto – Gäste bekommen 401', async () => {
    expect((await t.get('/api/sync')).status).toBe(401)
    expect((await put(undefined, snapshot(), null)).status).toBe(401)
  })

  it('erstes Speichern, Abholen, weiteres Speichern mit Versionsnummer', async () => {
    const { cookie } = await t.login('lena@example.com')
    expect((await t.get('/api/sync', cookie)).status).toBe(204)
    const first = await json(await put(cookie, snapshot([['wort:w1', 1]]), null))
    expect(first.version).toBe(1)
    const loaded = await json(await t.get('/api/sync', cookie))
    expect(loaded).toMatchObject({ version: 1, data: { app: 'kotoba-dojo', cards: [['wort:w1', 1]] } })
    expect((await json(await put(cookie, snapshot([['wort:w2', 2]]), 1))).version).toBe(2)
  })

  it('veraltete Version wird abgelehnt (zwei Geräte gleichzeitig) – nichts wird überschrieben', async () => {
    const { cookie } = await t.login('lena@example.com')
    await put(cookie, snapshot([['a', 1]]), null)
    await put(cookie, snapshot([['b', 2]]), 1)
    expect((await put(cookie, snapshot([['c', 3]]), 1)).status).toBe(409)
    expect((await put(cookie, snapshot([['d', 4]]), null)).status).toBe(409)
    expect((await json(await t.get('/api/sync', cookie))).data.cards).toEqual([['b', 2]])
  })

  it('jeder sieht nur seinen eigenen Lernstand', async () => {
    const lena = await t.login('lena@example.com')
    const mika = await t.login('mika@example.com')
    await put(lena.cookie, snapshot([['lena', 1]]), null)
    expect((await t.get('/api/sync', mika.cookie)).status).toBe(204)
  })

  it('lehnt Fremdes und zu Großes ab und speichert komprimiert', async () => {
    const { cookie, userId } = await t.login('lena@example.com')
    expect((await put(cookie, { irgendwas: true }, null)).status).toBe(400)
    expect((await put(cookie, snapshot(), 1.5)).status).toBe(400)
    const huge = snapshot([['x'.repeat(MAX_SYNC_BYTES), 1]])
    expect((await put(cookie, huge, null)).status).toBe(400)

    const many = snapshot(Array.from({ length: 6000 }, (_, i) => [`wort:w${i}`, 1794911635000 + i, 3.2, 5.1, 0, 3, 0, 2, 0, 2, 1794911635000, 1794911635000]))
    expect((await put(cookie, many, null)).status).toBe(200)
    const row = await t.db.prepare('SELECT size, length(data) AS stored FROM progress_sync WHERE user_id = ?').bind(userId).first<{ size: number; stored: number }>()
    expect(row!.stored).toBeLessThan(row!.size / 2)
    expect((await json(await t.get('/api/sync', cookie))).data.cards).toHaveLength(6000)
  })
})

describe('Konto löschen', () => {
  it('löscht Konto, Sitzung und Lernstand', async () => {
    const { cookie, userId } = await t.login('lena@example.com')
    await put(cookie, snapshot([['a', 1]]), null)
    expect((await t.request('DELETE', '/api/account', { cookie })).status).toBe(200)
    expect((await json(await t.get('/api/me', cookie))).user).toBeNull()
    expect(await t.db.prepare('SELECT COUNT(*) AS n FROM progress_sync WHERE user_id = ?').bind(userId).first('n')).toBe(0)
    expect(await t.db.prepare('SELECT COUNT(*) AS n FROM users WHERE id = ?').bind(userId).first('n')).toBe(0)
  })

  it('geht nicht, solange ein Pro-Abo weiterläuft – nach der Kündigung schon', async () => {
    const { cookie, userId } = await t.login('lena@example.com')
    const sub = newSimulatedSubscription(userId, 'monthly', t.now)
    await t.deliver(buildSubscriptionEvent('customer.subscription.created', sub, t.now))
    expect((await t.request('DELETE', '/api/account', { cookie })).status).toBe(409)
    t.advance(60)
    await t.deliver(buildSubscriptionEvent('customer.subscription.updated', { ...sub, cancelAtPeriodEnd: true }, t.now))
    expect((await t.request('DELETE', '/api/account', { cookie })).status).toBe(200)
  })

  it('nur angemeldet und nur von der eigenen Seite (CSRF)', async () => {
    expect((await t.request('DELETE', '/api/account')).status).toBe(401)
    const { cookie } = await t.login('lena@example.com')
    expect((await t.request('DELETE', '/api/account', { cookie, headers: { origin: 'https://boese.example' } })).status).toBe(403)
  })
})
