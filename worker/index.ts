/**
 * Einstiegspunkt des Cloudflare Workers. Anfragen an /api/* landen hier;
 * alles andere (die Oberfläche) liefert Cloudflare direkt als statische Dateien aus (siehe wrangler.jsonc).
 */
import { createApp } from './app'
import type { Env } from './env'
import { sendDueReminders } from './routes/reminders'

const app = createApp()

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => app.fetch(request, env, ctx),
  // Zeitplan (wrangler.jsonc → triggers.crons): alle 15 Minuten fällige Lern-Erinnerungen verschicken.
  scheduled: (_event: ScheduledController, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(sendDueReminders(env, Date.now()).then((r) => console.log(`Erinnerungen: ${r.sent} gesendet, ${r.removed} abgemeldet`)))
  },
} satisfies ExportedHandler<Env>
