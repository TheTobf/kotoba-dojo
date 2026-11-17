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
  /** Schrift-Stufen, die man selbst freigeschaltet hat („Kann ich schon“). */
  unlockedStages: WritingStage[]
}

export const DEFAULT_SETTINGS: Settings = { theme: 'system', showKana: true, showRomaji: true, newPerDay: 8, unlockedStages: [] }

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

export function applyTheme(theme: Settings['theme']) {
  const dark = theme === 'dunkel' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function updateSettings(change: Partial<Settings>) {
  cache = { ...read(), ...change }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // Privater Modus o. Ä.: Einstellung gilt dann nur bis zum Schließen der Seite.
  }
  if (change.theme) applyTheme(cache.theme)
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => listeners.delete(notify)
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_SETTINGS)
}

/** Folgt dem System, wenn „system“ gewählt ist und das Gerät zwischen hell und dunkel wechselt. */
export function watchSystemTheme() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(read().theme))
}
