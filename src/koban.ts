/**
 * Koban-Münzen: XP werden während einer Übung gesammelt („ausstehend“) und am Ende als Münzen
 * in die Pass-Leiste gezogen. Die Leiste zeigt `echte XP − ausstehend`, damit sie sich mit jeder Münze füllt.
 */
type Listener = () => void
let ausstehend = 0
const listeners = new Set<Listener>()
const notify = () => listeners.forEach((l) => l())

export const koban = {
  get ausstehend() { return ausstehend },
  add(n: number) { ausstehend += n; notify() },
  /** Eine Münze ist angekommen. */
  take(n: number) { ausstehend = Math.max(0, ausstehend - n); notify() },
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l) } },
}

/** Letzte Tipp-/Klickposition – dort starten die Münzen. */
export const letzterTipp = { x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 }
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => { letzterTipp.x = e.clientX; letzterTipp.y = e.clientY }, { capture: true, passive: true })
}

/** Münzen für eine XP-Menge: 4–30 Stück, Wert gleichmäßig verteilt. */
export function muenzen(xp: number) {
  const n = Math.max(4, Math.min(30, Math.ceil(xp / 8)))
  const basis = Math.floor(xp / n)
  return Array.from({ length: n }, (_, i) => basis + (i < xp - basis * n ? 1 : 0))
}
