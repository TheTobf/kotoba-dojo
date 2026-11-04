import Kopf from '../components/Kopf'
import Ring from '../components/Ring'
import ZettelZeile from '../components/ZettelZeile'
import { FAECHER, fachAktiv } from '../faecher'
import { useAlleZettel } from '../inhalte'
import { pfad } from '../router'
import { istGelesen, useZustand } from '../speicher'
import { datumLang, kalenderwoche, wochenKey, wochenSpanne } from '../woche'
import { gliedereFach, wochenListe, wochenListeAlle } from '../zettel'

export default function Woche() {
  const alle = useAlleZettel()
  const z = useZustand()
  const heute = new Date()
  const woche = wochenKey(heute)
  const liste = wochenListeAlle(alle, heute)
  const erledigt = liste.filter((x) => istGelesen(z, x.id, woche)).length
  const alles = liste.length > 0 && erledigt >= liste.length

  // Wie viele Lernzettel wurden in den letzten Wochen durchgearbeitet?
  const verlauf = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(heute)
    d.setDate(d.getDate() - 7 * (7 - i))
    const key = wochenKey(d)
    const anzahl = Object.values(z.gelesen).filter((w) => w.includes(key)).length
    return { key, kw: kalenderwoche(d), anzahl }
  })
  const maxVerlauf = Math.max(1, ...verlauf.map((v) => v.anzahl))
  const hatVerlauf = verlauf.some((v) => v.anzahl > 0)

  return (
    <div className="pb-28">
      <Kopf titel="Wochen-Check" />
      <div className="mx-auto max-w-2xl px-4">
        <section className="einblenden karte mt-4 flex items-center gap-5 p-5">
          <Ring wert={erledigt} max={liste.length} groesse={92} dicke={9}>
            <div>
              <div className="text-xl leading-none font-extrabold">{liste.length ? erledigt : '–'}</div>
              {liste.length > 0 && <div className="text-xs text-stone-500">von {liste.length}</div>}
            </div>
          </Ring>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-stone-500">
              KW {kalenderwoche(heute)} · {wochenSpanne(heute)}
            </div>
            <div className="mt-0.5 text-lg leading-snug font-bold">
              {liste.length === 0 ? 'Noch nichts zu tun' : alles ? 'Alles geschafft – stark! 🎉' : `Noch ${liste.length - erledigt} Lernzettel`}
            </div>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Jede Woche einmal alles durchgehen – dann sitzt es zur Klausur.</p>
          </div>
        </section>

        {FAECHER.map((f) => {
          const eigene = wochenListe(alle, f.id, heute)
          const aktiv = fachAktiv(f, heute)
          const g = gliedereFach(alle, f.id)
          const fertig = eigene.filter((x) => istGelesen(z, x.id, woche)).length
          return (
            <section key={f.id} className="mt-6" style={{ '--fach': f.farbe } as React.CSSProperties}>
              <a href={pfad.fach(f.id)} className="mb-2 flex items-center gap-2 px-1">
                <span>{f.icon}</span>
                <h2 className="font-bold">{f.name}</h2>
                {eigene.length > 0 && (
                  <span className={`ml-auto text-sm font-semibold ${fertig === eigene.length ? 'text-green-600' : 'text-stone-500'}`}>
                    {fertig}/{eigene.length}
                  </span>
                )}
              </a>
              {!aktiv && f.ab ? (
                <p className="px-1 text-sm text-stone-500">🔒 Startet am {datumLang(f.ab)}.</p>
              ) : eigene.length ? (
                <>
                  {g.klausur.length > 0 && (
                    <p className="mb-1.5 px-1 text-xs text-stone-500">Der Klausur-Lernzettel ersetzt jetzt die einzelnen Übungen im Wochen-Check.</p>
                  )}
                  <div className="karte divide-y divide-black/5 p-1.5 dark:divide-white/5">
                    {eigene.map((x) => (
                      <ZettelZeile key={x.id} zettel={x} abhaken />
                    ))}
                  </div>
                </>
              ) : (
                <p className="px-1 text-sm text-stone-500">Noch keine Lernzettel.</p>
              )}
            </section>
          )
        })}

        {hatVerlauf && (
          <section className="karte mt-8 p-4">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-stone-500 uppercase">Deine letzten Wochen</h2>
            <div className="flex h-28 items-end gap-2">
              {verlauf.map((v) => (
                <div key={v.key} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-stone-500">{v.anzahl || ''}</span>
                  <div
                    className={`w-full rounded-t-md ${v.key === woche ? 'bg-green-600' : 'bg-green-600/40'}`}
                    style={{ height: `${Math.max(4, (v.anzahl / maxVerlauf) * 64)}px` }}
                  />
                  <span className="text-[10px] text-stone-500">{v.kw}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-500">Durchgearbeitete Lernzettel pro Kalenderwoche</p>
          </section>
        )}
      </div>
    </div>
  )
}
