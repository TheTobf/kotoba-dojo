import { db, type KotobaDB } from './db'
import { isLearned, startOfDay } from './srs'
import { DEFAULT_PROFILE, type CardState, type Profile } from './types'
import { aktuelleSaison, neueBelohnungen, omamoriVerfuegbar, stufeAus } from './pass'
import type { Belohnung } from './content/pass'

// ---------- Level & Ränge ----------

/** XP, die man für Level L insgesamt braucht (Level 1 = 0 XP). Jedes Level kostet 20 XP mehr als das vorige. */
export const xpForLevel = (level: number) => 100 * (level - 1) + 10 * (level - 1) * (level - 2)

export function levelInfo(xp: number) {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  const from = xpForLevel(level)
  const to = xpForLevel(level + 1)
  return { level, into: xp - from, need: to - from, ratio: (xp - from) / (to - from) }
}

export const RAENGE = [
  { ab: 1, jp: '見習い', de: 'Lehrling' },
  { ab: 5, jp: '学生', de: 'Schüler' },
  { ab: 12, jp: '先輩', de: 'Senpai' },
  { ab: 25, jp: '先生', de: 'Sensei' },
  { ab: 40, jp: '達人', de: 'Meister' },
] as const

export const rangFuer = (level: number) => [...RAENGE].reverse().find((r) => level >= r.ab)!

// ---------- XP-Werte ----------

export const XP = {
  karteGut: 10, karteSchwer: 6, karteNochmal: 3, kennIchSchon: 5,
  quizRichtig: 12, quizFalsch: 3,
  zeichenRichtig: 8, zeichenFalsch: 2, zeichnen: 15,
  satzRichtig: 15, satzFalsch: 3,
  comboBonus: 2,   // pro Combo-Stufe ab 3
} as const

// ---------- Farbthemen ----------

export const THEMEN = [
  { id: 'sakura', name: 'Sakura', farbe: '#ff5fa2', bedingung: 'Von Anfang an' },
  { id: 'neon', name: 'Neon-Tokyo', farbe: '#3de0ff', bedingung: '7 Tage Streak' },
  { id: 'matcha', name: 'Matcha', farbe: '#4cc38a', bedingung: 'Level 10' },
  { id: 'yuzu', name: 'Yuzu', farbe: '#ffb020', bedingung: '500 Wörter gelernt' },
  { id: 'fuji', name: 'Fuji-Violett', farbe: '#9b7bff', bedingung: 'Alle Kana gemeistert' },
  { id: 'momiji', name: 'Momiji', farbe: '#ff5a36', bedingung: 'Rang 先生' },
] as const

// ---------- Erfolge ----------

export interface Stand {
  woerter: number
  streak: number
  level: number
  hiragana: number   // Anteil gemeistert 0..1
  katakana: number
  kanji: number      // Anzahl gemeisterte Kanji
  comboMax: number
  quizPerfekt: boolean
  situationen: number
}

export const ERFOLGE: { id: string; icon: string; name: string; text: string; check: (s: Stand) => boolean; thema?: string }[] = [
  { id: 'w10', icon: '🌱', name: 'Erste Schritte', text: '10 Wörter gelernt', check: (s) => s.woerter >= 10 },
  { id: 'w50', icon: '🌿', name: 'Wortsammler', text: '50 Wörter gelernt', check: (s) => s.woerter >= 50 },
  { id: 'w150', icon: '🧳', name: 'Reisefertig', text: 'Den Reise-Block (150 Wörter) gelernt', check: (s) => s.woerter >= 150 },
  { id: 'w500', icon: '🌳', name: 'Halbes Tausend', text: '500 Wörter gelernt', check: (s) => s.woerter >= 500, thema: 'yuzu' },
  { id: 'w1000', icon: '🏯', name: 'Tausend Wörter', text: '1000 Wörter gelernt', check: (s) => s.woerter >= 1000 },
  { id: 'w2000', icon: '🗻', name: 'Gipfel', text: '2000 Wörter gelernt', check: (s) => s.woerter >= 2000 },
  { id: 's3', icon: '🔥', name: 'Warm gelaufen', text: '3 Tage Streak', check: (s) => s.streak >= 3 },
  { id: 's7', icon: '🎆', name: 'Eine Woche', text: '7 Tage Streak', check: (s) => s.streak >= 7, thema: 'neon' },
  { id: 's30', icon: '🌕', name: 'Ein Monat', text: '30 Tage Streak', check: (s) => s.streak >= 30 },
  { id: 's100', icon: '🐉', name: 'Drachenstreak', text: '100 Tage Streak', check: (s) => s.streak >= 100 },
  { id: 'l5', icon: '🎓', name: '学生', text: 'Rang Schüler erreicht (Level 5)', check: (s) => s.level >= 5 },
  { id: 'l10', icon: '🍵', name: 'Level 10', text: 'Level 10 erreicht', check: (s) => s.level >= 10, thema: 'matcha' },
  { id: 'l25', icon: '🧑‍🏫', name: '先生', text: 'Rang Sensei erreicht (Level 25)', check: (s) => s.level >= 25, thema: 'momiji' },
  { id: 'hira', icon: 'あ', name: 'Hiragana-Meister', text: 'Alle Hiragana gemeistert', check: (s) => s.hiragana >= 1 },
  { id: 'kata', icon: 'ア', name: 'Katakana-Meister', text: 'Alle Katakana gemeistert', check: (s) => s.katakana >= 1, thema: 'fuji' },
  { id: 'k50', icon: '漢', name: 'Kanji-Kenner', text: '50 Kanji gemeistert', check: (s) => s.kanji >= 50 },
  { id: 'combo10', icon: '⚡', name: 'Combo-König', text: '10 richtige Antworten am Stück', check: (s) => s.comboMax >= 10 },
  { id: 'perfekt', icon: '💯', name: '完璧', text: 'Ein Quiz ohne Fehler', check: (s) => s.quizPerfekt },
  { id: 'japan1', icon: '🗾', name: 'Erste Situation', text: 'Eine Japan-Situation gemeistert', check: (s) => s.situationen >= 1 },
  { id: 'japan8', icon: '🏮', name: 'Halb bereit', text: '8 Japan-Situationen gemeistert', check: (s) => s.situationen >= 8 },
  { id: 'japan16', icon: '✈️', name: 'Bereit für Japan', text: 'Alle 16 Japan-Situationen gemeistert', check: (s) => s.situationen >= 16 },
]

// ---------- Streak ----------

export const dayKey = (t = Date.now()) => {
  const d = new Date(startOfDay(t))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Wie viele Tage seit dem letzten Lerntag verpasst wurden (0 = gestern gelernt), bis max; sonst undefined. */
function verpasst(last: string, now: number, max: number) {
  for (let k = 1; k <= max + 1; k++) if (dayKey(now - k * 86_400_000) === last) return k - 1
  return undefined
}

/** Neuer Streak-Stand nach Aktivität heute. Omamori retten verpasste Tage (je Tag eins). */
export function nextStreak(p: Profile, now = Date.now(), omamori = 0) {
  if (p.lastActiveDay === dayKey(now)) return { streak: p.streak, erhoeht: false, verbraucht: 0 }
  const m = p.lastActiveDay ? verpasst(p.lastActiveDay, now, omamori) : undefined
  if (m === undefined) return { streak: 1, erhoeht: true, verbraucht: 0 }
  return { streak: p.streak + 1, erhoeht: true, verbraucht: m }
}

/** Streak, wie er gerade angezeigt wird (0, wenn er gerissen ist und kein Omamori ihn rettet). */
export function aktuellerStreak(p: Profile, now = Date.now(), omamori = 0) {
  if (!p.lastActiveDay) return 0
  if (p.lastActiveDay === dayKey(now)) return p.streak
  return verpasst(p.lastActiveDay, now, omamori) === undefined ? 0 : p.streak
}

// ---------- Ereignisse (für Toast, Maskottchen, Konfetti) ----------

export type Ereignis =
  | { typ: 'xp'; menge: number }
  | { typ: 'level'; level: number; rang?: string }
  | { typ: 'streak'; tage: number }
  | { typ: 'tagesziel' }
  | { typ: 'erfolg'; icon: string; name: string; text: string }
  | { typ: 'thema'; name: string }
  | { typ: 'pass'; stufe: number; saison: string; belohnung: Belohnung }
  | { typ: 'omamori'; tage: number }
  | { typ: 'sammeln' }

export function emit(e: Ereignis) {
  window.dispatchEvent(new CustomEvent('kotoba', { detail: e }))
}

// ---------- XP vergeben ----------

let comboMaxSession = 0
let quizPerfekt = false
export const merkeCombo = (n: number) => { comboMaxSession = Math.max(comboMaxSession, n) }
export const merkeQuizPerfekt = () => { quizPerfekt = true }

/** Aktueller Stand für die Erfolge (aus der Datenbank berechnet). */
export async function stand(d: KotobaDB, p: Profile, extra: { kana?: { hiragana: string[]; katakana: string[] }; situationen?: number } = {}): Promise<Stand> {
  const cards: CardState[] = await d.cards.toArray()
  const z = new Map(cards.filter((c) => c.kind === 'zeichen' && c.state === 2).map((c) => [c.refId, c]))
  const anteil = (chars?: string[]) => (chars?.length ? chars.filter((c) => z.has(c)).length / chars.length : 0)
  const kanaSet = new Set([...(extra.kana?.hiragana ?? []), ...(extra.kana?.katakana ?? [])])
  return {
    woerter: cards.filter((c) => c.kind === 'vokabel' && isLearned(c)).length,
    streak: p.streak,
    level: levelInfo(p.xp).level,
    hiragana: anteil(extra.kana?.hiragana),
    katakana: anteil(extra.kana?.katakana),
    kanji: [...z.keys()].filter((c) => !kanaSet.has(c) && /\p{Script=Han}/u.test(c)).length,
    comboMax: comboMaxSession,
    quizPerfekt,
    situationen: extra.situationen ?? 0,
  }
}

/** Kontext, den die App einmal setzt (Kana-Listen, Situationen-Zähler), damit Erfolge geprüft werden können. */
export const kontext: { kana?: { hiragana: string[]; katakana: string[] }; situationen?: () => Promise<number> } = {}

/**
 * Vergibt XP, aktualisiert Streak/Level, prüft Erfolge und Themen und meldet alles als Ereignis.
 * `dailyGoal`: Tagesziel in Karten (für die Meldung „Tagesziel geschafft“).
 */
export async function belohnen(menge: number, { dailyGoal = 20, d = db, now = Date.now() } = {}) {
  const situationen = await kontext.situationen?.()
  // In einer Transaktion, damit parallele Schreibvorgänge (Tageszähler aus rate()) nicht verloren gehen
  const { profile, events } = await d.transaction('rw', [d.profile, d.cards], () => belohnenIntern(menge, dailyGoal, d, now, situationen))
  if (typeof window !== 'undefined') events.forEach(emit)
  return { profile, events }
}

async function belohnenIntern(menge: number, dailyGoal: number, d: KotobaDB, now: number, situationen?: number) {
  const alt: Profile = { ...DEFAULT_PROFILE, ...(await d.profile.get('me')) }
  const { streak, erhoeht, verbraucht } = nextStreak(alt, now, omamoriVerfuegbar(alt))
  const saison = aktuelleSaison(now)
  const sxAlt = alt.seasonXp?.[saison.id] ?? 0
  const p: Profile = {
    ...alt,
    xp: alt.xp + menge,
    streak,
    bestStreak: Math.max(alt.bestStreak, streak),
    lastActiveDay: dayKey(now),
    seasonXp: { ...alt.seasonXp, [saison.id]: sxAlt + menge },
    omamoriUsed: (alt.omamoriUsed ?? 0) + verbraucht,
  }
  const events: Ereignis[] = [{ typ: 'xp', menge }]
  if (verbraucht) events.push({ typ: 'omamori', tage: verbraucht })
  const altStufe = stufeAus(sxAlt).stufe
  neueBelohnungen(saison, sxAlt, sxAlt + menge).forEach((b, i) =>
    events.push({ typ: 'pass', stufe: altStufe + i + 1, saison: saison.name, belohnung: b }))

  const lvAlt = levelInfo(alt.xp).level
  const lvNeu = levelInfo(p.xp).level
  if (lvNeu > lvAlt) {
    const rAlt = rangFuer(lvAlt), rNeu = rangFuer(lvNeu)
    events.push({ typ: 'level', level: lvNeu, rang: rNeu !== rAlt ? `${rNeu.jp} (${rNeu.de})` : undefined })
  }
  if (erhoeht && streak > 1) events.push({ typ: 'streak', tage: streak })

  const heute = p.activeDays[new Date(now).toISOString().slice(0, 10)] ?? 0
  const zielKey = `ziel-${dayKey(now)}`
  if (heute >= dailyGoal && !alt.achievements.includes(zielKey)) {
    p.achievements = [...p.achievements.filter((a) => !a.startsWith('ziel-')), zielKey]
    events.push({ typ: 'tagesziel' })
  }

  const st = await stand(d, p, { kana: kontext.kana, situationen })
  for (const e of ERFOLGE) {
    if (p.achievements.includes(e.id) || !e.check(st)) continue
    p.achievements = [...p.achievements, e.id]
    events.push({ typ: 'erfolg', icon: e.icon, name: e.name, text: e.text })
    if (e.thema && !p.unlockedThemes.includes(e.thema)) {
      p.unlockedThemes = [...p.unlockedThemes, e.thema]
      events.push({ typ: 'thema', name: THEMEN.find((t) => t.id === e.thema)!.name })
    }
  }

  await d.profile.put(p)
  return { profile: p, events }
}

/** XP-Bonus für Combos ab 3 in Folge. */
export const comboXp = (combo: number) => (combo >= 3 ? XP.comboBonus * Math.min(combo, 10) : 0)

/** Zählt eine Übung ohne FSRS-Karte (z. B. Satzbau) für Tagesziel und Heatmap. */
export async function zaehleAktivitaet(d: KotobaDB = db, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10)
  await d.transaction('rw', d.profile, async () => {
    const p: Profile = { ...DEFAULT_PROFILE, ...(await d.profile.get('me')) }
    await d.profile.put({ ...p, activeDays: { ...p.activeDays, [day]: (p.activeDays[day] ?? 0) + 1 } })
  })
}

/** Am Ende einer Übung: gesammelte XP als Koban in die Pass-Leiste fliegen lassen. */
export const sammeln = () => { if (typeof window !== 'undefined') emit({ typ: 'sammeln' }) }
