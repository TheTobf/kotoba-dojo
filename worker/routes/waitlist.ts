/**
 * Warteliste der Landingpage mit Double-Opt-in: Eine Adresse zählt erst, wenn der Link aus der
 * Bestätigungs-Mail geöffnet wurde. Gespeichert wird nur die E-Mail-Adresse.
 */
import { Hono } from 'hono'
import { nowSeconds, origin, type AppEnv } from '../context'
import { isDevelopment } from '../env'
import { randomToken, sha256Hex } from '../lib/crypto'
import { invalid } from '../lib/errors'
import { parseEmail, parseText, readJson } from '../lib/validate'

export const waitlist = new Hono<AppEnv>()

waitlist.post('/waitlist', async (c) => {
  const body = await readJson(c.req.raw)
  const email = parseEmail(body.email)
  if (body.consent !== true) throw invalid('Bitte stimme zu, dass wir dir zum Start eine E-Mail schicken dürfen.')

  const token = randomToken()
  // Bereits bestätigte Adressen bleiben unverändert; unbestätigte bekommen einen neuen Link.
  await c.env.DB.prepare(
    `INSERT INTO waitlist (email, token_hash, created_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(email) DO UPDATE SET token_hash = ?2 WHERE confirmed_at IS NULL`,
  )
    .bind(email, await sha256Hex(token), nowSeconds(c))
    .run()

  const confirmUrl = `${origin(c)}/warteliste/bestaetigen?token=${token}`
  await c.var.deps.mailer(c.env).send({
    to: email,
    subject: 'Bitte bestätige deine Anmeldung zur Kotoba-Dojo-Warteliste',
    text: `Fast geschafft: Bitte bestätige deine Anmeldung mit diesem Link:\n${confirmUrl}\nWenn du dich nicht angemeldet hast, ignoriere diese E-Mail einfach.`,
  })

  return c.json(isDevelopment(c.env) ? { ok: true, devConfirmUrl: confirmUrl } : { ok: true })
})

waitlist.post('/waitlist/confirm', async (c) => {
  const token = parseText((await readJson(c.req.raw)).token, 'Bestätigungslink', 128)
  const result = await c.env.DB.prepare('UPDATE waitlist SET confirmed_at = COALESCE(confirmed_at, ?) WHERE token_hash = ?')
    .bind(nowSeconds(c), await sha256Hex(token))
    .run()
  if (result.meta.changes === 0) throw invalid('Dieser Bestätigungslink ist ungültig oder veraltet.')
  return c.json({ ok: true })
})
