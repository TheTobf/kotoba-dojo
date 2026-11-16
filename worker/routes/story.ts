/** Pro-Story-Missionen: Die Vorschau sieht jeder, den vollständigen Inhalt nur Pro. */
import { Hono } from 'hono'
import { toTeaser } from '../../shared/mission'
import type { AppEnv } from '../context'
import { findProMission, PRO_MISSIONS } from '../content/missions'
import { requirePro } from '../lib/access'
import { ApiError } from '../lib/errors'

export const story = new Hono<AppEnv>()

story.get('/story/missions', (c) => c.json({ missions: PRO_MISSIONS.map(toTeaser) }))

story.get('/story/missions/:id', async (c) => {
  await requirePro(c)
  const mission = findProMission(c.req.param('id'))
  if (!mission) throw new ApiError(404, 'nicht_gefunden', 'Diese Mission gibt es nicht.')
  return c.json({ mission })
})
