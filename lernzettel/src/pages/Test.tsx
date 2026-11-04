import { useEffect, useMemo, useRef, useState } from 'react'
import Kopf from '../components/Kopf'
import Markdown from '../components/Markdown'
import Ring from '../components/Ring'
import { datumKey, fachById } from '../faecher'
import { bewertung, frageKey, leseFragen, mische, waehleFragen, type Frage } from '../fragen'
import { useAlleZettel } from '../inhalte'
import { rendere, rendereInline } from '../markdown'
import { pfad } from '../router'
import { beantworte, speichereTest, useZustand } from '../speicher'
import { bezeichnung, reihenfolge, type Zettel } from '../zettel'

interface PoolFrage {
  key: string
  zettel: Zettel
  frage: Frage
}

interface TestFrage extends PoolFrage {
  /** Reihenfolge der Antworten (gemischt) */
  reihe: number[]
}

interface Lauf {
  fragen: TestFrage[]
  pos: number
  /** gewählte Antwort (Index in frage.antworten) pro Frage */
  gewaehlt: (number | null)[]
  /** zählt fürs Ergebnis (nicht bei „Falsche nochmal“) */
  voll: boolean
}

function neuerLauf(fragen: PoolFrage[], voll: boolean): Lauf {
  return {
    fragen: fragen.map((f) => ({ ...f, reihe: mische(f.frage.antworten.map((_, i) => i)) })),
    pos: 0,
    gewaehlt: fragen.map(() => null),
    voll,
  }
}

function istRichtig(f: TestFrage, wahl: number | null): boolean {
  return wahl !== null && f.frage.antworten[wahl]?.richtig === true
}

const BUCHSTABEN = ['A', 'B', 'C', 'D', 'E', 'F']

export default function Test({ art, id }: { art: 'zettel' | 'fach'; id: string }) {
  const alle = useAlleZettel()
  const z = useZustand()
  const fachId = art === 'fach' ? id : alle.find((x) => x.id === id)?.fach
  const fach = fachId ? fachById(fachId) : undefined
  const zettel = art === 'zettel' ? alle.find((x) => x.id === id) : undefined
  const testId = art === 'fach' ? `fach:${id}` : id

  const pool = useMemo<PoolFrage[]>(() => {
    const quellen = art === 'fach' ? reihenfolge(alle, id) : alle.filter((x) => x.id === id)
    return quellen.flatMap((zt) => leseFragen(zt.inhalt).fragen.map((frage) => ({ key: frageKey(zt.id, frage), zettel: zt, frage })))
  }, [alle, art, id])

  const [lauf, setLauf] = useState<Lauf | null>(() => (art === 'zettel' && pool.length ? neuerLauf(pool, true) : null))
  const zurueckZu = art === 'fach' ? pfad.fach(id) : pfad.zettel(id)
  const titel = art === 'fach' ? `Abschlusstest · ${fach?.kurz ?? ''}` : `Test · ${zettel ? bezeichnung(zettel) : ''}`
  const stand = z.tests[testId]

  if (!pool.length) {
    return (
      <div className="pb-10">
        <Kopf titel={titel} zurueck={zurueckZu} farbe={fach?.farbe} />
        <div className="mx-auto max-w-2xl p-6 text-center">
          <div className="mb-2 text-4xl">📝</div>
          <p>{art === 'fach' ? 'Für dieses Fach gibt es noch keine Testfragen.' : 'Dieser Lernzettel hat noch keinen Test.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ '--fach': fach?.farbe, '--zettel-schrift': z.schrift } as React.CSSProperties} className="pb-32">
      <Kopf titel={titel} zurueck={zurueckZu} farbe={fach?.farbe} />
      <div className="mx-auto max-w-2xl px-4">
        {!lauf ? (
          <Start
            anzahl={pool.length}
            lernzettel={new Set(pool.map((p) => p.zettel.id)).size}
            beste={stand?.beste}
            starte={(n) => setLauf(neuerLauf(waehleFragen(pool, z.fragen, n), true))}
          />
        ) : lauf.pos < lauf.fragen.length ? (
          <FrageAnsicht
            key={`${lauf.fragen[lauf.pos].key}-${lauf.pos}`}
            lauf={lauf}
            mitHerkunft={art === 'fach'}
            waehle={(wahl) => {
              const f = lauf.fragen[lauf.pos]
              beantworte(f.key, istRichtig(f, wahl))
              setLauf({ ...lauf, gewaehlt: lauf.gewaehlt.map((g, i) => (i === lauf.pos ? wahl : g)) })
            }}
            weiter={() => {
              const naechste = lauf.pos + 1
              if (naechste >= lauf.fragen.length && lauf.voll) {
                const richtig = lauf.fragen.filter((f, i) => istRichtig(f, lauf.gewaehlt[i])).length
                speichereTest(testId, richtig, lauf.fragen.length, datumKey(new Date()))
              }
              setLauf({ ...lauf, pos: naechste })
              window.scrollTo(0, 0)
            }}
          />
        ) : (
          <Ergebnis
            lauf={lauf}
            beste={stand?.beste}
            zurueckZu={zurueckZu}
            zurueckText={art === 'fach' ? 'Zum Fach' : 'Zum Lernzettel'}
            nochmal={(nurFalsche) => {
              const auswahl = nurFalsche ? lauf.fragen.filter((f, i) => !istRichtig(f, lauf.gewaehlt[i])) : null
              if (auswahl) setLauf(neuerLauf(mische(auswahl), false))
              else if (art === 'fach') setLauf(null)
              else setLauf(neuerLauf(pool, true))
              window.scrollTo(0, 0)
            }}
          />
        )}
      </div>
    </div>
  )
}

function Start({ anzahl, lernzettel, beste, starte }: { anzahl: number; lernzettel: number; beste?: number; starte: (n: number) => void }) {
  const optionen = [10, 20].filter((n) => n < anzahl)
  return (
    <section className="einblenden pt-8 text-center">
      <div className="text-5xl">🏁</div>
      <h1 className="mt-3 text-2xl font-extrabold">Abschlusstest</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        {anzahl} Fragen aus {lernzettel} {lernzettel === 1 ? 'Lernzettel' : 'Lernzetteln'}. Fragen, die du zuletzt falsch hattest, kommen zuerst dran.
      </p>
      {beste !== undefined && <p className="mt-2 text-sm font-semibold text-(--fach)">Bestes Ergebnis bisher: {Math.round(beste * 100)} %</p>}
      <div className="mt-6 grid gap-3">
        {optionen.map((n) => (
          <button key={n} type="button" onClick={() => starte(n)} className="knopf karte min-h-14 text-base">
            {n} Fragen
          </button>
        ))}
        <button type="button" onClick={() => starte(anzahl)} className="knopf min-h-14 bg-(--fach) text-base text-white shadow-md">
          Alle {anzahl} Fragen
        </button>
      </div>
    </section>
  )
}

function FrageAnsicht({
  lauf,
  mitHerkunft,
  waehle,
  weiter,
}: {
  lauf: Lauf
  mitHerkunft: boolean
  waehle: (wahl: number) => void
  weiter: () => void
}) {
  const f = lauf.fragen[lauf.pos]
  const wahl = lauf.gewaehlt[lauf.pos]
  const beantwortet = wahl !== null
  const fragenHtml = useMemo(() => rendere(f.frage.frage).html, [f])
  const erklaerungHtml = useMemo(() => rendere(f.frage.erklaerung).html, [f])
  const antwortenHtml = useMemo(() => f.frage.antworten.map((a) => rendereInline(a.text)), [f])
  const richtigBisher = lauf.fragen.slice(0, lauf.pos).filter((x, i) => istRichtig(x, lauf.gewaehlt[i])).length
  const letzte = lauf.pos === lauf.fragen.length - 1
  const erklaerungRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Erklärung nicht hinter dem „Weiter“-Knopf verstecken
    if (beantwortet) erklaerungRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [beantwortet])

  return (
    <>
    <section className="einblenden pt-4">
      <div className="mb-1 flex items-center justify-between text-sm font-semibold text-stone-500">
        <span>
          Frage {lauf.pos + 1} von {lauf.fragen.length}
        </span>
        <span>✓ {richtigBisher}</span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
        <div className="h-full rounded-full bg-(--fach) transition-all" style={{ width: `${((lauf.pos + (beantwortet ? 1 : 0)) / lauf.fragen.length) * 100}%` }} />
      </div>
      {mitHerkunft && (
        <div className="mb-2 text-xs font-semibold tracking-wide text-(--fach) uppercase">
          {bezeichnung(f.zettel)} · {f.zettel.titel}
        </div>
      )}
      <div className="text-lg font-semibold">
        <Markdown html={fragenHtml} />
      </div>

      <div className="mt-5 grid gap-2.5">
        {f.reihe.map((idx, i) => {
          const a = f.frage.antworten[idx]
          let stil = 'bg-karte ring-1 ring-black/10 dark:bg-nacht-2 dark:ring-white/10'
          let zeichen = BUCHSTABEN[i]
          if (beantwortet) {
            if (a.richtig) {
              stil = 'bg-green-50 ring-2 ring-green-600 dark:bg-green-950/40'
              zeichen = '✓'
            } else if (idx === wahl) {
              stil = 'bg-red-50 ring-2 ring-red-500 dark:bg-red-950/40'
              zeichen = '✗'
            } else stil += ' opacity-55'
          }
          return (
            <button
              key={idx}
              type="button"
              disabled={beantwortet}
              onClick={() => waehle(idx)}
              className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:scale-[0.99] ${stil}`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  beantwortet && a.richtig
                    ? 'bg-green-600 text-white'
                    : beantwortet && idx === wahl
                      ? 'bg-red-500 text-white'
                      : 'bg-stone-100 text-stone-600 dark:bg-nacht-3 dark:text-stone-300'
                }`}
              >
                {zeichen}
              </span>
              <span className="zettel min-w-0 flex-1 leading-snug" dangerouslySetInnerHTML={{ __html: antwortenHtml[idx] }} />
            </button>
          )
        })}
      </div>

      {beantwortet && (
        <div ref={erklaerungRef} className="einblenden mt-5 scroll-mb-28">
          <div className={`callout ${f.frage.antworten[wahl].richtig ? 'callout-beispiel' : 'callout-achtung'}`}>
            <div className="callout-titel">
              <span>{f.frage.antworten[wahl].richtig ? '✅ Richtig!' : '❌ Leider falsch'}</span>
            </div>
            <div className="callout-inhalt">
              <Markdown html={erklaerungHtml} />
            </div>
          </div>
        </div>
      )}

    </section>
      {/* außerhalb der animierten section, sonst klebt der Knopf nicht am unteren Rand */}
      {beantwortet && (
        <div className="sicher-unten fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-papier/95 px-4 pt-3 backdrop-blur-md dark:border-white/10 dark:bg-nacht/95">
          <button type="button" onClick={weiter} className="knopf mx-auto mb-1 flex min-h-14 w-full max-w-2xl bg-(--fach) text-base text-white shadow-md">
            {letzte ? 'Zur Auswertung' : 'Weiter →'}
          </button>
        </div>
      )}
    </>
  )
}

function Ergebnis({
  lauf,
  beste,
  zurueckZu,
  zurueckText,
  nochmal,
}: {
  lauf: Lauf
  beste?: number
  zurueckZu: string
  zurueckText: string
  nochmal: (nurFalsche: boolean) => void
}) {
  const falsch = lauf.fragen.map((f, i) => ({ f, wahl: lauf.gewaehlt[i] })).filter(({ f, wahl }) => !istRichtig(f, wahl))
  const richtig = lauf.fragen.length - falsch.length
  const quote = richtig / lauf.fragen.length
  const b = bewertung(quote)

  return (
    <section className="einblenden pt-6">
      <div className="flex flex-col items-center text-center">
        <Ring wert={richtig} max={lauf.fragen.length} groesse={120} dicke={11} farbe={quote >= 0.75 ? '#16a34a' : quote >= 0.5 ? '#d97706' : '#dc2626'}>
          <div>
            <div className="text-2xl font-extrabold">
              {richtig}/{lauf.fragen.length}
            </div>
            <div className="text-xs text-stone-500">{Math.round(quote * 100)} %</div>
          </div>
        </Ring>
        <div className="mt-3 text-3xl">{b.emoji}</div>
        <p className="mt-1 text-lg font-bold">{b.text}</p>
        {lauf.voll ? (
          beste !== undefined && <p className="mt-1 text-sm text-stone-500">Bestes Ergebnis: {Math.round(beste * 100)} %</p>
        ) : (
          <p className="mt-1 text-sm text-stone-500">Wiederholung der falschen Fragen</p>
        )}
      </div>

      <div className="mt-6 grid gap-2.5">
        {falsch.length > 0 && (
          <button type="button" onClick={() => nochmal(true)} className="knopf min-h-13 bg-(--fach) text-white shadow-md">
            🔁 Falsche nochmal üben ({falsch.length})
          </button>
        )}
        <button type="button" onClick={() => nochmal(false)} className="knopf karte min-h-13">
          Neuer Durchgang
        </button>
        <a href={zurueckZu} className="knopf karte min-h-13">
          {zurueckText}
        </a>
      </div>

      {falsch.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">Das solltest du dir nochmal anschauen</h2>
          <div className="space-y-3">
            {falsch.map(({ f, wahl }) => (
              <FalschKarte key={f.key} f={f} wahl={wahl} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function FalschKarte({ f, wahl }: { f: TestFrage; wahl: number | null }) {
  const html = useMemo(
    () => ({
      frage: rendere(f.frage.frage).html,
      richtig: rendereInline(f.frage.antworten.find((a) => a.richtig)?.text ?? ''),
      gewaehlt: wahl !== null ? rendereInline(f.frage.antworten[wahl].text) : '',
      erklaerung: rendere(f.frage.erklaerung).html,
    }),
    [f, wahl],
  )
  return (
    <div className="karte p-4 text-[0.95rem]">
      <div className="mb-1 text-xs font-semibold text-(--fach)">
        {bezeichnung(f.zettel)} · {f.zettel.titel}
      </div>
      <Markdown html={html.frage} />
      <div className="mt-2 space-y-1 text-sm">
        {html.gewaehlt && (
          <div className="flex gap-2 text-red-600 dark:text-red-400">
            <span>✗</span>
            <span className="zettel" dangerouslySetInnerHTML={{ __html: html.gewaehlt }} />
          </div>
        )}
        <div className="flex gap-2 font-semibold text-green-700 dark:text-green-400">
          <span>✓</span>
          <span className="zettel" dangerouslySetInnerHTML={{ __html: html.richtig }} />
        </div>
      </div>
      <div className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        <Markdown html={html.erklaerung} />
      </div>
      <a href={pfad.zettel(f.zettel.id)} className="mt-2 inline-block text-sm font-medium text-(--fach) underline underline-offset-2">
        Im Lernzettel nachlesen
      </a>
    </div>
  )
}
