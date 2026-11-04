import { fachById } from '../faecher'
import { pfad } from '../router'
import { istGelesen, setzeGelesen, useZustand } from '../speicher'
import { wochenKey } from '../woche'
import { bezeichnung, type Zettel } from '../zettel'

interface Props {
  zettel: Zettel
  /** Fach-Namen anzeigen (z. B. im Wochen-Check) */
  mitFach?: boolean
  /** Häkchen-Kreis zum direkten Abhaken */
  abhaken?: boolean
  ausschnitt?: string
  /** eigene obere Zeile statt „Übung 3 · Teil 1“ ('' = keine) */
  oben?: string
}

export default function ZettelZeile({ zettel, mitFach, abhaken, ausschnitt, oben }: Props) {
  const z = useZustand()
  const woche = wochenKey(new Date())
  const fertig = istGelesen(z, zettel.id, woche)
  const fach = fachById(zettel.fach)
  const unterzeile = [mitFach ? fach?.kurz : null, oben ?? bezeichnung(zettel)].filter(Boolean).join(' · ')

  return (
    <div className="flex items-stretch gap-1">
      {abhaken && (
        <button
          type="button"
          onClick={() => setzeGelesen(zettel.id, woche, !fertig)}
          className="grid w-11 shrink-0 place-items-center"
          aria-label={fertig ? 'Als nicht durchgearbeitet markieren' : 'Als durchgearbeitet markieren'}
        >
          <span
            className={`grid size-7 place-items-center rounded-full border-2 text-sm font-bold transition ${
              fertig ? 'plopp border-green-600 bg-green-600 text-white' : 'border-stone-300 text-transparent dark:border-stone-600'
            }`}
          >
            ✓
          </span>
        </button>
      )}
      <a
        href={pfad.zettel(zettel.id)}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-black/3 active:bg-black/5 dark:hover:bg-white/5"
      >
        <div className="min-w-0 flex-1">
          {unterzeile && <div className="text-xs font-semibold tracking-wide uppercase" style={{ color: fach?.farbe }}>{unterzeile}</div>}
          <div className={`font-medium leading-snug ${fertig && abhaken ? 'text-stone-500 dark:text-stone-400' : ''}`}>{zettel.titel}</div>
          {(ausschnitt ?? zettel.kurz) && (
            <div className="mt-0.5 line-clamp-2 text-sm text-stone-500 dark:text-stone-400">{ausschnitt ?? zettel.kurz}</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {zettel.lokal && (
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-nacht-3 dark:text-stone-300" title="Nur auf diesem Gerät">
              📱
            </span>
          )}
          {!abhaken && fertig && <span className="text-sm text-green-600" title="Diese Woche durchgearbeitet">✓</span>}
          <span className="text-stone-400">›</span>
        </div>
      </a>
    </div>
  )
}
