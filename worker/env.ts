/** Alles, was Cloudflare dem Server mitgibt: Datenbank, statische Dateien, Einstellungen und Geheimnisse. */
export interface Env {
  DB: D1Database
  ASSETS: Fetcher

  /** "development" nur lokal (.env). Alles andere gilt als Produktion. */
  ENVIRONMENT: string
  AI_PROVIDER: string
  AI_DAILY_LIMIT: string
  AI_MONTHLY_BUDGET_CENTS: string
  MAIL_PROVIDER: string

  // Geheimnisse (lokal in .env, online als `wrangler secret`)
  SESSION_SECRET?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  /** Lern-Erinnerung (Web Push): öffentlicher und privater VAPID-Schlüssel, Kontakt für die Push-Dienste. */
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_JWK?: string
  VAPID_SUBJECT?: string
  /** Nur wenn ausdrücklich "true": echte Zahlungen erlaubt. Standard ist ausschließlich der Stripe-Testmodus. */
  ALLOW_LIVE_PAYMENTS?: string
}

export const isDevelopment = (env: Env) => env.ENVIRONMENT === 'development'
