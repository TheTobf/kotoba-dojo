/**
 * Abgleich zwischen Geräten – für jedes Konto, auch ohne Pro.
 *   GET  /api/sync  → gespeicherter Lernstand (oder 204, wenn es noch keinen gibt)
 *   PUT  /api/sync  → neuen Lernstand speichern; `baseVersion` muss zur gespeicherten Version passen (sonst 409)
 * Zusammengeführt wird auf dem Gerät (src/lib/sync.ts). Der Server bewahrt nur auf und prüft die Größe.
 */
import { Hono } from 'hono'
import { nowSeconds, type AppEnv } from '../context'
import { gunzipBase64, gzipBase64 } from '../lib/compress'
import { ApiError, invalid } from '../lib/errors'
import { requireUser } from '../lib/session'
import { readJson } from '../lib/validate'

/** Obergrenze für einen Lernstand (unkomprimiert). Reicht für alle Karten der App mehrfach. */
export const MAX_SYNC_BYTES = 1_500_000

interface SyncRow {
  data: string
  version: number
  updated_at: number
}

export const sync = new Hono<AppEnv>()

sync.get('/sync', async (c) => {
  const user = requireUser(c)
  const row = await c.env.DB.prepare('SELECT data, version, updated_at FROM progress_sync WHERE user_id = ?').bind(user.id).first<SyncRow>()
  if (!row) return c.body(null, 204)
  return c.json({ version: row.version, updatedAt: row.updated_at, data: JSON.parse(await gunzipBase64(row.data)) })
})

sync.put('/sync', async (c) => {
  const user = requireUser(c)
  const length = Number(c.req.header('content-length') ?? 0)
  if (length > MAX_SYNC_BYTES) throw new ApiError(400, 'ungueltig', 'Der Lernstand ist zu groß zum Speichern.')
  const body = await readJson(c.req.raw)
  const baseVersion = body.baseVersion
  if (baseVersion !== null && (typeof baseVersion !== 'number' || !Number.isInteger(baseVersion))) throw invalid('Ungültige Version.')
  const data = body.data
  if (typeof data !== 'object' || data === null || Array.isArray(data) || (data as { app?: unknown }).app !== 'kotoba-dojo') {
    throw invalid('Das ist kein Lernstand von Kotoba Dojo.')
  }
  const json = JSON.stringify(data)
  const size = new TextEncoder().encode(json).length
  if (size > MAX_SYNC_BYTES) throw new ApiError(400, 'ungueltig', 'Der Lernstand ist zu groß zum Speichern.')

  const now = nowSeconds(c)
  const packed = await gzipBase64(json)
  // Nur speichern, wenn seit dem Abholen niemand anderes (z. B. ein zweites Gerät) gespeichert hat.
  const result = baseVersion === null
    ? await c.env.DB.prepare('INSERT OR IGNORE INTO progress_sync (user_id, data, version, size, updated_at) VALUES (?, ?, 1, ?, ?)')
      .bind(user.id, packed, size, now).run()
    : await c.env.DB.prepare('UPDATE progress_sync SET data = ?, version = version + 1, size = ?, updated_at = ? WHERE user_id = ? AND version = ?')
      .bind(packed, size, now, user.id, baseVersion).run()
  if (result.meta.changes === 0) throw new ApiError(409, 'ungueltig', 'Ein anderes Gerät hat inzwischen gespeichert. Bitte erneut abgleichen.')

  const row = await c.env.DB.prepare('SELECT version, updated_at FROM progress_sync WHERE user_id = ?').bind(user.id).first<{ version: number; updated_at: number }>()
  return c.json({ version: row!.version, updatedAt: row!.updated_at })
})
