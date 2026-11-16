/**
 * Lokale Ersatzseiten für Stripe-Checkout und Kundenportal (Stripe-Simulator).
 * NUR aktiv bei ENVIRONMENT=development ohne STRIPE_SECRET_KEY – sonst antworten alle Adressen hier mit 404.
 * Jede Aktion erzeugt eine signierte Stripe-Meldung und schickt sie durch die echte Webhook-Prüfung.
 */
import { Hono } from 'hono'
import { html } from 'hono/html'
import type Stripe from 'stripe'
import { computeAccess } from '../../shared/entitlement'
import { formatPrice, isPlanId, PLANS } from '../../shared/plans'
import { nowSeconds, origin, type AppContext, type AppEnv } from '../context'
import { isDevelopment, type Env } from '../env'
import { loadSubscription, toState, type SubscriptionRow } from '../lib/access'
import { ApiError, invalid } from '../lib/errors'
import { requireUser } from '../lib/session'
import {
  buildSubscriptionEvent, newSimulatedSubscription, periodLength, signPayload,
  type SimulatedSubscription, type SubscriptionEventType,
} from '../payments/simulator'
import { applyStripeEvent, verifyStripeEvent } from '../payments/webhook'

export const simulatorEnabled = (env: Env) => isDevelopment(env) && !env.STRIPE_SECRET_KEY?.trim()

/** Signiert die Meldung wie Stripe und schickt sie durch dieselbe Prüfung und Verarbeitung wie der Webhook. */
export async function deliverSigned(c: AppContext, event: Stripe.Event): Promise<void> {
  const secret = c.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET fehlt (wird von `npm run dev` automatisch angelegt).')
  const payload = JSON.stringify(event)
  const signature = await signPayload(payload, secret, nowSeconds(c))
  const verified = await verifyStripeEvent(payload, signature, secret, c.var.deps.now())
  await applyStripeEvent(c.env.DB, verified, nowSeconds(c))
}

export function toSimulated(row: SubscriptionRow): SimulatedSubscription {
  return {
    id: row.stripe_subscription_id,
    customerId: row.stripe_customer_id,
    userId: row.user_id,
    plan: row.plan ?? 'monthly',
    status: row.status,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    cancelAtPeriodEnd: row.cancel_at !== null,
  }
}

export async function loadSimulated(db: D1Database, subscriptionId: string): Promise<SimulatedSubscription | null> {
  const row = await db.prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ?').bind(subscriptionId).first<SubscriptionRow>()
  return row ? toSimulated(row) : null
}

/** Nur Adressen der eigenen App als Rücksprungziel zulassen. */
function sameOrigin(c: AppContext, value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.startsWith(`${origin(c)}/`)) return value
  return `${origin(c)}${fallback}`
}

const page = (title: string, body: unknown) => html`<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${title} – Stripe-Simulator</title>
    <style>
      :root { color-scheme: light dark; }
      body { font: 16px/1.5 system-ui, sans-serif; max-width: 34rem; margin: 0 auto; padding: 2rem 1rem; }
      .banner { background: #fde68a; color: #422006; padding: .6rem .9rem; border-radius: .5rem; font-size: .9rem; margin-bottom: 1.5rem; }
      h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
      .box { border: 1px solid #8884; border-radius: .75rem; padding: 1rem; margin: 1rem 0; }
      dl { display: grid; grid-template-columns: auto 1fr; gap: .25rem 1rem; margin: 0; }
      dt { opacity: .7; } dd { margin: 0; font-weight: 600; }
      form { margin: .5rem 0; }
      button, a.btn { display: block; width: 100%; box-sizing: border-box; text-align: center; font: inherit; font-weight: 600; padding: .75rem 1rem;
        border-radius: .6rem; border: 1px solid #8886; background: transparent; color: inherit; cursor: pointer; text-decoration: none; }
      button.primary { background: #635bff; border-color: #635bff; color: #fff; }
      small { display: block; opacity: .7; margin-top: .2rem; }
    </style>
  </head>
  <body>
    <div class="banner"><strong>Stripe-Simulator (nur lokal).</strong> Hier fließt kein Geld. Jede Aktion schickt eine signierte Test-Meldung an den Webhook – genau wie Stripe.</div>
    ${body}
  </body>
</html>`

export const devStripe = new Hono<AppEnv>()

devStripe.use('*', async (c, next) => {
  if (!simulatorEnabled(c.env)) throw new ApiError(404, 'nicht_gefunden', 'Nicht gefunden.')
  await next()
})

devStripe.get('/checkout', (c) => {
  const user = requireUser(c)
  const plan = c.req.query('plan')
  if (!isPlanId(plan) || c.req.query('user') !== user.id) throw invalid('Ungültige Checkout-Adresse.')
  const cancelUrl = sameOrigin(c, c.req.query('cancel'), '/preise')
  return c.html(
    page(
      'Bezahlen',
      html`<h1>Kotoba Dojo Pro abonnieren</h1>
        <div class="box">
          <dl>
            <dt>Konto</dt><dd>${user.email}</dd>
            <dt>Tarif</dt><dd>${PLANS[plan].name}</dd>
            <dt>Preis</dt><dd>${formatPrice(PLANS[plan].priceCents)} pro ${plan === 'yearly' ? 'Jahr' : 'Monat'}</dd>
          </dl>
        </div>
        <form method="post">
          <input type="hidden" name="plan" value="${plan}" />
          <input type="hidden" name="success" value="${c.req.query('success') ?? ''}" />
          <input type="hidden" name="customer" value="${c.req.query('customer') ?? ''}" />
          <button class="primary" type="submit">Testzahlung erfolgreich abschließen</button>
        </form>
        <a class="btn" href="${cancelUrl}">Abbrechen</a>`,
    ),
  )
})

devStripe.post('/checkout', async (c) => {
  const user = requireUser(c)
  const form = await c.req.parseBody()
  if (!isPlanId(form.plan)) throw invalid('Ungültiger Tarif.')
  const customer = typeof form.customer === 'string' && form.customer ? form.customer : undefined
  const sub = newSimulatedSubscription(user.id, form.plan, nowSeconds(c), customer)
  await deliverSigned(c, buildSubscriptionEvent('customer.subscription.created', sub, nowSeconds(c)))
  return c.redirect(sameOrigin(c, form.success, '/app/profil'), 303)
})

const ACTIONS: Record<string, { label: string; note: string; type: SubscriptionEventType; change: (s: SimulatedSubscription, now: number) => SimulatedSubscription }> = {
  kuendigen: {
    label: 'Abo kündigen (zum Ende des Zeitraums)',
    note: 'Pro bleibt bis zum Ende des bezahlten Zeitraums.',
    type: 'customer.subscription.updated',
    change: (s) => ({ ...s, cancelAtPeriodEnd: true }),
  },
  fortsetzen: {
    label: 'Kündigung zurücknehmen',
    note: 'Das Abo verlängert sich wieder automatisch.',
    type: 'customer.subscription.updated',
    change: (s) => ({ ...s, cancelAtPeriodEnd: false }),
  },
  verlaengern: {
    label: 'Zeit vorspulen: Verlängerung wird bezahlt',
    note: 'Ein neuer bezahlter Zeitraum beginnt jetzt.',
    type: 'customer.subscription.updated',
    change: (s, now) => ({ ...s, status: 'active', cancelAtPeriodEnd: false, periodStart: now, periodEnd: now + periodLength(s.plan) }),
  },
  zahlung_fehlgeschlagen: {
    label: 'Zeit vorspulen: Verlängerung schlägt fehl',
    note: 'Status „Zahlung offen“ – Pro bleibt noch für die Kulanzfrist.',
    type: 'customer.subscription.updated',
    change: (s, now) => ({ ...s, status: 'past_due', periodStart: now, periodEnd: now + periodLength(s.plan) }),
  },
  beenden: {
    label: 'Zeit vorspulen: Abo ist beendet',
    note: 'Der Zeitraum ist abgelaufen – Pro endet sofort.',
    type: 'customer.subscription.deleted',
    change: (s) => ({ ...s, status: 'canceled' }),
  },
}

devStripe.get('/portal', async (c) => {
  const user = requireUser(c)
  const row = await loadSubscription(c.env.DB, user.id)
  if (!row) throw new ApiError(404, 'kein_abo', 'Zu diesem Konto gibt es kein Abo.')
  const access = computeAccess(toState(row), nowSeconds(c))
  const returnUrl = sameOrigin(c, c.req.query('return'), '/app/profil')
  const date = (s: number) => new Date(s * 1000).toLocaleDateString('de-DE')
  return c.html(
    page(
      'Kundenportal',
      html`<h1>Kundenportal</h1>
        <div class="box">
          <dl>
            <dt>Konto</dt><dd>${user.email}</dd>
            <dt>Stripe-Status</dt><dd>${row.status}${row.cancel_at ? ' (gekündigt)' : ''}</dd>
            <dt>Zeitraum</dt><dd>${date(row.period_start)} – ${date(row.period_end)}</dd>
            <dt>Pro laut Server</dt><dd>${access.pro ? 'ja' : 'nein'} (${access.reason})</dd>
          </dl>
        </div>
        ${Object.entries(ACTIONS).map(
          ([id, action]) => html`<form method="post">
            <input type="hidden" name="action" value="${id}" />
            <input type="hidden" name="return" value="${returnUrl}" />
            <button type="submit">${action.label}<small>${action.note}</small></button>
          </form>`,
        )}
        <a class="btn" href="${returnUrl}">← Zurück zu Kotoba Dojo</a>`,
    ),
  )
})

devStripe.post('/portal', async (c) => {
  const user = requireUser(c)
  const form = await c.req.parseBody()
  const action = typeof form.action === 'string' ? ACTIONS[form.action] : undefined
  const row = await loadSubscription(c.env.DB, user.id)
  if (!action || !row) throw invalid('Unbekannte Aktion.')
  const now = nowSeconds(c)
  await deliverSigned(c, buildSubscriptionEvent(action.type, action.change(toSimulated(row), now), now))
  return c.redirect(`${origin(c)}/api/dev/stripe/portal?${new URLSearchParams({ return: sameOrigin(c, form.return, '/app/profil') })}`, 303)
})
