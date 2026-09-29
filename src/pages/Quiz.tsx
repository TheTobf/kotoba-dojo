import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { toHiragana } from 'wanakana'
import { loadData, type LearnData } from '../data'
import { db } from '../db'
import { speak } from '../audio'
import { DEFAULT_SETTINGS, type Settings } from '../types'
import { isLearned, quizQueue, rate, Rating, type QueueItem } from '../srs'
import { addResult, answerOf, checkTyped, choicesFor, verdict, type QuizMode, type QuizStats } from '../quiz'
import { correctSound, vibrate, wrongSound } from '../sfx'
import { belohnen, comboXp, merkeCombo, merkeQuizPerfekt, XP } from '../motivation'
import SentenceText from '../components/SentenceText'
import PlayButtons from '../components/PlayButtons'

type ModeChoice = QuizMode | 'gemischt'

const MODES: { id: ModeChoice; icon: string; label: string; desc: string }[] = [
  { id: 'auswahl', icon: '🔘', label: 'Auswahl', desc: '4 Möglichkeiten, eine passt in die Lücke' },
  { id: 'tippen', icon: '⌨️', label: 'Eintippen', desc: 'Romaji tippen – wird automatisch zu Kana' },
  { id: 'hoeren', icon: '🎧', label: 'Hören', desc: 'Satz nur hören, dann das Wort wählen' },
  { id: 'gemischt', icon: '🎲', label: 'Gemischt', desc: 'Alle drei abwechselnd' },
]

interface Run {
  queue: QueueItem[]
  modes: QuizMode[]
  idx: number
  combo: number
  stats: QuizStats
  retried: Set<string>
}

export default function Quiz() {
  const [data, setData] = useState<LearnData>()
  const [mode, setMode] = useState<ModeChoice>('auswahl')
  const [run, setRun] = useState<Run>()
  const [done, setDone] = useState<QuizStats>()
  const cards = useLiveQuery(() => db.cards.toArray())
  const stored = useLiveQuery(() => db.settings.get('me'))
  const settings: Settings = { ...DEFAULT_SETTINGS, ...stored }

  useEffect(() => { loadData().then(setData) }, [])
  const queue = useMemo(() => (data && cards ? quizQueue(data.words, cards) : []), [data, cards])
  if (!data || !cards) return <p className="opacity-60">Lade …</p>

  const learnedCount = cards.filter((c) => c.kind === 'vokabel' && isLearned(c)).length
  const learned = new Set(cards.filter((c) => c.kind === 'vokabel' && isLearned(c)).map((c) => c.refId))

  const start = () => {
    const pick = (i: number): QuizMode => (mode === 'gemischt' ? (['auswahl', 'tippen', 'hoeren'] as const)[i % 3] : mode)
    setDone(undefined)
    setRun({ queue, modes: queue.map((_, i) => pick(i)), idx: 0, combo: 0, stats: { total: 0, right: 0, bestCombo: 0, wrong: [] }, retried: new Set() })
  }

  if (run) {
    return <Runde data={data} run={run} learned={learned} settings={settings} onUpdate={setRun}
      onFinish={(st) => {
        setRun(undefined); setDone(st)
        if (st.total >= 5 && st.right === st.total) { merkeQuizPerfekt(); void belohnen(25, { dailyGoal: settings.dailyGoal }) }
      }} />
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">
        Quiz <span className="text-sakura">クイズ</span>
      </h1>

      {done && <Auswertung st={done} />}

      {learnedCount < 4 ? (
        <div className="card space-y-3 p-6 text-center">
          <div className="text-5xl">🃏</div>
          <p>Das Quiz fragt nur Wörter ab, die du schon gelernt hast. Lerne zuerst ein paar Karteikarten.</p>
          <Link to="/vokabeln" className="btn-primary">Zu den Vokabeln</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`card p-3 text-left transition ${mode === m.id ? 'ring-2 ring-sakura' : 'opacity-70'}`}>
                <div className="text-2xl">{m.icon}</div>
                <div className="font-bold">{m.label}</div>
                <div className="text-xs opacity-70">{m.desc}</div>
              </button>
            ))}
          </div>
          <div className="card space-y-3 p-5 text-center">
            {queue.length ? (
              <>
                <p className="opacity-80">{queue.length} Lückensätze aus deinen {learnedCount} gelernten Wörtern</p>
                <button onClick={start} className="btn-primary w-full text-lg">Quiz starten</button>
              </>
            ) : (
              <p className="opacity-80">🎉 Gerade ist nichts fällig. Lerne neue Karteikarten oder schau später wieder rein.</p>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function Auswertung({ st }: { st: QuizStats }) {
  const v = verdict(st)
  return (
    <div className="card pop-in space-y-2 p-5 text-center">
      <div lang="ja" className="text-3xl font-bold text-sakura">{v.jp}</div>
      <div className="font-bold">{v.de} {st.right} / {st.total} richtig</div>
      {st.bestCombo >= 3 && <div className="text-sm">🔥 Beste Combo: {st.bestCombo}</div>}
      {st.wrong.length > 0 && (
        <div className="text-sm opacity-80">
          Nochmal anschauen: <span lang="ja">{[...new Set(st.wrong.map((w) => w.surface))].join('、')}</span>
        </div>
      )}
    </div>
  )
}

function Runde({ data, run, learned, settings, onUpdate, onFinish }: {
  data: LearnData
  run: Run
  learned: Set<string>
  settings: Settings
  onUpdate: (r: Run) => void
  onFinish: (st: QuizStats) => void
}) {
  const item = run.queue[run.idx]
  const mode = run.modes[run.idx] ?? 'auswahl'
  const sentence = data.sentences.get(item.word.sentenceIds[0])!
  const answer = answerOf(sentence)
  const [result, setResult] = useState<{ ok: boolean; given: string }>()
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const shownAt = useRef(Date.now())
  const sfx = { volume: settings.volume, muted: settings.muted }
  const choices = useMemo(
    () => choicesFor(item.word, sentence, data.words, data.sentences, learned),
    [item, sentence, data, learned],
  )

  useEffect(() => {
    setResult(undefined); setInput(''); shownAt.current = Date.now()
    if (mode === 'hoeren' && !settings.muted) speak(sentence.ja, sentence.audio, { volume: settings.volume })
    if (mode === 'tippen') setTimeout(() => inputRef.current?.focus(), 50)
  }, [run.idx]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(async (given: string) => {
    if (result) return
    const ok = mode === 'tippen' ? checkTyped(given, sentence) : given === answer.surface
    setResult({ ok, given })
    const combo = ok ? run.combo + 1 : 0
    if (ok) { correctSound(combo, sfx); vibrate(settings.vibration) } else { wrongSound(sfx); vibrate(settings.vibration, [30, 40, 30]) }
    if (!settings.muted && mode !== 'hoeren') setTimeout(() => speak(sentence.ja, sentence.audio, { volume: settings.volume }), 350)
    // Nur der erste Versuch zählt fürs FSRS; falsche Wörter kommen am Ende der Runde nochmal
    const retry = run.retried.has(item.word.id)
    if (!retry) { merkeCombo(combo); void belohnen(ok ? XP.quizRichtig + comboXp(combo) : XP.quizFalsch, { dailyGoal: settings.dailyGoal }) }
    const card = retry ? undefined : await rate(item.word, item.card, ok ? Rating.Good : Rating.Again, Date.now() - shownAt.current, db, Date.now(), 'quiz')
    const queue = !ok && !retry ? [...run.queue, { word: item.word, card }] : run.queue
    const modes = !ok && !retry ? [...run.modes, mode] : run.modes
    const retried = !ok ? new Set(run.retried).add(item.word.id) : run.retried
    onUpdate({ ...run, queue, modes, retried, combo, stats: retry ? run.stats : addResult(run.stats, item.word, ok, combo) })
  }, [result, mode, sentence, answer, run, item, settings]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    if (run.idx + 1 >= run.queue.length) onFinish(run.stats)
    else onUpdate({ ...run, idx: run.idx + 1 })
  }, [run, onFinish, onUpdate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (result && e.key === 'Enter') { e.preventDefault(); next(); return }
      if (!result && mode !== 'tippen' && ['1', '2', '3', '4'].includes(e.key)) void submit(choices[+e.key - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result, mode, choices, submit, next])

  const hideText = mode === 'hoeren' && !result

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => onFinish(run.stats)} className="btn min-h-10 px-2 opacity-60" aria-label="Beenden">✕</button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="h-full rounded-full bg-sakura transition-all" style={{ width: `${(100 * run.idx) / run.queue.length}%` }} />
        </div>
        {run.combo >= 2 && <span key={run.combo} className="pop-in text-sm font-bold text-yuzu">🔥 {run.combo}</span>}
      </div>

      <div className={`card space-y-4 p-6 transition ${result ? (result.ok ? 'ring-2 ring-matcha' : 'ring-2 ring-rose-400') : ''}`}>
        <div className="text-xs font-bold uppercase tracking-wide opacity-50">
          {mode === 'auswahl' ? 'Was fehlt?' : mode === 'tippen' ? 'Tippe das fehlende Wort' : 'Hör zu – welches Wort kommt vor?'}
        </div>

        {hideText ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="text-6xl">🎧</div>
            <PlayButtons text={sentence.ja} file={sentence.audio} credit={sentence.audioCredit} />
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <SentenceText sentence={sentence} furigana={settings.furigana} hideTarget={!result} className="flex-1 text-2xl" />
            {result && <PlayButtons text={sentence.ja} file={sentence.audio} credit={sentence.audioCredit} size="sm" />}
          </div>
        )}

        {(!hideText || result) && <div className="opacity-80">{sentence.de}</div>}
        {mode === 'tippen' && !result && (
          <div className="text-sm opacity-60">Hinweis: {item.word.meaningsDe[0]} ({item.word.pos})</div>
        )}
        {result && (
          <div className={`pop-in rounded-xl p-3 ${result.ok ? 'bg-matcha/15' : 'bg-rose-500/10'}`}>
            <div className="font-bold">{result.ok ? '⭕ Richtig!' : '❌ Leider falsch'}</div>
            <div>
              <span lang="ja" className="text-lg font-bold">{answer.surface}</span>
              {answer.surface !== answer.kana && <span lang="ja" className="opacity-70"> ({answer.kana})</span>}
              {' – '}{item.word.meaningsDe.join(', ')}
            </div>
            {!result.ok && result.given && <div className="text-sm opacity-70">Deine Antwort: <span lang="ja">{result.given}</span></div>}
          </div>
        )}
      </div>

      {mode === 'tippen' && !result ? (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void submit(input) }}>
          <input ref={inputRef} lang="ja" value={input} autoComplete="off" autoCapitalize="off" spellCheck={false}
            onChange={(e) => setInput(toHiragana(e.target.value, { IMEMode: true }))}
            placeholder="z. B. taberu → たべる"
            className="min-h-12 min-w-0 flex-1 rounded-xl bg-paper-2 px-4 text-xl ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-sakura dark:bg-ink-2 dark:ring-white/20" />
          <button className="btn-primary" disabled={!input.trim()}>Prüfen</button>
        </form>
      ) : !result ? (
        <div className="grid grid-cols-2 gap-2">
          {choices.map((c, i) => (
            <button key={c} onClick={() => submit(c)} lang="ja"
              className="card btn min-h-16 text-xl hover:ring-sakura/50">
              <span className="text-xs opacity-40">{i + 1}</span> {c}
            </button>
          ))}
        </div>
      ) : (
        <button onClick={next} className="btn-primary w-full text-lg">Weiter ⏎</button>
      )}
    </section>
  )
}
