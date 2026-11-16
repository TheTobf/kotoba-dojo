/**
 * Kostenbremsen für die KI:
 *   1. Tageskontingent pro Nutzer (Anzahl Nachrichten),
 *   2. globales Monatsbudget für alle Nutzer zusammen (in Euro).
 *
 * Beide Zähler werden mit EINER Datenbank-Anweisung geprüft und erhöht („atomar“). So können auch viele
 * gleichzeitige Anfragen das Limit nicht überschreiten.
 */

/** Tag bzw. Monat in UTC, z. B. „2026-11-16“ und „2026-11“. */
export const dayKey = (nowMs: number) => new Date(nowMs).toISOString().slice(0, 10)
export const monthKey = (nowMs: number) => new Date(nowMs).toISOString().slice(0, 7)

export interface AiLimits {
  dailyLimit: number
  monthlyBudgetMicro: number
}

export function readLimits(env: { AI_DAILY_LIMIT: string; AI_MONTHLY_BUDGET_CENTS: string }): AiLimits {
  const daily = Number.parseInt(env.AI_DAILY_LIMIT, 10)
  const cents = Number.parseInt(env.AI_MONTHLY_BUDGET_CENTS, 10)
  // Fehlt eine Einstellung oder ist sie kaputt, gilt 0 – also lieber gar keine KI als unbegrenzte Kosten.
  return {
    dailyLimit: Number.isFinite(daily) && daily > 0 ? daily : 0,
    monthlyBudgetMicro: Number.isFinite(cents) && cents > 0 ? cents * 10_000 : 0,
  }
}

/** Zählt eine Nachricht für heute. Gibt den neuen Stand zurück oder `null`, wenn das Tageslimit erreicht ist. */
export async function takeDailySlot(db: D1Database, userId: string, day: string, dailyLimit: number): Promise<number | null> {
  if (dailyLimit <= 0) return null
  const row = await db
    .prepare(
      `INSERT INTO ai_usage (user_id, day, count) VALUES (?1, ?2, 1)
       ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1 WHERE count < ?3
       RETURNING count`,
    )
    .bind(userId, day, dailyLimit)
    .first<{ count: number }>()
  return row?.count ?? null
}

export async function returnDailySlot(db: D1Database, userId: string, day: string): Promise<void> {
  await db.prepare('UPDATE ai_usage SET count = MAX(count - 1, 0) WHERE user_id = ? AND day = ?').bind(userId, day).run()
}

export async function usedToday(db: D1Database, userId: string, day: string): Promise<number> {
  const row = await db.prepare('SELECT count FROM ai_usage WHERE user_id = ? AND day = ?').bind(userId, day).first<{ count: number }>()
  return row?.count ?? 0
}

/** Reserviert einen Betrag vom Monatsbudget. `false` = Budget reicht nicht mehr. */
export async function reserveBudget(db: D1Database, month: string, amountMicro: number, budgetMicro: number): Promise<boolean> {
  if (amountMicro > budgetMicro) return false
  const row = await db
    .prepare(
      `INSERT INTO ai_budget (month, spent_micro) VALUES (?1, ?2)
       ON CONFLICT(month) DO UPDATE SET spent_micro = spent_micro + ?2 WHERE spent_micro + ?2 <= ?3
       RETURNING spent_micro`,
    )
    .bind(month, amountMicro, budgetMicro)
    .first<{ spent_micro: number }>()
  return row !== null
}

/** Ersetzt die Reservierung durch die tatsächlichen Kosten (0 = Aufruf fehlgeschlagen, alles zurück). */
export async function settleBudget(db: D1Database, month: string, reservedMicro: number, actualMicro: number): Promise<void> {
  await db
    .prepare('UPDATE ai_budget SET spent_micro = MAX(spent_micro - ?2 + ?3, 0) WHERE month = ?1')
    .bind(month, reservedMicro, actualMicro)
    .run()
}
