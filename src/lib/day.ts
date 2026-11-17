/** Lerntage: Ein neuer Lerntag beginnt um 4 Uhr morgens – wer nach Mitternacht lernt, zählt noch zum Vortag. */

const DAY = 86_400_000

export function startOfDay(now = Date.now()): number {
  const day = new Date(now)
  day.setHours(4, 0, 0, 0)
  if (day.getTime() > now) day.setTime(day.getTime() - DAY)
  return day.getTime()
}

/** Lerntag als Text, z. B. „2026-11-17“ (Ortszeit, Tagesgrenze 4 Uhr). */
export function dayKey(now = Date.now()): string {
  const d = new Date(startOfDay(now))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Der Lerntag `offset` Tage vor `now`. */
export const dayKeyBefore = (offset: number, now = Date.now()) => dayKey(startOfDay(now) - offset * DAY + 12 * 3_600_000)
