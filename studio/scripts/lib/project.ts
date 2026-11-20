/** Projekt-Daten laden: Stilvorlage, Lehrplan, Folgen, Fortschritt. Und: Status jeder Folge. */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { AppVideoZ, appAsEpisode, type AppVideo } from '../../src/episode/appvideo'
import type { CurriculumEntry, Episode } from '../../src/episode/schema'
import type { StyleRules } from '../../src/episode/timeline'
import { validateEpisode, type ValidateResult } from '../../src/episode/validate'
import { APPVIDEOS_DIR, CURRICULUM_FILE, EPISODES_DIR, LICENSES_DIR, PROGRESS_FILE, STYLE_FILE, episodeFile, outDir, recordingDir } from './paths'

export interface Style extends StyleRules {
  serie: string
  maskottchen: { id: string; name: string; beschreibung: string }
  audio: { stimmeLufs: number; japanischLufs: number; effekteLufs: number; gesamtLufs: number; spitzeDb: number; musik: string | null }
  stimmen: Record<string, { voicevox: string; stil: string } | string>
  verboteneWoerter: string[]
  hashtags: string[]
}

const readJson = <T,>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T

export const loadStyle = (): Style => readJson<Style>(STYLE_FILE)

export function voiceOf(style: Style, key: string): { voicevox: string; stil: string } {
  const v = style.stimmen[key]
  if (!v || typeof v === 'string') throw new Error(`Stimme „${key}“ fehlt in der Stilvorlage.`)
  return v
}
export const voiceKeys = (style: Style) => Object.entries(style.stimmen).filter(([, v]) => typeof v !== 'string').map(([k]) => k)

export function loadCurriculum(): Map<string, CurriculumEntry> {
  const data = readJson<{ eintraege: CurriculumEntry[] }>(CURRICULUM_FILE)
  return new Map(data.eintraege.map((e) => [e.id, e]))
}

/** Alle geplanten Folgen, sortiert nach Nummer */
export function episodeIds(): string[] {
  if (!existsSync(EPISODES_DIR)) return []
  return readdirSync(EPISODES_DIR).filter((d) => /^ep\d+$/.test(d) && existsSync(episodeFile(d))).sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)))
}

export const rawEpisode = (id: string): unknown => readJson(episodeFile(id))

export const isApp = (id: string) => id.startsWith('app-')
export function appIds(): string[] {
  if (!existsSync(APPVIDEOS_DIR)) return []
  return readdirSync(APPVIDEOS_DIR).filter((d) => /^app-\d+$/.test(d) && existsSync(episodeFile(d))).sort()
}
export function loadApp(id: string): AppVideo {
  const r = AppVideoZ.safeParse(rawEpisode(id))
  if (!r.success) throw new Error(`${id} hat Fehler:\n- ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n- ')}`)
  return r.data
}

/** Sätze, die vor dieser Folge eingeführt wurden (Satz → Folge) */
export function introducedBefore(id: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const other of episodeIds()) {
    if (Number(other.slice(2)) >= Number(id.slice(2))) break
    const raw = rawEpisode(other) as { learn?: { new?: string[] } }
    for (const s of raw.learn?.new ?? []) if (!map.has(s)) map.set(s, other)
  }
  return map
}

export function validate(id: string, strict = false): ValidateResult {
  const style = loadStyle()
  const before = introducedBefore(id)
  return validateEpisode(rawEpisode(id), {
    curriculum: loadCurriculum(),
    introducedBefore: before,
    hasEarlierEpisodes: episodeIds().some((e) => Number(e.slice(2)) < Number(id.slice(2))),
    voices: voiceKeys(style),
    forbiddenWords: style.verboteneWoerter,
    strict,
  })
}

export function loadEpisode(id: string, strict = false): Episode {
  if (isApp(id)) return appAsEpisode(loadApp(id))
  const r = validate(id, strict)
  if (r.errors.length || !r.episode) throw new Error(`${id} hat Fehler:\n- ${r.errors.join('\n- ')}`)
  return r.episode
}

/** Zahl der SAGEN-Sätze, die Ole vor dieser Folge schon kann */
export function counterBase(id: string): number {
  if (isApp(id)) return 0
  const cur = loadCurriculum()
  return [...introducedBefore(id).keys()].filter((s) => cur.get(s)?.art === 'sagen').length
}

const VOICE_EXT = ['m4a', 'mp3', 'wav', 'aac', 'ogg', 'opus', 'flac', 'mp4', 'webm']
/** Aufnahme der Folge (voice.m4a o. ä.), falls vorhanden */
export function recordingOf(id: string): string | undefined {
  const dir = recordingDir(id)
  for (const ext of VOICE_EXT) {
    const f = join(dir, `voice.${ext}`)
    if (existsSync(f)) return f
  }
  return undefined
}

export type EpisodeStatus = 'geplant' | 'aufnahme-da' | 'fertig'
export function statusOf(id: string): EpisodeStatus {
  if (existsSync(join(outDir(id), 'video.mp4'))) return 'fertig'
  if (recordingOf(id)) return 'aufnahme-da'
  return 'geplant'
}

/** progress.json neu berechnen (aus allen Folgen – so kann nichts auseinanderlaufen) */
export function writeProgress(): void {
  const folgen: Record<string, { neu: string[]; wiederholung: string[]; postDatum: string; status: EpisodeStatus }> = {}
  const eingefuehrt: Record<string, string> = {}
  const wiederholt: Record<string, string[]> = {}
  for (const id of episodeIds()) {
    const raw = rawEpisode(id) as Episode
    folgen[id] = { neu: raw.learn.new, wiederholung: raw.learn.review, postDatum: raw.postDate, status: statusOf(id) }
    for (const s of raw.learn.new) eingefuehrt[s] ??= id
    for (const s of raw.learn.review) (wiederholt[s] ??= []).push(id)
  }
  const data = {
    hinweis: 'Wird automatisch aus episodes/*/episode.json berechnet (npm run skripte / status). Nicht von Hand ändern.',
    stand: new Date().toISOString().slice(0, 10),
    folgen, eingefuehrt, wiederholt,
  }
  writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2) + '\n')
}

/** Welche VOICEVOX-Stimmen sind geprüft (licenses/voicevox/geprueft.json)? */
export function checkedVoices(): Record<string, { credit: string; kommerziell: boolean; geprueftAm: string; hinweise?: string }> {
  const f = join(LICENSES_DIR, 'geprueft.json')
  return existsSync(f) ? readJson(f) : {}
}
