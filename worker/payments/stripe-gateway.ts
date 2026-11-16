/** Echte Stripe-Anbindung (Checkout + Kundenportal). Wird nur mit einem Testschlüssel (sk_test_…) erzeugt. */
import Stripe from 'stripe'
import { CHECKOUT_CONSENTS } from '../../shared/legal'
import { PLANS } from '../../shared/plans'
import { ApiError } from '../lib/errors'
import type { CheckoutParams, PaymentGateway } from './gateway'

export class StripeGateway implements PaymentGateway {
  private readonly stripe: Stripe

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() })
  }

  async createCheckout({ user, plan, customerId, successUrl, cancelUrl }: CheckoutParams): Promise<string> {
    // Der Preis wird über seinen Namen (lookup_key) gefunden – angelegt von `npm run stripe:setup`.
    const prices = await this.stripe.prices.list({ lookup_keys: [PLANS[plan].lookupKey], active: true, limit: 1 })
    const price = prices.data[0]
    if (!price) {
      throw new ApiError(503, 'zahlung_nicht_eingerichtet', 'Der Preis ist bei Stripe noch nicht angelegt (npm run stripe:setup).')
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      locale: 'de',
      line_items: [{ price: price.id, quantity: 1 }],
      ...(customerId ? { customer: customerId } : { customer_email: user.email }),
      client_reference_id: user.id,
      // Über diese Angabe ordnet der Webhook das Abo dem Konto zu.
      subscription_data: { metadata: { user_id: user.id } },
      custom_text: {
        submit: { message: `${CHECKOUT_CONSENTS.immediateStart} ${CHECKOUT_CONSENTS.withdrawalExpires}` },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })
    if (!session.url) throw new Error('Stripe hat keine Checkout-Adresse geliefert.')
    return session.url
  }

  async createPortal(customerId: string, returnUrl: string): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl, locale: 'de' })
    return session.url
  }

  async cancelAtPeriodEnd(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
  }
}

/** Testmodus-Schlüssel beginnen mit sk_test_ (oder rk_test_ bei eingeschränkten Schlüsseln). */
export const isTestKey = (key: string) => key.startsWith('sk_test_') || key.startsWith('rk_test_')
