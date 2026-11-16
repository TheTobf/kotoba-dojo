/**
 * Zugriff auf Pro: liest den Abo-Stand aus der Datenbank und wendet DIE Pro-Regel (shared/entitlement.ts) an.
 * Jede Pro-Route ruft `requirePro` auf – der Browser kann sich Pro nicht selbst geben.
 */
import { computeAccess, type Access, type SubscriptionState, type SubscriptionStatus } from '../../shared/entitlement'
import type { PlanId } from '../../shared/plans'
import { nowSeconds, type AppContext, type User } from '../context'
import { ApiError } from './errors'
import { requireUser } from './session'

export interface SubscriptionRow {
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  status: SubscriptionStatus
  plan: PlanId | null
  period_start: number
  period_end: number
  cancel_at: number | null
  last_event_at: number
  updated_at: number
}

export const toState = (row: SubscriptionRow): SubscriptionState => ({
  status: row.status,
  periodStart: row.period_start,
  periodEnd: row.period_end,
  cancelAt: row.cancel_at,
})

export async function loadSubscription(db: D1Database, userId: string): Promise<SubscriptionRow | null> {
  return db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').bind(userId).first<SubscriptionRow>()
}

export async function getAccess(c: AppContext, userId: string): Promise<{ access: Access; subscription: SubscriptionRow | null }> {
  const subscription = await loadSubscription(c.env.DB, userId)
  return { access: computeAccess(subscription ? toState(subscription) : null, nowSeconds(c)), subscription }
}

/** Gibt den Nutzer zurück, wenn er angemeldet ist UND Pro hat – sonst 401 bzw. 402. */
export async function requirePro(c: AppContext): Promise<User> {
  const user = requireUser(c)
  const { access } = await getAccess(c, user.id)
  if (!access.pro) throw new ApiError(402, 'pro_noetig', 'Dieser Bereich gehört zu Kotoba Dojo Pro.')
  return user
}
