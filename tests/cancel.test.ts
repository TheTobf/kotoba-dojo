/** Kündigungsbutton (§ 312k BGB): funktioniert ohne Anmeldung und bestätigt den Eingang mit Datum und Uhrzeit. */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { buildSubscriptionEvent, newSimulatedSubscription } from '../worker/payments/simulator'
import { disposeDatabase, json, TestApp } from './helpers'

let t: TestApp
beforeEach(async () => {
  t = await TestApp.create()
})
afterAll(disposeDatabase)

async function subscriber(email = 'mika@example.com') {
  const account = await t.login(email)
  const sub = newSimulatedSubscription(account.userId, 'monthly', t.now)
  await t.deliver(buildSubscriptionEvent('customer.subscription.created', sub, t.now))
  return { ...account, sub }
}

const lastCancellation = () =>
  t.db.prepare('SELECT * FROM cancellations ORDER BY created_at DESC LIMIT 1').first<{ status: string; kind: string; email: string; user_id: string | null }>()

describe('Kündigungsbutton', () => {
  it('ordentliche Kündigung ohne Anmeldung: wird an Stripe weitergegeben und mit Zeitpunkt bestätigt', async () => {
    const { sub } = await subscriber()
    t.mails.length = 0
    const response = await t.post('/api/cancel', { email: 'Mika@example.com', kind: 'ordentlich' }) // kein Cookie
    expect(response.status).toBe(200)
    const body = await json(response)
    expect(body).toMatchObject({ receivedAt: t.now, kind: 'ordentlich' })
    expect(body.reference).toMatch(/^K-[0-9A-F]{8}$/)

    expect(t.gateway.cancelled).toEqual([sub.id])
    expect(await lastCancellation()).toMatchObject({ status: 'umgesetzt', kind: 'ordentlich', email: 'mika@example.com' })
    // Bestätigung in Textform an die angegebene Adresse.
    expect(t.mails).toHaveLength(1)
    expect(t.mails[0]).toMatchObject({ to: 'mika@example.com' })
    expect(t.mails[0].text).toContain(body.reference)
  })

  it('die Kündigung selbst ändert den Abo-Stand nicht – das macht erst die Meldung von Stripe', async () => {
    const { cookie, sub } = await subscriber()
    await t.post('/api/cancel', { email: 'mika@example.com', kind: 'ordentlich' })
    expect((await json(await t.get('/api/me', cookie))).access.reason).toBe('aktiv')
    await t.deliver(buildSubscriptionEvent('customer.subscription.updated', { ...sub, cancelAtPeriodEnd: true }, t.now))
    expect((await json(await t.get('/api/me', cookie))).access).toMatchObject({ pro: true, reason: 'gekuendigt_laeuft' })
  })

  it('unbekannte Adresse: gleiche Bestätigung (verrät nicht, ob es ein Konto gibt), aber nichts wird gekündigt', async () => {
    const known = await subscriber()
    void known
    const response = await t.post('/api/cancel', { email: 'niemand@example.com', kind: 'ordentlich' })
    expect(response.status).toBe(200)
    expect(Object.keys(await json(response)).sort()).toEqual(['kind', 'receivedAt', 'reference'])
    expect(t.gateway.cancelled).toEqual([])
    expect(await lastCancellation()).toMatchObject({ status: 'kein_vertrag', user_id: null })
  })

  it('außerordentliche Kündigung braucht einen Grund und bleibt zur Bearbeitung offen', async () => {
    await subscriber()
    expect((await t.post('/api/cancel', { email: 'mika@example.com', kind: 'ausserordentlich' })).status).toBe(400)
    const response = await t.post('/api/cancel', { email: 'mika@example.com', kind: 'ausserordentlich', reason: 'Dauerhafte Störung' })
    expect(response.status).toBe(200)
    expect(t.gateway.cancelled).toEqual([])
    expect(await lastCancellation()).toMatchObject({ status: 'offen', kind: 'ausserordentlich' })
  })

  it('ist Stripe nicht erreichbar, gilt die Kündigung trotzdem als eingegangen und bleibt offen', async () => {
    await subscriber()
    t.gateway.failCancel = true
    const response = await t.post('/api/cancel', { email: 'mika@example.com', kind: 'ordentlich' })
    expect(response.status).toBe(200)
    expect(await lastCancellation()).toMatchObject({ status: 'offen' })
  })

  it('ungültige Eingaben werden abgelehnt', async () => {
    expect((await t.post('/api/cancel', { email: 'keine-adresse', kind: 'ordentlich' })).status).toBe(400)
    expect((await t.post('/api/cancel', { email: 'mika@example.com', kind: 'sofort' })).status).toBe(400)
    expect((await t.post('/api/cancel', { email: 'mika@example.com', kind: 'ausserordentlich', reason: 'x'.repeat(1001) })).status).toBe(400)
  })
})
