/**
 * Motivation: Punkte (XP), Level mit japanischen Rängen, Lernserie, Tagesziel und Erfolge.
 * Alles liegt auf dem Gerät (Tabelle `profile`). Jede Übung meldet ihre Aktivität über `recordActivity`;
 * daraus entstehen Meldungen (Level erreicht, Tagesziel geschafft …), die `src/ui/Toasts.tsx` zeigt.
 */
import { dayKey, dayKeyBefore } from './day'
import type { Kana } from './data'
import { db, type CardState, type KotobaDB } from './db'
import { getSettings } from './settings'

// ---------- Profil ----------

export interface Profile {
  id: 'me'
  xp: number
  /** Lernserie: so viele Lerntage hintereinander. */
  streak: number
  bestStreak: number
  lastActiveDay?: string
  /** Erreichte Erfolge (IDs) und erreichte Tagesziele (`ziel-JJJJ-MM-TT`). */
  achievements: string[]
  /** Lerntag → Anzahl Übungen (für Tagesziel und Lernkalender). */
  activeDays: Record<string, number>
}

export const emptyProfile = (): Profile => ({ id: 'me', xp: 0, streak: 0, bestStreak: 0, achievements: [], activeDays: {} })

export async function getProfile(d: KotobaDB = db): Promise<Profile> {
  return { ...emptyProfile(), ...(await d.profile.get('me')) }
}

// ---------- Level und Ränge ----------

/** XP, die man für Level L insgesamt braucht (Level 1 = 0 XP). Jedes Level kostet 20 XP mehr als das vorige. */
export const xpForLevel = (level: number) => 100 * (level - 1) + 10 * (level - 1) * (level - 2)

export function levelInfo(xp: number) {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  const from = xpForLevel(level)
  const to = xpForLevel(level + 1)
  return { level, into: xp - from, need: to - from, ratio: (xp - from) / (to - from) }
}

export const RANKS = [
  { from: 1, ja: '見習い', de: 'Lehrling' },
  { from: 5, ja: '学生', de: 'Schüler' },
  { from: 12, ja: '先輩', de: 'Senpai' },
  { from: 25, ja: '先生', de: 'Sensei' },
  { from: 40, ja: '達人', de: 'Meister' },
] as const

export const rankFor = (level: number) => [...RANKS].reverse().find((r) => level >= r.from)!

/** Punkte je Übung. */
export const XP = {
  cardEasy: 10, cardGood: 10, cardHard: 6, cardAgain: 3,
  glyphRight: 8, glyphWrong: 2,
  missionStep: 15, missionDone: 30,
  exerciseRight: 12, exerciseWrong: 3,
} as const

// ---------- Lernserie ----------

/** Lernserie, wie sie gerade gilt: 0, wenn gestern und heute nicht gelernt wurde. */
export function currentStreak(profile: Profile, now = Date.now()): number {
  if (!profile.lastActiveDay) return 0
  return profile.lastActiveDay === dayKey(now) || profile.lastActiveDay === dayKeyBefore(1, now) ? profile.streak : 0
}

function nextStreak(profile: Profile, now: number): { streak: number; grew: boolean } {
  const today = dayKey(now)
  if (profile.lastActiveDay === today) return { streak: profile.streak, grew: false }
  if (profile.lastActiveDay === dayKeyBefore(1, now)) return { streak: profile.streak + 1, grew: true }
  return { streak: 1, grew: true }
}

// ---------- Erfolge ----------

export interface ProgressStats {
  words: number
  streak: number
  level: number
  /** Anteil sicher gekonnter Hiragana bzw. Katakana (0 … 1). */
  hiragana: number
  katakana: number
  kanji: number
  bestCombo: number
  missions: number
  trialMissions: number
}

export interface Achievement {
  id: string
  /** Zeichen als Abzeichen (statt Emoji). */
  mark: string
  name: string
  text: string
  check: (s: ProgressStats) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'w10', mark: '芽', name: 'Erste Schritte', text: '10 Wörter gelernt', check: (s) => s.words >= 10 },
  { id: 'w50', mark: '葉', name: 'Wortsammler', text: '50 Wörter gelernt', check: (s) => s.words >= 50 },
  { id: 'w150', mark: '枝', name: 'Grundstock', text: '150 Wörter gelernt', check: (s) => s.words >= 150 },
  { id: 'w500', mark: '木', name: 'Halbes Tausend', text: '500 Wörter gelernt', check: (s) => s.words >= 500 },
  { id: 'w1000', mark: '森', name: 'Tausend Wörter', text: '1.000 Wörter gelernt', check: (s) => s.words >= 1000 },
  { id: 'w2000', mark: '山', name: 'Gipfel', text: '2.000 Wörter gelernt', check: (s) => s.words >= 2000 },
  { id: 's3', mark: '三', name: 'Warm gelaufen', text: '3 Tage in Folge gelernt', check: (s) => s.streak >= 3 },
  { id: 's7', mark: '週', name: 'Eine Woche', text: '7 Tage in Folge gelernt', check: (s) => s.streak >= 7 },
  { id: 's30', mark: '月', name: 'Ein Monat', text: '30 Tage in Folge gelernt', check: (s) => s.streak >= 30 },
  { id: 's100', mark: '百', name: 'Hundert Tage', text: '100 Tage in Folge gelernt', check: (s) => s.streak >= 100 },
  { id: 'l5', mark: '学', name: '学生', text: 'Rang Schüler erreicht (Level 5)', check: (s) => s.level >= 5 },
  { id: 'l12', mark: '輩', name: '先輩', text: 'Rang Senpai erreicht (Level 12)', check: (s) => s.level >= 12 },
  { id: 'l25', mark: '師', name: '先生', text: 'Rang Sensei erreicht (Level 25)', check: (s) => s.level >= 25 },
  { id: 'hira', mark: 'あ', name: 'Hiragana sicher', text: 'Alle 46 Hiragana sicher gekonnt', check: (s) => s.hiragana >= 1 },
  { id: 'kata', mark: 'ア', name: 'Katakana sicher', text: 'Alle 46 Katakana sicher gekonnt', check: (s) => s.katakana >= 1 },
  { id: 'k50', mark: '漢', name: 'Kanji-Kenner', text: '50 Kanji sicher gekonnt', check: (s) => s.kanji >= 50 },
  { id: 'combo10', mark: '連', name: 'In Serie', text: '10 richtige Antworten hintereinander', check: (s) => s.bestCombo >= 10 },
  { id: 'trial', mark: '話', name: 'Erste Worte', text: 'Beide Probe-Missionen geschafft', check: (s) => s.trialMissions >= 2 },
  { id: 'm5', mark: '旅', name: 'Unterwegs', text: '5 Missionen geschafft', check: (s) => s.missions >= 5 },
]

/** Beste Serie richtiger Antworten in dieser Sitzung (für den Erfolg „In Serie“). */
let sessionBestCombo = 0
export const noteCombo = (n: number) => { sessionBestCombo = Math.max(sessionBestCombo, n) }

let kanaCache: Promise<Kana[]> | undefined
async function kanaLists(): Promise<{ hiragana: string[]; katakana: string[] }> {
  try {
    kanaCache ??= import('./data').then((m) => m.loadKana())
    const kana = await kanaCache
    const base = (script: Kana['script']) => kana.filter((k) => k.script === script && !k.stage.endsWith('dakuten')).map((k) => k.char)
    return { hiragana: base('hiragana'), katakana: base('katakana') }
  } catch {
    kanaCache = undefined
    return { hiragana: [], katakana: [] }
  }
}

export function statsFrom(cards: CardState[], profile: Profile, missions: string[], kana: { hiragana: string[]; katakana: string[] }): ProgressStats {
  const mastered = new Set(cards.filter((c) => c.kind === 'zeichen' && c.state === 2).map((c) => c.refId))
  const share = (chars: string[]) => (chars.length ? chars.filter((c) => mastered.has(c)).length / chars.length : 0)
  return {
    words: cards.filter((c) => c.kind === 'wort').length,
    streak: profile.streak,
    level: levelInfo(profile.xp).level,
    hiragana: share(kana.hiragana),
    katakana: share(kana.katakana),
    kanji: [...mastered].filter((c) => /\p{Script=Han}/u.test(c)).length,
    bestCombo: sessionBestCombo,
    missions: missions.length,
    trialMissions: missions.filter((id) => id.startsWith('probe-')).length,
  }
}

// ---------- Meldungen ----------

export type ProgressEvent =
  | { type: 'level'; level: number; rank?: string }
  | { type: 'streak'; days: number }
  | { type: 'goal'; goal: number }
  | { type: 'achievement'; mark: string; name: string; text: string }

export const PROGRESS_EVENT = 'kotoba:progress'

function emit(events: ProgressEvent[]) {
  const target = globalThis as unknown as { dispatchEvent?: (event: Event) => boolean }
  if (typeof target.dispatchEvent !== 'function') return // z. B. in Tests
  for (const detail of events) target.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail }))
}

// ---------- Aktivität verbuchen ----------

export interface ActivityOptions {
  /** Zählt für das Tagesziel (eine Karte, ein Zeichen, ein Missionsschritt). */
  counts?: boolean
  dailyGoal?: number
  d?: KotobaDB
  now?: number
  kana?: { hiragana: string[]; katakana: string[] }
}

/** Verbucht XP und Aktivität, aktualisiert Lernserie, Tagesziel und Erfolge und gibt die neuen Meldungen zurück. */
export async function recordActivity(xp: number, { counts = true, dailyGoal = getSettings().dailyGoal, d = db, now = Date.now(), kana }: ActivityOptions = {}) {
  const lists = kana ?? (await kanaLists())
  const result = await d.transaction('rw', [d.profile, d.cards, d.missions], async () => {
    const before = await getProfile(d)
    const today = dayKey(now)
    const { streak, grew } = nextStreak(before, now)
    const profile: Profile = {
      ...before,
      xp: before.xp + xp,
      streak,
      bestStreak: Math.max(before.bestStreak, streak),
      lastActiveDay: today,
      activeDays: counts ? { ...before.activeDays, [today]: (before.activeDays[today] ?? 0) + 1 } : before.activeDays,
    }
    const events: ProgressEvent[] = []

    const levelBefore = levelInfo(before.xp).level
    const levelNow = levelInfo(profile.xp).level
    if (levelNow > levelBefore) {
      const rank = rankFor(levelNow)
      events.push({ type: 'level', level: levelNow, rank: rank !== rankFor(levelBefore) ? `${rank.ja} · ${rank.de}` : undefined })
    }
    if (grew && streak > 1) events.push({ type: 'streak', days: streak })

    const goalKey = `ziel-${today}`
    if ((profile.activeDays[today] ?? 0) >= dailyGoal && !profile.achievements.includes(goalKey)) {
      profile.achievements = [...profile.achievements.filter((a) => !a.startsWith('ziel-')), goalKey]
      events.push({ type: 'goal', goal: dailyGoal })
    }

    const cards = await d.cards.toArray()
    const missions = (await d.missions.toArray()).map((m) => m.missionId)
    const stats = statsFrom(cards, profile, missions, lists)
    for (const a of ACHIEVEMENTS) {
      if (profile.achievements.includes(a.id) || !a.check(stats)) continue
      profile.achievements = [...profile.achievements, a.id]
      events.push({ type: 'achievement', mark: a.mark, name: a.name, text: a.text })
    }

    await d.profile.put(profile)
    return { profile, events }
  })
  emit(result.events)
  return result
}

/** Tagesziel erreicht heute? */
export const doneToday = (profile: Profile, now = Date.now()) => profile.activeDays[dayKey(now)] ?? 0

/** Mission abgeschlossen: speichern und Punkte vergeben. */
export async function completeMission(missionId: string, dailyGoal?: number, d: KotobaDB = db, now = Date.now()) {
  await d.missions.put({ missionId, completedAt: now })
  return recordActivity(XP.missionDone, { counts: false, dailyGoal, d, now })
}
