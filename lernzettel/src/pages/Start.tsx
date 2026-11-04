import { useMemo, useState } from 'react'
import Ring from '../components/Ring'
import ZettelZeile from '../components/ZettelZeile'
import { FAECHER, fachAktiv, fachById, type Fach } from '../faecher'
import { useAlleZettel } from '../inhalte'
import { pfad } from '../router'
import { istGelesen, useZustand } from '../speicher'
import { datumLang, kalenderwoche, klausurText, tageBis, wochenKey } from '../woche'
import { gliedereFach, suche, wochenListe, wochenListeAlle, type Zettel } from '../zettel'

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

export default function Start() {
  const alle = useAlleZettel()
  const z = useZustand()
  const [frage, setFrage] = useState('')
  const heute = new Date()
  const woche = wochenKey(heute)
  const liste = wochenListeAlle(alle, heute)
  const erledigt = liste.filter((x) => istGelesen(z, x.id, woche)).length
  const treffer = useMemo(() => suche(alle, frage), [alle, frage])
  const zuletzt = z.zuletzt && Date.now() - z.zuletzt.zeit < 14 * 86400000 ? alle.find((x) => x.id === z.zuletzt!.id) : undefined

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28">
      <header className="sicher-oben pt-6 pb-4">
        <div className="text-sm font-medium text-stone-500 dark:text-stone-400">
          {WOCHENTAGE[heute.getDay()]}, {heute.getDate()}. {MONATE[heute.getMonth()]} · KW {kalenderwoche(heute)}
        </div>
        <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight">Lernzettel</h1>
      </header>

      <div className="relative mb-5">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-stone-400">🔍</span>
        <input
          type="search"
          value={frage}
          onChange={(e) => setFrage(e.target.value)}
          placeholder="Alle Lernzettel durchsuchen…"
          className="h-12 w-full rounded-2xl bg-karte pr-4 pl-11 shadow-sm ring-1 ring-black/5 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-blue-500 dark:bg-nacht-2 dark:ring-white/10"
        />
      </div>

      {frage.trim() ? (
        <section className="einblenden">
          <h2 className="mb-2 px-1 text-sm font-semibold text-stone-500">
            {treffer.length ? `${treffer.length} Treffer` : 'Nichts gefunden'}
          </h2>
          {treffer.length > 0 && (
            <div className="karte divide-y divide-black/5 p-1.5 dark:divide-white/5">
              {treffer.map((t) => (
                <ZettelZeile key={t.zettel.id} zettel={t.zettel} mitFach ausschnitt={t.ausschnitt} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <a href={pfad.woche()} className="karte mb-4 flex items-center gap-4 p-4 transition active:scale-[0.99]">
            <Ring wert={erledigt} max={liste.length} groesse={64}>
              <span className="text-sm font-bold">{liste.length ? `${erledigt}/${liste.length}` : '–'}</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <div className="font-bold">Wochen-Check</div>
              <div className="text-sm text-stone-500 dark:text-stone-400">
                {liste.length === 0
                  ? 'Sobald Lernzettel da sind, gehst du sie hier jede Woche durch.'
                  : erledigt >= liste.length
                    ? 'Alles für diese Woche geschafft 🎉'
                    : `Noch ${liste.length - erledigt} Lernzettel diese Woche durchgehen`}
              </div>
            </div>
            <span className="text-stone-400">›</span>
          </a>

          {zuletzt && (
            <a href={pfad.zettel(zuletzt.id)} className="karte mb-4 flex items-center gap-3 p-4 transition active:scale-[0.99]">
              <span className="text-2xl">📖</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Weiterlesen</div>
                <div className="truncate font-medium">{zuletzt.titel}</div>
                <div className="text-xs" style={{ color: fachById(zuletzt.fach)?.farbe }}>
                  {fachById(zuletzt.fach)?.name}
                </div>
              </div>
              <span className="text-stone-400">›</span>
            </a>
          )}

          <h2 className="mt-6 mb-2 px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">Fächer</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FAECHER.map((f) => (
              <FachKarte key={f.id} fach={f} alle={alle} heute={heute} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FachKarte({ fach, alle, heute }: { fach: Fach; alle: Zettel[]; heute: Date }) {
  const z = useZustand()
  const woche = wochenKey(heute)
  const aktiv = fachAktiv(fach, heute)
  const g = gliedereFach(alle, fach.id)
  const anzahl = g.klausur.length + g.uebungen.reduce((s, u) => s + u.zettel.length, 0) + g.extra.length
  const liste = wochenListe(alle, fach.id, heute)
  const erledigt = liste.filter((x) => istGelesen(z, x.id, woche)).length
  const klausur = z.klausur[fach.id]
  const tage = klausur ? tageBis(heute, klausur) : undefined

  let info: string
  if (!aktiv && fach.ab) info = `Startet am ${datumLang(fach.ab)}`
  else if (!anzahl) info = 'Noch keine Lernzettel'
  else {
    const teile = [`${anzahl} Lernzettel`]
    if (g.uebungen.length) teile.push(`${g.uebungen.length} ${g.uebungen.length === 1 ? 'Übung' : 'Übungen'}`)
    info = teile.join(' · ')
  }

  return (
    <a
      href={pfad.fach(fach.id)}
      className={`karte relative flex items-center gap-4 overflow-hidden p-4 transition active:scale-[0.99] ${aktiv ? '' : 'opacity-60'}`}
      style={{ '--fach': fach.farbe } as React.CSSProperties}
    >
      <span className="absolute inset-y-0 left-0 w-1.5 bg-(--fach)" />
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-(--fach)/12 text-2xl">{fach.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="font-bold leading-tight">{fach.name}</div>
        <div className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{info}</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {g.klausur.length > 0 && (
            <span className="rounded-full bg-(--fach)/12 px-2 py-0.5 text-xs font-semibold text-(--fach)">🎯 Klausur-Lernzettel</span>
          )}
          {tage !== undefined && tage >= 0 && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-nacht-3 dark:text-stone-300">
              📅 {klausurText(tage)}
            </span>
          )}
          {!aktiv && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-nacht-3 dark:text-stone-300">🔒 bald</span>}
        </div>
      </div>
      {liste.length > 0 && (
        <Ring wert={erledigt} max={liste.length} groesse={44} dicke={5} farbe={fach.farbe}>
          <span className="text-[11px] font-bold">
            {erledigt}/{liste.length}
          </span>
        </Ring>
      )}
    </a>
  )
}
