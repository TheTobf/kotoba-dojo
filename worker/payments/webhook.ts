/**
 * Stripe-Webhook: die EINZIGE Stelle, die den Abo-Stand schreibt.
 *
 * Ablauf einer Meldung:
 *   1. Signatur prüfen (verifyStripeEvent) – nur Stripe kennt das Geheimnis. Ohne gültige Signatur passiert nichts.
 *   2. Schon verarbeitet? Stripe stellt Meldungen manchmal doppelt zu → dann nichts tun.
 *   3. Abo-Stand aus der Meldung übernehmen (applyStripeEvent). Ältere Meldungen überschreiben neuere nicht.
 *
 * Es zählen nur die drei Abo-Meldungen. Sie enthalten jeweils den vollständigen Stand, deshalb decken sie
 * Kauf, Verlängerung, Kündigung, Zahlungsausfall und Ablauf ab.
 */
import Stripe from 'stripe'
import type { SubscriptionStatus } from '../../shared/entitlement'
import { PLANS, type PlanId } from '../../shared/plans'
import type { SubscriptionRow } from '../lib/access'

const SUBSCRIPTION_EVENTS = new Set(['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'])

/** Abo gilt bei Stripe als „lebendig“ (im Unterschied zu beendet/nie zustande gekommen). */
const ALIVE: SubscriptionStatus[] = ['active', 'trialing', 'past_due']

const cryptoProvider = Stripe.createSubtleCryptoProvider()

/** Höchstalter einer Meldung in Sekunden (schützt vor dem erneuten Einspielen abgefangener Meldungen). */
export const SIGNATURE_TOLERANCE_SECONDS = 300

/** Prüft die Signatur. Wirft einen Fehler, wenn sie fehlt, falsch oder zu alt ist. */
export async function verifyStripeEvent(payload: string, signatureHeader: string, secret: string, nowMs: number): Promise<Stripe.Event> {
  return Stripe.webhooks.constructEventAsync(payload, signatureHeader, secret, SIGNATURE_TOLERANCE_SECONDS, cryptoProvider, nowMs)
}

export type ApplyResult =
  | 'uebernommen'        // Abo-Stand gespeichert
  | 'doppelt'            // Meldung war schon verarbeitet
  | 'veraltet'           // eine neuere Meldung war schneller
  | 'anderes_abo'        // gehört zu einem alten, toten Abo desselben Kontos
  | 'unbekanntes_konto'  // lässt sich keinem Konto zuordnen
  | 'ignoriert'          // Meldungstyp, der den Abo-Stand nicht betrifft

/** Liest aus einem Stripe-Abo genau die Werte, die wir speichern. */
export function snapshotFromSubscription(sub: Stripe.Subscription) {
  const item = sub.items.data[0]
  // Seit 2025 stehen Beginn/Ende des Zeitraums an der Abo-Position; ältere Meldungen haben sie am Abo selbst.
  const legacy = sub as unknown as { current_period_start?: number; current_period_end?: number }
  const periodStart = item?.current_period_start ?? legacy.current_period_start
  const periodEnd = item?.current_period_end ?? legacy.current_period_end
  if (typeof periodStart !== 'number' || typeof periodEnd !== 'number') return null

  const lookupKey = item?.price?.lookup_key
  const interval = item?.price?.recurring?.interval
  const plan: PlanId | null =
    (Object.values(PLANS).find((p) => p.lookupKey === lookupKey)?.id ?? null) ||
    (interval === 'year' ? 'yearly' : interval === 'month' ? 'monthly' : null)

  return {
    subscriptionId: sub.id,
    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    status: sub.status as SubscriptionStatus,
    plan,
    periodStart,
    periodEnd,
    cancelAt: sub.cancel_at ?? (sub.cancel_at_period_end ? periodEnd : null),
    userId: sub.metadata?.user_id ?? null,
  }
}

export async function applyStripeEvent(db: D1Database, event: Stripe.Event, nowSeconds: number): Promise<ApplyResult> {
  const seen = await db.prepare('SELECT 1 FROM stripe_events WHERE id = ?').bind(event.id).first()
  if (seen) return 'doppelt'

  const remember = db
    .prepare('INSERT OR IGNORE INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)')
    .bind(event.id, event.type, nowSeconds)

  const finish = async (result: ApplyResult) => {
    await remember.run()
    return result
  }

  if (!SUBSCRIPTION_EVENTS.has(event.type)) return finish('ignoriert')
  const snapshot = snapshotFromSubscription(event.data.object as Stripe.Subscription)
  if (!snapshot) return finish('ignoriert')

  // Konto finden: über die beim Kauf mitgegebene Konto-ID, ersatzweise über die Stripe-Kundennummer.
  let userId: string | null = null
  if (snapshot.userId) {
    userId = (await db.prepare('SELECT id FROM users WHERE id = ?').bind(snapshot.userId).first<{ id: string }>())?.id ?? null
  }
  if (!userId) {
    userId =
      (await db.prepare('SELECT user_id FROM subscriptions WHERE stripe_customer_id = ?').bind(snapshot.customerId).first<{ user_id: string }>())
        ?.user_id ?? null
  }
  if (!userId) {
    console.warn(`Stripe-Meldung ${event.id}: kein Konto für Abo ${snapshot.subscriptionId} gefunden`)
    return finish('unbekanntes_konto')
  }

  const existing = await db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').bind(userId).first<SubscriptionRow>()
  if (existing) {
    const sameSubscription = existing.stripe_subscription_id === snapshot.subscriptionId
    // Meldungen können in falscher Reihenfolge ankommen: eine ältere darf den neueren Stand nicht überschreiben.
    if (sameSubscription && event.created < existing.last_event_at) return finish('veraltet')
    // Meldung zu einem ANDEREN Abo desselben Kontos: nur übernehmen, wenn dieses Abo lebt (z. B. Neukauf nach Ablauf).
    if (!sameSubscription && !ALIVE.includes(snapshot.status)) return finish('anderes_abo')
  }

  // Beides zusammen in einer Transaktion: Abo-Stand speichern UND Meldung als verarbeitet merken.
  await db.batch([
    db
      .prepare(
        `INSERT INTO subscriptions
           (user_id, stripe_customer_id, stripe_subscription_id, status, plan, period_start, period_end, cancel_at, last_event_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(user_id) DO UPDATE SET
           stripe_customer_id = excluded.stripe_customer_id,
           stripe_subscription_id = excluded.stripe_subscription_id,
           status = excluded.status,
           plan = excluded.plan,
           period_start = excluded.period_start,
           period_end = excluded.period_end,
           cancel_at = excluded.cancel_at,
           last_event_at = excluded.last_event_at,
           updated_at = excluded.updated_at`,
      )
      .bind(
        userId, snapshot.customerId, snapshot.subscriptionId, snapshot.status, snapshot.plan,
        snapshot.periodStart, snapshot.periodEnd, snapshot.cancelAt, event.created, nowSeconds,
      ),
    remember,
  ])
  return 'uebernommen'
}
