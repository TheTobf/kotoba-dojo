import { useEffect, useMemo, useRef, useState } from 'react'
import type { Grade } from 'ts-fsrs'
import { db } from '../db'
import { speak } from '../audio'
import { rate, Rating } from '../srs'
import { optionsFor, type Glyph } from '../schrift'
import { correctSound, unlockSound, vibrate, wrongSound, type SfxOpts } from '../sfx'
import type { CardState, Settings } from '../types'
import { StrokeOrder, TraceBoard } from './Strokes'
import { belohnen, comboXp, merkeCombo, XP } from '../motivation'

export type Spiel = 'erkennen' | 'hoeren' | 'memory' | 'zeichnen'

export interface SpielProps {
  round: Glyph[]
  pool: Glyph[]
  cards: Map<string, CardState>
  settings: Settings
  onDone: (res: { right: number; total: number; bestCombo: number }) => void
}

const sfxOf = (s: Settings): SfxOpts => ({ volume: s.volume, muted: s.muted })

async function rateGlyph(g: Glyph, cards: Map<string, CardState>, grade: Grade) {
  await rate({ id: g.char }, cards.get(g.char), grade, undefined, db, Date.now(), 'zeichen')
}

function Header({ i, n, combo, onQuit }: { i: number; n: number; combo: number; onQuit: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onQuit} className="btn min-h-10 px-2 opacity-60" aria-label="Beenden">✕</button>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div className="h-full rounded-full bg-sakura transition-all" style={{ width: `${(100 * i) / n}%` }} />
      </div>
      {combo >= 2 && <span key={combo} className="pop-in text-sm font-bold text-yuzu">🔥 {combo}</span>}
    </div>
  )
}

/** Zeichen erkennen unter Zeitdruck – oder (hoeren) Laut hören und Zeichen wählen. */
export function Quizspiel({ round, pool, cards, settings, onDone, mode }: SpielProps & { mode: 'erkennen' | 'hoeren' }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>()
  const [stats, setStats] = useState({ right: 0, combo: 0, bestCombo: 0 })
  const g = round[i]
  const isKanji = g?.stage === 'kanji'
  const seconds = isKanji ? 10 : 6
  const opts = useMemo(() => optionsFor(g, pool, Math.random, mode === 'hoeren' ? 'char' : 'answer'), [g, pool, mode])
  const sfx = sfxOf(settings)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!g) return
    setPicked(undefined)
    if (mode === 'hoeren' && g.audio) speak(g.char, g.audio, { volume: settings.volume })
    if (mode === 'erkennen') timer.current = setTimeout(() => choose(null), seconds * 1000)
    return () => clearTimeout(timer.current)
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (c: Glyph | null) => {
    if (picked !== undefined) return
    clearTimeout(timer.current)
    const ok = c?.char === g.char
    setPicked(c?.char ?? null)
    const combo = ok ? stats.combo + 1 : 0
    const next = { right: stats.right + (ok ? 1 : 0), combo, bestCombo: Math.max(stats.bestCombo, combo) }
    setStats(next)
    if (ok) { correctSound(combo, sfx); vibrate(settings.vibration) } else { wrongSound(sfx); vibrate(settings.vibration, [30, 40, 30]) }
    if (mode === 'erkennen' && g.audio && ok) speak(g.char, g.audio, { volume: settings.volume })
    void rateGlyph(g, cards, ok ? Rating.Good : Rating.Again)
    merkeCombo(combo)
    void belohnen(ok ? XP.zeichenRichtig + comboXp(combo) : XP.zeichenFalsch, { dailyGoal: settings.dailyGoal })
    setTimeout(() => {
      if (i + 1 >= round.length) onDone({ right: next.right, total: round.length, bestCombo: next.bestCombo })
      else setI(i + 1)
    }, ok ? 700 : 1600)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (['1', '2', '3', '4'].includes(e.key)) choose(opts[+e.key - 1]) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!g) return null
  return (
    <section className="space-y-4">
      <Header i={i} n={round.length} combo={stats.combo} onQuit={() => onDone({ right: stats.right, total: i, bestCombo: stats.bestCombo })} />
      <div className={`card flex flex-col items-center gap-2 p-6 ${picked === null || (picked && picked !== g.char) ? 'shake' : ''}`}>
        {mode === 'erkennen' ? (
          <>
            <div lang="ja" className="text-8xl font-bold">{g.char}</div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              {picked === undefined && <div key={i} className="h-full rounded-full bg-yuzu" style={{ animation: `shrink ${seconds}s linear forwards` }} />}
            </div>
          </>
        ) : (
          <button onClick={() => g.audio && speak(g.char, g.audio, { volume: settings.volume })} className="py-4 text-7xl active:scale-90">🔊</button>
        )}
        {picked !== undefined && (
          <div className="pop-in text-center">
            {picked === g.char ? '⭕' : picked === null ? '⏰ Zeit um!' : '❌'}{' '}
            <b lang="ja">{g.char}</b> = <b>{g.answer}</b>
            {g.hint && <div className="text-sm opacity-60" lang="ja">{g.hint}</div>}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o, k) => {
          const state = picked === undefined ? '' : o.char === g.char ? 'ring-2 ring-matcha bg-matcha/15' : o.char === picked ? 'ring-2 ring-rose-400' : 'opacity-50'
          return (
            <button key={o.char} onClick={() => choose(o)} className={`card btn min-h-16 text-xl ${state}`} lang="ja">
              <span className="text-xs opacity-40">{k + 1}</span> {mode === 'hoeren' ? o.char : o.answer}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** Memory: Zeichen und Lesung/Bedeutung als Paare aufdecken. */
export function Memory({ round, settings, onDone }: SpielProps) {
  const glyphs = round.slice(0, 6)
  const deck = useMemo(() =>
    glyphs.flatMap((g) => [{ key: `c${g.char}`, g, text: g.char, jp: true }, { key: `a${g.char}`, g, text: g.answer, jp: false }])
      .sort(() => Math.random() - 0.5), [round]) // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState<string[]>([])
  const [found, setFound] = useState<Set<string>>(new Set())
  const [moves, setMoves] = useState(0)
  const sfx = sfxOf(settings)

  const click = (k: string) => {
    if (open.length === 2 || open.includes(k) || found.has(k.slice(1))) return
    const next = [...open, k]
    setOpen(next)
    if (next.length < 2) return
    setMoves((m) => m + 1)
    const [a, b] = next.map((x) => deck.find((d) => d.key === x)!)
    if (a.g.char === b.g.char) {
      const f = new Set(found).add(a.g.char)
      setFound(f)
      setOpen([])
      correctSound(f.size, sfx)
      if (a.g.audio) speak(a.g.char, a.g.audio, { volume: settings.volume })
      void belohnen(4, { dailyGoal: settings.dailyGoal })
      if (f.size === glyphs.length) {
        setTimeout(() => { unlockSound(sfx); onDone({ right: glyphs.length, total: moves + 1, bestCombo: 0 }) }, 900)
      }
    } else {
      setTimeout(() => setOpen([]), 900)
    }
  }

  return (
    <section className="space-y-4">
      <Header i={found.size} n={glyphs.length} combo={0} onQuit={() => onDone({ right: found.size, total: moves, bestCombo: 0 })} />
      <p className="text-center text-sm opacity-60">Finde die Paare · {moves} Züge</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {deck.map((d) => {
          const shown = open.includes(d.key) || found.has(d.g.char)
          return (
            <button key={d.key} onClick={() => click(d.key)} lang={d.jp ? 'ja' : undefined}
              className={`card flex aspect-square items-center justify-center p-1 text-center transition ${
                found.has(d.g.char) ? 'bg-matcha/20 ring-matcha/50' : shown ? 'ring-2 ring-sakura' : 'bg-sakura/10'
              } ${d.jp ? 'text-4xl font-bold' : 'text-base'}`}>
              {shown ? d.text : <span className="text-2xl opacity-40">❀</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** Nachzeichnen mit Strichreihenfolge; erst ansehen, dann selbst schreiben. */
export function Zeichnen({ round, cards, settings, onDone }: SpielProps) {
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<'ansehen' | 'schreiben' | 'fertig'>('ansehen')
  const [replay, setReplay] = useState(0)
  const [right, setRight] = useState(0)
  const [result, setResult] = useState<number>()
  const withStrokes = round.filter((g) => g.svg)
  const g = withStrokes[i]
  const sfx = sfxOf(settings)

  useEffect(() => { setPhase('ansehen'); setResult(undefined) }, [i])
  if (!g) return <p className="opacity-60">Für diese Zeichen gibt es keine Strichdaten.</p>

  const done = (mistakes: number) => {
    setResult(mistakes)
    setPhase('fertig')
    const grade = mistakes === 0 ? Rating.Good : mistakes <= 2 ? Rating.Hard : Rating.Again
    if (mistakes <= 2) setRight((r) => r + 1)
    unlockSound(sfx)
    void rateGlyph(g, cards, grade)
    void belohnen(mistakes === 0 ? XP.zeichnen : mistakes <= 2 ? XP.zeichenRichtig : XP.zeichenFalsch, { dailyGoal: settings.dailyGoal })
  }
  const next = () => (i + 1 >= withStrokes.length ? onDone({ right, total: withStrokes.length, bestCombo: 0 }) : setI(i + 1))

  return (
    <section className="space-y-4">
      <Header i={i} n={withStrokes.length} combo={0} onQuit={() => onDone({ right, total: i, bestCombo: 0 })} />
      <div className="card flex flex-col items-center gap-3 p-5">
        <div className="text-center">
          <span lang="ja" className="text-3xl font-bold">{g.char}</span> <span className="opacity-70">= {g.answer}</span>
          {g.hint && <div lang="ja" className="text-sm opacity-60">{g.hint}</div>}
        </div>
        {phase === 'ansehen' ? (
          <>
            <StrokeOrder file={g.svg} size={240} replayKey={replay} />
            <div className="flex gap-2">
              <button onClick={() => setReplay((r) => r + 1)} className="btn bg-black/5 dark:bg-white/10">↻ Nochmal zeigen</button>
              <button onClick={() => setPhase('schreiben')} className="btn-primary">✍️ Selbst schreiben</button>
            </div>
          </>
        ) : (
          <>
            <TraceBoard file={g.svg} showGuide={true}
              onStroke={(ok) => (ok ? correctSound(0, { ...sfx, volume: sfx.volume * 0.5 }) : wrongSound(sfx))}
              onDone={done} />
            {phase === 'fertig' ? (
              <div className="pop-in flex flex-col items-center gap-2">
                <div className="font-bold">{result === 0 ? '完璧！ Fehlerfrei' : `Geschafft – ${result} Fehlversuch${result === 1 ? '' : 'e'}`}</div>
                <button onClick={next} className="btn-primary">Weiter</button>
              </div>
            ) : (
              <p className="text-center text-sm opacity-60">Schreib Strich für Strich in der richtigen Reihenfolge. Der blaue Punkt zeigt, wo es losgeht.</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
