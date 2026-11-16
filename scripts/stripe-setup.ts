/**
 * Legt im Stripe-TESTMODUS alles an, was die App braucht – passend zu den Preisen in shared/plans.ts:
 *   - das Produkt „Kotoba Dojo Pro“
 *   - je einen Preis für monatlich und jährlich (auffindbar über ihren lookup_key)
 *   - eine Einstellung für das Kundenportal (Kündigen und Zahlungsart ändern erlaubt)
 *
 * Aufruf:  npm run stripe:setup        (liest STRIPE_SECRET_KEY aus .env)
 * Das Skript kann beliebig oft laufen: Was schon passt, bleibt unverändert. Ändert sich ein Preis in
 * shared/plans.ts, entsteht ein neuer Stripe-Preis und übernimmt den lookup_key (bestehende Abos behalten den alten).
 *
 * ⚠ Noch nicht gegen ein echtes Stripe-Konto ausgeführt (in der Aufbau-Sitzung gab es keinen Testschlüssel).
 */
import Stripe from 'stripe'
import { CURRENCY, PLANS, PRODUCT_NAME, formatPrice } from '../shared/plans'

try {
  process.loadEnvFile('.env')
} catch {
  // keine .env – dann muss STRIPE_SECRET_KEY in der Umgebung stehen
}

const key = process.env.STRIPE_SECRET_KEY?.trim()
if (!key) {
  console.error('STRIPE_SECRET_KEY fehlt. Trage deinen Testschlüssel (sk_test_…) in die Datei .env ein.')
  process.exit(1)
}
if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
  console.error('Abbruch: Das ist kein Testschlüssel. Dieses Skript arbeitet ausschließlich im Stripe-Testmodus.')
  process.exit(1)
}

const stripe = new Stripe(key)
const PRODUCT_MARKER = 'kotoba_dojo_pro'

async function ensureProduct(): Promise<Stripe.Product> {
  const existing = await stripe.products.search({ query: `metadata['app_product']:'${PRODUCT_MARKER}' AND active:'true'` })
  if (existing.data[0]) return existing.data[0]
  return stripe.products.create({ name: PRODUCT_NAME, metadata: { app_product: PRODUCT_MARKER } })
}

async function ensurePrice(product: Stripe.Product, plan: (typeof PLANS)[keyof typeof PLANS]): Promise<Stripe.Price> {
  const current = (await stripe.prices.list({ lookup_keys: [plan.lookupKey], active: true, limit: 1 })).data[0]
  const matches =
    current && current.unit_amount === plan.priceCents && current.currency === CURRENCY && current.recurring?.interval === plan.interval
  if (matches) return current
  return stripe.prices.create({
    product: product.id,
    currency: CURRENCY,
    unit_amount: plan.priceCents,
    recurring: { interval: plan.interval },
    lookup_key: plan.lookupKey,
    transfer_lookup_key: true, // übernimmt den Namen von einem älteren Preis
    nickname: `${PRODUCT_NAME} ${plan.name}`,
  })
}

async function ensurePortal(): Promise<void> {
  const configs = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 })
  if (configs.data[0]) return
  await stripe.billingPortal.configurations.create({
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
    },
  })
}

const product = await ensureProduct()
console.log(`✔ Produkt: ${product.name} (${product.id})`)
for (const plan of Object.values(PLANS)) {
  const price = await ensurePrice(product, plan)
  console.log(`✔ Preis ${plan.name}: ${formatPrice(plan.priceCents)} / ${plan.interval} → ${price.id} (lookup_key ${plan.lookupKey})`)
}
await ensurePortal()
console.log('✔ Kundenportal ist eingerichtet')
console.log('\nFertig. Weiter mit: stripe listen --forward-to localhost:5173/api/stripe/webhook  (siehe README.md)')
