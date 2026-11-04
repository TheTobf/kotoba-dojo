import { describe, expect, it } from 'vitest'
import { aufraeumen, bereinige, fuehreZusammen, leer, type TestStand } from './speicher'

describe('Speicher', () => {
  it('übernimmt nur gültige Daten', () => {
    const z = bereinige({
      gelesen: { a: ['2026-W45', '2026-W44', '2026-W45', 3], b: 'kaputt' },
      haken: { '2026-W45|a': [0, 2, 'x'] },
      klausur: { mathe: '2027-02-10', chemie: '2027-02-10', 'externes-rechnungswesen': 'morgen' },
      eigene: [{ id: 'lokal/1', fach: 'mathe', typ: 'übung', titel: 'T', inhalt: 'I', uebung: 1 }, { id: 2 }],
      schrift: 5,
      design: 'dunkel',
    })
    expect(z.gelesen).toEqual({ a: ['2026-W44', '2026-W45'] })
    expect(z.haken).toEqual({ '2026-W45|a': [0, 2] })
    expect(z.klausur).toEqual({ mathe: '2027-02-10' })
    expect(z.eigene).toHaveLength(1)
    expect(z.eigene[0]).toMatchObject({ typ: 'uebung', lokal: true })
    expect(z.schrift).toBe(1)
    expect(z.design).toBe('dunkel')
    expect(bereinige(null)).toEqual(leer())
  })

  it('Checklisten-Haken gelten nur für die aktuelle Woche', () => {
    const z = { ...leer(), haken: { '2026-W44|a': [1], '2026-W45|a': [0], '2026-W45|b': [] } }
    expect(aufraeumen(z, '2026-W45').haken).toEqual({ '2026-W45|a': [0] })
  })

  it('Sicherung wird zusammengeführt, nichts geht verloren', () => {
    const jetzt = { ...leer(), gelesen: { a: ['2026-W45'] }, klausur: { mathe: '2027-02-10' } }
    const alt = {
      ...leer(),
      gelesen: { a: ['2026-W44'], b: ['2026-W40'] },
      klausur: { 'externes-rechnungswesen': '2027-02-12' },
      eigene: [{ id: 'lokal/1', fach: 'mathe', typ: 'extra' as const, titel: 'T', inhalt: 'I', lokal: true }],
    }
    const z = fuehreZusammen(jetzt, alt)
    expect(z.gelesen).toEqual({ a: ['2026-W44', '2026-W45'], b: ['2026-W40'] })
    expect(z.klausur).toEqual({ mathe: '2027-02-10', 'externes-rechnungswesen': '2027-02-12' })
    expect(z.eigene).toHaveLength(1)
  })
  it('Test-Ergebnisse: bestes Ergebnis bleibt beim Zusammenführen erhalten', () => {
    const t = (beste: number, datum: string): TestStand => ({ richtig: 1, anzahl: 2, beste, datum, laeufe: 1 })
    const roh = bereinige({ tests: { a: t(0.5, '2026-11-04'), b: { kaputt: true } }, fragen: { 'a#1': { r: 1, f: 0, zuletzt: true }, x: 3 } })
    expect(Object.keys(roh.tests)).toEqual(['a'])
    expect(roh.fragen).toEqual({ 'a#1': { r: 1, f: 0, zuletzt: true } })
    const z = fuehreZusammen({ ...leer(), tests: { a: t(0.5, '2026-11-05') } }, { ...leer(), tests: { a: t(0.9, '2026-11-01'), c: t(1, '2026-11-01') } })
    expect(z.tests.a.beste).toBe(0.9)
    expect(z.tests.a.datum).toBe('2026-11-05')
    expect(z.tests.c.beste).toBe(1)
  })
})
