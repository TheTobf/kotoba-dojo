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

export async function createSession(c: AppContext, userId: string): Promise<void> {
  const token = randomToken()
  const now = nowSeconds(c)
  await c.env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, now, now + SESSION_SECONDS)
    .run()
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
    path: '/',
    maxAge: SESSION_SECONDS,
  })
}

export async function loadUser(c: AppContext): Promise<User | null> {
  const token = getCookie(c, COOKIE)
  if (!token || token.length > 128) return null
  const row = await c.env.DB.prepare(
    `SELECT users.id AS id, users.email AS email FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
  )
    .bind(await sha256Hex(token), nowSeconds(c))
    .first<User>()
  return row ?? null
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
