/**
 * Paywall von außen geprüft: echte API, echte Datenbank, signierte Stripe-Meldungen.
 * Kernaussage: Pro entsteht und endet ausschließlich durch verifizierte Meldungen von Stripe (und durch Zeitablauf).
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  buildSubscriptionEvent, newSimulatedSubscription, periodLength, type SimulatedSubscription,
} from '../worker/payments/simulator'
import { PAST_DUE_GRACE_SECONDS, RENEWAL_BUFFER_SECONDS } from '../shared/entitlement'
import { DAY, disposeDatabase, json, TestApp, WEBHOOK_SECRET } from './helpers'

let t: TestApp
let cookie: string
let userId: string

/** Stellt die Uhr vor. Sitzungen laufen nach 30 Tagen ab – deshalb meldet sich der Nutzer danach neu an. */
async function advance(seconds: number) {
  t.advance(seconds)
  cookie = (await t.login('mika@example.com')).cookie
}

beforeEach(async () => {
  t = await TestApp.create()
  ;({ cookie, userId } = await t.login('mika@example.com'))
})
afterAll(disposeDatabase)

const PRO_ROUTE = '/api/story/missions/ryokan-checkin'
const consent = { consentImmediateStart: true, consentWithdrawalExpires: true }

/** Kauf: Stripe meldet ein neues, aktives Abo für das Konto. */
async function purchase(plan: 'monthly' | 'yearly' = 'monthly'): Promise<SimulatedSubscription> {
  const sub = newSimulatedSubscription(userId, plan, t.now)
  const response = await t.deliver(buildSubscriptionEvent('customer.subscription.created', sub, t.now))
  expect(await json(response)).toMatchObject({ received: true, result: 'uebernommen' })
  return sub
}

describe('ohne Pro', () => {
  it('Gäste werden abgewiesen (401), angemeldete Gratis-Nutzer bekommen „Pro nötig“ (402)', async () => {
    expect((await t.get(PRO_ROUTE)).status).toBe(401)
    const response = await t.get(PRO_ROUTE, cookie)
    expect(response.status).toBe(402)
    expect((await json(response)).error.code).toBe('pro_noetig')
    expect(await t.isPro(cookie)).toBe(false)
  })

  it('die Vorschau der Missionen ist offen, enthält aber keine Lösungen', async () => {
    const body = await json(await t.get('/api/story/missions'))
    expect(body.missions.length).toBeGreaterThan(0)
    expect(JSON.stringify(body)).not.toContain('accepted')
  })

  it('der Browser kann sich Pro nicht selbst geben', async () => {
    // Weder über erfundene Felder noch über andere Methoden auf /api/me.
    expect((await t.post('/api/me', { pro: true }, cookie)).status).toBe(404)
    expect((await t.request('PUT', '/api/billing/checkout', { body: { pro: true }, cookie })).status).toBe(404)
    expect(await t.isPro(cookie)).toBe(false)
  })
})

describe('Webhook-Signatur', () => {
  it('Meldung ohne Signatur wird abgelehnt und ändert nichts', async () => {
    const sub = newSimulatedSubscription(userId, 'monthly', t.now)
    const response = await t.deliver(buildSubscriptionEvent('customer.subscription.created', sub, t.now), { signature: null })
    expect(response.status).toBe(400)
    expect(await t.isPro(cookie)).toBe(false)
  })

  it('Meldung mit falschem Geheimnis wird abgelehnt', async () => {
    const sub = newSimulatedSubscription(userId, 'monthly', t.now)
    const response = await t.deliver(buildSubscriptionEvent('customer.subscription.created', sub, t.now), { secret: 'whsec_falsch' })
    expect(response.status).toBe(400)
    expect(await t.isPro(cookie)).toBe(false)
  })

  it('nachträglich veränderte Meldung wird abgelehnt', async () => {
    const sub = newSimulatedSubscription('usr_fremd', 'monthly', t.now)
    const event = buildSubscriptionEvent('customer.subscription.created', sub, t.now)
    const { signPayload } = await import('../worker/payments/simulator')
    const signature = await signPayload(JSON.stringify(event), WEBHOOK_SECRET, t.now)
    // Angreifer tauscht die Konto-ID aus, behält aber die echte Signatur.
    const tampered = JSON.parse(JSON.stringify(event).replace('usr_fremd', userId))
    expect((await t.deliver(tampered, { signature })).status).toBe(400)
    expect(await t.isPro(cookie)).toBe(false)
  })

  it('alte (abgefangene) Meldung wird abgelehnt', async () => {
    const sub = newSimulatedSubscription(userId, 'monthly', t.now)
    const response = await t.deliver(buildSubscriptionEvent('customer.subscription.created', sub, t.now), { signedAt: t.now - 3600 })
    expect(response.status).toBe(400)
    expect(await t.isPro(cookie)).toBe(false)
  })

  it('ohne eingerichtetes Webhook-Geheimnis wird nichts angenommen', async () => {
    t = await TestApp.create({ env: { STRIPE_WEBHOOK_SECRET: '' } })
    const account = await t.login('mika@example.com')
    const sub = newSimulatedSubscription(account.userId, 'monthly', t.now)
    expect((await t.deliver(buildSubscriptionEvent('customer.subscription.created', sub, t.now))).status).toBe(503)
    expect(await t.isPro(account.cookie)).toBe(false)
  })
})

describe('Kauf', () => {
  it('Checkout verlangt Anmeldung, gültigen Tarif und beide Zustimmungen', async () => {
    expect((await t.post('/api/billing/checkout', { plan: 'monthly', ...consent })).status).toBe(401)
    expect((await t.post('/api/billing/checkout', { plan: 'lifetime', ...consent }, cookie)).status).toBe(400)
    expect((await t.post('/api/billing/checkout', { plan: 'monthly', consentImmediateStart: true }, cookie)).status).toBe(400)
    expect((await t.post('/api/billing/checkout', { plan: 'monthly', ...consent, consentWithdrawalExpires: 'ja' }, cookie)).status).toBe(400)
    expect(t.gateway.checkouts).toHaveLength(0)
  })

  it('Checkout speichert die Zustimmung und führt zur Bezahlseite – gibt aber noch kein Pro', async () => {
    const response = await t.post('/api/billing/checkout', { plan: 'yearly', ...consent }, cookie)
    expect(await json(response)).toEqual({ url: 'https://stripe.test/checkout' })
    expect(t.gateway.checkouts[0]).toMatchObject({ plan: 'yearly', user: { id: userId, email: 'mika@example.com' } })
    const saved = await t.db.prepare('SELECT plan, text_version, created_at FROM checkout_consents WHERE user_id = ?').bind(userId).first()
    expect(saved).toMatchObject({ plan: 'yearly', created_at: t.now })
    // Der Aufruf der Bezahlseite allein schaltet nichts frei – erst die Meldung von Stripe.
    expect(await t.isPro(cookie)).toBe(false)
  })

  it('nach der verifizierten Kauf-Meldung ist Pro freigeschaltet', async () => {
    const sub = await purchase('monthly')
    const me = await json(await t.get('/api/me', cookie))
    expect(me).toMatchObject({ user: { email: 'mika@example.com' }, plan: 'monthly', access: { pro: true, reason: 'aktiv', until: sub.periodEnd } })
    const mission = await t.get(PRO_ROUTE, cookie)
    expect(mission.status).toBe(200)
    expect((await json(mission)).mission.steps[0].accepted.length).toBeGreaterThan(0)
  })

  it('Pro gilt nur für das Konto, das gekauft hat', async () => {
    await purchase()
    const other = await t.login('fremd@example.com')
    expect(await t.isPro(other.cookie)).toBe(false)
    expect((await t.get(PRO_ROUTE, other.cookie)).status).toBe(402)
  })

  it('doppelt zugestellte Meldung wird nur einmal verarbeitet', async () => {
    const sub = newSimulatedSubscription(userId, 'monthly', t.now)
    const event = buildSubscriptionEvent('customer.subscription.created', sub, t.now)
    expect((await json(await t.deliver(event))).result).toBe('uebernommen')
    expect((await json(await t.deliver(event))).result).toBe('doppelt')
    const count = await t.db.prepare('SELECT COUNT(*) AS n FROM subscriptions').first<{ n: number }>()
    expect(count!.n).toBe(1)
  })

  it('wer schon Pro hat, kann nicht noch einmal kaufen', async () => {
    await purchase()
    expect((await t.post('/api/billing/checkout', { plan: 'monthly', ...consent }, cookie)).status).toBe(409)
  })

  it('Meldung für ein unbekanntes Konto wird quittiert, schaltet aber nichts frei', async () => {
    const sub = newSimulatedSubscription('usr_gibt_es_nicht', 'monthly', t.now)
    const response = await t.deliver(buildSubscriptionEvent('customer.subscription.created', sub, t.now))
    expect(await json(response)).toMatchObject({ result: 'unbekanntes_konto' })
    expect(await t.isPro(cookie)).toBe(false)
  })

  it('andere Stripe-Meldungen werden quittiert und ignoriert', async () => {
    const event = { ...buildSubscriptionEvent('customer.subscription.created', newSimulatedSubscription(userId, 'monthly', t.now), t.now), type: 'invoice.paid' }
    expect((await json(await t.deliver(event as never))).result).toBe('ignoriert')
    expect(await t.isPro(cookie)).toBe(false)
  })
})

describe('Verlängerung', () => {
  it('Stripe meldet den neuen Zeitraum → Pro läuft nahtlos weiter', async () => {
    const sub = await purchase('monthly')
    await advance(periodLength('monthly'))
    const renewed = { ...sub, periodStart: sub.periodEnd, periodEnd: sub.periodEnd + periodLength('monthly') }
    await t.deliver(buildSubscriptionEvent('customer.subscription.updated', renewed, t.now))
    const me = await json(await t.get('/api/me', cookie))
    expect(me.access).toEqual({ pro: true, reason: 'aktiv', until: renewed.periodEnd })

    // Auch weit im zweiten Zeitraum noch Pro.
    await advance(20 * DAY)
    expect(await t.isPro(cookie)).toBe(true)
  })

  it('fehlgeschlagene Verlängerung: Pro bleibt während der Kulanzfrist, danach nicht mehr', async () => {
    const sub = await purchase()
    await advance(periodLength('monthly'))
    const failed = { ...sub, status: 'past_due' as const, periodStart: t.now, periodEnd: t.now + periodLength('monthly') }
    await t.deliver(buildSubscriptionEvent('customer.subscription.updated', failed, t.now))
    expect((await json(await t.get('/api/me', cookie))).access).toMatchObject({ pro: true, reason: 'zahlung_offen' })

    t.advance(PAST_DUE_GRACE_SECONDS)
    expect((await json(await t.get('/api/me', cookie))).access).toMatchObject({ pro: false, reason: 'zahlung_fehlt' })
    expect((await t.get(PRO_ROUTE, cookie)).status).toBe(402)

    // Zahlung klappt doch noch → wieder Pro.
    await t.deliver(buildSubscriptionEvent('customer.subscription.updated', { ...failed, status: 'active' }, t.now))
    expect(await t.isPro(cookie)).toBe(true)
  })
})

describe('Kündigung', () => {
  it('nach der Kündigung bleibt Pro bis zum Ende des bezahlten Zeitraums und endet dann', async () => {
    const sub = await purchase('monthly')
    t.advance(5 * DAY)
    await t.deliver(buildSubscriptionEvent('customer.subscription.updated', { ...sub, cancelAtPeriodEnd: true }, t.now))
    expect((await json(await t.get('/api/me', cookie))).access).toEqual({ pro: true, reason: 'gekuendigt_laeuft', until: sub.periodEnd })
    expect((await t.get(PRO_ROUTE, cookie)).status).toBe(200)

    // Zeitraum ist um: Stripe meldet das Ende des Abos.
    await advance(25 * DAY)
    await t.deliver(buildSubscriptionEvent('customer.subscription.deleted', { ...sub, status: 'canceled', cancelAtPeriodEnd: true }, t.now))
    expect((await json(await t.get('/api/me', cookie))).access).toEqual({ pro: false, reason: 'abgelaufen', until: null })
    expect((await t.get(PRO_ROUTE, cookie)).status).toBe(402)
  })

  it('Kündigung zurücknehmen: das Abo läuft normal weiter', async () => {
    const sub = await purchase()
    await t.deliver(buildSubscriptionEvent('customer.subscription.updated', { ...sub, cancelAtPeriodEnd: true }, t.now))
    t.advance(60)
    await t.deliver(buildSubscriptionEvent('customer.subscription.updated', { ...sub, cancelAtPeriodEnd: false }, t.now))
    expect((await json(await t.get('/api/me', cookie))).access.reason).toBe('aktiv')
  })

  it('sofort beendetes Abo (z. B. Rückerstattung) nimmt Pro sofort weg', async () => {
    const sub = await purchase('yearly')
    t.advance(DAY)
    await t.deliver(buildSubscriptionEvent('customer.subscription.deleted', { ...sub, status: 'canceled' }, t.now))
    expect(await t.isPro(cookie)).toBe(false)
  })

  it('nach dem Ende kann neu gekauft werden – das neue Abo gilt', async () => {
    const first = await purchase()
    t.advance(DAY)
    await t.deliver(buildSubscriptionEvent('customer.subscription.deleted', { ...first, status: 'canceled' }, t.now))
    t.advance(DAY)
    expect((await t.post('/api/billing/checkout', { plan: 'yearly', ...consent }, cookie)).status).toBe(200)
    expect(t.gateway.checkouts[0].customerId).toBe(first.customerId) // derselbe Stripe-Kunde wird wiederverwendet
    await purchase('yearly')
    expect((await json(await t.get('/api/me', cookie))).plan).toBe('yearly')
    expect(await t.isPro(cookie)).toBe(true)
  })
})

describe('abgelaufenes Abo', () => {
  it('kommt nie wieder eine Meldung von Stripe, endet Pro nach Zeitraum + Puffer von selbst', async () => {
    const sub = await purchase('monthly')
    await advance(periodLength('monthly') + RENEWAL_BUFFER_SECONDS - 60)
    expect(await t.isPro(cookie)).toBe(true)
    t.advance(60)
    expect((await json(await t.get('/api/me', cookie))).access).toEqual({ pro: false, reason: 'abgelaufen', until: null })
    expect((await t.get(PRO_ROUTE, cookie)).status).toBe(402)
    expect(sub.periodEnd).toBeLessThan(t.now)
  })
})

describe('Reihenfolge der Meldungen', () => {
  it('eine verspätete alte Meldung überschreibt den neueren Stand nicht', async () => {
    const sub = await purchase()
    const cancelledAt = t.now + 100
    const endedAt = t.now + 200
    t.advance(300)
    // Die „beendet“-Meldung kommt zuerst an, die ältere „gekündigt, läuft noch“-Meldung danach.
    await t.deliver(buildSubscriptionEvent('customer.subscription.deleted', { ...sub, status: 'canceled' }, endedAt))
    const late = await t.deliver(buildSubscriptionEvent('customer.subscription.updated', { ...sub, cancelAtPeriodEnd: true }, cancelledAt))
    expect((await json(late)).result).toBe('veraltet')
    expect(await t.isPro(cookie)).toBe(false)
  })

  it('Meldungen zu einem alten, toten Abo überschreiben das aktuelle Abo nicht', async () => {
    const old = await purchase()
    t.advance(DAY)
    await t.deliver(buildSubscriptionEvent('customer.subscription.deleted', { ...old, status: 'canceled' }, t.now))
    t.advance(DAY)
    await purchase('yearly')
    t.advance(60)
    const stray = await t.deliver(buildSubscriptionEvent('customer.subscription.updated', { ...old, status: 'canceled' }, t.now))
    expect((await json(stray)).result).toBe('anderes_abo')
    expect(await t.isPro(cookie)).toBe(true)
  })
})

describe('Kundenportal', () => {
  it('nur für angemeldete Nutzer mit Abo', async () => {
    expect((await t.post('/api/billing/portal')).status).toBe(401)
    expect((await t.post('/api/billing/portal', {}, cookie)).status).toBe(404)
    const sub = await purchase()
    expect(await json(await t.post('/api/billing/portal', {}, cookie))).toEqual({ url: 'https://stripe.test/portal' })
    expect(t.gateway.portals).toEqual([sub.customerId])
  })

  it('ohne eingerichtete Bezahlung gibt es eine klare Meldung statt eines Absturzes', async () => {
    t = await TestApp.create({ gateway: null })
    const account = await t.login('mika@example.com')
    const response = await t.post('/api/billing/checkout', { plan: 'monthly', ...consent }, account.cookie)
    expect(response.status).toBe(503)
    expect((await json(response)).error.code).toBe('zahlung_nicht_eingerichtet')
  })
})
