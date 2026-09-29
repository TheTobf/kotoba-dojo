import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Grade } from 'ts-fsrs'
import { loadData, type LearnData } from '../data'
import { db } from '../db'
import { speak } from '../audio'
import { DEFAULT_SETTINGS, type Settings } from '../types'
import { buildQueue, countNewToday, markKnown, previewIntervals, rate, Rating, type QueueItem } from '../srs'
import { flipSound, rateSound, tickSound, unlockSound, vibrate } from '../sfx'
import { learnedIds, newlyReached, situationStatus } from '../progress'
import { belohnen, sammeln, XP } from '../motivation'
import { ALLE_BELOHNUNGEN, MUSTER_CSS, NEKO } from '../content/pass'
import type { Medium, Situation } from '../content/ziele'
import SentenceText from '../components/SentenceText'
import PlayButtons from '../components/PlayButtons'
import Typewriter from '../components/Typewriter'
import WortListe from '../components/WortListe'
import KanjiUeben, { kanjiVon } from '../components/KanjiUeben'
import { KanjiTippbar } from '../components/SentenceText'

const BUTTONS: { grade: Grade; label: string; key: string; cls: string }[] = [
  { grade: Rating.Again, label: 'Nochmal', key: '1', cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-300' },
  { grade: Rating.Hard, label: 'Schwer', key: '2', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { grade: Rating.Good, label: 'Gut', key: '3', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { grade: Rating.Easy, label: 'Einfach', key: '4', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
]

interface Session {
  queue: QueueItem[]
  idx: number
  before: Set<string>
  started: number
  reviewed: number
  good: number
  known: number
}

interface Result { session: Session; situationen: Situation[]; medien: Medium[] }

export default function Vokabeln() {
  const [data, setData] = useState<LearnData>()
  const [view, setView] = useState<'lernen' | 'liste'>('lernen')
  const [session, setSession] = useState<Session>()
  const [result, setResult] = useState<Result>()
  const [newToday, setNewToday] = useState(0)
  const cardsArr = useLiveQuery(() => db.cards.where('kind').equals('vokabel').toArray())
  const stored = useLiveQuery(() => db.settings.get('me'))
  const settings: Settings = { ...DEFAULT_SETTINGS, ...stored }

  useEffect(() => { loadData().then(setData) }, [])
  useEffect(() => { countNewToday().then(setNewToday) }, [cardsArr])

  const cards = useMemo(() => new Map((cardsArr ?? []).map((c) => [c.refId, c])), [cardsArr])
  const plan = useMemo(
    () => (data && cardsArr ? buildQueue(data.words, cardsArr, settings.newPerDay, newToday) : []),
    [data, cardsArr, settings.newPerDay, newToday],
  )

  if (!data || !cardsArr) return <p className="opacity-60">Lade Wörter …</p>

  const start = () => {
    setResult(undefined)
    setSession({ queue: plan, idx: 0, before: learnedIds(cardsArr), started: Date.now(), reviewed: 0, good: 0, known: 0 })
  }

  const finish = async (s: Session) => {
    const after = learnedIds(await db.cards.toArray())
    const reached = newlyReached(data.words, s.before, after)
    if (reached.situationen.length || reached.medien.length) setTimeout(() => unlockSound(settings), 300)
    setSession(undefined)
    setResult({ session: s, ...reached })
    setTimeout(sammeln, 250)
  }

  if (session) {
    return <Lernen data={data} session={session} settings={settings}
      onUpdate={setSession} onFinish={finish} onCancel={() => finish(session)} />
  }

  const dueCount = plan.filter((q) => q.card).length
  const newCount = plan.length - dueCount
  const nextLesson = plan.find((q) => !q.card)?.word.lesson
  const learned = learnedIds(cardsArr)
  const nextGoal = situationStatus(data.words, learned).filter((x) => !x.ready).sort((a, b) => b.pct - a.pct)[0]
  const begleiter = ALLE_BELOHNUNGEN.find((b) => b.id === settings.companion) ?? NEKO

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">
        Vokabeln <span className="text-sakura">単語</span>
      </h1>

      <div className="flex gap-2">
        {(['lernen', 'liste'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`btn min-h-10 ${view === v ? 'bg-sakura/15 font-bold text-sakura' : 'opacity-60'}`}>
            {v === 'lernen' ? '🃏 Lernen' : '📖 Wortliste'}
          </button>
        ))}
      </div>

      {view === 'liste' ? <WortListe data={data} cards={cards} settings={settings} /> : (
        <>
          {result && <Ergebnis result={result} />}

          <div className="card space-y-4 p-6 text-center">
            {plan.length ? (
              <>
                <div className="flex justify-center gap-8">
                  <Stat n={dueCount} label="Wiederholungen" cls="text-neon" />
                  <Stat n={newCount} label="neue Wörter" cls="text-sakura" />
                </div>
                {nextLesson && newCount > 0 && <p className="opacity-70">Heute neu: Lektion {nextLesson}</p>}
                <button onClick={start} className="btn-primary w-full text-lg">Los geht’s</button>
              </>
            ) : (
              <>
                <div className="text-5xl">🎉</div>
                <p className="text-lg font-bold">Für heute alles erledigt!</p>
                <p className="opacity-70">Morgen warten die nächsten Wörter. Mehr neue Karten pro Tag kannst du in den Einstellungen freigeben.</p>
              </>
            )}
          </div>

          <div className="card flex items-center gap-4 p-4">
            <div className="mascot text-4xl" title={begleiter.name}>{begleiter.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm opacity-60">{learned.size} von {data.words.length} Wörtern gelernt</div>
              {nextGoal && <div className="font-bold">Nächstes Ziel: {nextGoal.s.title} ({nextGoal.pct} %)</div>}
            </div>
            <Link to="/ziele" className="btn min-h-10 bg-sakura/10 text-sakura">Ziele →</Link>
          </div>
        </>
      )}
    </section>
  )
}

function Stat({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div>
      <div className={`text-4xl font-bold ${cls}`}>{n}</div>
      <div className="text-sm opacity-60">{label}</div>
    </div>
  )
}

function Ergebnis({ result: { session: s, situationen, medien } }: { result: Result }) {
  const min = Math.max(1, Math.round((Date.now() - s.started) / 60_000))
  return (
    <div className="card space-y-3 p-5">
      <div className="font-bold">Einheit geschafft ✨</div>
      <p className="opacity-80">
        {s.reviewed} {s.reviewed === 1 ? 'Karte' : 'Karten'} in ca. {min} Min · {s.reviewed ? Math.round((100 * s.good) / s.reviewed) : 0} % gewusst
        {s.known > 0 && ` · ${s.known}× „Kenn ich schon“`}
      </p>
      {situationen.map((x) => (
        <div key={x.id} className="pop-in rounded-xl bg-matcha/15 p-3">
          <b>{x.icon} Neu in Japan möglich: {x.title}</b>
          <div className="text-sm opacity-80">{x.canDo}</div>
        </div>
      ))}
      {medien.map((m) => (
        <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="pop-in block rounded-xl bg-yuzu/20 p-3">
          <b>🔓 Freigeschaltet: {m.title}</b>
          <div className="text-sm opacity-80">{m.note}</div>
        </a>
      ))}
    </div>
  )
}

function Lernen({ data, session, settings, onUpdate, onFinish, onCancel }: {
  data: LearnData
  session: Session
  settings: Settings
  onUpdate: (s: Session) => void
  onFinish: (s: Session) => void
  onCancel: () => void
}) {
  const item = session.queue[session.idx]
  const [flipped, setFlipped] = useState(false)
  const [skipType, setSkipType] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ueben, setUeben] = useState<{ wort: string; start: string }>()
  const shownAt = useRef(Date.now())
  const sfx = { volume: settings.volume, muted: settings.muted }

  useEffect(() => { setFlipped(false); setSkipType(!settings.typewriter); shownAt.current = Date.now() }, [session.idx, settings.typewriter])

  const flip = useCallback(() => {
    if (flipped) { setSkipType(true); return }
    setFlipped(true)
    flipSound(sfx)
    vibrate(settings.vibration)
    if (settings.autoplayAudio && !settings.muted) {
      setTimeout(() => speak(item.word.reading, item.word.audio, { volume: settings.volume }), 450)
    }
  }, [flipped, item, settings]) // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback((next: Session) => {
    if (next.idx >= next.queue.length) onFinish(next)
    else onUpdate(next)
  }, [onFinish, onUpdate])

  const answer = useCallback(async (grade: Grade) => {
    if (busy || !flipped) return
    setBusy(true)
    try {
      const now = Date.now()
      // aktuellen Stand aus der DB – die Karte kann sich seit dem Aufbau der Warteschlange geändert haben
      const card = (await db.cards.get(`vokabel:${item.word.id}`)) ?? item.card
      const state = await rate(item.word, card, grade, now - shownAt.current)
      rateSound(grade, sfx)
      void belohnen(grade >= Rating.Good ? XP.karteGut : grade === Rating.Hard ? XP.karteSchwer : XP.karteNochmal, { dailyGoal: settings.dailyGoal })
      const queue = [...session.queue]
      // Lernschritte (< 1 Std) kommen in dieser Einheit noch einmal
      if (state.due - now < 60 * 60_000) queue.push({ word: item.word, card: state })
      advance({
        ...session, queue, idx: session.idx + 1,
        reviewed: session.reviewed + 1, good: session.good + (grade >= Rating.Good ? 1 : 0),
      })
    } catch (e) {
      console.error('Bewertung fehlgeschlagen', e)
      alert(`Bewertung konnte nicht gespeichert werden: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [busy, flipped, item, session, advance]) // eslint-disable-line react-hooks/exhaustive-deps

  const known = useCallback(async () => {
    if (busy || item.card) return
    setBusy(true)
    try {
      await markKnown(item.word)
      rateSound(Rating.Easy, sfx)
      void belohnen(XP.kennIchSchon, { dailyGoal: settings.dailyGoal })
      advance({ ...session, idx: session.idx + 1, known: session.known + 1 })
    } catch (e) {
      console.error('Kenn ich schon fehlgeschlagen', e)
      alert(`Konnte nicht gespeichert werden: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [busy, item, session, advance]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || document.body.dataset.modal) return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip() }
      else if (flipped && ['1', '2', '3', '4'].includes(e.key)) void answer(+e.key as Grade)
      else if (!flipped && e.key.toLowerCase() === 'k') void known()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flip, answer, known, flipped])

  const intervals = useMemo(() => previewIntervals(item?.card), [item])
  if (!item) return null
  const { word } = item
  const sentence = data.sentences.get(word.sentenceIds[0])
  const isNew = !item.card
  const hasKanji = word.surface !== word.reading
  const remaining = session.queue.length - session.idx

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="btn min-h-10 px-2 opacity-60" aria-label="Beenden">✕</button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="h-full rounded-full bg-sakura transition-all"
            style={{ width: `${(100 * session.idx) / session.queue.length}%` }} />
        </div>
        <span className="text-sm tabular-nums opacity-60">{remaining}</span>
      </div>

      <div className="flip-scene" onClick={flip}>
        <div className={`flip-card cursor-pointer select-none ${flipped ? 'is-flipped' : ''}`}>
          {/* Vorderseite */}
          <div className="flip-face card flex min-h-80 flex-col items-center justify-center gap-3 p-6"
            style={settings.cardPattern && MUSTER_CSS[settings.cardPattern] ? { background: `${MUSTER_CSS[settings.cardPattern]('#888888')}, var(--card-bg)` } : undefined}>
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${isNew ? 'bg-sakura/15 text-sakura' : 'bg-neon/15 text-sky-700 dark:text-neon'}`}>
              {isNew ? `NEU · Lektion ${word.lesson}` : 'Wiederholung'}
            </span>
            {settings.furigana && hasKanji && <div lang="ja" className="text-lg opacity-50">{word.reading}</div>}
            <div lang="ja" className="text-6xl font-bold md:text-7xl">{word.surface}</div>
            <div className="mt-4 text-sm opacity-40">Tippen zum Umdrehen</div>
          </div>

          {/* Rückseite */}
          <div className="flip-face flip-back card flex min-h-80 flex-col gap-3 p-6">
            <div className="flex items-start gap-3">
              <span className="text-4xl">{word.emoji}</span>
              <div className="min-w-0 flex-1">
                <div lang="ja" className="text-4xl font-bold">
                  <KanjiTippbar text={word.surface} onKanji={(c) => setUeben({ wort: word.surface, start: c })} />
                </div>
                <div className="opacity-70">
                  {hasKanji && <span lang="ja">{word.reading} · </span>}{word.romaji} · <span className="text-sm">{word.pos}</span>
                </div>
              </div>
              <span onClick={(e) => e.stopPropagation()}>
                <PlayButtons text={word.reading} file={word.audio} credit={word.audioCredit} size="sm" />
              </span>
            </div>
            <div className="min-h-9 text-2xl font-bold text-sakura">
              <Typewriter text={word.meaningsDe.join(', ')} active={flipped} skip={skipType}
                onTick={settings.typewriter ? () => tickSound(sfx) : undefined} />
            </div>
            {sentence && (
              <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                <div className="flex items-start gap-2">
                  <SentenceText sentence={sentence} furigana={settings.furigana} className="flex-1 text-xl"
                    onKanji={(c) => setUeben(word.surface.includes(c) ? { wort: word.surface, start: c } : { wort: c, start: c })} />
                  <span onClick={(e) => e.stopPropagation()}>
                    <PlayButtons text={sentence.ja} file={sentence.audio} credit={sentence.audioCredit} size="sm" />
                  </span>
                </div>
                <div className="text-sm opacity-60">{sentence.romaji}</div>
                <div className="mt-1">{sentence.de}</div>
              </div>
            )}
            {kanjiVon(word.surface, data).length > 0 && (
              <button onClick={(e) => { e.stopPropagation(); setUeben({ wort: word.surface, start: kanjiVon(word.surface, data)[0] }) }}
                className="self-start text-sm text-sakura underline-offset-4 hover:underline">
                ✍️ Kanji nachzeichnen ({kanjiVon(word.surface, data).join('')})
              </button>
            )}
            <a href={`https://youglish.com/pronounce/${encodeURIComponent(word.surface)}/japanese`} target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()} className="self-start text-sm text-sakura underline-offset-4 hover:underline">
              ▶️ In echten Videos hören (YouGlish)
            </a>
          </div>
        </div>
      </div>

      {ueben && <KanjiUeben wort={ueben.wort} start={ueben.start} data={data} settings={settings} onClose={() => setUeben(undefined)} />}

      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {BUTTONS.map((b) => (
            <button key={b.grade} disabled={busy} onClick={() => answer(b.grade)}
              className={`btn flex-col gap-0 py-2 ${b.cls}`}>
              <span className="font-bold">{b.label}</span>
              <span className="text-xs opacity-70">{intervals[b.grade - 1]}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={flip} className="btn-primary flex-1">Umdrehen</button>
          {isNew && (
            <button onClick={known} disabled={busy} className="btn bg-matcha/20 text-emerald-700 dark:text-matcha"
              title="Überspringt das Lernen – Kontrolle in 7 Tagen">
              Kenn ich schon
            </button>
          )}
        </div>
      )}
      <p className="hidden text-center text-xs opacity-40 md:block">
        Leertaste = umdrehen · 1–4 = bewerten{isNew ? ' · K = kenn ich schon' : ''}
      </p>
    </section>
  )
}
