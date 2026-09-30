import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { loadData, type LearnData } from '../data'
import { db } from '../db'
import { speak } from '../audio'
import { isLearned } from '../srs'
import { mischen, ordnenSaetze, ordnungRichtig, partikelAufgabe, beispiele, type PartikelAufgabe } from '../satzbau'
import { GRAMMATIK } from '../content/grammatik'
import { correctSound, unlockSound, vibrate, wrongSound } from '../sfx'
import { DEFAULT_SETTINGS, type Sentence, type Settings } from '../types'
import { belohnen, sammeln, zaehleAktivitaet, XP } from '../motivation'
import SentenceText from '../components/SentenceText'
import PlayButtons from '../components/PlayButtons'

type Tab = 'ordnen' | 'partikel' | 'grammatik'
const RUNDE = 8

export default function Satzbau() {
  const [data, setData] = useState<LearnData>()
  const [tab, setTab] = useState<Tab>('ordnen')
  const [runde, setRunde] = useState<Sentence[]>()
  const [ergebnis, setErgebnis] = useState<{ right: number; total: number }>()
  const cards = useLiveQuery(() => db.cards.where('kind').equals('vokabel').toArray())
  const stored = useLiveQuery(() => db.settings.get('me'))
  const settings: Settings = { ...DEFAULT_SETTINGS, ...stored }
  useEffect(() => { loadData().then(setData) }, [])

  const learned = useMemo(() => new Set((cards ?? []).filter(isLearned).map((c) => c.refId)), [cards])
  const sentences = useMemo(() => (data ? [...data.sentences.values()] : []), [data])
  if (!data || !cards) return <p className="opacity-60">Lade …</p>

  const poolOrdnen = ordnenSaetze(sentences, learned)
  const poolPartikel = sentences.filter((s) => learned.has(s.wordId) && partikelAufgabe(s))
  const pool = tab === 'ordnen' ? poolOrdnen : poolPartikel

  const start = () => {
    setErgebnis(undefined)
    setRunde([...pool].sort(() => Math.random() - 0.5).slice(0, RUNDE))
  }
  const fertig = (r: { right: number; total: number }) => {
    setRunde(undefined); setErgebnis(r); setTimeout(sammeln, 250)
    if (r.total && r.right === r.total) unlockSound(settings)
  }

  if (runde) {
    return tab === 'ordnen'
      ? <Ordnen runde={runde} settings={settings} onDone={fertig} />
      : <Partikeln runde={runde} settings={settings} onDone={fertig} />
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">
        Satzbau <span className="text-sakura">文法</span>
      </h1>
      <div className="flex gap-2 overflow-x-auto">
        {([['ordnen', '🧩 Sätze bauen'], ['partikel', '🔗 Partikeln'], ['grammatik', '📘 Grammatik']] as const).map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setErgebnis(undefined) }}
            className={`btn min-h-10 shrink-0 ${tab === id ? 'bg-sakura/15 font-bold text-sakura' : 'opacity-60'}`}>{label}</button>
        ))}
      </div>

      {tab === 'grammatik' ? <Grammatik data={data} learned={learned} settings={settings} /> : (
        <>
          {ergebnis && (
            <div className="card pop-in p-4 text-center font-bold">
              {ergebnis.right === ergebnis.total ? '完璧！ ' : ''}{ergebnis.right} / {ergebnis.total} richtig
            </div>
          )}
          <div className="card space-y-3 p-5 text-center">
            <p className="opacity-80">
              {tab === 'ordnen'
                ? 'Bring die Satzteile in die richtige Reihenfolge. Denk dran: Das Verb kommt ans Ende.'
                : 'Setz die passende Partikel ein – は・が・を・に・で・へ・と・も・の・から・まで.'}
            </p>
            {pool.length >= 3 ? (
              <>
                <p className="text-sm opacity-60">{pool.length} passende Sätze aus deinen gelernten Wörtern</p>
                <button onClick={start} className="btn-primary w-full text-lg">Runde starten</button>
              </>
            ) : (
              <>
                <p className="text-sm opacity-60">Dafür brauchst du erst ein paar gelernte Wörter mit längeren Sätzen.</p>
                <Link to="/vokabeln" className="btn-primary">Zu den Vokabeln</Link>
              </>
            )}
          </div>
          <Legende />
        </>
      )}
    </section>
  )
}

function Legende() {
  return (
    <p className="flex flex-wrap justify-center gap-3 text-xs">
      <span className="text-sky-500 dark:text-sky-300">■ Thema/Subjekt</span>
      <span className="text-amber-600 dark:text-amber-300">■ Objekt</span>
      <span className="text-rose-500 dark:text-rose-300">■ Verb/Adjektiv</span>
      <span className="text-emerald-600 dark:text-emerald-300">■ Partikel</span>
    </p>
  )
}

function Kopf({ i, n, onQuit }: { i: number; n: number; onQuit: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onQuit} className="btn min-h-10 px-2 opacity-60" aria-label="Beenden">✕</button>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div className="h-full rounded-full bg-sakura transition-all" style={{ width: `${(100 * i) / n}%` }} />
      </div>
    </div>
  )
}

function Aufloesung({ s, ok, settings }: { s: Sentence; ok: boolean; settings: Settings }) {
  return (
    <div className={`pop-in space-y-1 rounded-xl p-3 ${ok ? 'bg-matcha/15' : 'bg-rose-500/10'}`}>
      <div className="font-bold">{ok ? '⭕ Richtig!' : '❌ So wäre es richtig:'}</div>
      <div className="flex items-start gap-2">
        <SentenceText sentence={s} furigana={settings.furigana} roles className="flex-1 text-xl" />
        <PlayButtons text={s.ja} file={s.audio} credit={s.audioCredit} size="sm" />
      </div>
      <div className="text-sm opacity-80">💡 {s.grammar}</div>
      <Legende />
    </div>
  )
}

function Ordnen({ runde, settings, onDone }: { runde: Sentence[]; settings: Settings; onDone: (r: { right: number; total: number }) => void }) {
  const [i, setI] = useState(0)
  const [right, setRight] = useState(0)
  const s = runde[i]
  const kacheln = useMemo(() => mischen(s.chunks).map((text, k) => ({ text, k })), [s])
  const [gelegt, setGelegt] = useState<number[]>([])
  const [ok, setOk] = useState<boolean>()
  const sfx = { volume: settings.volume, muted: settings.muted }

  const pruefen = () => {
    const r = ordnungRichtig(gelegt.map((k) => kacheln[k].text), s)
    setOk(r)
    void zaehleAktivitaet().then(() => belohnen(r ? XP.satzRichtig : XP.satzFalsch, { dailyGoal: settings.dailyGoal }))
    if (r) { setRight((x) => x + 1); correctSound(right + 1, sfx); vibrate(settings.vibration) } else { wrongSound(sfx); vibrate(settings.vibration, [30, 40, 30]) }
    if (!settings.muted) setTimeout(() => speak(s.ja, s.audio, { volume: settings.volume }), 300)
  }
  // Zurücksetzen im selben Schritt wie der Satzwechsel – sonst zeigt ein Zwischenbild
  // die Kacheln des alten Satzes mit den Teilen des neuen (Absturz bei weniger Teilen).
  const weiter = () => {
    if (i + 1 >= runde.length) return onDone({ right, total: runde.length })
    setGelegt([]); setOk(undefined); setI(i + 1)
  }

  return (
    <section className="space-y-4">
      <Kopf i={i} n={runde.length} onQuit={() => onDone({ right, total: i })} />
      <div className="card space-y-4 p-5">
        <div className="text-xs font-bold uppercase tracking-wide opacity-50">Bau den Satz</div>
        <div className="text-lg">{s.de}</div>
        <div className="flex min-h-16 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-black/10 p-2 dark:border-white/15">
          {gelegt.length === 0 && <span className="text-sm opacity-40">Tippe die Teile in der richtigen Reihenfolge an …</span>}
          {gelegt.map((k) => (
            <button key={k} lang="ja" disabled={ok !== undefined} onClick={() => setGelegt(gelegt.filter((x) => x !== k))}
              className="pop-in rounded-lg bg-sakura/15 px-3 py-2 text-xl font-bold text-sakura">{kacheln[k].text}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {kacheln.map(({ text, k }) => (
            <button key={k} lang="ja" disabled={gelegt.includes(k) || ok !== undefined} onClick={() => setGelegt([...gelegt, k])}
              className={`card px-3 py-2 text-xl transition active:scale-95 ${gelegt.includes(k) ? 'invisible' : ''}`}>{text}</button>
          ))}
        </div>
        {ok !== undefined && <Aufloesung s={s} ok={ok} settings={settings} />}
      </div>
      {ok === undefined
        ? <button onClick={pruefen} disabled={gelegt.length !== kacheln.length} className="btn-primary w-full disabled:opacity-40">Prüfen</button>
        : <button onClick={weiter} className="btn-primary w-full">Weiter</button>}
    </section>
  )
}

function Partikeln({ runde, settings, onDone }: { runde: Sentence[]; settings: Settings; onDone: (r: { right: number; total: number }) => void }) {
  const [i, setI] = useState(0)
  const [right, setRight] = useState(0)
  const aufgabe = useMemo<PartikelAufgabe>(() => partikelAufgabe(runde[i])!, [runde, i])
  const [gewaehlt, setGewaehlt] = useState<string>()
  const sfx = { volume: settings.volume, muted: settings.muted }

  const waehlen = (p: string) => {
    if (gewaehlt) return
    setGewaehlt(p)
    const ok = p === aufgabe.answer
    void zaehleAktivitaet().then(() => belohnen(ok ? XP.satzRichtig : XP.satzFalsch, { dailyGoal: settings.dailyGoal }))
    if (ok) { setRight((x) => x + 1); correctSound(right + 1, sfx); vibrate(settings.vibration) } else { wrongSound(sfx); vibrate(settings.vibration, [30, 40, 30]) }
    if (!settings.muted) setTimeout(() => speak(aufgabe.sentence.ja, aufgabe.sentence.audio, { volume: settings.volume }), 300)
  }
  const weiter = () => {
    if (i + 1 >= runde.length) return onDone({ right, total: runde.length })
    setGewaehlt(undefined); setI(i + 1)
  }
  const s = aufgabe.sentence

  return (
    <section className="space-y-4">
      <Kopf i={i} n={runde.length} onQuit={() => onDone({ right, total: i })} />
      <div className="card space-y-4 p-5">
        <div className="text-xs font-bold uppercase tracking-wide opacity-50">Welche Partikel fehlt?</div>
        {!gewaehlt ? (
          <p lang="ja" className="text-2xl leading-[2.4]">
            {s.tokens.map((t, k) => k === aufgabe.index
              ? <span key={k} className="mx-1 inline-block min-w-10 border-b-2 border-sakura text-center">？</span>
              : <span key={k}>{t.f ? t.f.map((f, j) => f.r ? <ruby key={j}>{f.s}<rt className={`text-[0.5em] opacity-70 ${settings.furigana ? '' : 'invisible'}`}>{f.r}</rt></ruby> : f.s) : t.s}</span>)}
          </p>
        ) : <Aufloesung s={s} ok={gewaehlt === aufgabe.answer} settings={settings} />}
        <div className="opacity-80">{s.de}</div>
      </div>
      {!gewaehlt ? (
        <div className="grid grid-cols-4 gap-2">
          {aufgabe.options.map((p) => (
            <button key={p} lang="ja" onClick={() => waehlen(p)} className="card btn min-h-16 text-2xl font-bold">{p}</button>
          ))}
        </div>
      ) : <button onClick={weiter} className="btn-primary w-full">Weiter</button>}
    </section>
  )
}

function Grammatik({ data, learned, settings }: { data: LearnData; learned: Set<string>; settings: Settings }) {
  const [offen, setOffen] = useState<string>()
  const words = useMemo(() => new Map(data.words.map((w) => [w.id, w])), [data])
  const sentences = useMemo(() => [...data.sentences.values()], [data])
  return (
    <div className="space-y-2">
      {GRAMMATIK.map((l, n) => (
        <div key={l.id} className="card overflow-hidden">
          <button onClick={() => setOffen(offen === l.id ? undefined : l.id)} className="flex w-full items-center gap-3 p-4 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sakura/15 text-sm font-bold text-sakura">{n + 1}</span>
            <span className="flex-1 font-bold">{l.titel}</span>
            <span lang="ja" className="opacity-50">{l.jp}</span>
          </button>
          {offen === l.id && (
            <div className="space-y-3 border-t border-black/5 p-4 dark:border-white/10">
              {l.text.map((t, k) => <p key={k}>{t}</p>)}
              {l.formel && <p lang="ja" className="rounded-lg bg-yuzu/15 p-2 text-center font-bold">{l.formel}</p>}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase opacity-50">Beispiele aus deinen Sätzen</div>
                {beispiele(l.muster, sentences, words, learned).map((s) => (
                  <div key={s.id} className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <div className="flex items-start gap-2">
                      <SentenceText sentence={s} furigana={settings.furigana} roles className="flex-1 text-xl" />
                      <PlayButtons text={s.ja} file={s.audio} credit={s.audioCredit} size="sm" />
                    </div>
                    <div className="text-sm opacity-70">{s.de}</div>
                  </div>
                ))}
              </div>
              <Legende />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
