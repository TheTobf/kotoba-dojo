import { describe, expect, it } from 'vitest'
import { frageKey, leseFragen, mische, parseFrage, waehleFragen } from './fragen'

const md = `## Ableiten

Text.

## Test

> [!FRAGE]
> Was ist die Ableitung von $e^{2x}$?
> - [ ] $e^{2x}$
> - [x] $2e^{2x}$
> - [ ] $2x\\,e^{2x-1}$
> - [ ] $\\ln(2x)$
>
> **Erklärung:** Kettenregel – innere Ableitung $2$.

> [!FRAGE]
> Kaputt
> - [x] a
> - [x] b
>
> Weil.
`

describe('Testfragen', () => {
  it('liest Frage, Antworten und Erklärung', () => {
    const { fragen, fehler } = leseFragen(md)
    expect(fragen).toHaveLength(1)
    expect(fragen[0]).toEqual({
      frage: 'Was ist die Ableitung von $e^{2x}$?',
      antworten: [
        { text: '$e^{2x}$', richtig: false },
        { text: '$2e^{2x}$', richtig: true },
        { text: '$2x\\,e^{2x-1}$', richtig: false },
        { text: '$\\ln(2x)$', richtig: false },
      ],
      erklaerung: 'Kettenregel – innere Ableitung $2$.',
    })
    expect(fehler).toEqual(['Frage 2: 2 statt 4 Antworten, 2 statt genau 1 richtigen Antwort'])
  })

  it('meldet fehlende Erklärung und doppelte Antworten', () => {
    expect(parseFrage('Frage?\n- [x] a\n- [ ] a\n- [ ] b\n- [ ] c').fehler).toEqual(['doppelte Antworten', 'Erklärung fehlt'])
  })

  it('Schlüssel hängt am Fragetext, nicht an der Position', () => {
    const f = leseFragen(md).fragen[0]
    expect(frageKey('mathe/a', f)).toBe(frageKey('mathe/a', { ...f, antworten: [] }))
    expect(frageKey('mathe/a', f)).not.toBe(frageKey('mathe/b', f))
    expect(frageKey('mathe/a', f)).not.toBe(frageKey('mathe/a', { ...f, frage: 'Andere Frage?' }))
  })

  it('mischt ohne etwas zu verlieren', () => {
    const a = [1, 2, 3, 4, 5]
    expect(mische(a).sort()).toEqual(a)
    expect(mische(a, () => 0)).toEqual([2, 3, 4, 5, 1])
  })

  it('Abschlusstest: zuletzt falsche zuerst, dann neue, dann richtige', () => {
    const alle = ['richtig', 'neu', 'falsch', 'neu2'].map((key) => ({ key }))
    const stats = { richtig: { r: 3, f: 0, zuletzt: true }, falsch: { r: 1, f: 2, zuletzt: false } }
    const auswahl = waehleFragen(alle, stats, 3, () => 0.5)
    expect(auswahl.map((x) => x.key).sort()).toEqual(['falsch', 'neu', 'neu2'])
    expect(waehleFragen(alle, stats, 1, () => 0.5)).toEqual([{ key: 'falsch' }])
    expect(waehleFragen(alle, stats, 10)).toHaveLength(4)
  })
})
