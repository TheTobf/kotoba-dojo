/**
 * Stripe-SIMULATOR – nur für die lokale Entwicklung ohne Stripe-Konto.
 *
 * Er ersetzt Stripes Bezahlseite und Kundenportal durch einfache lokale Seiten (worker/routes/dev-stripe.ts).
 * Entscheidend: Er schreibt NICHT in die Datenbank. Er baut dieselben Meldungen wie Stripe, signiert sie wie
 * Stripe und schickt sie an den echten Webhook. So wird lokal exakt der Weg geprüft, der später auch gilt:
 * Signaturprüfung → Abo-Stand → Pro-Regel.
 *
 * Aktiv nur, wenn ENVIRONMENT=development UND kein STRIPE_SECRET_KEY gesetzt ist (siehe worker/deps.ts).
 * Die Meldungen sind auch die Vorlagen für die Tests (tests/helpers.ts).
 */
import Stripe from 'stripe'
import { CURRENCY, PLANS, type PlanId } from '../../shared/plans'
import type { SubscriptionStatus } from '../../shared/entitlement'
import { randomToken } from '../lib/crypto'
import type { CheckoutParams, PaymentGateway } from './gateway'

export interface SimulatedSubscription {
  id: string
  customerId: string
  userId: string
  plan: PlanId
  status: SubscriptionStatus
  periodStart: number
  periodEnd: number
  cancelAtPeriodEnd: boolean
}

const MONTH = 30 * 86_400
const YEAR = 365 * 86_400

export const periodLength = (plan: PlanId) => (plan === 'yearly' ? YEAR : MONTH)

export function newSimulatedSubscription(userId: string, plan: PlanId, nowSeconds: number, customerId?: string): SimulatedSubscription {
  return {
    id: `sub_sim_${randomToken(8)}`,
    customerId: customerId ?? `cus_sim_${randomToken(8)}`,
    userId,
    plan,
    status: 'active',
    periodStart: nowSeconds,
    periodEnd: nowSeconds + periodLength(plan),
    cancelAtPeriodEnd: false,
  }
}

/** Baut ein Abo-Objekt in der Form, wie Stripe es in Webhook-Meldungen schickt (nur die Felder, die wir lesen). */
export function toStripeSubscription(sub: SimulatedSubscription): Stripe.Subscription {
  const plan = PLANS[sub.plan]
  return {
    id: sub.id,
    object: 'subscription',
    customer: sub.customerId,
    status: sub.status,
    cancel_at_period_end: sub.cancelAtPeriodEnd,
    cancel_at: sub.cancelAtPeriodEnd ? sub.periodEnd : null,
    metadata: { user_id: sub.userId },
    items: {
      object: 'list',
      data: [
        {
          id: `si_sim_${sub.id.slice(8)}`,
          object: 'subscription_item',
          current_period_start: sub.periodStart,
          current_period_end: sub.periodEnd,
          price: {
            id: `price_sim_${plan.id}`,
            object: 'price',
            lookup_key: plan.lookupKey,
            currency: CURRENCY,
            unit_amount: plan.priceCents,
            recurring: { interval: plan.interval, interval_count: 1 },
          },
        },
      ],
    },
  } as unknown as Stripe.Subscription
}

export type SubscriptionEventType = 'customer.subscription.created' | 'customer.subscription.updated' | 'customer.subscription.deleted'

export function buildSubscriptionEvent(type: SubscriptionEventType, sub: SimulatedSubscription, createdSeconds: number, id?: string): Stripe.Event {
  return {
    id: id ?? `evt_sim_${randomToken(10)}`,
    object: 'event',
    api_version: '2026-10-28.endive',
    created: createdSeconds,
    livemode: false,
    type,
    data: { object: toStripeSubscription(sub) },
  } as unknown as Stripe.Event
}

const cryptoProvider = Stripe.createSubtleCryptoProvider()

/** Signiert eine Meldung genauso, wie Stripe es tut (Kopfzeile `Stripe-Signature`). */
export async function signPayload(payload: string, secret: string, timestampSeconds: number): Promise<string> {
  return Stripe.webhooks.generateTestHeaderStringAsync({ payload, secret, timestamp: timestampSeconds, cryptoProvider })
}

/** Schickt eine signierte Meldung an den echten Webhook-Endpunkt. */
export type Dispatch = (event: Stripe.Event) => Promise<void>

/** Zahlungs-Schnittstelle des Simulators: führt auf lokale Seiten statt zu Stripe. */
export class SimulatorGateway implements PaymentGateway {
  constructor(
    private readonly origin: string,
    private readonly loadSubscription: (subscriptionId: string) => Promise<SimulatedSubscription | null>,
    private readonly dispatch: Dispatch,
    private readonly now: () => number,
  ) {}

  async createCheckout({ user, plan, customerId, successUrl, cancelUrl }: CheckoutParams): Promise<string> {
    const query = new URLSearchParams({ user: user.id, plan, success: successUrl, cancel: cancelUrl })
    if (customerId) query.set('customer', customerId)
    return `${this.origin}/api/dev/stripe/checkout?${query}`
  }

  async createPortal(_customerId: string, returnUrl: string): Promise<string> {
    return `${this.origin}/api/dev/stripe/portal?${new URLSearchParams({ return: returnUrl })}`
  }

  async cancelAtPeriodEnd(subscriptionId: string): Promise<void> {
    const sub = await this.loadSubscription(subscriptionId)
    if (!sub) return
    await this.dispatch(buildSubscriptionEvent('customer.subscription.updated', { ...sub, cancelAtPeriodEnd: true }, Math.floor(this.now() / 1000)))
  }
}
