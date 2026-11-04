import { useEffect, useMemo, useState } from 'react'
import { zeigeHinweis } from '../hinweis'
import Kopf from '../components/Kopf'
import Markdown from '../components/Markdown'
import { fachById } from '../faecher'
import { leseFragen } from '../fragen'
import { useAlleZettel } from '../inhalte'
import { rendere } from '../markdown'
import { geheZu, pfad } from '../router'
import {
  hakenKey,
  istGelesen,
  loescheEigenen,
  merkeZuletzt,
  setzeGelesen,
  setzeHaken,
  setzeSchrift,
  useZustand,
  zuletztGelesen,
} from '../speicher'
import { datumLang, kwLabel, wochenKey } from '../woche'
import { alsMarkdown, bezeichnung, dateiname, reihenfolge, wochenListe } from '../zettel'

export default function Leser({ id }: { id: string }) {
  const alle = useAlleZettel()
  const z = useZustand()
  const zettel = alle.find((x) => x.id === id)
  const gerendert = useMemo(() => (zettel ? rendere(zettel.inhalt) : null), [zettel])
  const anzahlFragen = useMemo(() => (zettel ? leseFragen(zettel.inhalt).fragen.length : 0), [zettel])
  const fortschritt = useLeseFortschritt()

  useEffect(() => {
    if (zettel) merkeZuletzt(zettel.id)
  }, [zettel])

  if (!zettel || !gerendert) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="mb-4">Diesen Lernzettel gibt es nicht (mehr).</p>
        <a href={pfad.start()} className="knopf bg-tinte text-white dark:bg-white dark:text-tinte">
          Zur Übersicht
        </a>
      </div>
    )
  }

  const fach = fachById(zettel.fach)
  const heute = new Date()
  const woche = wochenKey(heute)
  const fertig = istGelesen(z, zettel.id, woche)
  const zuletzt = zuletztGelesen(z, zettel.id)
  const haken = z.haken[hakenKey(woche, zettel.id)] ?? []
  const test = z.tests[zettel.id]
  const imWochenCheck = wochenListe(alle, zettel.fach, heute).some((x) => x.id === zettel.id)
  const folge = reihenfolge(alle, zettel.fach)
  const pos = folge.findIndex((x) => x.id === zettel.id)
  const vorher = pos > 0 ? folge[pos - 1] : undefined
  const nachher = pos >= 0 && pos < folge.length - 1 ? folge[pos + 1] : undefined

  function hake(nr: number, an: boolean) {
    setzeHaken(zettel!.id, woche, nr, an)
    const anzahl = new Set(an ? [...haken, nr] : haken.filter((n) => n !== nr)).size
    if (an && gerendert!.haken > 0 && anzahl >= gerendert!.haken && !fertig) {
      setzeGelesen(zettel!.id, woche, true)
      zeigeHinweis('Alles abgehakt – für diese Woche erledigt ✓')
    }
  }

  function teilen() {
    const text = alsMarkdown(zettel!)
    const datei = new File([text], dateiname(zettel!), { type: 'text/markdown' })
    if (navigator.canShare?.({ files: [datei] })) {
      navigator.share({ files: [datei], title: zettel!.titel }).catch(() => {})
      return
    }
    const url = URL.createObjectURL(datei)
    const a = document.createElement('a')
    a.href = url
    a.download = datei.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function loeschen() {
    if (!confirm(`„${zettel!.titel}“ von diesem Gerät löschen?`)) return
    loescheEigenen(zettel!.id)
    geheZu(pfad.fach(zettel!.fach))
  }

  return (
    <div style={{ '--fach': fach?.farbe, '--zettel-schrift': z.schrift } as React.CSSProperties} className="pb-16">
      <Kopf
        titel={<span className="text-base">{bezeichnung(zettel)}</span>}
        zurueck={pfad.fach(zettel.fach)}
        farbe={fach?.farbe}
        rechts={
          <div className="flex items-center">
            <button type="button" className="knopf size-11 px-0 text-sm" onClick={() => setzeSchrift(z.schrift - 0.1)} aria-label="Schrift kleiner">
              A−
            </button>
            <button type="button" className="knopf size-11 px-0 text-lg" onClick={() => setzeSchrift(z.schrift + 0.1)} aria-label="Schrift größer">
              A+
            </button>
          </div>
        }
      />
      <div className="fixed top-[calc(env(safe-area-inset-top)+3.5rem)] left-0 z-30 h-0.5 bg-(--fach)" style={{ width: `${fortschritt * 100}%` }} />

      <article className="mx-auto max-w-2xl px-4">
        <header className="einblenden pt-5 pb-4">
          <a href={pfad.fach(zettel.fach)} className="inline-flex items-center gap-1.5 rounded-full bg-(--fach)/12 px-2.5 py-1 text-xs font-semibold text-(--fach)">
            {fach?.icon} {fach?.name}
          </a>
          <h1 className="mt-2 text-[1.7rem] leading-tight font-extrabold tracking-tight">{zettel.titel}</h1>
          {zettel.kurz && <p className="mt-1.5 text-stone-600 dark:text-stone-400">{zettel.kurz}</p>}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
            {zettel.datum && <span>Stand {datumLang(zettel.datum)}</span>}
            {gerendert.haken > 0 && (
              <span>
                ☑️ Checkliste {haken.length}/{gerendert.haken}
              </span>
            )}
            {fertig ? <span className="font-semibold text-green-600">✓ diese Woche durchgearbeitet</span> : zuletzt && <span>zuletzt {kwLabel(zuletzt)}</span>}
            {zettel.lokal && <span>📱 nur auf diesem Gerät</span>}
          </div>
        </header>

        {gerendert.abschnitte.length >= 3 && (
          <details className="karte mb-6 overflow-hidden">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold select-none">
              📑 Inhalt <span className="text-sm font-normal text-stone-500">({gerendert.abschnitte.length} Abschnitte)</span>
              <span className="ml-auto text-stone-400">▾</span>
            </summary>
            <ol className="border-t border-black/5 px-2 py-1.5 dark:border-white/5">
              {gerendert.abschnitte.map((a, i) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="flex w-full items-baseline gap-2 rounded-lg px-2 py-2 text-left hover:bg-black/3 dark:hover:bg-white/5"
                  >
                    <span className="w-5 shrink-0 text-right text-sm text-(--fach)">{i + 1}.</span>
                    <span>{a.text}</span>
                  </button>
                </li>
              ))}
            </ol>
          </details>
        )}

        <Markdown html={gerendert.html} haken={haken} onHaken={hake} />

        {anzahlFragen > 0 && (
          <a href={pfad.test(zettel.id)} className="karte mt-10 flex items-center gap-4 p-4 ring-2 ring-(--fach)/40 transition active:scale-[0.99]">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-(--fach)/12 text-2xl">📝</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">Test zu diesem Lernzettel</div>
              <div className="text-sm text-stone-500 dark:text-stone-400">
                {anzahlFragen} Multiple-Choice-Fragen
                {test ? ` · bestes Ergebnis ${Math.round(test.beste * 100)} %` : ' · noch nicht gemacht'}
              </div>
            </div>
            <span className="knopf min-h-10 bg-(--fach) px-3 text-sm text-white">{test ? 'Nochmal' : 'Starten'}</span>
          </a>
        )}

        <section className={`karte p-4 text-center ${anzahlFragen > 0 ? 'mt-4' : 'mt-10'}`}>
          <button
            type="button"
            onClick={() => {
              setzeGelesen(zettel.id, woche, !fertig)
              if (!fertig) zeigeHinweis('Super – für diese Woche abgehakt ✓')
            }}
            className={`knopf min-h-14 w-full text-base ${fertig ? 'bg-green-600 text-white' : 'bg-(--fach) text-white shadow-md'}`}
          >
            {fertig ? '✓ Diese Woche durchgearbeitet' : 'Diese Woche durchgearbeitet ✓'}
          </button>
          <p className="mt-2 text-xs text-stone-500">
            {imWochenCheck ? 'Gehört zu deinem Wochen-Check. ' : ''}
            {fertig ? `Nochmal tippen, um es rückgängig zu machen.` : zuletzt ? `Zuletzt abgehakt in ${kwLabel(zuletzt)}.` : 'Noch nie abgehakt.'}
          </p>
        </section>

        {zettel.lokal && (
          <section className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <a href={pfad.neu(zettel.id)} className="knopf karte">
              ✏️ Bearbeiten
            </a>
            <button type="button" onClick={teilen} className="knopf karte">
              📤 Teilen
            </button>
            <button type="button" onClick={loeschen} className="knopf karte text-red-600">
              🗑️ Löschen
            </button>
          </section>
        )}

        <nav className="mt-6 grid grid-cols-2 gap-3">
          {vorher ? (
            <a href={pfad.zettel(vorher.id)} className="karte flex min-w-0 flex-col p-3 text-left">
              <span className="text-xs text-stone-500">‹ Vorheriger</span>
              <span className="truncate text-sm font-medium">{vorher.titel}</span>
            </a>
          ) : (
            <span />
          )}
          {nachher && (
            <a href={pfad.zettel(nachher.id)} className="karte flex min-w-0 flex-col p-3 text-right">
              <span className="text-xs text-stone-500">Nächster ›</span>
              <span className="truncate text-sm font-medium">{nachher.titel}</span>
            </a>
          )}
        </nav>
      </article>

      <NachOben />
    </div>
  )
}

function useLeseFortschritt(): number {
  const [wert, setWert] = useState(0)
  useEffect(() => {
    let rahmen = 0
    const messen = () => {
      cancelAnimationFrame(rahmen)
      rahmen = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        setWert(max > 0 ? Math.min(1, window.scrollY / max) : 0)
      })
    }
    messen()
    window.addEventListener('scroll', messen, { passive: true })
    window.addEventListener('resize', messen)
    return () => {
      cancelAnimationFrame(rahmen)
      window.removeEventListener('scroll', messen)
      window.removeEventListener('resize', messen)
    }
  }, [])
  return wert
}

function NachOben() {
  const [zeigen, setZeigen] = useState(false)
  useEffect(() => {
    const pruefe = () => setZeigen(window.scrollY > 1200)
    window.addEventListener('scroll', pruefe, { passive: true })
    return () => window.removeEventListener('scroll', pruefe)
  }, [])
  if (!zeigen) return null
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="einblenden fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 grid size-12 place-items-center rounded-full bg-tinte text-xl text-white shadow-lg dark:bg-stone-100 dark:text-tinte"
      aria-label="Nach oben"
    >
      ↑
    </button>
  )
}
