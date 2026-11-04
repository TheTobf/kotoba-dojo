import { useMemo, useState } from 'react'
import { zeigeHinweis } from '../hinweis'
import Kopf from '../components/Kopf'
import Markdown from '../components/Markdown'
import { FAECHER, findeFach } from '../faecher'
import { rendere } from '../markdown'
import { geheZu, pfad } from '../router'
import { speichereEigenen, useZustand } from '../speicher'
import { alsMarkdown, entferneCodeRahmen, leseKopf, leseTyp, type Typ, type Zettel } from '../zettel'

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

function felderAus(text: string, alt: Felder): Felder {
  const { kopf, inhalt } = leseKopf(entferneCodeRahmen(text))
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

  const inhalt = useMemo(() => trenneTitel(leseKopf(entferneCodeRahmen(text)).inhalt).rest, [text])
  const gerendert = useMemo(() => (vorschau ? rendere(inhalt) : null), [vorschau, inhalt])

  function neuerText(t: string) {
    setText(t)
    setFelder((alt) => felderAus(t, alt))
    setFehler('')
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
    const id = vorhanden?.id ?? `lokal/${felder.fach}-${Date.now().toString(36)}`
    const zettel: Zettel = {
      id,
      fach: felder.fach,
      typ: felder.typ,
      titel: felder.titel.trim(),
      uebung: felder.typ === 'uebung' ? uebung : undefined,
      teil,
      datum: vorhanden?.datum ?? leseKopf(entferneCodeRahmen(text)).kopf.datum ?? new Date().toISOString().slice(0, 10),
      kurz: leseKopf(entferneCodeRahmen(text)).kopf.kurz || vorhanden?.kurz,
      inhalt,
      lokal: true,
    }
    speichereEigenen(zettel)
    zeigeHinweis(vorhanden ? 'Gespeichert ✓' : 'Lernzettel hinzugefügt ✓')
    geheZu(pfad.zettel(id))
  }

  const feld = 'h-12 w-full rounded-xl bg-karte px-3 ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nacht-2 dark:ring-white/10'

  return (
    <div className="pb-28">
      <Kopf titel={vorhanden ? 'Lernzettel bearbeiten' : 'Lernzettel einfügen'} zurueck={vorhanden ? pfad.zettel(vorhanden.id) : undefined} />
      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {!vorhanden && (
          <div className="karte p-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Hier kannst du einen Lernzettel einfügen, den ich dir <b>im Chat</b> geschrieben habe (einfach den ganzen Text kopieren). Er wird
            nur auf <b>diesem Gerät</b> gespeichert.
            <br />
            Dauerhaft und auf allen Geräten landen Lernzettel in der App, wenn du mich in <b>Claude Code</b> darum bittest – dann lege ich sie
            direkt ins Repo.
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
      </div>
    </div>
  )
}
