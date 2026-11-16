/**
 * Schnittstelle zum Zahlungsanbieter. Die Routen kennen nur diese drei Aktionen – dahinter steckt entweder
 * Stripe im Testmodus (stripe-gateway.ts) oder lokal der Stripe-Simulator (simulator.ts).
 *
 * Wichtig: Keine dieser Aktionen schreibt den Abo-Stand in die Datenbank. Das macht ausschließlich der
 * verifizierte Webhook (webhook.ts), nachdem der Zahlungsanbieter die Änderung gemeldet hat.
 */
import type { PlanId } from '../../shared/plans'
import type { User } from '../context'

export interface CheckoutParams {
  user: User
  plan: PlanId
  /** Vorhandene Stripe-Kundennummer (bei Wiederkäufern), sonst null. */
  customerId: string | null
  successUrl: string
  cancelUrl: string
}

export interface PaymentGateway {
  /** Erstellt die Bezahlseite und gibt deren Adresse zurück. */
  createCheckout(params: CheckoutParams): Promise<string>
  /** Erstellt die Kundenportal-Sitzung (Zahlungsart ändern, Rechnungen, kündigen). */
  createPortal(customerId: string, returnUrl: string): Promise<string>
  /** Ordentliche Kündigung: Das Abo läuft bis zum Ende des bezahlten Zeitraums und verlängert sich nicht. */
  cancelAtPeriodEnd(subscriptionId: string): Promise<void>
}
