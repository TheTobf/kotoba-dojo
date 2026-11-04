import { describe, expect, it } from 'vitest'
import { findeFach, fachAktiv, fachById } from './faecher'
import {
  alsMarkdown,
  ausPfad,
  baueZettel,
  bezeichnung,
  dateiname,
  entferneCodeRahmen,
  gliedereFach,
  leseKopf,
  reihenfolge,
  suche,
  wochenListe,
  type Zettel,
} from './zettel'

function z(teil: Partial<Zettel> & { id: string }): Zettel {
  return { fach: 'mathe', typ: 'uebung', titel: teil.id, inhalt: '', lokal: false, ...teil }
}

describe('Kopfbereich', () => {
  it('liest Schlüssel, Anführungszeichen und Doppelpunkte im Wert', () => {
    const { kopf, inhalt } = leseKopf('---\r\ntitel: "Beispiel: Ableitungen"\r\nÜbung: 3\r\ntyp: uebung\r\n---\r\n\r\n## Los\r\n')
    expect(kopf).toEqual({ titel: 'Beispiel: Ableitungen', uebung: '3', typ: 'uebung' })
    expect(inhalt).toBe('\n## Los\n')
  })

  it('ohne Kopf bleibt der Text unverändert', () => {
    expect(leseKopf('Hallo').kopf).toEqual({})
  })

  it('entfernt einen ```markdown-Rahmen aus dem Chat', () => {
    expect(entferneCodeRahmen('```markdown\n---\ntitel: A\n---\nText\n```')).toBe('---\ntitel: A\n---\nText')
    expect(entferneCodeRahmen('  Text  ')).toBe('Text')
  })
})

describe('Lernzettel bauen', () => {
  it('nimmt das Fach aus dem Ordner', () => {
    const { fach, id } = ausPfad('../inhalte/externes-rechnungswesen/uebung-02-1-bilanz.md')
    expect(fach).toBe('externes-rechnungswesen')
    expect(id).toBe('externes-rechnungswesen/uebung-02-1-bilanz')
    const r = baueZettel(id, '---\ntitel: Bilanz\ntyp: übung\nuebung: 2\nteil: 1\ndatum: 2026-11-04\n---\nText', { fach })
    expect(r.fehler).toEqual([])
    expect(r.zettel).toMatchObject({ fach, typ: 'uebung', uebung: 2, teil: 1, titel: 'Bilanz', inhalt: 'Text' })
  })

  it('meldet fehlende Angaben', () => {
    const r = baueZettel('mathe/x', '---\ntyp: uebung\ndatum: 4.11.2026\n---\nText', { fach: 'mathe' })
    expect(r.fehler).toEqual(['uebung: Nummer fehlt', 'titel fehlt', 'datum „4.11.2026“ nicht im Format JJJJ-MM-TT'])
  })

  it('erkennt Fächer an verschiedenen Schreibweisen', () => {
    expect(findeFach('Externes Rechnungswesen')?.id).toBe('externes-rechnungswesen')
    expect(findeFach('ExReWe')?.id).toBe('externes-rechnungswesen')
    expect(findeFach('Mathematik')?.id).toBe('mathe')
    expect(findeFach('WInfo')?.id).toBe('wirtschaftsinformatik')
    expect(findeFach('Internationales Management')?.id).toBe('internationales-management')
    expect(findeFach('Chemie')).toBeUndefined()
  })

  it('bezeichnet und benennt Lernzettel', () => {
    const a = z({ id: 'a', uebung: 3, teil: 2, titel: 'Kettenregel & Co.' })
    expect(bezeichnung(a)).toBe('Übung 3 · Teil 2')
    expect(dateiname(a)).toBe('uebung-03-2-kettenregel-co.md')
    expect(bezeichnung(z({ id: 'k', typ: 'klausur' }))).toBe('Klausur-Lernzettel')
  })

  it('Markdown-Export lässt sich wieder einlesen', () => {
    const a = z({ id: 'lokal/x', uebung: 4, teil: 1, titel: 'Zinsen: einfach', datum: '2026-11-04', kurz: 'Kurz', inhalt: '## A\n\nText' })
    const r = baueZettel('lokal/x', alsMarkdown(a), { lokal: true })
    expect(r.fehler).toEqual([])
    expect(r.zettel).toEqual({ ...a, lokal: true })
  })
})

describe('Gliederung und Wochen-Check', () => {
  const alle = [
    z({ id: 'u2b', uebung: 2, teil: 2 }),
    z({ id: 'u1', uebung: 1 }),
    z({ id: 'u2a', uebung: 2, teil: 1 }),
    z({ id: 'x', typ: 'extra' }),
    z({ id: 'r1', fach: 'externes-rechnungswesen', uebung: 1 }),
  ]

  it('sortiert nach Übung und Teil', () => {
    const g = gliedereFach(alle, 'mathe')
    expect(g.uebungen.map((u) => [u.nr, u.zettel.map((x) => x.id)])).toEqual([
      [1, ['u1']],
      [2, ['u2a', 'u2b']],
    ])
    expect(g.extra.map((x) => x.id)).toEqual(['x'])
    expect(reihenfolge(alle, 'mathe').map((x) => x.id)).toEqual(['u1', 'u2a', 'u2b', 'x'])
  })

  it('ohne Klausur-Lernzettel: alle Übungen; danach nur der Klausur-Lernzettel', () => {
    const heute = new Date(2026, 10, 4)
    expect(wochenListe(alle, 'mathe', heute).map((x) => x.id)).toEqual(['u1', 'u2a', 'u2b'])
    const mitKlausur = [...alle, z({ id: 'k2', typ: 'klausur', teil: 2 }), z({ id: 'k1', typ: 'klausur', teil: 1 })]
    expect(wochenListe(mitKlausur, 'mathe', heute).map((x) => x.id)).toEqual(['k1', 'k2'])
    expect(wochenListe(mitKlausur, 'externes-rechnungswesen', heute).map((x) => x.id)).toEqual(['r1'])
  })

  it('Wirtschaftsinformatik startet erst im Dezember', () => {
    const winfo = fachById('wirtschaftsinformatik')!
    expect(fachAktiv(winfo, new Date(2026, 10, 30))).toBe(false)
    expect(fachAktiv(winfo, new Date(2026, 11, 1))).toBe(true)
    const w = [z({ id: 'w1', fach: 'wirtschaftsinformatik', uebung: 1 })]
    expect(wochenListe(w, 'wirtschaftsinformatik', new Date(2026, 10, 4))).toEqual([])
    expect(wochenListe(w, 'wirtschaftsinformatik', new Date(2026, 11, 7))).toHaveLength(1)
  })
})

describe('Suche', () => {
  const alle = [
    z({ id: 'a', titel: 'Kettenregel', inhalt: 'Äußere mal innere Ableitung' }),
    z({ id: 'b', titel: 'Zinsen', inhalt: 'Bei der **Kettenregel** gilt …' }),
    z({ id: 'c', titel: 'Bilanz', fach: 'externes-rechnungswesen', inhalt: 'Aktiva und Passiva' }),
  ]

  it('findet Titel vor Textstellen', () => {
    expect(suche(alle, 'kettenregel').map((t) => t.zettel.id)).toEqual(['a', 'b'])
    expect(suche(alle, 'kettenregel')[1].ausschnitt).toContain('Kettenregel gilt')
  })

  it('alle Wörter müssen vorkommen, auch Fachnamen zählen', () => {
    expect(suche(alle, 'aktiva rechnungswesen').map((t) => t.zettel.id)).toEqual(['c'])
    expect(suche(alle, 'aktiva mathe')).toEqual([])
    expect(suche(alle, '   ')).toEqual([])
  })
})
