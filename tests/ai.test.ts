/** KI-Endpunkt: nur für Pro, mit Tageskontingent pro Nutzer und globalem Monatsbudget. */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { AiProvider } from '../worker/ai/provider'
import { MockProvider } from '../worker/ai/mock'
import { MAX_MESSAGE_LENGTH } from '../worker/routes/ai'
import { buildSubscriptionEvent, newSimulatedSubscription } from '../worker/payments/simulator'
import { DAY, disposeDatabase, json, TestApp, type TestOptions } from './helpers'

let t: TestApp
afterAll(disposeDatabase)

async function setup(options: TestOptions = {}) {
  t = await TestApp.create(options)
}

async function proUser(email: string) {
  const account = await t.login(email)
  const sub = newSimulatedSubscription(account.userId, 'monthly', t.now)
  await t.deliver(buildSubscriptionEvent('customer.subscription.created', sub, t.now))
  return account
}

const chat = (cookie: string | undefined, message = 'こんにちは', extra: Record<string, unknown> = {}) =>
  t.post('/api/ai/chat', { characterId: 'haru', message, history: [], ...extra }, cookie)

const spent = async () =>
  (await t.db.prepare('SELECT spent_micro FROM ai_budget').first<{ spent_micro: number }>())?.spent_micro ?? 0

describe('Zugang', () => {
  beforeEach(() => setup())

  it('Gäste bekommen 401, Gratis-Nutzer 402 – und es entstehen keine Kosten', async () => {
    expect((await chat(undefined)).status).toBe(401)
    const free = await t.login('gratis@example.com')
    expect((await chat(free.cookie)).status).toBe(402)
    expect(await spent()).toBe(0)
  })

  it('Pro-Nutzer bekommen eine Antwort mit Übersetzung und Kontingent-Stand', async () => {
    const { cookie } = await proUser('pro@example.com')
    const body = await json(await chat(cookie))
    expect(body.reply).toMatchObject({ ja: expect.any(String), kana: expect.any(String), romaji: expect.any(String), de: expect.any(String) })
    expect(body.quota).toEqual({ usedToday: 1, dailyLimit: 40 })
    expect(body.mock).toBe(true)
  })

  it('„Ich weiß nicht weiter“ liefert Hilfe auf Deutsch', async () => {
    const { cookie } = await proUser('pro@example.com')
    expect((await json(await chat(cookie, 'えっと', { help: true }))).help).toEqual(expect.any(String))
    expect((await json(await chat(cookie, 'えっと'))).help).toBeUndefined()
  })

  it('endet Pro, endet auch der Zugang zur KI', async () => {
    const { cookie, userId } = await proUser('pro@example.com')
    const row = await t.db.prepare('SELECT stripe_subscription_id AS id, stripe_customer_id AS customerId FROM subscriptions WHERE user_id = ?').bind(userId).first<{ id: string; customerId: string }>()
    const ended = { ...newSimulatedSubscription(userId, 'monthly', t.now, row!.customerId), id: row!.id, status: 'canceled' as const }
    t.advance(60)
    await t.deliver(buildSubscriptionEvent('customer.subscription.deleted', ended, t.now))
    expect((await chat(cookie)).status).toBe(402)
  })
})

describe('Eingaben', () => {
  beforeEach(() => setup())

  it('zu lange oder leere Nachrichten und unbekannte Figuren werden abgelehnt – ohne Kontingent zu verbrauchen', async () => {
    const { cookie } = await proUser('pro@example.com')
    expect((await chat(cookie, 'あ'.repeat(MAX_MESSAGE_LENGTH + 1))).status).toBe(400)
    expect((await chat(cookie, '   ')).status).toBe(400)
    expect((await t.post('/api/ai/chat', { characterId: 'gibt-es-nicht', message: 'はい' }, cookie)).status).toBe(404)
    expect((await chat(cookie, 'はい', { history: 'kaputt' })).status).toBe(400)
    expect((await json(await chat(cookie))).quota.usedToday).toBe(1)
  })
})

describe('Tageskontingent pro Nutzer', () => {
  beforeEach(() => setup({ env: { AI_DAILY_LIMIT: '3' } }))

  it('nach dem Limit ist für heute Schluss (429), morgen geht es weiter', async () => {
    const { cookie } = await proUser('pro@example.com')
    for (let i = 1; i <= 3; i++) expect((await json(await chat(cookie))).quota.usedToday).toBe(i)
    const blocked = await chat(cookie)
    expect(blocked.status).toBe(429)
    expect((await json(blocked)).error.code).toBe('tageslimit')

    t.advance(DAY)
    expect((await chat(cookie)).status).toBe(200)
  })

  it('das Kontingent gilt pro Nutzer, nicht für alle zusammen', async () => {
    const a = await proUser('a@example.com')
    const b = await proUser('b@example.com')
    for (let i = 0; i < 3; i++) await chat(a.cookie)
    expect((await chat(a.cookie)).status).toBe(429)
    expect((await chat(b.cookie)).status).toBe(200)
  })

  it('abgelehnte Anfragen belasten das Monatsbudget nicht', async () => {
    const { cookie } = await proUser('pro@example.com')
    for (let i = 0; i < 3; i++) await chat(cookie)
    const before = await spent()
    await chat(cookie)
    expect(await spent()).toBe(before)
  })

  it('gleichzeitige Anfragen können das Limit nicht überschreiten', async () => {
    const { cookie } = await proUser('pro@example.com')
    const statuses = (await Promise.all(Array.from({ length: 8 }, () => chat(cookie)))).map((r) => r.status)
    expect(statuses.filter((s) => s === 200)).toHaveLength(3)
    expect(statuses.filter((s) => s === 429)).toHaveLength(5)
  })
})

describe('globales Monatsbudget', () => {
  // Budget 1 Cent = 10.000 Millionstel Euro. Die Platzhalter-KI reserviert 2.000 je Aufruf und verbraucht 500.
  beforeEach(() => setup({ env: { AI_MONTHLY_BUDGET_CENTS: '1', AI_DAILY_LIMIT: '1000' } }))

  it('gebucht werden die tatsächlichen Kosten, nicht die Reservierung', async () => {
    const { cookie } = await proUser('pro@example.com')
    await chat(cookie)
    expect(await spent()).toBe(500)
  })

  it('ist das Budget aufgebraucht, macht die KI für alle Pause (503) – im nächsten Monat geht es weiter', async () => {
    const a = await proUser('a@example.com')
    const b = await proUser('b@example.com')
    // 17 Aufrufe à 500 = 8.500 → der nächste bräuchte 2.000 Reserve und passt nicht mehr unter 10.000.
    for (let i = 0; i < 17; i++) expect((await chat(i % 2 ? a.cookie : b.cookie)).status).toBe(200)
    for (const cookie of [a.cookie, b.cookie]) {
      const blocked = await chat(cookie)
      expect(blocked.status).toBe(503)
      expect((await json(blocked)).error.code).toBe('budget_erschoepft')
    }
    expect(await spent()).toBeLessThanOrEqual(10_000)

    t.advance(31 * DAY)
    const again = await t.login('a@example.com')
    // Abo wurde nicht verlängert → erst wieder Pro geben, dann prüfen, dass das neue Monatsbudget gilt.
    const sub = newSimulatedSubscription(again.userId, 'monthly', t.now)
    await t.deliver(buildSubscriptionEvent('customer.subscription.created', sub, t.now))
    expect((await chat(again.cookie)).status).toBe(200)
  })

  it('ohne oder mit kaputter Budget-Einstellung ist die KI aus (lieber keine KI als unbegrenzte Kosten)', async () => {
    await setup({ env: { AI_MONTHLY_BUDGET_CENTS: 'abc' } })
    const { cookie } = await proUser('pro@example.com')
    expect((await chat(cookie)).status).toBe(503)
  })
})

describe('Fehler der KI und Korrekturen', () => {
  it('schlägt die KI fehl, kostet das weder Kontingent noch Budget', async () => {
    const failing: AiProvider = { isMock: true, maxCostMicroPerCall: 2_000, chat: async () => { throw new Error('KI nicht erreichbar') } }
    await setup({ deps: { ai: () => failing } })
    const { cookie, userId } = await proUser('pro@example.com')
    expect((await chat(cookie)).status).toBe(500)
    expect(await spent()).toBe(0)
    const usage = await t.db.prepare('SELECT count FROM ai_usage WHERE user_id = ?').bind(userId).first<{ count: number }>()
    expect(usage!.count).toBe(0)
  })

  it('meldet die KI mehr Kosten als reserviert, wird höchstens die Reservierung gebucht', async () => {
    const greedy: AiProvider = { ...new MockProvider(), isMock: true, maxCostMicroPerCall: 2_000, chat: async (input) => ({ ...(await new MockProvider().chat(input)), costMicro: 999_999 }) }
    await setup({ deps: { ai: () => greedy } })
    const { cookie } = await proUser('pro@example.com')
    await chat(cookie)
    expect(await spent()).toBe(2_000)
  })

  it('eine Korrektur landet automatisch als Fehler-Karteikarte beim Nutzer', async () => {
    await setup()
    const { cookie } = await proUser('pro@example.com')
    const other = await proUser('andere@example.com')
    const body = await json(await chat(cookie, 'コーヒーを好きです'))
    expect(body.correction.better.ja).toBe('コーヒーが好きです。')
    expect(body.correction.explanation).toContain('が')

    const cards = (await json(await t.get('/api/mistakes', cookie))).cards
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ ja: 'コーヒーが好きです。', de: 'Ich mag Kaffee.' })
    // Karten sind privat.
    expect((await json(await t.get('/api/mistakes', other.cookie))).cards).toHaveLength(0)
    expect((await t.get('/api/mistakes')).status).toBe(401)
  })
})
