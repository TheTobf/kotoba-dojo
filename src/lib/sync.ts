/**
 * Abgleich zwischen Geräten (für alle mit Konto, auch ohne Pro).
 *
 * Ablauf von `syncNow`:
 *   1. Lernstand vom Server holen (GET /api/sync).
 *   2. Mit dem Lernstand dieses Geräts zusammenführen – nichts geht verloren (siehe merge…).
 *   3. Ergebnis hier speichern und zum Server schicken (PUT, mit Versionsnummer).
 *      Hat ein anderes Gerät inzwischen gespeichert (409), geht es noch einmal von vorn los.
 *
 * Abgeglichen werden Karten-Zustände, erledigte Missionen und Punkte/Serie/Erfolge.
 * Nicht abgeglichen: Einstellungen (pro Gerät) und das Bewertungs-Protokoll (bleibt auf dem Gerät).
 */
import { db, FLASHCARD_KINDS, type CardKind, type CardState, type KotobaDB, type MissionProgress } from './db'
import type { Profile } from './progress'

// ---------- Format (kompakt, damit auch tausende Karten klein bleiben) ----------

/** [id, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review, introducedAt] */
export type CompactCard = [string, number, number, number, number, number, number, number, number, number, number, number]

export interface Snapshot {
  app: 'kotoba-dojo'
  version: 1
  savedAt: number
  cards: CompactCard[]
  missions: [string, number][]
  profile: Profile | null
}

const KINDS: CardKind[] = [...FLASHCARD_KINDS, 'zeichen', 'quiz']
const round4 = (n: number) => Math.round(n * 10_000) / 10_000

export function compactCard(c: CardState): CompactCard {
  return [c.id, c.due, round4(c.stability), round4(c.difficulty), c.elapsed_days, c.scheduled_days, c.learning_steps, c.reps, c.lapses, c.state, c.last_review ?? 0, c.introducedAt]
}

export function expandCard(c: CompactCard): CardState | undefined {
  const [id, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, lastReview, introducedAt] = c
  const split = id.indexOf(':')
  const kind = id.slice(0, split) as CardKind
  if (split < 1 || !KINDS.includes(kind)) return undefined
  return {
    id, kind, refId: id.slice(split + 1), due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state,
    last_review: lastReview || undefined, introducedAt,
  }
}

// ---------- Zusammenführen (rein, testbar) ----------

const reviewedAt = (c: CardState) => c.last_review ?? 0

/** Pro Karte gewinnt die zuletzt bewertete; bei Gleichstand die mit mehr Wiederholungen. */
export function mergeCards(a: CardState[], b: CardState[]): CardState[] {
  const result = new Map(a.map((c) => [c.id, c]))
  for (const card of b) {
    const mine = result.get(card.id)
    if (!mine || reviewedAt(card) > reviewedAt(mine) || (reviewedAt(card) === reviewedAt(mine) && card.reps > mine.reps)) result.set(card.id, card)
  }
  return [...result.values()]
}

export function mergeMissions(a: MissionProgress[], b: MissionProgress[]): MissionProgress[] {
  const result = new Map(a.map((m) => [m.missionId, m]))
  for (const m of b) {
    const mine = result.get(m.missionId)
    if (!mine || m.completedAt < mine.completedAt) result.set(m.missionId, m)
  }
  return [...result.values()]
}

const maxPerKey = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
  const result = { ...a }
  for (const [k, v] of Object.entries(b)) result[k] = Math.max(result[k] ?? 0, v)
  return result
}

/** Zähler: jeweils das Maximum (verliert nichts, zählt nichts doppelt). Die Lernserie kommt vom zuletzt aktiven Gerät. */
export function mergeProfile(a: Profile | null | undefined, b: Profile | null | undefined): Profile | null {
  if (!a || !b) return a ?? b ?? null
  const day = (p: Profile) => p.lastActiveDay ?? ''
  const latest = day(b) > day(a) ? b : day(a) > day(b) ? a : b.streak > a.streak ? b : a
  return {
    id: 'me',
    xp: Math.max(a.xp, b.xp),
    streak: latest.streak,
    lastActiveDay: latest.lastActiveDay,
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    achievements: [...new Set([...a.achievements, ...b.achievements])],
    activeDays: maxPerKey(a.activeDays, b.activeDays),
  }
}

export interface LocalState {
  cards: CardState[]
  missions: MissionProgress[]
  profile: Profile | null
}

export function mergeStates(local: LocalState, remote: LocalState | undefined): LocalState {
  if (!remote) return local
  return {
    cards: mergeCards(local.cards, remote.cards),
    missions: mergeMissions(local.missions, remote.missions),
    profile: mergeProfile(local.profile, remote.profile),
  }
}

export function toSnapshot(state: LocalState, now = Date.now()): Snapshot {
  return {
    app: 'kotoba-dojo', version: 1, savedAt: now,
    cards: state.cards.map(compactCard),
    missions: state.missions.map((m) => [m.missionId, m.completedAt]),
    profile: state.profile,
  }
}

export function fromSnapshot(s: Snapshot): LocalState {
  return {
    cards: (s.cards ?? []).map(expandCard).filter((c): c is CardState => !!c),
    missions: (s.missions ?? []).map(([missionId, completedAt]) => ({ missionId, completedAt })),
    profile: s.profile ?? null,
  }
}

// ---------- Gerät ----------

async function readLocal(d: KotobaDB): Promise<LocalState> {
  return { cards: await d.cards.toArray(), missions: await d.missions.toArray(), profile: (await d.profile.get('me')) ?? null }
}

/** Speichert den zusammengeführten Stand – und führt dabei noch einmal mit dem aktuellen Stand zusammen,
 *  falls während des Abgleichs weitergelernt wurde. */
async function writeLocal(d: KotobaDB, remote: LocalState): Promise<LocalState> {
  return d.transaction('rw', [d.cards, d.missions, d.profile], async () => {
    const merged = mergeStates(await readLocal(d), remote)
    await d.cards.bulkPut(merged.cards)
    await d.missions.bulkPut(merged.missions)
    if (merged.profile) await d.profile.put(merged.profile)
    return merged
  })
}

/** Löscht den Lernstand auf diesem Gerät (z. B. wenn sich ein anderes Konto anmeldet). */
export async function clearLocal(d: KotobaDB = db) {
  await d.transaction('rw', [d.cards, d.missions, d.profile, d.reviewLog, d.mistakes], async () => {
    await Promise.all([d.cards.clear(), d.missions.clear(), d.profile.clear(), d.reviewLog.clear(), d.mistakes.clear()])
  })
}

// ---------- Merkzettel dieses Geräts ----------

const OWNER_KEY = 'kd.syncOwner'
const LAST_KEY = 'kd.lastSync'
const storage = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* privater Modus */ } },
}
export const lastSyncAt = () => Number(storage.get(LAST_KEY) ?? 0) || 0
export const forgetSyncOwner = () => { storage.set(OWNER_KEY, null); storage.set(LAST_KEY, null) }

// ---------- Abgleich ----------

export type Fetcher = (method: 'GET' | 'PUT', body?: unknown) => Promise<{ status: number; data?: { version: number; data?: Snapshot } }>

const defaultFetcher: Fetcher = async (method, body) => {
  const response = await fetch('/api/sync', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = response.status === 204 ? undefined : ((await response.json().catch(() => undefined)) as { version: number; data?: Snapshot } | undefined)
  return { status: response.status, data }
}

export class SyncError extends Error {}

let running: Promise<void> | undefined

/** Gleicht den Lernstand dieses Geräts mit dem Konto ab. Mehrere Aufrufe gleichzeitig laufen nur einmal. */
export function syncNow(userId: string, { d = db, fetcher = defaultFetcher, now = Date.now } = {}): Promise<void> {
  running ??= (async () => {
    // Lag hier der Lernstand eines anderen Kontos? Der ist dort schon gesichert → Gerät leeren statt vermischen.
    const owner = storage.get(OWNER_KEY)
    if (owner && owner !== userId) await clearLocal(d)

    for (let attempt = 0; attempt < 3; attempt++) {
      const got = await fetcher('GET')
      if (got.status !== 200 && got.status !== 204) throw new SyncError(`Abgleich nicht möglich (${got.status}).`)
      const remote = got.status === 200 && got.data?.data ? fromSnapshot(got.data.data) : undefined
      const merged = await writeLocal(d, remote ?? { cards: [], missions: [], profile: null })
      const saved = await fetcher('PUT', { data: toSnapshot(merged, now()), baseVersion: got.status === 200 ? got.data!.version : null })
      if (saved.status === 409) continue // anderes Gerät war schneller → noch einmal
      if (saved.status !== 200) throw new SyncError(`Speichern nicht möglich (${saved.status}).`)
      storage.set(OWNER_KEY, userId)
      storage.set(LAST_KEY, String(now()))
      return
    }
    throw new SyncError('Ein anderes Gerät speichert gerade. Bitte gleich noch einmal versuchen.')
  })().finally(() => { running = undefined })
  return running
}
