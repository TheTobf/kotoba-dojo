/**
 * EINZIGE Stelle für Preise und Tarife. Oberfläche, Server und `npm run stripe:setup` lesen alle von hier.
 * Preis ändern = hier ändern und danach `npm run stripe:setup` ausführen (legt den neuen Preis bei Stripe an).
 */

export type PlanId = 'monthly' | 'yearly'

export interface Plan {
  id: PlanId
  name: string
  /** Endpreis in Cent (inkl. aller Steuern – siehe KLEINUNTERNEHMER). */
  priceCents: number
  interval: 'month' | 'year'
  /** Unter diesem Namen findet der Server den Preis bei Stripe (statt fester Preis-IDs in der Konfiguration). */
  lookupKey: string
}

export const CURRENCY = 'eur'

export const PLANS: Record<PlanId, Plan> = {
  monthly: { id: 'monthly', name: 'Monatlich', priceCents: 499, interval: 'month', lookupKey: 'kotoba_pro_monthly' },
  yearly: { id: 'yearly', name: 'Jährlich', priceCents: 3900, interval: 'year', lookupKey: 'kotoba_pro_yearly' },
}

export const PRODUCT_NAME = 'Kotoba Dojo Pro'

/**
 * Kleinunternehmer nach § 19 UStG: Es wird keine Umsatzsteuer berechnet und ausgewiesen.
 * [BITTE AUSFÜLLEN] Auf `false` stellen, sobald die Regelung nicht mehr gilt – dann den Steuerhinweis anpassen.
 */
export const KLEINUNTERNEHMER = true

export const TAX_NOTE = KLEINUNTERNEHMER
  ? 'Endpreis. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'
  : 'Endpreis inkl. gesetzlicher Umsatzsteuer.'

export function isPlanId(value: unknown): value is PlanId {
  return value === 'monthly' || value === 'yearly'
}

/** 499 → „4,99 €“, 3900 → „39 €“ */
export function formatPrice(cents: number): string {
  const euros = cents / 100
  return `${euros.toLocaleString('de-DE', { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })} €`
}

/** Ersparnis des Jahrestarifs gegenüber zwölf Monatszahlungen, in Prozent (abgerundet). */
export function yearlySavingsPercent(): number {
  const twelveMonths = PLANS.monthly.priceCents * 12
  return Math.floor(((twelveMonths - PLANS.yearly.priceCents) / twelveMonths) * 100)
}

/** Was Gratis-Nutzer ohne Konto ausprobieren dürfen. */
export const FREE_TRIAL_MISSIONS = 2
