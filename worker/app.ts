/**
 * Die API (alles unter /api). Diese Datei steckt nur zusammen: Schutzschichten zuerst, dann die Routen.
 * Die eigentliche Logik steht in worker/routes/, worker/payments/ und worker/ai/.
 */
import { Hono } from 'hono'
import type { ApiErrorBody } from '../shared/api'
import type { AppEnv, Deps } from './context'
import { defaultDeps } from './deps'
import { ApiError } from './lib/errors'
import { loadUser } from './lib/session'
import { ai } from './routes/ai'
import { auth } from './routes/auth'
import { billing } from './routes/billing'
import { cancel } from './routes/cancel'
import { devStripe } from './routes/dev-stripe'
import { me } from './routes/me'
import { story } from './routes/story'
import { waitlist } from './routes/waitlist'

const WEBHOOK_PATH = '/api/stripe/webhook'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function createApp(overrides: Partial<Deps> = {}) {
  const deps: Deps = { ...defaultDeps, ...overrides }
  const app = new Hono<AppEnv>().basePath('/api')

  app.use('*', async (c, next) => {
    c.set('deps', deps)
    c.set('user', null)
    await next()
    // Antworten der API enthalten persönliche Daten – nie zwischenspeichern.
    c.header('Cache-Control', 'no-store')
    c.header('X-Content-Type-Options', 'nosniff')
  })

  // Schutz vor fremden Webseiten (CSRF): Schreibende Anfragen müssen von der eigenen Seite kommen.
  // Ausnahme ist der Stripe-Webhook – der weist sich über seine Signatur aus.
  app.use('*', async (c, next) => {
    if (!SAFE_METHODS.has(c.req.method) && c.req.path !== WEBHOOK_PATH) {
      const source = c.req.header('origin')
      if (!source || source !== new URL(c.req.url).origin) {
        throw new ApiError(403, 'herkunft_abgelehnt', 'Diese Anfrage kam nicht von Kotoba Dojo.')
      }
    }
    await next()
  })

  // Angemeldeten Nutzer aus dem Sitzungs-Cookie laden (für alle Routen außer dem Webhook).
  app.use('*', async (c, next) => {
    if (c.req.path !== WEBHOOK_PATH) c.set('user', await loadUser(c))
    await next()
  })

  app.route('/auth', auth)
  app.route('/', me)
  app.route('/', billing)
  app.route('/', cancel)
  app.route('/', ai)
  app.route('/', story)
  app.route('/', waitlist)
  app.route('/dev/stripe', devStripe)

  app.notFound((c) => c.json({ error: { code: 'nicht_gefunden', message: 'Nicht gefunden.' } } satisfies ApiErrorBody, 404))

  app.onError((error, c) => {
    if (error instanceof ApiError) return c.json(error.toBody(), error.status)
    // Unerwartete Fehler: Details nur ins Server-Protokoll, nie an den Browser.
    console.error(error)
    return c.json({ error: { code: 'serverfehler', message: 'Da ist etwas schiefgelaufen. Bitte versuch es noch einmal.' } } satisfies ApiErrorBody, 500)
  })

  return app
}
