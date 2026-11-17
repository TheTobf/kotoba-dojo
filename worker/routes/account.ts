/**
 * Konto löschen (DSGVO, Recht auf Löschung). Löscht das Konto mit allem, was daran hängt:
 * Sitzungen, Lernstand, Fehlerkarten, KI-Zähler, Zustimmungs-Nachweise, Abo-Zeile.
 * Solange ein Abo läuft, geht das nicht – sonst würde Stripe weiter abbuchen.
 * Kündigungs-Nachweise (Tabelle `cancellations`) bleiben ohne Konto-Bezug erhalten.
 */
import { Hono } from 'hono'
import { computeAccess } from '../../shared/entitlement'
import { nowSeconds, type AppEnv } from '../context'
import { loadSubscription, toState } from '../lib/access'
import { ApiError } from '../lib/errors'
import { destroySession, requireUser } from '../lib/session'

export const account = new Hono<AppEnv>()

account.delete('/account', async (c) => {
  const user = requireUser(c)
  const subscription = await loadSubscription(c.env.DB, user.id)
  if (subscription) {
    const access = computeAccess(toState(subscription), nowSeconds(c))
    const renews = access.pro && access.reason !== 'gekuendigt_laeuft'
    if (renews) throw new ApiError(409, 'ungueltig', 'Dein Pro-Abo läuft noch. Bitte kündige es zuerst über „Verträge hier kündigen“.')
  }
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE cancellations SET user_id = NULL WHERE user_id = ?').bind(user.id),
    c.env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(user.email),
    // Dank ON DELETE CASCADE verschwinden damit auch sessions, progress_sync, mistake_cards, ai_usage, subscriptions, checkout_consents.
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ])
  await destroySession(c)
  return c.json({ ok: true })
})
