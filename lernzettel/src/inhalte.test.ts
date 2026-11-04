import { describe, expect, it } from 'vitest'
import { FAECHER } from './faecher'
import { APP_ZETTEL, ROH } from './inhalte'
import { rendere } from './markdown'
import { bezeichnung } from './zettel'

// Prüft alle Lernzettel in inhalte/ – nach dem Anlegen neuer Lernzettel `npm test` ausführen.
describe('Lernzettel in inhalte/', () => {
  it('es gibt Lernzettel', () => {
    expect(APP_ZETTEL.length).toBeGreaterThan(0)
  })

  for (const { zettel, fehler } of ROH) {
    describe(zettel.id, () => {
      it('liegt im Ordner eines bekannten Fachs', () => {
        expect(FAECHER.map((f) => f.id)).toContain(zettel.id.split('/')[0])
      })

      it('hat einen vollständigen Kopfbereich', () => {
        expect(fehler).toEqual([])
      })

      it('hat Inhalt und keine doppelte #-Überschrift', () => {
        expect(zettel.inhalt.length).toBeGreaterThan(100)
        expect(zettel.inhalt).not.toMatch(/^#\s/m)
      })

      it('alle Formeln lassen sich darstellen', () => {
        const { html } = rendere(zettel.inhalt)
        const fehlerhaft = [...html.matchAll(/class="katex-error"[^>]*title="([^"]*)"/g)].map((m) => m[1])
        expect(fehlerhaft).toEqual([])
      })

      it('übrig gebliebene $-Zeichen deuten auf kaputte Formeln hin', () => {
        const { html } = rendere(zettel.inhalt)
        const ohneFormeln = html.replace(/<span class="katex[\s\S]*?<\/annotation>/g, '')
        expect(ohneFormeln).not.toMatch(/\$[^\s]/)
      })
    })
  }

  it('keine zwei Lernzettel mit gleicher Übung und gleichem Teil', () => {
    const schluessel = APP_ZETTEL.filter((z) => z.typ !== 'extra').map((z) => `${z.fach}: ${bezeichnung(z)}`)
    const doppelt = schluessel.filter((s, i) => schluessel.indexOf(s) !== i)
    expect(doppelt).toEqual([])
  })
})
