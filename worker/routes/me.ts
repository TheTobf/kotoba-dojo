/** „Wer bin ich und was darf ich?“ – die Oberfläche fragt das beim Start ab. */
import { Hono } from 'hono'
import type { MeResponse, MistakeCard } from '../../shared/api'
import { computeAccess } from '../../shared/entitlement'
import { nowSeconds, type AppEnv } from '../context'
import { dayKey, readLimits, usedToday } from '../ai/limits'
import { getAccess } from '../lib/access'
import { requireUser } from '../lib/session'

export const me = new Hono<AppEnv>()

me.get('/me', async (c) => {
  const user = c.var.user
  if (!user) {
    const body: MeResponse = { user: null, access: computeAccess(null, nowSeconds(c)), plan: null, ai: null }
    return c.json(body)
  }
  const { access, subscription } = await getAccess(c, user.id)
  const body: MeResponse = {
    user: { email: user.email },
    access,
    plan: subscription?.plan ?? null,
    ai: access.pro
      ? { usedToday: await usedToday(c.env.DB, user.id, dayKey(c.var.deps.now())), dailyLimit: readLimits(c.env).dailyLimit }
      : null,
  }
  return c.json(body)
})

/** Fehler-Karteikarten aus KI-Gesprächen. Auch nach Ende von Pro abrufbar – die Karten gehören dem Nutzer. */
me.get('/mistakes', async (c) => {
  const user = requireUser(c)
  const since = Number.parseInt(c.req.query('since') ?? '0', 10) || 0
  const { results } = await c.env.DB.prepare(
    `SELECT id, ja, kana, romaji, de, note, created_at AS createdAt FROM mistake_cards
     WHERE user_id = ? AND created_at > ? ORDER BY created_at LIMIT 200`,
  )
    .bind(user.id, since)
    .all<MistakeCard>()
  return c.json({ cards: results })
})
