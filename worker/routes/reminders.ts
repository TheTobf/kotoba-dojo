/**
 * Tägliche Lern-Erinnerung (auch ohne Konto).
 *   GET    /api/reminders/key        öffentlicher VAPID-Schlüssel für den Browser
 *   POST   /api/reminders            Erinnerung anlegen/ändern {endpoint, time: "19:00", timeZone}
 *   POST   /api/reminders/:id/seen   „Heute schon gelernt“ → heute keine Erinnerung
 *   DELETE /api/reminders/:id        Erinnerung abbestellen
 * Verschickt werden die Erinnerungen vom Zeitplan (worker/index.ts → sendDueReminders), alle 15 Minuten.
 */
import { Hono } from 'hono'
import { nowSeconds, type AppEnv } from '../context'
import type { Env } from '../env'
import { randomId } from '../lib/crypto'
import { ApiError, invalid } from '../lib/errors'
import { parseText, readJson } from '../lib/validate'
import { isPushEndpoint, sendTickle, type VapidKeys } from '../lib/webpush'

export function vapidKeys(env: Env): VapidKeys | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_JWK || !env.VAPID_SUBJECT) return null
  return { publicKey: env.VAPID_PUBLIC_KEY, privateJwk: env.VAPID_PRIVATE_JWK, subject: env.VAPID_SUBJECT }
}

function parseTime(value: unknown): number {
  const match = typeof value === 'string' ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value) : null
  if (!match) throw invalid('Bitte gib eine Uhrzeit wie 19:00 an.')
  return Number(match[1]) * 60 + Number(match[2])
}

function parseTimeZone(value: unknown): string {
  const zone = parseText(value, 'Zeitzone', 64)
  try {
    new Intl.DateTimeFormat('de-DE', { timeZone: zone })
    return zone
  } catch {
    throw invalid('Unbekannte Zeitzone.')
  }
}

/** Ortszeit in einer Zeitzone: Tag (JJJJ-MM-TT) und Minuten nach Mitternacht. */
export function localTime(nowMs: number, timeZone: string): { day: string; minute: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(nowMs)).map((p) => [p.type, p.value]),
  )
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) }
}

export const reminders = new Hono<AppEnv>()

reminders.get('/reminders/key', (c) => {
  const keys = vapidKeys(c.env)
  if (!keys) throw new ApiError(503, 'zahlung_nicht_eingerichtet', 'Erinnerungen sind noch nicht eingerichtet.')
  return c.json({ publicKey: keys.publicKey })
})

reminders.post('/reminders', async (c) => {
  if (!vapidKeys(c.env)) throw new ApiError(503, 'zahlung_nicht_eingerichtet', 'Erinnerungen sind noch nicht eingerichtet.')
  const body = await readJson(c.req.raw)
  if (!isPushEndpoint(body.endpoint)) throw invalid('Diese Benachrichtigungs-Adresse wird nicht unterstützt.')
  const minute = parseTime(body.time)
  const timeZone = parseTimeZone(body.timeZone)
  const id = randomId('rem')
  await c.env.DB.prepare(
    `INSERT INTO reminders (id, endpoint, minute_of_day, time_zone, created_at) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(endpoint) DO UPDATE SET minute_of_day = ?3, time_zone = ?4`,
  ).bind(id, body.endpoint, minute, timeZone, nowSeconds(c)).run()
  const row = await c.env.DB.prepare('SELECT id FROM reminders WHERE endpoint = ?').bind(body.endpoint).first<{ id: string }>()
  return c.json({ id: row!.id })
})

reminders.post('/reminders/:id/seen', async (c) => {
  const row = await c.env.DB.prepare('SELECT time_zone FROM reminders WHERE id = ?').bind(c.req.param('id')).first<{ time_zone: string }>()
  if (!row) throw new ApiError(404, 'nicht_gefunden', 'Diese Erinnerung gibt es nicht.')
  const { day } = localTime(c.var.deps.now(), row.time_zone)
  await c.env.DB.prepare('UPDATE reminders SET last_seen_day = ? WHERE id = ?').bind(day, c.req.param('id')).run()
  return c.json({ ok: true })
})

reminders.delete('/reminders/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM reminders WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

interface ReminderRow {
  id: string
  endpoint: string
  minute_of_day: number
  time_zone: string
  last_sent_day: string | null
  last_seen_day: string | null
}

/** Höchstens so viele Erinnerungen pro Durchlauf (Gratis-Kontingent der Workers schonen). */
export const MAX_PER_RUN = 500

/**
 * Wird alle 15 Minuten vom Zeitplan aufgerufen. Erinnert alle, deren Uhrzeit erreicht ist, die heute noch nicht
 * erinnert wurden und heute noch nicht gelernt haben. Erinnerungen bis 3 Stunden nach der Wunschzeit holen ausgefallene
 * Durchläufe nach; später am Tag kommt keine mehr.
 */
export async function sendDueReminders(env: Env, nowMs: number, fetcher: typeof fetch = fetch): Promise<{ sent: number; removed: number }> {
  const keys = vapidKeys(env)
  if (!keys) return { sent: 0, removed: 0 }
  const { results } = await env.DB.prepare('SELECT id, endpoint, minute_of_day, time_zone, last_sent_day, last_seen_day FROM reminders').all<ReminderRow>()
  let sent = 0
  let removed = 0
  for (const row of results) {
    if (sent >= MAX_PER_RUN) break
    const { day, minute } = localTime(nowMs, row.time_zone)
    const due = minute >= row.minute_of_day && minute - row.minute_of_day <= 180
    if (!due || row.last_sent_day === day || row.last_seen_day === day) continue
    const result = await sendTickle(row.endpoint, keys, Math.floor(nowMs / 1000), fetcher).catch(() => 'fehler' as const)
    if (result === 'abgemeldet') {
      await env.DB.prepare('DELETE FROM reminders WHERE id = ?').bind(row.id).run()
      removed++
    } else if (result === 'gesendet') {
      await env.DB.prepare('UPDATE reminders SET last_sent_day = ? WHERE id = ?').bind(day, row.id).run()
      sent++
    }
  }
  return { sent, removed }
}
