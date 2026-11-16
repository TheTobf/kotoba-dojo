/** Die Pro-Regel für sich allein: Welcher Abo-Stand bedeutet zu welchem Zeitpunkt „Pro“? */
import { describe, expect, it } from 'vitest'
import {
  computeAccess, PAST_DUE_GRACE_SECONDS, RENEWAL_BUFFER_SECONDS,
  type SubscriptionState, type SubscriptionStatus,
} from '../shared/entitlement'

const START = 1_800_000_000
const MONTH = 30 * 86_400
const sub = (overrides: Partial<SubscriptionState> = {}): SubscriptionState => ({
  status: 'active', periodStart: START, periodEnd: START + MONTH, cancelAt: null, ...overrides,
})

describe('Pro-Regel (computeAccess)', () => {
  it('ohne Abo gibt es kein Pro', () => {
    expect(computeAccess(null, START)).toEqual({ pro: false, reason: 'kein_abo', until: null })
    expect(computeAccess(undefined, START).pro).toBe(false)
  })

  it('aktives Abo im bezahlten Zeitraum ist Pro', () => {
    expect(computeAccess(sub(), START + 5)).toEqual({ pro: true, reason: 'aktiv', until: START + MONTH })
  })

  it('Probezeitraum zählt wie aktiv', () => {
    expect(computeAccess(sub({ status: 'trialing' }), START + 5).pro).toBe(true)
  })

  it('kurz nach Ende des Zeitraums gilt noch der Puffer für die Verlängerungs-Meldung', () => {
    expect(computeAccess(sub(), START + MONTH + RENEWAL_BUFFER_SECONDS - 1).pro).toBe(true)
  })

  it('abgelaufen: bleibt die Verlängerung aus, endet Pro von selbst – auch ohne Meldung von Stripe', () => {
    expect(computeAccess(sub(), START + MONTH + RENEWAL_BUFFER_SECONDS)).toEqual({ pro: false, reason: 'abgelaufen', until: null })
  })

  it('gekündigt: Pro bleibt bis zum Ende des bezahlten Zeitraums', () => {
    const cancelled = sub({ cancelAt: START + MONTH })
    expect(computeAccess(cancelled, START + MONTH - 60)).toEqual({ pro: true, reason: 'gekuendigt_laeuft', until: START + MONTH })
    expect(computeAccess(cancelled, START + MONTH + RENEWAL_BUFFER_SECONDS).pro).toBe(false)
  })

  it('gekündigt mit früherem Termin: es zählt der frühere Zeitpunkt', () => {
    const early = sub({ cancelAt: START + 10 * 86_400 })
    expect(computeAccess(early, START + 5 * 86_400).until).toBe(START + 10 * 86_400)
    expect(computeAccess(early, START + 12 * 86_400).pro).toBe(false)
  })

  it('beendetes Abo ist sofort kein Pro mehr – auch wenn der Zeitraum rechnerisch noch läuft', () => {
    expect(computeAccess(sub({ status: 'canceled' }), START + 5)).toEqual({ pro: false, reason: 'abgelaufen', until: null })
  })

  it('fehlgeschlagene Verlängerung: Pro nur während der Kulanzfrist', () => {
    const pastDue = sub({ status: 'past_due' })
    expect(computeAccess(pastDue, START + PAST_DUE_GRACE_SECONDS - 1)).toEqual({
      pro: true, reason: 'zahlung_offen', until: START + PAST_DUE_GRACE_SECONDS,
    })
    expect(computeAccess(pastDue, START + PAST_DUE_GRACE_SECONDS)).toEqual({ pro: false, reason: 'zahlung_fehlt', until: null })
  })

  it.each<SubscriptionStatus>(['incomplete', 'incomplete_expired', 'unpaid', 'paused'])('Status %s ist nie Pro', (status) => {
    expect(computeAccess(sub({ status }), START + 5).pro).toBe(false)
  })

  it('unbekannter Status ist im Zweifel kein Pro', () => {
    expect(computeAccess(sub({ status: 'irgendwas_neues' as SubscriptionStatus }), START + 5).pro).toBe(false)
  })
})
