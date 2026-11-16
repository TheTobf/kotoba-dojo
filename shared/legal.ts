/**
 * Texte, denen Kunden vor dem Kauf ausdrücklich zustimmen müssen.
 * Wird ein Text geändert, MUSS die Version erhöht werden – der Server speichert zu jedem Kauf, welcher Version
 * zugestimmt wurde (Tabelle `checkout_consents`).
 *
 * [BITTE AUSFÜLLEN] Wortlaut vor dem Start rechtlich prüfen lassen.
 */
export const CHECKOUT_CONSENT_VERSION = '2026-11-entwurf-1'

export const CHECKOUT_CONSENTS = {
  immediateStart:
    'Ich verlange ausdrücklich, dass ihr vor Ablauf der Widerrufsfrist mit der Ausführung des Vertrags beginnt und mir Kotoba Dojo Pro sofort freischaltet.',
  withdrawalExpires:
    'Mir ist bekannt, dass ich bei vollständiger Vertragserfüllung mein Widerrufsrecht verliere; bei digitalen Inhalten erlischt es bereits mit Beginn der Ausführung.',
} as const

/** Platzhalter, der auf allen Rechtsseiten auffällig markiert wird. */
export const FILL_IN = '[BITTE AUSFÜLLEN]'
