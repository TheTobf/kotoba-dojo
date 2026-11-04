import { useMemo, useState } from 'react'
import { zeigeHinweis } from '../hinweis'
import Kopf from '../components/Kopf'
import Markdown from '../components/Markdown'
import { datumKey, FAECHER, fachById, findeFach } from '../faecher'
import { leseFragen } from '../fragen'
import { rendere } from '../markdown'
import { geheZu, pfad } from '../router'
import { speichereEigenen, useZustand } from '../speicher'
import { alsMarkdown, baueZettel, bezeichnung, gleicherPlatz, leseKopf, leseTyp, teileText, type Typ, type Zettel } from '../zettel'

interface Felder {
  fach: string
  typ: Typ
  uebung: string
  teil: string
  titel: string
}

/** Erste „# Überschrift“ entfernen – der Titel steht schon oben im Lernzettel. */
function trenneTitel(inhalt: string): { titel?: string; rest: string } {
  const m = /^\s*#\s+(.+)\n/.exec(inhalt + '\n')
  return m ? { titel: m[1].trim(), rest: (inhalt + '\n').slice(m[0].length).trim() } : { rest: inhalt.trim() }
}

/** Eingefügte Lernzettel ersetzen eine ältere Version auf demselben Platz (gleiche Übung/Teil) – Wochen-Check bleibt erhalten. */
function platzFuer(z: Zettel, eigene: Zettel[], neueId: string): { id: string; ersetzt: boolean } {
  const alt = eigene.find((e) => e.id !== neueId && gleicherPlatz(e, z))
  return alt ? { id: alt.id, ersetzt: true } : { id: neueId, ersetzt: false }
}

function neueId(fach: string, i = 0): string {
  return `lokal/${fach}-${(Date.now() + i).toString(36)}`
}

interface Erkannt {
  zettel: Zettel
  fragen: number
  hinweise: string[]
  blockiert: string[]
}

function erkenne(text: string, i: number, standardFach: string): Erkannt {
  const r = baueZettel(`neu-${i}`, text, { standardFach, lokal: true })
  const { titel, rest } = trenneTitel(r.zettel.inhalt)
  const zettel = { ...r.zettel, inhalt: rest, titel: r.zettel.titel || titel || '', datum: r.zettel.datum ?? datumKey(new Date()) }
  const f = leseFragen(rest)
  return {
    zettel,
    fragen: f.fragen.length,
    hinweise: [...r.fehler.filter((x) => x.startsWith('typ') || x.startsWith('datum')), ...f.fehler],
    blockiert: r.fehler.filter((x) => x.startsWith('uebung') || x.startsWith('titel')),
  }
}

function felderAus(text: string, alt: Felder): Felder {
  const { kopf, inhalt } = leseKopf(text)
  const neu = { ...alt }
  const fach = kopf.fach ? findeFach(kopf.fach) : undefined
  if (fach) neu.fach = fach.id
  const typ = leseTyp(kopf.typ)
  if (typ) neu.typ = typ
  else if (kopf.uebung) neu.typ = 'uebung'
  if (kopf.uebung) neu.uebung = kopf.uebung
  if (kopf.teil) neu.teil = kopf.teil
  const titel = kopf.titel || trenneTitel(inhalt).titel
  if (titel) neu.titel = titel
  return neu
}

export default function Neu({ bearbeiten }: { bearbeiten?: string }) {
  const z = useZustand()
  const vorhanden = bearbeiten ? z.eigene.find((e) => e.id === bearbeiten) : undefined
  const [text, setText] = useState(() => (vorhanden ? alsMarkdown(vorhanden) : ''))
  const [felder, setFelder] = useState<Felder>(() =>
    vorhanden
      ? { fach: vorhanden.fach, typ: vorhanden.typ, uebung: String(vorhanden.uebung ?? ''), teil: String(vorhanden.teil ?? ''), titel: vorhanden.titel }
      : { fach: FAECHER[0].id, typ: 'uebung', uebung: '', teil: '', titel: '' },
  )
  const [vorschau, setVorschau] = useState(false)
  const [fehler, setFehler] = useState('')

  const teile = useMemo(() => teileText(text), [text])
  const einzeln = teile[0] ?? ''
  const mehrere = useMemo(() => (!vorhanden && teile.length > 1 ? teile.map((t, i) => erkenne(t, i, felder.fach)) : null), [vorhanden, teile, felder.fach])
  const inhalt = useMemo(() => trenneTitel(leseKopf(einzeln).inhalt).rest, [einzeln])
  const fragen = useMemo(() => leseFragen(inhalt), [inhalt])
  const gerendert = useMemo(() => (vorschau ? rendere(inhalt) : null), [vorschau, inhalt])

  function neuerText(t: string) {
    setText(t)
    setFelder((alt) => felderAus(teileText(t)[0] ?? '', alt))
    setFehler('')
  }

  function alleSpeichern() {
    if (!mehrere) return
    const kaputt = mehrere.filter((m) => m.blockiert.length)
    if (kaputt.length) return setFehler(`Bitte erst korrigieren: ${kaputt.map((k) => `„${k.zettel.titel || 'ohne Titel'}“ – ${k.blockiert.join(', ')}`).join('; ')}`)
    const fertig = mehrere.map((m, i) => ({ ...m.zettel, id: platzFuer(m.zettel, z.eigene, neueId(m.zettel.fach, i)).id }))
    speichereEigenen(...fertig)
    zeigeHinweis(`${fertig.length} Lernzettel gespeichert ✓`)
    geheZu(pfad.fach(fertig[0].fach))
  }

  async function ausZwischenablage() {
    try {
      neuerText(await navigator.clipboard.readText())
    } catch {
      setFehler('Kein Zugriff auf die Zwischenablage – füge den Text bitte per langem Tippen → „Einsetzen“ ein.')
    }
  }

  async function ausDatei(datei: File | undefined) {
    if (!datei) return
    neuerText(await datei.text())
  }

  function speichern() {
    const uebung = felder.uebung.trim() ? Number(felder.uebung.replace(',', '.')) : undefined
    const teil = felder.teil.trim() ? Number(felder.teil.replace(',', '.')) : undefined
    if (!inhalt) return setFehler('Bitte zuerst den Text des Lernzettels einfügen.')
    if (!felder.titel.trim()) return setFehler('Bitte einen Titel eingeben.')
    if (felder.typ === 'uebung' && (uebung === undefined || !Number.isFinite(uebung))) return setFehler('Bitte die Nummer der Übung eingeben.')
    if (teil !== undefined && !Number.isFinite(teil)) return setFehler('Teil muss eine Zahl sein.')
    const kopf = leseKopf(einzeln).kopf
    const zettel: Zettel = {
      id: vorhanden?.id ?? neueId(felder.fach),
      fach: felder.fach,
      typ: felder.typ,
      titel: felder.titel.trim(),
      uebung: felder.typ === 'uebung' ? uebung : undefined,
      teil,
      datum: kopf.datum || vorhanden?.datum || datumKey(new Date()),
      kurz: kopf.kurz || vorhanden?.kurz,
      inhalt,
      lokal: true,
    }
    const platz = vorhanden ? { id: zettel.id, ersetzt: false } : platzFuer(zettel, z.eigene, zettel.id)
    speichereEigenen({ ...zettel, id: platz.id })
    zeigeHinweis(vorhanden ? 'Gespeichert ✓' : platz.ersetzt ? 'Ältere Version ersetzt ✓' : 'Lernzettel hinzugefügt ✓')
    geheZu(pfad.zettel(platz.id))
  }

  const feld = 'h-12 w-full rounded-xl bg-karte px-3 ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nacht-2 dark:ring-white/10'

  return (
    <div className="pb-28">
      <Kopf titel={vorhanden ? 'Lernzettel bearbeiten' : 'Lernzettel einfügen'} zurueck={vorhanden ? pfad.zettel(vorhanden.id) : undefined} />
      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {!vorhanden && (
          <div className="karte p-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Hier fügst du Lernzettel ein, die ich dir in einem <b>Claude-Projekt</b> oder Chat geschrieben habe – einfach die ganze Antwort
            kopieren, auch mehrere Lernzettel auf einmal. Eine neue Version ersetzt automatisch die alte. Gespeichert wird nur auf{' '}
            <b>diesem Gerät</b>.
            <br />
            Dauerhaft und auf allen Geräten landen Lernzettel in der App, wenn du mich in <b>Claude Code</b> darum bittest.
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
            <span className="text-sm font-semibold">Text des Lernzettels</span>
            <div className="flex gap-1.5">
              <button type="button" onClick={ausZwischenablage} className="rounded-lg bg-stone-200 px-2.5 py-1.5 text-xs font-medium dark:bg-nacht-3">
                📋 Einfügen
              </button>
              <label className="cursor-pointer rounded-lg bg-stone-200 px-2.5 py-1.5 text-xs font-medium dark:bg-nacht-3">
                📄 Datei
                <input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" onChange={(e) => ausDatei(e.target.files?.[0])} />
              </label>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => neuerText(e.target.value)}
            placeholder={'---\ntitel: Kettenregel\nfach: mathe\ntyp: uebung\nuebung: 3\n---\n\n## Worum geht’s?\n…'}
            className="min-h-64 w-full rounded-2xl bg-karte p-3 font-mono text-sm ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nacht-2 dark:ring-white/10"
            spellCheck={false}
          />
        </div>

        {mehrere ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="font-bold">📚 {mehrere.length} Lernzettel erkannt</span>
            </div>
            <div className="karte divide-y divide-black/5 dark:divide-white/5">
              {mehrere.map((m, i) => {
                const f = fachById(m.zettel.fach)
                const ersetzt = platzFuer(m.zettel, z.eigene, `neu-${i}`).ersetzt
                return (
                  <div key={i} className="px-4 py-3">
                    <div className="text-xs font-semibold tracking-wide uppercase" style={{ color: f?.farbe }}>
                      {f?.icon} {f?.kurz} · {bezeichnung(m.zettel)}
                    </div>
                    <div className="font-medium">{m.zettel.titel || 'Ohne Titel'}</div>
                    <div className="mt-0.5 text-xs text-stone-500">
                      {m.fragen ? `❓ ${m.fragen} Testfragen` : '⚠️ ohne Test'}
                      {ersetzt ? ' · ersetzt deine ältere Version' : ''}
                    </div>
                    {[...m.blockiert, ...m.hinweise].map((h) => (
                      <div key={h} className={`mt-0.5 text-xs ${m.blockiert.includes(h) ? 'text-red-600' : 'text-amber-600'}`}>
                        {h}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            <label className="block">
              <span className="mb-1 block px-1 text-sm text-stone-500">Fach für Lernzettel ohne Fach-Angabe</span>
              <select value={felder.fach} onChange={(e) => setFelder({ ...felder, fach: e.target.value })} className={feld}>
                {FAECHER.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.icon} {f.name}
                  </option>
                ))}
              </select>
            </label>
            {fehler && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{fehler}</p>}
            <button type="button" onClick={alleSpeichern} className="knopf min-h-13 w-full bg-blue-600 text-white shadow-md">
              💾 Alle {mehrere.length} speichern
            </button>
          </section>
        ) : (
        <>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block">
            <span className="mb-1 block px-1 text-sm font-semibold">Titel</span>
            <input value={felder.titel} onChange={(e) => setFelder({ ...felder, titel: e.target.value })} className={feld} placeholder="z. B. Kettenregel" />
          </label>
          <label className="block">
            <span className="mb-1 block px-1 text-sm font-semibold">Fach</span>
            <select value={felder.fach} onChange={(e) => setFelder({ ...felder, fach: e.target.value })} className={feld}>
              {FAECHER.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.icon} {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block px-1 text-sm font-semibold">Art</span>
            <select value={felder.typ} onChange={(e) => setFelder({ ...felder, typ: e.target.value as Typ })} className={feld}>
              <option value="uebung">Übung</option>
              <option value="klausur">Klausur-Lernzettel</option>
              <option value="extra">Extra</option>
            </select>
          </label>
          {felder.typ === 'uebung' && (
            <label className="block">
              <span className="mb-1 block px-1 text-sm font-semibold">Übung Nr.</span>
              <input inputMode="numeric" value={felder.uebung} onChange={(e) => setFelder({ ...felder, uebung: e.target.value })} className={feld} placeholder="3" />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block px-1 text-sm font-semibold">Teil (optional)</span>
            <input inputMode="numeric" value={felder.teil} onChange={(e) => setFelder({ ...felder, teil: e.target.value })} className={feld} placeholder="1" />
          </label>
        </div>

        {inhalt && (
          <div className="px-1 text-sm">
            {fragen.fragen.length ? (
              <span className="text-stone-600 dark:text-stone-300">❓ {fragen.fragen.length} Testfragen erkannt</span>
            ) : (
              <span className="text-amber-600">⚠️ Keine Testfragen gefunden – der Lernzettel hat dann keinen Test.</span>
            )}
            {fragen.fehler.map((f) => (
              <div key={f} className="text-xs text-amber-600">
                {f}
              </div>
            ))}
          </div>
        )}

        {fehler && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{fehler}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => setVorschau(!vorschau)} className="knopf karte flex-1" disabled={!inhalt}>
            {vorschau ? 'Vorschau schließen' : '👀 Vorschau'}
          </button>
          <button type="button" onClick={speichern} className="knopf flex-1 bg-blue-600 text-white shadow-md">
            💾 Speichern
          </button>
        </div>

        {gerendert && (
          <div className="karte p-4" style={{ '--fach': FAECHER.find((f) => f.id === felder.fach)?.farbe } as React.CSSProperties}>
            <h1 className="mb-3 text-2xl font-extrabold">{felder.titel || 'Ohne Titel'}</h1>
            <Markdown html={gerendert.html} />
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}
