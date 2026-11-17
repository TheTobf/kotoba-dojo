/** Hell oder dunkel: setzt data-theme am <html>-Element (dieselbe Regel wie public/theme.js vor dem ersten Zeichnen). */
import { getSettings, subscribe, type Settings } from './settings'

export function applyTheme(theme: Settings['theme']) {
  const dark = theme === 'dunkel' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

/** Folgt der Einstellung und – bei „system“ – dem Gerät, wenn es zwischen hell und dunkel wechselt. */
export function watchTheme() {
  const apply = () => applyTheme(getSettings().theme)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply)
  subscribe(apply)
  apply()
}
