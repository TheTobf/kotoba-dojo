/** Gemeinsame Typen für alle Routen. */
import type { Context } from 'hono'
import type { AiProvider } from './ai/provider'
import type { Env } from './env'
import type { Mailer } from './lib/mailer'
import type { PaymentGateway } from './payments/gateway'

export interface User {
  id: string
  email: string
}

/**
 * Austauschbare Bausteine. Im Betrieb liefert `defaultDeps` die echten; Tests setzen eigene ein
 * (z. B. eine verstellbare Uhr), ohne dass der Rest des Codes davon etwas merkt.
 */
export interface Deps {
  /** Aktuelle Zeit in Millisekunden. */
  now(): number
  mailer(env: Env): Mailer
  /** `null` = Bezahlung ist nicht eingerichtet. */
  gateway(c: AppContext): PaymentGateway | null
  ai(env: Env): AiProvider
}

export type AppEnv = {
  Bindings: Env
  Variables: { deps: Deps; user: User | null }
}

export type AppContext = Context<AppEnv>

/** Aktuelle Zeit in Unix-Sekunden. */
export const nowSeconds = (c: AppContext) => Math.floor(c.var.deps.now() / 1000)

/** Adresse, unter der die App gerade läuft (z. B. http://localhost:5173). */
export const origin = (c: AppContext) => new URL(c.req.url).origin
