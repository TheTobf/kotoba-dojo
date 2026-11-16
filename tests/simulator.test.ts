/**
 * Stripe-Simulator: gibt es nur in der lokalen Entwicklung – und auch dort läuft alles über signierte Meldungen.
 * Dieser Test klickt den ganzen Ablauf durch: Kauf → Pro → Kündigung → Pro endet.
 */
import { afterAll, describe, expect, it } from 'vitest'
import { disposeDatabase, json, ORIGIN, TestApp } from './helpers'

afterAll(disposeDatabase)

const consent = { consentImmediateStart: true, consentWithdrawalExpires: true }

describe('Stripe-Simulator', () => {
  it('ist in Produktion nicht erreichbar', async () => {
    const t = await TestApp.create({ gateway: 'default' })
    const { cookie } = await t.login('mika@example.com')
    expect((await t.get('/api/dev/stripe/portal', cookie)).status).toBe(404)
    expect((await t.get('/api/dev/stripe/checkout?plan=monthly', cookie)).status).toBe(404)
    expect((await t.request('POST', '/api/dev/stripe/checkout', { cookie, form: { plan: 'monthly' } })).status).toBe(404)
    // Ohne Stripe-Schlüssel ist die Bezahlung in Produktion schlicht „nicht eingerichtet“.
    expect((await t.post('/api/billing/checkout', { plan: 'monthly', ...consent }, cookie)).status).toBe(503)
    expect(await t.isPro(cookie)).toBe(false)
  })

  it('ist auch lokal aus, sobald ein Stripe-Schlüssel hinterlegt ist', async () => {
    const t = await TestApp.create({ gateway: 'default', env: { ENVIRONMENT: 'development', STRIPE_SECRET_KEY: 'sk_test_123' } })
    const { cookie } = await t.login('mika@example.com')
    expect((await t.get('/api/dev/stripe/portal', cookie)).status).toBe(404)
  })

  it('Live-Schlüssel werden abgelehnt, solange echte Zahlungen nicht ausdrücklich erlaubt sind', async () => {
    const t = await TestApp.create({ gateway: 'default', env: { STRIPE_SECRET_KEY: 'sk_live_123' } })
    const { cookie } = await t.login('mika@example.com')
    const response = await t.post('/api/billing/checkout', { plan: 'monthly', ...consent }, cookie)
    expect(response.status).toBe(503)
    expect((await json(response)).error.message).toContain('Testmodus')
  })

  it('kompletter Ablauf lokal: Kauf → Pro → Kündigung → Pro läuft noch → Abo beendet → kein Pro', async () => {
    const t = await TestApp.create({ gateway: 'default', env: { ENVIRONMENT: 'development' } })
    const { cookie, userId } = await t.login('mika@example.com')

    // 1. Kauf starten → führt auf die lokale Bezahlseite
    const { url } = await json<{ url: string }>(await t.post('/api/billing/checkout', { plan: 'monthly', ...consent }, cookie))
    expect(url).toContain(`${ORIGIN}/api/dev/stripe/checkout?`)
    const checkoutPage = await t.get(url.replace(ORIGIN, ''), cookie)
    expect(checkoutPage.status).toBe(200)
    expect(await checkoutPage.text()).toContain('Stripe-Simulator')
    expect(await t.isPro(cookie)).toBe(false)

    // 2. „Testzahlung erfolgreich“ → signierte Meldung → Pro
    const paid = await t.request('POST', '/api/dev/stripe/checkout', { cookie, form: { plan: 'monthly', success: `${ORIGIN}/app/profil?kauf=erfolgreich` } })
    expect(paid.status).toBe(303)
    expect(paid.headers.get('location')).toBe(`${ORIGIN}/app/profil?kauf=erfolgreich`)
    expect(await t.isPro(cookie)).toBe(true)
    expect((await t.get('/api/story/missions/ryokan-checkin', cookie)).status).toBe(200)

    // 3. Kündigung über den Kündigungsbutton (ohne Anmeldung)
    t.advance(60)
    await t.post('/api/cancel', { email: 'mika@example.com', kind: 'ordentlich' })
    const me = await json(await t.get('/api/me', cookie))
    expect(me.access).toMatchObject({ pro: true, reason: 'gekuendigt_laeuft' })

    // 4. Zeit vorspulen im Portal: Abo ist beendet → Pro endet
    t.advance(60)
    const portal = await t.get('/api/dev/stripe/portal', cookie)
    expect(await portal.text()).toContain('gekündigt')
    const ended = await t.request('POST', '/api/dev/stripe/portal', { cookie, form: { action: 'beenden' } })
    expect(ended.status).toBe(303)
    expect((await json(await t.get('/api/me', cookie))).access).toEqual({ pro: false, reason: 'abgelaufen', until: null })
    expect((await t.get('/api/story/missions/ryokan-checkin', cookie)).status).toBe(402)

    // Jede Änderung lief über eine gespeicherte, signaturgeprüfte Meldung.
    const events = await t.db.prepare('SELECT COUNT(*) AS n FROM stripe_events').first<{ n: number }>()
    expect(events!.n).toBe(3)
    void userId
  })

  it('Rücksprungziele außerhalb der eigenen App werden ignoriert', async () => {
    const t = await TestApp.create({ gateway: 'default', env: { ENVIRONMENT: 'development' } })
    const { cookie } = await t.login('mika@example.com')
    const paid = await t.request('POST', '/api/dev/stripe/checkout', { cookie, form: { plan: 'yearly', success: 'https://boese.example/klau' } })
    expect(paid.headers.get('location')).toBe(`${ORIGIN}/app/profil`)
  })

  it('niemand kann für ein fremdes Konto „bezahlen“', async () => {
    const t = await TestApp.create({ gateway: 'default', env: { ENVIRONMENT: 'development' } })
    const mika = await t.login('mika@example.com')
    const other = await t.login('andere@example.com')
    expect((await t.get(`/api/dev/stripe/checkout?plan=monthly&user=${mika.userId}`, other.cookie)).status).toBe(400)
    expect((await t.request('POST', '/api/dev/stripe/checkout', { form: { plan: 'monthly' } })).status).toBe(401)
    expect(await t.isPro(mika.cookie)).toBe(false)
  })
})
