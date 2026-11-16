/**
 * Sitzungen: Nach der Anmeldung bekommt der Browser ein Cookie mit einem zufälligen Token.
 * In der Datenbank liegt nur der Fingerabdruck (SHA-256) – wer die Datenbank liest, kann sich damit nicht anmelden.
 * Das Cookie ist HttpOnly (für JavaScript unsichtbar) und technisch notwendig, also ohne Cookie-Banner zulässig.
 */
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { nowSeconds, type AppContext, type User } from '../context'
import { ApiError } from './errors'
import { randomToken, sha256Hex } from './crypto'

const COOKIE = 'kd_session'
export const SESSION_DAYS = 30
const SESSION_SECONDS = SESSION_DAYS * 86_400

function writeCookie(c: AppContext, token: string) {
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
    path: '/',
    maxAge: SESSION_SECONDS,
  })
}

export async function createSession(c: AppContext, userId: string): Promise<void> {
  const token = randomToken()
  const now = nowSeconds(c)
  await c.env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, now, now + SESSION_SECONDS)
    .run()
  writeCookie(c, token)
}

export async function loadUser(c: AppContext): Promise<User | null> {
  const token = getCookie(c, COOKIE)
  if (!token || token.length > 128) return null
  const now = nowSeconds(c)
  const tokenHash = await sha256Hex(token)
  const row = await c.env.DB.prepare(
    `SELECT users.id AS id, users.email AS email, sessions.expires_at AS expiresAt FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
  )
    .bind(tokenHash, now)
    .first<User & { expiresAt: number }>()
  if (!row) return null

  // Wer die App regelmäßig nutzt, bleibt angemeldet: Ist die Hälfte der Laufzeit um, wird die Sitzung verlängert.
  if (row.expiresAt - now < SESSION_SECONDS / 2) {
    await c.env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').bind(now + SESSION_SECONDS, tokenHash).run()
    writeCookie(c, token)
  }
  return { id: row.id, email: row.email }
}

export async function destroySession(c: AppContext): Promise<void> {
  const token = getCookie(c, COOKIE)
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run()
  deleteCookie(c, COOKIE, { path: '/' })
}

/** Gibt den angemeldeten Nutzer zurück oder bricht mit „nicht angemeldet“ ab. */
export function requireUser(c: AppContext): User {
  const user = c.var.user
  if (!user) throw new ApiError(401, 'nicht_angemeldet', 'Bitte melde dich an.')
  return user
}
