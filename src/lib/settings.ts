/** Einstellungen dieses Geräts (Design, Lesehilfen). Liegen nur lokal im Browser, nie auf dem Server. */
import { useSyncExternalStore } from 'react'
import type { WritingStage } from './data'

export interface Settings {
  theme: 'system' | 'hell' | 'dunkel'
  /** Lesung in Kana unter japanischem Text zeigen. */
  showKana: boolean
  /** Lateinische Umschrift zeigen. */
  showRomaji: boolean
  /** Neue Karten pro Tag. */
  newPerDay: number
  /** Tagesziel: so viele Übungen (Karten, Zeichen, Missionsschritte) pro Tag. */
  dailyGoal: number
  /** Zustimmung zur Spracheingabe (der Browser schickt den Ton zur Erkennung an seinen Hersteller). */
  micConsent: boolean
  /** Hinweis „Sichere deinen Fortschritt“: wann zuletzt weggeklickt, wie oft. */
  nudgeDismissedAt: number
  nudgeDismissals: number
  /** Schrift-Stufen, die man selbst freigeschaltet hat („Kann ich schon“). */
  unlockedStages: WritingStage[]
}

export const DEFAULT_SETTINGS: Settings = { theme: 'system', showKana: true, showRomaji: true, newPerDay: 8, dailyGoal: 20, micConsent: false, nudgeDismissedAt: 0, nudgeDismissals: 0, unlockedStages: [] }

const KEY = 'kd.settings' // derselbe Schlüssel wie in public/theme.js
const listeners = new Set<() => void>()
let cache: Settings | undefined

function read(): Settings {
  if (cache) return cache
  try {
    cache = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    cache = DEFAULT_SETTINGS
  }
  return cache!
}

/** Aktuelle Einstellungen außerhalb von React (z. B. für das Tagesziel beim Verbuchen). */
export const getSettings = (): Settings => read()

export function updateSettings(change: Partial<Settings>) {
  cache = { ...read(), ...change }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // Privater Modus o. Ä.: Einstellung gilt dann nur bis zum Schließen der Seite.
  }
  listeners.forEach((notify) => notify())
}

/** Meldet jede Änderung der Einstellungen (z. B. für die Hell/Dunkel-Umschaltung in theme.ts). */
export function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => listeners.delete(notify)
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_SETTINGS)
}
