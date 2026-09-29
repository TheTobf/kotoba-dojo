import { startOfDay } from './srs'
import type { CardKind, CardState, ReviewLogEntry } from './types'

const DAY = 86_400_000
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)

/** Anteil „gewusst“ (Gut/Einfach bzw. richtig) an allen Bewertungen; „Kenn ich schon“ (0) zählt nicht. */
export function trefferquote(log: ReviewLogEntry[]) {
  const bewertet = log.filter((l) => l.rating >= 1)
  const q = (xs: ReviewLogEntry[]) => (xs.length ? xs.filter((l) => l.rating >= 3).length / xs.length : undefined)
  const proArt: Partial<Record<CardKind, number>> = {}
  for (const k of ['vokabel', 'quiz', 'zeichen'] as CardKind[]) {
    const v = q(bewertet.filter((l) => l.kind === k))
    if (v !== undefined) proArt[k] = v
  }
  return { gesamt: q(bewertet), proArt }
}

/** Wochen-Spalten (Mo–So) der letzten `wochen` Wochen für die Heatmap. */
export function heatmap(activeDays: Record<string, number>, wochen: number, now = Date.now()) {
  const heute = new Date(now)
  const wochentag = (heute.getDay() + 6) % 7 // Mo = 0
  const start = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() - wochentag - (wochen - 1) * 7, 12)
  return Array.from({ length: wochen }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const t = start.getTime() + (w * 7 + d) * DAY
      const tag = iso(t)
      return { tag, anzahl: activeDays[tag] ?? 0, zukunft: t > now + DAY / 2 }
    }))
}

/** Fällige Karten pro Tag für die nächsten `tage` Tage (heute inkl. Überfälliger). */
export function prognose(cards: CardState[], tage: number, now = Date.now()) {
  const s = startOfDay(now)
  const out = Array.from({ length: tage }, (_, i) => {
    const t = s + i * DAY
    const d = new Date(t)
    return { tag: iso(t + DAY / 2), kurz: `${d.getDate()}.`, anzahl: 0 }
  })
  for (const c of cards) {
    const i = Math.max(0, Math.floor((c.due - s) / DAY))
    if (i < tage) out[i].anzahl++
  }
  return out
}
