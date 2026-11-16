/** Die echten Bausteine für den Betrieb (Uhr, Mail, Zahlung, KI). Tests ersetzen einzelne davon. */
import { createAiProvider } from './ai/provider'
import { origin, type Deps } from './context'
import { ApiError } from './lib/errors'
import { createMailer } from './lib/mailer'
import { SimulatorGateway } from './payments/simulator'
import { isTestKey, StripeGateway } from './payments/stripe-gateway'
import { deliverSigned, loadSimulated, simulatorEnabled } from './routes/dev-stripe'

export const defaultDeps: Deps = {
  now: () => Date.now(),
  mailer: createMailer,
  ai: createAiProvider,

  gateway(c) {
    const key = c.env.STRIPE_SECRET_KEY?.trim()
    if (key) {
      // Sicherung: Mit einem Live-Schlüssel geht nichts, solange echte Zahlungen nicht ausdrücklich erlaubt sind.
      if (!isTestKey(key) && c.env.ALLOW_LIVE_PAYMENTS !== 'true') {
        throw new ApiError(503, 'zahlung_nicht_eingerichtet', 'Es ist ein Live-Schlüssel hinterlegt, erlaubt ist aber nur der Stripe-Testmodus.')
      }
      return new StripeGateway(key)
    }
    if (simulatorEnabled(c.env)) {
      return new SimulatorGateway(
        origin(c),
        (subscriptionId) => loadSimulated(c.env.DB, subscriptionId),
        (event) => deliverSigned(c, event),
        c.var.deps.now,
      )
    }
    return null
  },
}
