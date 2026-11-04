import { useState } from 'react'
import Kopf from '../components/Kopf'
import { FAECHER, type Fach } from '../faecher'
import { zeigeHinweis } from '../hinweis'
import { projektanweisung } from '../projektanweisung'
import { APP_ZETTEL } from '../inhalte'
import { neuLaden } from '../pwa'
import { ladeSicherung, setzeDesign, setzeKlausur, setzeSchrift, sicherungAlsText, useZustand, type Design } from '../speicher'
import { datumLang } from '../woche'

const DESIGNS: { wert: Design; text: string }[] = [
  { wert: 'auto', text: '🌓 Auto' },
  { wert: 'hell', text: '☀️ Hell' },
  { wert: 'dunkel', text: '🌙 Dunkel' },
]

export default function Mehr() {
  const z = useZustand()
  const [meldung, setMeldung] = useState('')
  const [anweisung, setAnweisung] = useState<{ fach: Fach; text: string } | null>(null)

  async function kopiereAnweisung(fach: Fach) {
    const text = projektanweisung(fach)
    try {
      await navigator.clipboard.writeText(text)
      setAnweisung(null)
      zeigeHinweis(`Anweisung für ${fach.kurz} kopiert ✓`)
    } catch {
      // Kein Zugriff auf die Zwischenablage: Text zum Markieren anzeigen
      setAnweisung({ fach, text })
    }
  }

  function sichern() {
    const blob = new Blob([sicherungAlsText(z)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lernzettel-sicherung-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function laden(datei: File | undefined) {
    if (!datei) return
    try {
      const r = ladeSicherung(await datei.text())
      setMeldung(`✓ Sicherung geladen (${r.gelesen} Lernzettel mit Wochen-Check, ${r.eigene} eigene Lernzettel).`)
    } catch (e) {
      setMeldung(`⚠️ ${(e as Error).message}`)
    }
  }

  const ueberschrift = 'mb-2 px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase'

  return (
    <div className="pb-28">
      <Kopf titel="Mehr" />
      <div className="mx-auto max-w-2xl space-y-7 px-4 pt-4">
        <section>
          <h2 className={ueberschrift}>📅 Klausurtermine</h2>
          <div className="karte divide-y divide-black/5 dark:divide-white/5">
            {FAECHER.map((f) => (
              <label key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xl">{f.icon}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                <input
                  type="date"
                  value={z.klausur[f.id] ?? ''}
                  onChange={(e) => setzeKlausur(f.id, e.target.value)}
                  className="rounded-lg bg-stone-100 px-2 py-1.5 text-sm dark:bg-nacht-3"
                />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className={ueberschrift}>Darstellung</h2>
          <div className="karte space-y-4 p-4">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-nacht-3">
              {DESIGNS.map((d) => (
                <button
                  key={d.wert}
                  type="button"
                  onClick={() => setzeDesign(d.wert)}
                  className={`rounded-lg py-2 text-sm font-medium transition ${z.design === d.wert ? 'bg-karte shadow-sm dark:bg-nacht-2' : 'text-stone-500'}`}
                >
                  {d.text}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Schriftgröße</span>
              <button type="button" className="knopf ml-auto size-10 bg-stone-100 px-0 dark:bg-nacht-3" onClick={() => setzeSchrift(z.schrift - 0.1)}>
                A−
              </button>
              <span className="w-12 text-center text-sm">{Math.round(z.schrift * 100)} %</span>
              <button type="button" className="knopf size-10 bg-stone-100 px-0 text-lg dark:bg-nacht-3" onClick={() => setzeSchrift(z.schrift + 0.1)}>
                A+
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className={ueberschrift}>🤖 Claude-Projekte verbinden</h2>
          <div className="karte space-y-3 p-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <p>
              Damit Claude in deinen Projekten bei jedem Upload automatisch Lernzettel mit Test im richtigen Format schreibt, kopierst du einmal
              pro Projekt die passende Anweisung:
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Unten auf das Fach tippen – die Anweisung wird kopiert.</li>
              <li>
                In Claude das Projekt öffnen → <b>Anweisungen</b> (Project instructions) bearbeiten → einfügen → speichern.
              </li>
              <li>
                Ab dann: Unterlagen hochladen, Claudes Antwort kopieren und hier unter <b>➕ Einfügen</b> einsetzen.
              </li>
            </ol>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {FAECHER.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => void kopiereAnweisung(f)}
                  className="knopf min-h-12 bg-stone-100 px-2 text-sm text-tinte dark:bg-nacht-3 dark:text-stone-100"
                >
                  📋 {f.icon} {f.kurz}
                </button>
              ))}
            </div>
            {anweisung && (
              <div>
                <p className="mb-1 text-xs">Kopieren hat nicht geklappt – Text markieren und kopieren ({anweisung.fach.name}):</p>
                <textarea readOnly value={anweisung.text} className="h-48 w-full rounded-xl bg-stone-100 p-2 font-mono text-xs dark:bg-nacht-3" onFocus={(e) => e.target.select()} />
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className={ueberschrift}>So kommen neue Lernzettel rein</h2>
          <div className="karte space-y-3 p-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <p>
              <b>1. In Claude Code (empfohlen):</b> Schick mir Übungsblatt, Lösungen und Folien (Foto/PDF) und sag z. B. „Mach mir Lernzettel
              für Mathe Übung 4“. Ich lege sie direkt in die App – sie sind dann auf allen Geräten da und offline verfügbar.
            </p>
            <p>
              <b>2. Aus deinen Claude-Projekten:</b> Antwort kopieren und unter <b>➕ Einfügen</b> einsetzen (auch mehrere Lernzettel auf
              einmal). Sie bleiben nur auf diesem Gerät – für alle Geräte schick sie mir in Claude Code.
            </p>
            <p>
              <b>Vor der Klausur:</b> Sag mir „Mach mir den Klausur-Lernzettel für Mathe“ – dann fasse ich alle Übungen zusammen. Ab dann
              steht im Wochen-Check nur noch dieser Zettel.
            </p>
          </div>
        </section>

        <section>
          <h2 className={ueberschrift}>Sicherung</h2>
          <div className="karte space-y-3 p-4">
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Wochen-Check, Klausurtermine und eingefügte Lernzettel liegen nur auf diesem Gerät. Mit einer Sicherung nimmst du sie mit aufs
              nächste Handy.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={sichern} className="knopf bg-stone-100 text-sm dark:bg-nacht-3">
                💾 Speichern
              </button>
              <label className="knopf cursor-pointer bg-stone-100 text-sm dark:bg-nacht-3">
                📂 Laden
                <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => laden(e.target.files?.[0])} />
              </label>
            </div>
            {meldung && <p className="text-sm">{meldung}</p>}
          </div>
        </section>

        <section className="pb-4 text-center text-xs text-stone-500">
          <p>
            {APP_ZETTEL.length} Lernzettel in der App · {z.eigene.length} auf diesem Gerät
          </p>
          <p className="mt-1">Stand der App: {datumLang(__BAUZEIT__.slice(0, 10))}</p>
          <button type="button" onClick={() => void neuLaden()} className="mt-3 underline">
            Probleme? App neu laden
          </button>
        </section>
      </div>
    </div>
  )
}
