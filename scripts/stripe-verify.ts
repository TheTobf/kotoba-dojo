/**
 * Prüft die Paywall gegen ECHTES Stripe im TESTMODUS – ohne Browser und ohne `stripe listen`.
 *
 * Was passiert:
 *   1. Bei Stripe entstehen ein Testkunde mit Testkarte und ein Abo – an einer „Testuhr“, mit der sich die Zeit
 *      vorspulen lässt.
 *   2. Die Meldungen, die Stripe dazu erzeugt, werden abgeholt und (wie von `stripe listen`) signiert an den
 *      lokalen Webhook geschickt. Geprüft wird also, ob der Server ECHTE Stripe-Meldungen richtig versteht.
 *   3. Nach jedem Schritt fragt das Skript den Server, ob Pro stimmt: Kauf → Verlängerung → Kündigung → Ende.
 *   4. Am Ende wird die Testuhr gelöscht (damit verschwinden Testkunde und Abo wieder).
 *
 * Voraussetzungen: `npm run dev` läuft, in .env steht ein Testschlüssel, `npm run stripe:setup` ist gelaufen.
 * Aufruf: npm run stripe:verify
 */
import Stripe from 'stripe'
import { PLANS } from '../shared/plans'

try {
  process.loadEnvFile('.env')
} catch {
  // ohne .env müssen die Werte in der Umgebung stehen
}

const APP = process.env.APP_URL ?? 'http://localhost:5173'
const key = process.env.STRIPE_SECRET_KEY?.trim()
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
if (!key || !(key.startsWith('sk_test_') || key.startsWith('rk_test_'))) fail('STRIPE_SECRET_KEY in .env fehlt oder ist kein Testschlüssel (sk_test_…).')
if (!webhookSecret) fail('STRIPE_WEBHOOK_SECRET fehlt in .env.')

const stripe = new Stripe(key!, { httpClient: Stripe.createFetchHttpClient() })
const DAY = 86_400
const SUBSCRIPTION_EVENTS = ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted']

function fail(message: string): never {
  console.error(`✖ ${message}`)
  process.exit(1)
}
const ok = (message: string) => console.log(`✔ ${message}`)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let cookie = ''
async function app(method: string, path: string, body?: unknown): Promise<{ status: number; data: any; headers: Headers }> {
  const response = await fetch(`${APP}/api${path}`, {
    method,
    headers: { origin: APP, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, data: await response.json().catch(() => null), headers: response.headers }
}

async function access(): Promise<{ pro: boolean; reason: string; until: number | null }> {
  return (await app('GET', '/me')).data.access
}

function expect(actual: unknown, wanted: unknown, what: string) {
  if (actual !== wanted) fail(`${what}: erwartet ${String(wanted)}, bekommen ${String(actual)}`)
  ok(what)
}

const delivered = new Set<string>()
/** Holt neue Abo-Meldungen von Stripe und stellt sie signiert dem lokalen Webhook zu (älteste zuerst). */
async function relayEvents(subscriptionId: string, since: number): Promise<string[]> {
  const events: Stripe.Event[] = []
  for await (const event of stripe.events.list({ types: SUBSCRIPTION_EVENTS, created: { gte: since }, limit: 100 })) {
    if ((event.data.object as Stripe.Subscription).id === subscriptionId && !delivered.has(event.id)) events.push(event)
  }
  events.sort((a, b) => a.created - b.created)
  const seen: string[] = []
  for (const event of events) {
    const payload = JSON.stringify(event)
    const signature = await Stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: webhookSecret!, cryptoProvider: Stripe.createSubtleCryptoProvider() })
    const response = await fetch(`${APP}/api/stripe/webhook`, { method: 'POST', headers: { 'stripe-signature': signature }, body: payload })
    const result = ((await response.json()) as { result?: string }).result
    if (response.status !== 200) fail(`Webhook hat ${event.type} abgelehnt (${response.status})`)
    delivered.add(event.id)
    seen.push(`${event.type} → ${result}`)
  }
  return seen
}

async function waitForEvents(subscriptionId: string, since: number, label: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const seen = await relayEvents(subscriptionId, since)
    if (seen.length) return ok(`${label}: ${seen.join(', ')}`)
    await sleep(1500)
  }
  fail(`${label}: Stripe hat keine Meldung erzeugt`)
}

async function advanceClock(clockId: string, to: number) {
  await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: to })
  for (let attempt = 0; attempt < 60; attempt++) {
    if ((await stripe.testHelpers.testClocks.retrieve(clockId)).status === 'ready') return
    await sleep(2000)
  }
  fail('Die Testuhr ist nicht fertig geworden.')
}

// ---------- Ablauf ----------

const balance = await stripe.balance.retrieve()
if (balance.livemode) fail('Dieser Schlüssel gehört zum LIVE-Modus. Abbruch – es wurde nichts angelegt.')
ok('Stripe erreichbar, Testmodus bestätigt')

const price = (await stripe.prices.list({ lookup_keys: [PLANS.monthly.lookupKey], active: true, limit: 1 })).data[0]
if (!price) fail('Preis fehlt bei Stripe – bitte zuerst `npm run stripe:setup` ausführen.')
expect(price.unit_amount, PLANS.monthly.priceCents, `Stripe-Preis stimmt mit shared/plans.ts überein (${PLANS.monthly.priceCents} Cent)`)

// Lokales Konto anlegen (Anmeldung per Code; lokal steht der Code in der Antwort)
const email = `stripe-pruefung-${Date.now()}@example.com`
const started = await app('POST', '/auth/start', { email })
if (!started.data?.devCode) fail('Der lokale Server läuft nicht im Entwicklungsmodus (npm run dev).')
const verified = await app('POST', '/auth/verify', { email, code: started.data.devCode })
cookie = verified.headers.get('set-cookie')!.split(';')[0]
expect((await access()).pro, false, 'Neues Konto hat noch kein Pro')

// Der echte Checkout-Aufruf des Servers (erzeugt nur die Bezahlseite, es wird nichts gekauft)
const checkout = await app('POST', '/billing/checkout', { plan: 'monthly', consentImmediateStart: true, consentWithdrawalExpires: true })
if (checkout.status === 200 && String(checkout.data.url).startsWith('https://checkout.stripe.com/')) ok('Server erzeugt eine echte Stripe-Checkout-Seite')
else console.log(`⚠ Checkout über den Server nicht bestätigt (Status ${checkout.status}: ${checkout.data?.error?.message ?? checkout.data?.url}). Hat der Server den Schlüssel und Netzzugang?`)

const userId: string = (await app('GET', '/me')).data.user.id
const start = Math.floor(Date.now() / 1000)
const clock = await stripe.testHelpers.testClocks.create({ frozen_time: start, name: 'Kotoba Dojo Paywall-Prüfung' })
try {
  const customer = await stripe.customers.create({ email, test_clock: clock.id, payment_method: 'pm_card_visa', invoice_settings: { default_payment_method: 'pm_card_visa' } })
  // Genau wie der Checkout: Das Abo trägt die Konto-ID in den Metadaten.
  const subscription = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: price.id }], metadata: { user_id: userId } })

  await waitForEvents(subscription.id, start - 5, 'Kauf')
  let state = await access()
  expect(state.pro, true, 'Nach dem Kauf: Pro ist freigeschaltet')
  expect(state.reason, 'aktiv', 'Grund „aktiv“')

  await advanceClock(clock.id, start + 31 * DAY + 3600)
  await waitForEvents(subscription.id, start - 5, 'Verlängerung')
  const renewed = await access()
  expect(renewed.pro, true, 'Nach der Verlängerung: weiter Pro')
  if (!(renewed.until! > state.until!)) fail('Der bezahlte Zeitraum wurde nicht verlängert.')
  ok('Bezahlter Zeitraum ist um einen Monat weitergerückt')

  await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true })
  await waitForEvents(subscription.id, start - 5, 'Kündigung')
  state = await access()
  expect(state.pro, true, 'Nach der Kündigung: Pro läuft noch')
  expect(state.reason, 'gekuendigt_laeuft', 'Grund „gekündigt, läuft noch“')

  await advanceClock(clock.id, start + 62 * DAY + 2 * 3600)
  await waitForEvents(subscription.id, start - 5, 'Ende des Abos')
  state = await access()
  expect(state.pro, false, 'Nach Ablauf: Pro ist beendet')
  expect((await app('GET', '/story/missions/ryokan-checkin')).status, 402, 'Pro-Inhalt ist wieder gesperrt (402)')

  console.log('\n✔ Alles bestanden: Kauf → Verlängerung → Kündigung → Ende mit echten Stripe-Meldungen.')
} finally {
  await stripe.testHelpers.testClocks.del(clock.id).catch(() => undefined)
}
