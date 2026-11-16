/**
 * Kündigungsbutton nach § 312k BGB („Verträge hier kündigen“).
 * Die Kündigung muss OHNE Anmeldung möglich sein. Deshalb reicht hier die E-Mail-Adresse des Kontos.
 *
 * Die Antwort ist immer dieselbe Eingangsbestätigung – so verrät das Formular nicht, ob es zu einer Adresse
 * ein Konto gibt. Schutz vor Missbrauch: Eine ordentliche Kündigung wirkt erst zum Ende des bezahlten
 * Zeitraums und lässt sich bis dahin im Kundenportal zurücknehmen; der Kontoinhaber wird per E-Mail informiert.
 */
import { Hono } from 'hono'
import type { CancelResponse } from '../../shared/api'
import { computeAccess } from '../../shared/entitlement'
import { nowSeconds, type AppEnv } from '../context'
import { loadSubscription, toState } from '../lib/access'
import { randomToken } from '../lib/crypto'
import { invalid } from '../lib/errors'
import { parseEmail, parseText, readJson } from '../lib/validate'

export const cancel = new Hono<AppEnv>()

cancel.post('/cancel', async (c) => {
  const body = await readJson(c.req.raw)
  const email = parseEmail(body.email)
  const kind = body.kind
  if (kind !== 'ordentlich' && kind !== 'ausserordentlich') throw invalid('Bitte wähle die Art der Kündigung.')
  const reason = parseText(body.reason, 'Grund', 1000, { optional: true })
  if (kind === 'ausserordentlich' && !reason) throw invalid('Bitte nenne den Grund für die außerordentliche Kündigung.')

  const now = nowSeconds(c)
  const reference = `K-${randomToken(4).toUpperCase()}`
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
  const subscription = user ? await loadSubscription(c.env.DB, user.id) : null
  const active = subscription !== null && computeAccess(toState(subscription), now).pro

  // umgesetzt = Abo endet automatisch zum Laufzeitende · offen = muss von Hand bearbeitet werden
  let status: 'umgesetzt' | 'offen' | 'kein_vertrag' = 'kein_vertrag'
  if (subscription && active) {
    status = 'offen'
    if (kind === 'ordentlich') {
      try {
        const gateway = c.var.deps.gateway(c)
        if (gateway) {
          // Stripe meldet die Kündigung anschließend per Webhook – erst der ändert den Abo-Stand.
          await gateway.cancelAtPeriodEnd(subscription.stripe_subscription_id)
          status = 'umgesetzt'
        }
      } catch (error) {
        // Die Kündigung ist trotzdem zugegangen und bleibt als „offen“ zur Bearbeitung gespeichert.
        console.error('Kündigung konnte nicht automatisch umgesetzt werden:', error)
      }
    }
  }

  await c.env.DB.prepare('INSERT INTO cancellations (id, email, user_id, kind, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(reference, email, user?.id ?? null, kind, reason || null, status, now)
    .run()

  const when = new Date(now * 1000).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'long', timeStyle: 'short' })
  await c.var.deps.mailer(c.env).send({
    to: email,
    subject: `Eingang deiner Kündigung (${reference})`,
    text:
      `Wir haben deine ${kind === 'ordentlich' ? 'ordentliche' : 'außerordentliche'} Kündigung von Kotoba Dojo Pro am ${when} Uhr erhalten.\n` +
      `Vorgangsnummer: ${reference}\n` +
      (kind === 'ordentlich'
        ? 'Dein Abo endet zum Ende des laufenden Abrechnungszeitraums. Bis dahin kannst du Pro weiter nutzen.'
        : 'Wir prüfen deine Kündigung und melden uns bei dir.'),
  })

  return c.json({ receivedAt: now, reference, kind } satisfies CancelResponse)
})
