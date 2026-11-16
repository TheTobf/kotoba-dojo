/**
 * KI-Gespräche (Pro). Der einzige Weg zur KI – der Browser bekommt nie einen KI-Schlüssel zu sehen.
 * Reihenfolge der Prüfungen: angemeldet? → Pro? → Eingabe gültig? → Monatsbudget frei? → Tageskontingent frei?
 */
import { Hono } from 'hono'
import type { ChatResponse, ChatTurn } from '../../shared/api'
import { findCharacter } from '../../shared/characters'
import { nowSeconds, type AppEnv } from '../context'
import { dayKey, monthKey, readLimits, reserveBudget, returnDailySlot, settleBudget, takeDailySlot } from '../ai/limits'
import { requirePro } from '../lib/access'
import { randomId } from '../lib/crypto'
import { ApiError, invalid } from '../lib/errors'
import { parseText, readJson } from '../lib/validate'

/** Eingaben begrenzen = Kosten begrenzen. */
export const MAX_MESSAGE_LENGTH = 300
export const MAX_HISTORY_TURNS = 12

function parseHistory(value: unknown): ChatTurn[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw invalid('Der Gesprächsverlauf ist ungültig.')
  return value.slice(-MAX_HISTORY_TURNS).map((turn) => {
    const role = (turn as ChatTurn)?.role
    if (role !== 'user' && role !== 'character') throw invalid('Der Gesprächsverlauf ist ungültig.')
    return { role, text: parseText((turn as ChatTurn).text, 'Nachricht', 600) }
  })
}

export const ai = new Hono<AppEnv>()

ai.post('/ai/chat', async (c) => {
  const user = await requirePro(c)
  const body = await readJson(c.req.raw)
  const character = findCharacter(parseText(body.characterId, 'Figur', 40))
  if (!character) throw new ApiError(404, 'nicht_gefunden', 'Diese Figur gibt es nicht.')
  const message = parseText(body.message, 'Nachricht', MAX_MESSAGE_LENGTH)
  const history = parseHistory(body.history)

  const provider = c.var.deps.ai(c.env)
  const limits = readLimits(c.env)
  const nowMs = c.var.deps.now()
  const day = dayKey(nowMs)
  const month = monthKey(nowMs)
  const reserved = provider.maxCostMicroPerCall

  if (!(await reserveBudget(c.env.DB, month, reserved, limits.monthlyBudgetMicro))) {
    throw new ApiError(503, 'budget_erschoepft', 'Die KI macht für diesen Monat Pause. Ab dem nächsten Monat geht es weiter.')
  }
  const used = await takeDailySlot(c.env.DB, user.id, day, limits.dailyLimit)
  if (used === null) {
    await settleBudget(c.env.DB, month, reserved, 0)
    throw new ApiError(429, 'tageslimit', `Für heute sind deine ${limits.dailyLimit} KI-Nachrichten aufgebraucht. Morgen geht es weiter.`)
  }

  let output
  try {
    output = await provider.chat({ character, history, message, help: body.help === true })
  } catch (error) {
    // Fehlgeschlagene Aufrufe kosten den Nutzer nichts.
    await settleBudget(c.env.DB, month, reserved, 0)
    await returnDailySlot(c.env.DB, user.id, day)
    throw error
  }
  await settleBudget(c.env.DB, month, reserved, Math.min(output.costMicro, reserved))

  // Korrektur → automatisch eine Fehler-Karteikarte anlegen.
  if (output.correction) {
    const { better, explanation } = output.correction
    await c.env.DB.prepare('INSERT INTO mistake_cards (id, user_id, ja, kana, romaji, de, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(randomId('mis'), user.id, better.ja, better.kana, better.romaji, better.de, explanation, nowSeconds(c))
      .run()
  }

  const response: ChatResponse = {
    reply: output.reply,
    help: output.help,
    correction: output.correction,
    quota: { usedToday: used, dailyLimit: limits.dailyLimit },
    mock: provider.isMock,
  }
  return c.json(response)
})
