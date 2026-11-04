import Kopf from '../components/Kopf'
import Ring from '../components/Ring'
import ZettelZeile from '../components/ZettelZeile'
import { fachAktiv, fachById } from '../faecher'
import { leseFragen } from '../fragen'
import { useAlleZettel } from '../inhalte'
import { pfad } from '../router'
import { istGelesen, setzeKlausur, useZustand } from '../speicher'
import { datumLang, klausurText, tageBis, wochenKey } from '../woche'
import { gliedereFach, reihenfolge, wochenListe } from '../zettel'

export default function FachSeite({ id }: { id: string }) {
  const fach = fachById(id)
  const alle = useAlleZettel()
  const z = useZustand()
  if (!fach) {
    return (
      <div className="p-6">
        Fach nicht gefunden. <a href={pfad.start()} className="underline">Zur Übersicht</a>
      </div>
    )
  }
  const heute = new Date()
  const woche = wochenKey(heute)
  const aktiv = fachAktiv(fach, heute)
  const g = gliedereFach(alle, fach.id)
  const leer = !g.klausur.length && !g.uebungen.length && !g.extra.length
  const liste = wochenListe(alle, fach.id, heute)
  const erledigt = liste.filter((x) => istGelesen(z, x.id, woche)).length
  const klausur = z.klausur[fach.id]
  const tage = klausur ? tageBis(heute, klausur) : undefined
  const mitTest = reihenfolge(alle, fach.id).map((x) => leseFragen(x.inhalt).fragen.length).filter((n) => n > 0)
  const anzahlFragen = mitTest.reduce((a, b) => a + b, 0)
  const abschluss = z.tests[`fach:${fach.id}`]

  return (
    <div style={{ '--fach': fach.farbe } as React.CSSProperties} className="pb-28">
      <Kopf titel={fach.name} zurueck={pfad.start()} farbe={fach.farbe} />
      <div className="mx-auto max-w-2xl px-4">
        <section className="einblenden mt-4 flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-(--fach)/12 text-4xl">{fach.icon}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl leading-tight font-extrabold">{fach.name}</h1>
            <label className="relative mt-1 inline-flex cursor-pointer items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
              <span>📅</span>
              <span className="underline decoration-dotted underline-offset-2">
                {klausur ? `Klausur: ${datumLang(klausur)}${tage !== undefined && tage >= 0 ? ` · ${klausurText(tage)}` : ''}` : 'Klausurtermin eintragen'}
              </span>
              {/* unsichtbar über dem Text, damit ein Tippen direkt die Datumsauswahl öffnet (auch auf dem iPhone) */}
              <input
                type="date"
                value={klausur ?? ''}
                onChange={(e) => setzeKlausur(fach.id, e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Klausurtermin"
              />
            </label>
          </div>
          {liste.length > 0 && (
            <a href={pfad.woche()} className="flex flex-col items-center gap-0.5" aria-label="Wochen-Check">
              <Ring wert={erledigt} max={liste.length} groesse={52} dicke={5} farbe={fach.farbe}>
                <span className="text-xs font-bold">
                  {erledigt}/{liste.length}
                </span>
              </Ring>
              <span className="text-[10px] font-semibold tracking-wide text-stone-500 uppercase">Woche</span>
            </a>
          )}
        </section>

        {!aktiv && fach.ab && (
          <div className="karte mt-5 p-4 text-sm">
            🔒 <b>{fach.name}</b> startet am <b>{datumLang(fach.ab)}</b>. Ab dann kommen hier die Lernzettel zu den Übungen rein.
          </div>
        )}

        {/* Klausur-Lernzettel */}
        <section className="mt-6">
          <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">🎯 Klausur-Lernzettel</h2>
          {g.klausur.length ? (
            <div className="karte divide-y divide-black/5 overflow-hidden p-1.5 ring-2 ring-(--fach)/40 dark:divide-white/5">
              {g.klausur.map((k) => (
                <ZettelZeile key={k.id} zettel={k} oben={k.teil ? `Teil ${k.teil}` : 'Zusammenfassung'} />
              ))}
              <p className="px-3 py-2.5 text-xs text-stone-500 dark:text-stone-400">
                Das Wichtigste aus allen Übungen – geh ihn jede Woche einmal komplett durch und hake die Checkliste ab.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-stone-300 p-4 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
              Vor der Klausur fasse ich hier das Wichtigste aus allen Übungen zusammen. Den Klausur-Lernzettel gehst du dann jede Woche
              durch.
            </div>
          )}
        </section>

        {/* Übungen */}
        <section className="mt-6">
          <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">📝 Übungen</h2>
          {g.uebungen.length ? (
            <div className="space-y-3">
              {g.uebungen.map((u) => (
                <div key={u.nr} className="karte overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-black/5 px-4 py-2.5 dark:border-white/5">
                    <span className="grid size-7 place-items-center rounded-lg bg-(--fach) text-sm font-bold text-white">{u.nr}</span>
                    <span className="font-bold">Übung {u.nr}</span>
                    {u.zettel.length > 1 && <span className="ml-auto text-xs text-stone-500">{u.zettel.length} Lernzettel</span>}
                  </div>
                  <div className="divide-y divide-black/5 p-1.5 dark:divide-white/5">
                    {u.zettel.map((x) => (
                      <ZettelZeile key={x.id} zettel={x} oben={x.teil ? `Teil ${x.teil}` : ''} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            leer && (
              <div className="karte p-5 text-sm leading-relaxed">
                <div className="mb-1 text-base font-bold">Noch keine Lernzettel</div>
                Schick mir dein Übungsblatt (Foto oder PDF), die Lösungen und die passenden Folien – ich mache daraus Lernzettel mit den
                wichtigsten Regeln, Beispielen und einer Checkliste. Sie erscheinen dann hier unter der jeweiligen Übung.
              </div>
            )
          )}
        </section>

        {g.extra.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">📎 Weitere Lernzettel</h2>
            <div className="karte divide-y divide-black/5 p-1.5 dark:divide-white/5">
              {g.extra.map((x) => (
                <ZettelZeile key={x.id} zettel={x} oben={x.teil ? `Teil ${x.teil}` : ''} />
              ))}
            </div>
          </section>
        )}

        {/* Abschlusstest ganz zum Schluss */}
        <section className="mt-8">
          <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">🏁 Abschlusstest</h2>
          {anzahlFragen > 0 ? (
            <a href={pfad.abschluss(fach.id)} className="karte flex items-center gap-4 p-4 ring-2 ring-(--fach)/40 transition active:scale-[0.99]">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-(--fach) text-2xl">🏁</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">Alles gemischt testen</div>
                <div className="text-sm text-stone-500 dark:text-stone-400">
                  {anzahlFragen} Fragen aus {mitTest.length} {mitTest.length === 1 ? 'Lernzettel' : 'Lernzetteln'}
                  {abschluss ? ` · bestes Ergebnis ${Math.round(abschluss.beste * 100)} %` : ''}
                </div>
              </div>
              <span className="text-stone-400">›</span>
            </a>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-stone-300 p-4 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
              Jeder Lernzettel bekommt einen eigenen Multiple-Choice-Test. Hier testest du dann alle Fragen des Fachs gemischt.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
