/**
 * Anmeldung ohne Passwort: E-Mail eingeben → sechsstelligen Code erhalten → Code eingeben.
 * Das Konto entsteht beim ersten erfolgreichen Anmelden. Gespeichert wird nur die E-Mail-Adresse.
 */
import { Hono } from 'hono'
import type { AuthStartResponse } from '../../shared/api'
import { nowSeconds, type AppContext, type AppEnv } from '../context'
import { isDevelopment } from '../env'
import { hmacHex, randomCode, randomId, safeEqual } from '../lib/crypto'
import { ApiError, invalid } from '../lib/errors'
import { createSession, destroySession } from '../lib/session'
import { parseEmail, parseText, readJson } from '../lib/validate'

export const CODE_MINUTES = 10
export const MAX_ATTEMPTS = 5
export const MAX_CODES_PER_HOUR = 5
const HOUR = 3600

function secret(c: AppContext): string {
  const value = c.env.SESSION_SECRET
  if (!value || value.length < 16) throw new Error('SESSION_SECRET fehlt oder ist zu kurz.')
  return value
}

const codeHash = (c: AppContext, email: string, code: string) => hmacHex(secret(c), `login:${email}:${code}`)

interface CodeRow {
  code_hash: string
  expires_at: number
  attempts: number
  window_start: number
  sent_count: number
}

export const auth = new Hono<AppEnv>()

auth.post('/start', async (c) => {
  const email = parseEmail((await readJson(c.req.raw)).email)
  const now = nowSeconds(c)

  // Versand begrenzen: höchstens MAX_CODES_PER_HOUR Codes pro Adresse und Stunde.
  const previous = await c.env.DB.prepare('SELECT * FROM login_codes WHERE email = ?').bind(email).first<CodeRow>()
  const sameWindow = previous !== null && now - previous.window_start < HOUR
  if (sameWindow && previous.sent_count >= MAX_CODES_PER_HOUR) {
    throw new ApiError(429, 'zu_viele_anfragen', 'Zu viele Codes angefordert. Bitte versuch es in einer Stunde noch einmal.')
  }

  const code = randomCode()
  await c.env.DB.prepare(
    `INSERT INTO login_codes (email, code_hash, expires_at, attempts, window_start, sent_count) VALUES (?1, ?2, ?3, 0, ?4, ?5)
     ON CONFLICT(email) DO UPDATE SET code_hash = ?2, expires_at = ?3, attempts = 0, window_start = ?4, sent_count = ?5`,
  )
    .bind(email, await codeHash(c, email, code), now + CODE_MINUTES * 60, sameWindow ? previous.window_start : now, sameWindow ? previous.sent_count + 1 : 1)
    .run()

  await c.var.deps.mailer(c.env).send({
    to: email,
    subject: `Dein Anmeldecode für Kotoba Dojo: ${code}`,
    text: `Dein Anmeldecode lautet ${code}.\nEr gilt ${CODE_MINUTES} Minuten. Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
  })

  // Lokal gibt es keinen Mailversand – der Code wird deshalb direkt mitgeschickt und in der Oberfläche angezeigt.
  const body: AuthStartResponse = isDevelopment(c.env) ? { ok: true, devCode: code } : { ok: true }
  return c.json(body)
})

auth.post('/verify', async (c) => {
  const body = await readJson(c.req.raw)
  const email = parseEmail(body.email)
  const code = parseText(body.code, 'Code', 12).replace(/\s/g, '')
  const now = nowSeconds(c)
  const wrong = () => invalid('Der Code stimmt nicht oder ist abgelaufen. Bitte fordere einen neuen an.')

  const row = await c.env.DB.prepare('SELECT * FROM login_codes WHERE email = ?').bind(email).first<CodeRow>()
  if (!row || row.expires_at <= now || row.attempts >= MAX_ATTEMPTS) throw wrong()

  if (!safeEqual(row.code_hash, await codeHash(c, email, code))) {
    await c.env.DB.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?').bind(email).run()
    throw wrong()
  }

  // Code ist verbraucht. Die Zeile bleibt (ohne gültigen Code) bestehen, damit die Versand-Begrenzung weiter zählt.
  await c.env.DB.prepare('UPDATE login_codes SET expires_at = 0 WHERE email = ?').bind(email).run()

  await c.env.DB.prepare('INSERT OR IGNORE INTO users (id, email, created_at) VALUES (?, ?, ?)').bind(randomId('usr'), email, now).run()
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
  if (!user) throw new Error('Konto konnte nicht angelegt werden.')

  await createSession(c, user.id)
  return c.json({ ok: true })
})

auth.post('/logout', async (c) => {
  await destroySession(c)
  return c.json({ ok: true })
})
