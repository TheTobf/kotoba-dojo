/**
 * Einstiegspunkt des Cloudflare Workers. Anfragen an /api/* landen hier;
 * alles andere (die Oberfläche) liefert Cloudflare direkt als statische Dateien aus (siehe wrangler.jsonc).
 */
import { createApp } from './app'
import type { Env } from './env'

const app = createApp()

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => app.fetch(request, env, ctx),
} satisfies ExportedHandler<Env>
