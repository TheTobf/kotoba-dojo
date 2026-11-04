import { describe, expect, it } from 'vitest'
import { rendere } from './markdown'

describe('Markdown', () => {
  it('rendert Kästen mit eigenem und Standard-Titel', () => {
    const { html } = rendere('> [!MERKE] Kettenregel\n> Außen mal innen\n\n> [!WARNING]\n> Vorsicht')
    expect(html).toContain('class="callout callout-merke"')
    expect(html).toContain('<span>Kettenregel</span>')
    expect(html).toContain('<p>Außen mal innen</p>')
    expect(html).toContain('callout-achtung')
    expect(html).toContain('Achtung – typischer Fehler')
  })

  it('Lösungen sind aufklappbar (auch mit Umlaut geschrieben)', () => {
    for (const art of ['LOESUNG', 'LÖSUNG', 'Lösung']) {
      const { html } = rendere(`> [!${art}]\n> $x = 3$`)
      expect(html).toMatch(/^<details class="callout callout-loesung"><summary>/)
      expect(html).toContain('class="katex"')
    }
  })

  it('normale Zitate und unbekannte Kästen bleiben Zitate', () => {
    expect(rendere('> Hallo').html).toContain('<blockquote>')
    expect(rendere('> [!QUATSCH]\n> x').html).toContain('<blockquote>')
  })

  it('nummeriert Checklisten-Punkte', () => {
    const r = rendere('- [ ] eins\n- [x] zwei\n\nAbsatz\n\n- normal')
    expect(r.haken).toBe(2)
    expect(r.html).toContain('data-haken="0"')
    expect(r.html).toContain('data-haken="1"')
    expect(r.html).not.toContain('checked')
    expect(r.html).toContain('<ul class="haken-liste">')
    expect(r.html).toContain('<ul>\n<li>normal</li>')
  })

  it('sammelt ##-Abschnitte mit eindeutigen IDs', () => {
    const r = rendere('## Übersicht\n\n### Unter\n\n## Übersicht\n\n## $f\'(x)$ *ableiten*')
    expect(r.abschnitte).toEqual([
      { id: 'h-uebersicht', text: 'Übersicht' },
      { id: 'h-uebersicht-2', text: 'Übersicht' },
      { id: 'h-f-x-ableiten', text: "f'(x) ableiten" },
    ])
  })

  it('Formeln inline und als Block, Euro-Beträge bleiben Text', () => {
    const { html } = rendere('Kosten $K(x) = 0{,}5x^2$ kosten 30 €.\n\n$$\n\\frac{a}{b}\n$$')
    expect(html).toContain('class="katex-display"')
    expect(html).toContain('kosten 30 €.')
    expect(html).not.toContain('katex-error')
  })

  it('Tabellen sind seitlich wischbar, externe Links öffnen neu', () => {
    const { html } = rendere('| a | b |\n|---|---|\n| 1 | 2 |\n\n[x](https://example.com) [y](#h-a)')
    expect(html).toContain('<div class="tabelle"><table>')
    expect(html).toContain('<a target="_blank" rel="noopener noreferrer" href="https://example.com">')
    expect(html).toContain('<a href="#h-a">')
  })
})
