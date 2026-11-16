/**
 * Test-Werkzeug: startet die echte API mit einer echten (leeren) D1-Datenbank und einer verstellbaren Uhr.
 * So prüfen die Tests denselben Code, der später online läuft – nur Mail, Zahlung und Zeit sind ersetzt.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getPlatformProxy, type PlatformProxy } from 'wrangler'
import type Stripe from 'stripe'
import { createApp } from '../worker/app'
import type { Deps } from '../worker/context'
import type { Env } from '../worker/env'
import type { Mail } from '../worker/lib/mailer'
import type { CheckoutParams, PaymentGateway } from '../worker/payments/gateway'
import { signPayload } from '../worker/payments/simulator'

export const ORIGIN = 'https://kotoba.test'
export const WEBHOOK_SECRET = 'whsec_test_geheimnis'
export const DAY = 86_400

const TABLES = [
  'sessions', 'login_codes', 'subscriptions', 'stripe_events', 'checkout_consents', 'cancellations',
  'ai_usage', 'ai_budget', 'mistake_cards', 'waitlist', 'users',
]

let proxy: PlatformProxy<{ DB: D1Database }> | undefined
let database: D1Database | undefined

/** Eine Datenbank im Arbeitsspeicher für alle Tests einer Datei; vor jedem Test wird sie geleert. */
async function getDatabase(): Promise<D1Database> {
  if (database) return database
  // Liest wrangler.jsonc und stellt dieselbe Datenbank-Art bereit wie Cloudflare (D1/SQLite) – ohne etwas zu speichern.
  proxy = await getPlatformProxy<{ DB: D1Database }>({ configPath: join(import.meta.dirname, '../wrangler.jsonc'), persist: false })
  database = proxy.env.DB
  const dir = join(import.meta.dirname, '../migrations')
  for (const file of readdirSync(dir).sort()) {
    const sql = readFileSync(join(dir, file), 'utf8').replace(/--.*$/gm, '')
    for (const statement of sql.split(';').map((s) => s.trim()).filter(Boolean)) await database.prepare(statement).run()
  }
  return database
}

export async function disposeDatabase() {
  await proxy?.dispose()
  proxy = undefined
  database = undefined
}

/** Zahlungsanbieter für Tests: merkt sich nur, was aufgerufen wurde. */
export class FakeGateway implements PaymentGateway {
  checkouts: CheckoutParams[] = []
  cancelled: string[] = []
  portals: string[] = []
  failCancel = false

  async createCheckout(params: CheckoutParams) {
    this.checkouts.push(params)
    return 'https://stripe.test/checkout'
  }
  async createPortal(customerId: string) {
    this.portals.push(customerId)
    return 'https://stripe.test/portal'
  }
  async cancelAtPeriodEnd(subscriptionId: string) {
    if (this.failCancel) throw new Error('Stripe nicht erreichbar')
    this.cancelled.push(subscriptionId)
  }
}

export interface TestOptions {
  env?: Partial<Env>
  deps?: Partial<Deps>
  /** `null` = keine Bezahlung eingerichtet, `'default'` = echte Auswahl aus worker/deps.ts (für Simulator-Tests). */
  gateway?: FakeGateway | null | 'default'
}

export class TestApp {
  /** Aktuelle Zeit in Millisekunden – Tests stellen sie mit `advance` vor. */
  nowMs = Date.UTC(2026, 10, 16, 12, 0, 0)
  mails: Mail[] = []
  gateway = new FakeGateway()

  private constructor(
    private readonly app: ReturnType<typeof createApp>,
    readonly env: Env,
  ) {}

  static async create(options: TestOptions = {}): Promise<TestApp> {
    const db = await getDatabase()
    for (const table of TABLES) await db.prepare(`DELETE FROM ${table}`).run()

    const env: Env = {
      DB: db,
      ASSETS: undefined as unknown as Fetcher,
      ENVIRONMENT: 'production',
      AI_PROVIDER: 'mock',
      AI_DAILY_LIMIT: '40',
      AI_MONTHLY_BUDGET_CENTS: '2000',
      MAIL_PROVIDER: 'console',
      SESSION_SECRET: 'test-geheimnis-mit-genug-laenge-123456',
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
      ...options.env,
    }

    // eslint-disable-next-line prefer-const
    let test: TestApp
    const deps: Partial<Deps> = {
      now: () => test.nowMs,
      mailer: () => ({ send: async (mail) => void test.mails.push(mail) }),
      ...(options.gateway === 'default' ? {} : { gateway: () => (options.gateway === null ? null : test.gateway) }),
      ...options.deps,
    }
    test = new TestApp(createApp(deps), env)
    if (options.gateway instanceof FakeGateway) test.gateway = options.gateway
    return test
  }

  get now(): number {
    return Math.floor(this.nowMs / 1000)
  }

  advance(seconds: number) {
    this.nowMs += seconds * 1000
  }

  get db(): D1Database {
    return this.env.DB
  }

  /** Schickt eine Anfrage an die API. `cookie` = Sitzung eines angemeldeten Nutzers. */
  async request(
    method: string,
    path: string,
    options: { body?: unknown; cookie?: string; headers?: Record<string, string>; form?: Record<string, string> } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = { ...options.headers }
    if (method !== 'GET' && headers.origin === undefined) headers.origin = ORIGIN
    if (options.cookie) headers.cookie = options.cookie
    let body: BodyInit | undefined
    if (options.form) {
      body = new URLSearchParams(options.form)
      headers['content-type'] = 'application/x-www-form-urlencoded'
    } else if (options.body !== undefined) {
      body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
      headers['content-type'] ??= 'application/json'
    }
    return this.app.fetch(new Request(`${ORIGIN}${path}`, { method, headers, body, redirect: 'manual' }), this.env)
  }

  get = (path: string, cookie?: string) => this.request('GET', path, { cookie })
  post = (path: string, body?: unknown, cookie?: string) => this.request('POST', path, { body, cookie })

  /** Meldet einen Nutzer an (legt das Konto bei Bedarf an) und gibt Cookie und Konto-ID zurück. */
  async login(email: string): Promise<{ cookie: string; userId: string }> {
    await this.post('/api/auth/start', { email })
    const code = this.mails.at(-1)!.text.match(/\b(\d{6})\b/)![1]
    const response = await this.post('/api/auth/verify', { email, code })
    if (response.status !== 200) throw new Error(`Anmeldung fehlgeschlagen: ${response.status}`)
    const cookie = response.headers.get('set-cookie')!.split(';')[0]
    const user = await this.db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
    return { cookie, userId: user!.id }
  }

  /** Stellt eine Stripe-Meldung zu – standardmäßig korrekt signiert und „gerade eben“ abgeschickt. */
  async deliver(event: Stripe.Event, options: { secret?: string; signedAt?: number; signature?: string | null } = {}): Promise<Response> {
    const payload = JSON.stringify(event)
    const signature =
      options.signature !== undefined ? options.signature : await signPayload(payload, options.secret ?? WEBHOOK_SECRET, options.signedAt ?? this.now)
    return this.request('POST', '/api/stripe/webhook', {
      body: payload,
      headers: { origin: '', ...(signature ? { 'stripe-signature': signature } : {}) },
    })
  }

  async isPro(cookie: string): Promise<boolean> {
    const me = (await (await this.get('/api/me', cookie)).json()) as { access: { pro: boolean } }
    return me.access.pro
  }
}

export const json = async <T = Record<string, any>>(response: Response): Promise<T> => (await response.json()) as T
