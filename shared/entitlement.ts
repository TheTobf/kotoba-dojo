/**
 * DIE Pro-Regel. Diese eine Funktion entscheidet, ob ein Abo-Stand „Pro“ bedeutet.
 *
 * - Sie läuft auf dem SERVER (worker/lib/access.ts) – nur dessen Ergebnis zählt.
 * - Der Abo-Stand kommt aus der Datenbank und wird dort ausschließlich vom verifizierten Stripe-Webhook geschrieben.
 * - Die Funktion ist „rein“ (keine Datenbank, keine Uhr): Zeit kommt als Parameter herein. Dadurch ist sie
 *   leicht testbar – siehe tests/entitlement.test.ts.
 */

/** Stripe-Status eines Abos. */
export type SubscriptionStatus =
  | 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused'

/** Abo-Stand, wie er in der Tabelle `subscriptions` liegt (Zeiten in Unix-Sekunden). */
export interface SubscriptionState {
  status: SubscriptionStatus
  periodStart: number
  periodEnd: number
  /** Gesetzt, wenn gekündigt wurde: Zeitpunkt, zu dem das Abo endet. */
  cancelAt: number | null
}

export type AccessReason =
  | 'kein_abo'          // nie gekauft
  | 'aktiv'             // bezahlt, läuft
  | 'gekuendigt_laeuft' // gekündigt, aber der bezahlte Zeitraum läuft noch
  | 'zahlung_offen'     // Verlängerung ist fehlgeschlagen, Kulanzfrist läuft
  | 'zahlung_fehlt'     // Kulanzfrist vorbei oder Erstzahlung nie abgeschlossen
  | 'abgelaufen'        // Abo beendet oder bezahlter Zeitraum vorbei

export interface Access {
  pro: boolean
  reason: AccessReason
  /** Bis wann Pro mindestens gilt (Unix-Sekunden) – nur wenn `pro` wahr ist. */
  until: number | null
}

const DAY = 86_400

/**
 * Puffer nach Ende des bezahlten Zeitraums. Stripe meldet die Verlängerung meist nach Sekunden, selten aber erst
 * nach Stunden. Ohne Puffer würden zahlende Nutzer kurz ausgesperrt.
 */
export const RENEWAL_BUFFER_SECONDS = 1 * DAY

/** Kulanz bei fehlgeschlagener Verlängerung (Karte abgelaufen o. Ä.): so lange bleibt Pro noch an. */
export const PAST_DUE_GRACE_SECONDS = 3 * DAY

export function computeAccess(sub: SubscriptionState | null | undefined, nowSeconds: number): Access {
  if (!sub) return { pro: false, reason: 'kein_abo', until: null }

  switch (sub.status) {
    case 'active':
    case 'trialing': {
      // Ende = Ende des bezahlten Zeitraums; bei Kündigung zusätzlich nie später als der Kündigungstermin.
      const cancelled = sub.cancelAt !== null
      const end = cancelled ? Math.min(sub.periodEnd, sub.cancelAt!) : sub.periodEnd
      // Auch wenn die „beendet“-Meldung von Stripe nie ankommt, endet Pro hier von selbst.
      const hardEnd = end + RENEWAL_BUFFER_SECONDS
      if (nowSeconds >= hardEnd) return { pro: false, reason: 'abgelaufen', until: null }
      return { pro: true, reason: cancelled ? 'gekuendigt_laeuft' : 'aktiv', until: end }
    }
    case 'past_due': {
      // Stripe hat den neuen Zeitraum schon begonnen, die Zahlung dafür fehlt aber noch.
      const graceEnd = sub.periodStart + PAST_DUE_GRACE_SECONDS
      if (nowSeconds >= graceEnd) return { pro: false, reason: 'zahlung_fehlt', until: null }
      return { pro: true, reason: 'zahlung_offen', until: graceEnd }
    }
    case 'incomplete':
    case 'unpaid':
    case 'paused':
      return { pro: false, reason: 'zahlung_fehlt', until: null }
    case 'canceled':
    case 'incomplete_expired':
      return { pro: false, reason: 'abgelaufen', until: null }
    default: {
      // Unbekannter Status (Stripe führt gelegentlich neue ein): im Zweifel KEIN Pro.
      const unknown: never = sub.status
      void unknown
      return { pro: false, reason: 'zahlung_fehlt', until: null }
    }
  }
}
