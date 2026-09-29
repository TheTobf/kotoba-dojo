import { describe, expect, it } from 'vitest'
import { KotobaDB } from './db'
import { aktuelleSaison, besitz, neueBelohnungen, omamoriVerfuegbar, stufeAus } from './pass'
import { ALLE_BELOHNUNGEN, SAISONS, XP_PRO_STUFE } from './content/pass'
import { belohnen, dayKey, nextStreak } from './motivation'
import { koban, muenzen } from './koban'
import { DEFAULT_PROFILE } from './types'

const DAY = 86_400_000

describe('Reise-Pass', () => {
  it('4 Saisons à 25 Stufen, lückenlos bis zur Reise, letzte Stufe = Randeffekt, IDs eindeutig', () => {
    expect(SAISONS).toHaveLength(4)
    for (const s of SAISONS) {
      expect(s.stufen).toHaveLength(25)
      expect(s.stufen[24].art).toBe('effekt')
    }
    expect(SAISONS[3].bis).toBe('2027-09-30')
    expect(SAISONS.find((s) => s.id === 'fruehling')!.stufen[24].wert).toBe('sakura')
    expect(new Set(ALLE_BELOHNUNGEN.map((b) => b.id)).size).toBe(ALLE_BELOHNUNGEN.length)
  })

  it('Saison nach Datum', () => {
    expect(aktuelleSaison(new Date(2026, 9, 1).getTime()).id).toBe('herbst')
    expect(aktuelleSaison(new Date(2027, 4, 5).getTime()).id).toBe('fruehling')
    expect(aktuelleSaison(new Date(2028, 0, 1).getTime()).id).toBe('sommer')
  })

  it('Stufen aus XP, Besitz bleibt über Saisons hinweg', () => {
    expect(stufeAus(0).stufe).toBe(0)
    expect(stufeAus(XP_PRO_STUFE * 3 + 10)).toMatchObject({ stufe: 3, rest: 10 })
    expect(stufeAus(1e9)).toMatchObject({ stufe: 25, fertig: true })
    const b = besitz({ seasonXp: { herbst: XP_PRO_STUFE * 2, winter: XP_PRO_STUFE } })
    expect(b.map((x) => x.id)).toEqual(['tier-neko', 'stempel-fushimi', 'tier-tanuki', 'stempel-sensoji'])
    expect(neueBelohnungen(SAISONS[0], 790, 1610).map((x) => x.id)).toEqual(['stempel-fushimi', 'tier-tanuki'])
  })

  it('Omamori retten einen verpassten Tag', () => {
    const now = new Date(2026, 9, 10, 12).getTime()
    const p = { ...DEFAULT_PROFILE, streak: 8, lastActiveDay: dayKey(now - 2 * DAY) }
    expect(nextStreak(p, now, 0)).toMatchObject({ streak: 1, verbraucht: 0 })
    expect(nextStreak(p, now, 1)).toMatchObject({ streak: 9, verbraucht: 1 })
    expect(omamoriVerfuegbar({ seasonXp: { herbst: XP_PRO_STUFE * 5 }, omamoriUsed: 0 })).toBe(1)
    expect(omamoriVerfuegbar({ seasonXp: { herbst: XP_PRO_STUFE * 5 }, omamoriUsed: 1 })).toBe(0)
  })

  it('belohnen zählt Saison-XP und meldet neue Stufen', async () => {
    const d = new KotobaDB('pass-1')
    const now = new Date(2026, 9, 10, 12).getTime()
    await d.profile.put({ ...DEFAULT_PROFILE, seasonXp: { herbst: XP_PRO_STUFE - 5 } })
    const { profile, events } = await belohnen(10, { d, now })
    expect(profile.seasonXp?.herbst).toBe(XP_PRO_STUFE + 5)
    expect(events.find((e) => e.typ === 'pass')).toMatchObject({ stufe: 1, belohnung: { id: 'stempel-fushimi' } })
  })

  it('Koban: XP werden auf 4–30 Münzen verteilt, Summe bleibt gleich', () => {
    for (const xp of [3, 10, 57, 400, 2000]) {
      const m = muenzen(xp)
      expect(m.length).toBeGreaterThanOrEqual(4)
      expect(m.length).toBeLessThanOrEqual(30)
      expect(m.reduce((a, b) => a + b, 0)).toBe(Math.max(xp, 0))
    }
    koban.add(20); koban.take(15); koban.take(15)
    expect(koban.ausstehend).toBe(0)
  })
})
