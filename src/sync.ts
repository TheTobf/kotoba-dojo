import { db, type Backup, type KotobaDB } from './db'
import type { CardState, Profile, ReviewLogEntry } from './types'

/**
 * Abgleich zwischen Geräten über ein privates GitHub Gist.
 * Token + Gist-ID liegen nur in localStorage dieses Geräts (nie im Backup, nie im Gist).
 * Einstellungen bleiben pro Gerät – synchronisiert wird nur der Lernfortschritt.
 */

const DATEI = 'kotoba-dojo.json'
const BESCHREIBUNG = 'Kotoba Dojo – Lernfortschritt (automatisch)'
const LOG_TAGE = 90 // ältere Wiederholungen braucht die Statistik nicht
const API = 'https://api.github.com'

export interface SyncDaten {
  app: 'kotoba-dojo'
  version: 1
  syncedAt: string
  cards: CardState[]
  reviewLog: ReviewLogEntry[]
  profile?: Profile
}

// ---------- Zusammenführen (rein, testbar) ----------

const zeitVon = (c: CardState) => c.last_review ?? 0

export function mergeCards(a: CardState[], b: CardState[]): CardState[] {
  const m = new Map(a.map((c) => [c.id, c]))
  for (const c of b) {
    const x = m.get(c.id)
    if (!x || zeitVon(c) > zeitVon(x) || (zeitVon(c) === zeitVon(x) && c.reps > x.reps)) m.set(c.id, c)
  }
  return [...m.values()]
}

export function mergeLog(a: ReviewLogEntry[], b: ReviewLogEntry[], now = Date.now()): ReviewLogEntry[] {
  const grenze = now - LOG_TAGE * 86_400_000
  const m = new Map<string, ReviewLogEntry>()
  for (const e of [...a, ...b]) {
    if (e.at < grenze) continue
    const { id: _id, ...rest } = e
    m.set(`${e.cardId}@${e.at}`, rest)
  }
  return [...m.values()].sort((x, y) => x.at - y.at)
}

const maxJe = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
  const r = { ...a }
  for (const [k, v] of Object.entries(b)) r[k] = Math.max(r[k] ?? 0, v)
  return r
}

/** Zähler: jeweils das Maximum (verliert nichts, zählt aber nichts doppelt). */
export function mergeProfile(a?: Profile, b?: Profile): Profile | undefined {
  if (!a || !b) return a ?? b
  const neuer = (b.lastActiveDay ?? '') > (a.lastActiveDay ?? '') ? b
    : (a.lastActiveDay ?? '') > (b.lastActiveDay ?? '') ? a
    : b.streak > a.streak ? b : a
  return {
    ...a,
    xp: Math.max(a.xp, b.xp),
    streak: neuer.streak,
    lastActiveDay: neuer.lastActiveDay,
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    achievements: [...new Set([...a.achievements, ...b.achievements])],
    unlockedThemes: [...new Set([...a.unlockedThemes, ...b.unlockedThemes])],
    activeDays: maxJe(a.activeDays, b.activeDays),
    seasonXp: maxJe(a.seasonXp, b.seasonXp),
    omamoriUsed: Math.max(a.omamoriUsed ?? 0, b.omamoriUsed ?? 0),
  }
}

export function merge(lokal: Omit<SyncDaten, 'syncedAt'>, fern?: SyncDaten, now = Date.now()): SyncDaten {
  return {
    app: 'kotoba-dojo',
    version: 1,
    syncedAt: new Date(now).toISOString(),
    cards: mergeCards(lokal.cards, fern?.cards ?? []),
    reviewLog: mergeLog(lokal.reviewLog, fern?.reviewLog ?? [], now),
    profile: mergeProfile(lokal.profile, fern?.profile),
  }
}

// ---------- Lokale Daten ----------

async function lokal(d: KotobaDB): Promise<Omit<Backup, 'settings' | 'exportedAt'>> {
  return {
    app: 'kotoba-dojo', version: 1,
    cards: await d.cards.toArray(),
    reviewLog: await d.reviewLog.toArray(),
    profile: await d.profile.get('me'),
  }
}

async function schreibeLokal(s: SyncDaten, d: KotobaDB) {
  await d.transaction('rw', [d.cards, d.reviewLog, d.profile], async () => {
    // Während des Abrufs kann lokal weitergelernt worden sein → erneut mischen
    const jetzt = await lokal(d)
    const neu = merge(jetzt, s)
    await d.cards.bulkPut(neu.cards)
    await d.reviewLog.clear()
    await d.reviewLog.bulkAdd(neu.reviewLog)
    if (neu.profile) await d.profile.put(neu.profile)
  })
}

// ---------- GitHub ----------

const store = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? '' } catch { return '' } },
  set: (k: string, v: string) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k) } catch { /* privat */ } },
}
export const syncToken = { get: () => store.get('sync-token'), set: (v: string) => { store.set('sync-token', v.trim()); store.set('sync-gist', '') } }
export const letzterSync = () => store.get('sync-zeit')

async function gh(pfad: string, token: string, init?: RequestInit) {
  const r = await fetch(API + pfad, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  if (r.status === 401) throw new Error('Token ungültig oder abgelaufen')
  if (r.status === 404 && pfad.startsWith('/gists/')) return null
  if (!r.ok) throw new Error(`GitHub antwortet ${r.status}`)
  return r.json()
}

async function findeGist(token: string): Promise<string | undefined> {
  const gemerkt = store.get('sync-gist')
  if (gemerkt) return gemerkt
  for (let page = 1; page <= 5; page++) {
    const liste = await gh(`/gists?per_page=100&page=${page}`, token) as { id: string; files: Record<string, unknown> }[]
    const g = liste.find((x) => DATEI in x.files)
    if (g) { store.set('sync-gist', g.id); return g.id }
    if (liste.length < 100) break
  }
}

async function ladeFern(token: string, id: string): Promise<SyncDaten | undefined | null> {
  const g = await gh(`/gists/${id}`, token)
  if (!g) return null // gelöscht
  const f = g.files?.[DATEI]
  if (!f) return undefined
  const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content
  const daten = JSON.parse(text) as SyncDaten
  if (daten.app !== 'kotoba-dojo') throw new Error('Gist enthält keine Kotoba-Dojo-Daten')
  return daten
}

let laeuft: Promise<string> | undefined

/** Holt den Stand aus dem Gist, führt zusammen, schreibt beides zurück. Gibt eine kurze Meldung zurück. */
export function synchronisieren(d: KotobaDB = db): Promise<string> {
  laeuft ??= (async () => {
    const token = syncToken.get()
    if (!token) throw new Error('Kein Token eingetragen')
    if (!navigator.onLine) throw new Error('Offline')
    let id = await findeGist(token)
    let fern = id ? await ladeFern(token, id) : undefined
    if (fern === null) { store.set('sync-gist', ''); id = undefined; fern = undefined }
    const neu = merge(await lokal(d), fern ?? undefined)
    const body = JSON.stringify({ description: BESCHREIBUNG, files: { [DATEI]: { content: JSON.stringify(neu) } } })
    if (id) await gh(`/gists/${id}`, token, { method: 'PATCH', body })
    else store.set('sync-gist', (await gh('/gists', token, { method: 'POST', body: JSON.stringify({ ...JSON.parse(body), public: false }) })).id)
    await schreibeLokal(neu, d)
    store.set('sync-zeit', new Date().toISOString())
    return `✓ ${neu.cards.length} Karten abgeglichen`
  })().finally(() => { laeuft = undefined })
  return laeuft
}

/** Still im Hintergrund: beim Start, beim Verlassen der App und wenn wieder online. */
export function autoSync() {
  const los = () => { if (syncToken.get()) synchronisieren().catch(() => {}) }
  los()
  document.addEventListener('visibilitychange', los)
  window.addEventListener('online', los)
}
