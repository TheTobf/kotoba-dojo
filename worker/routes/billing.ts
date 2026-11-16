/** Kauf (Stripe Checkout), Kundenportal und Webhook. */
import { Hono } from 'hono'
import type { UrlResponse } from '../../shared/api'
import { CHECKOUT_CONSENT_VERSION } from '../../shared/legal'
import { isPlanId } from '../../shared/plans'
import { nowSeconds, origin, type AppContext, type AppEnv } from '../context'
import { getAccess } from '../lib/access'
import { randomId } from '../lib/crypto'
import { ApiError, invalid } from '../lib/errors'
import { requireUser } from '../lib/session'
import { readJson } from '../lib/validate'
import { applyStripeEvent, verifyStripeEvent } from '../payments/webhook'

function requireGateway(c: AppContext) {
  const gateway = c.var.deps.gateway(c)
  if (!gateway) throw new ApiError(503, 'zahlung_nicht_eingerichtet', 'Die Bezahlung ist noch nicht eingerichtet.')
  return gateway
}

export const billing = new Hono<AppEnv>()

billing.post('/billing/checkout', async (c) => {
  const user = requireUser(c)
  const body = await readJson(c.req.raw)
  if (!isPlanId(body.plan)) throw invalid('Bitte wähle einen Tarif.')
  // Ohne beide Zustimmungen gibt es keinen Kauf – das prüft der Server, nicht nur das Formular.
  if (body.consentImmediateStart !== true || body.consentWithdrawalExpires !== true) {
    throw invalid('Bitte bestätige beide Hinweise zum sofortigen Beginn und zum Widerrufsrecht.')
  }

  const { access, subscription } = await getAccess(c, user.id)
  if (access.pro) throw new ApiError(409, 'ungueltig', 'Du hast bereits Kotoba Dojo Pro. Dein Abo verwaltest du im Profil.')

  const gateway = requireGateway(c)
  await c.env.DB.prepare('INSERT INTO checkout_consents (id, user_id, plan, text_version, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(randomId('con'), user.id, body.plan, CHECKOUT_CONSENT_VERSION, nowSeconds(c))
    .run()

  const url = await gateway.createCheckout({
    user,
    plan: body.plan,
    customerId: subscription?.stripe_customer_id ?? null,
    successUrl: `${origin(c)}/app/profil?kauf=erfolgreich`,
    cancelUrl: `${origin(c)}/preise?kauf=abgebrochen`,
  })
  return c.json({ url } satisfies UrlResponse)
})

billing.post('/billing/portal', async (c) => {
  const user = requireUser(c)
  const { subscription } = await getAccess(c, user.id)
  if (!subscription) throw new ApiError(404, 'kein_abo', 'Zu diesem Konto gibt es kein Abo.')
  const url = await requireGateway(c).createPortal(subscription.stripe_customer_id, `${origin(c)}/app/profil`)
  return c.json({ url } satisfies UrlResponse)
})

/**
 * Stripe ruft diese Adresse auf, wenn sich an einem Abo etwas ändert.
 * Hier gibt es keine Anmeldung – stattdessen beweist die Signatur, dass die Meldung wirklich von Stripe kommt.
 */
billing.post('/stripe/webhook', async (c) => {
  const secret = c.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return c.json({ error: 'webhook_nicht_eingerichtet' }, 503)

  const signature = c.req.header('stripe-signature')
  if (!signature) return c.json({ error: 'signatur_fehlt' }, 400)

  const payload = await c.req.text() // unveränderter Rohtext – nur der passt zur Signatur
  let event
  try {
    event = await verifyStripeEvent(payload, signature, secret, c.var.deps.now())
  } catch {
    return c.json({ error: 'signatur_ungueltig' }, 400)
  }

  const result = await applyStripeEvent(c.env.DB, event, nowSeconds(c))
  return c.json({ received: true, result })
})
