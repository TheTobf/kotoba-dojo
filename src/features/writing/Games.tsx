/**
 * Die vier Schrift-Spiele. Jede Antwort bewertet die Karte des Zeichens im Wiederholungs-System:
 * richtig = „Gut“, falsch = „Nochmal“ (beim Nachzeichnen je nach Fehlerzahl).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CardState } from '../../lib/db'
import { speak } from '../../lib/speech'
import { rate, Rating, type Grade } from '../../lib/srs'
import { glyphCardId, optionsFor, shuffle, type Glyph } from '../../lib/writing'
import { Button, IconButton } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { cx } from '../../ui/cx'
import { Icon } from '../../ui/Icon'
import { ProgressBar } from '../../ui/ProgressBar'
import { StrokeOrder, TraceBoard } from '../../ui/Strokes'

export type GameId = 'erkennen' | 'hoeren' | 'memory' | 'zeichnen'

export interface GameResult {
  right: number
  total: number
  bestStreak: number
}

export interface GameProps {
  round: Glyph[]
  pool: Glyph[]
  cards: Map<string, CardState>
  onDone: (result: GameResult) => void
}

export function rateGlyph(glyph: Glyph, card: CardState | undefined, grade: Grade) {
  return rate({ cardId: glyphCardId(glyph.char), kind: 'zeichen', refId: glyph.char }, card, grade)
}

function GameHeader({ index, total, streak, onQuit }: { index: number; total: number; streak: number; onQuit: () => void }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <IconButton label="Runde beenden" onClick={onQuit}><Icon name="close" /></IconButton>
      <ProgressBar className="flex-1" value={total ? index / total : 0} label="Fortschritt der Runde" />
      <span className="min-w-14 text-right text-sm text-ink-soft tabular-nums">{streak >= 3 ? `${streak} in Folge` : `${Math.min(index + 1, total)} / ${total}`}</span>
    </div>
  )
}

/** Blitz-Erkennen (Zeichen sehen, Bedeutung wählen, mit Zeitbalken) oder Hören (Laut hören, Zeichen wählen). */
export function ChoiceGame({ round, pool, cards, onDone, mode }: GameProps & { mode: 'erkennen' | 'hoeren' }) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>()
  const [stats, setStats] = useState({ right: 0, streak: 0, bestStreak: 0 })
  const glyph = round[index]
  const seconds = glyph?.stage === 'kanji' ? 10 : 6
  const options = useMemo(() => (glyph ? optionsFor(glyph, pool, Math.random, mode === 'hoeren' ? 'char' : 'answer') : []), [glyph, pool, mode])
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  function choose(option: Glyph | null) {
    if (picked !== undefined || !glyph) return
    clearTimeout(timer.current)
    const ok = option?.char === glyph.char
    setPicked(option?.char ?? null)
    const streak = ok ? stats.streak + 1 : 0
    const next = { right: stats.right + (ok ? 1 : 0), streak, bestStreak: Math.max(stats.bestStreak, streak) }
    setStats(next)
    if (ok && mode === 'erkennen') void speak(glyph.char)
    void rateGlyph(glyph, cards.get(glyph.char), ok ? Rating.Good : Rating.Again)
    setTimeout(() => {
      if (index + 1 >= round.length) onDone({ right: next.right, total: round.length, bestStreak: next.bestStreak })
      else setIndex(index + 1)
    }, ok ? 700 : 1700)
  }

  useEffect(() => {
    if (!glyph) return
    setPicked(undefined)
    if (mode === 'hoeren') void speak(glyph.char)
    if (mode === 'erkennen') timer.current = setTimeout(() => choose(null), seconds * 1000)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (['1', '2', '3', '4'].includes(e.key)) choose(options[Number(e.key) - 1]) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!glyph) return null
  const wrong = picked === null || (picked !== undefined && picked !== glyph.char)
  return (
    <section>
      <GameHeader index={index} total={round.length} streak={stats.streak} onQuit={() => onDone({ right: stats.right, total: index, bestStreak: stats.bestStreak })} />
      <Card className={cx('flex flex-col items-center gap-4 py-10', wrong && 'shake')}>
        {mode === 'erkennen' ? (
          <>
            <p lang="ja" className="font-display text-8xl leading-none">{glyph.char}</p>
            <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-sunken" aria-hidden="true">
              {picked === undefined && <div key={index} className="h-full rounded-full bg-accent" style={{ animation: `shrink ${seconds}s linear forwards` }} />}
            </div>
          </>
        ) : (
          <Button variant="secondary" size="lg" onClick={() => void speak(glyph.char)}><Icon name="sound" /> Nochmal hören</Button>
        )}
        <p className="min-h-6 text-center" aria-live="polite">
          {picked !== undefined && (
            <>
              <span className={cx('font-semibold', picked === glyph.char ? 'text-ok' : 'text-accent')}>
                {picked === glyph.char ? 'Richtig' : picked === null ? 'Zeit um' : 'Leider falsch'}
              </span>
              {' · '}<span lang="ja">{glyph.char}</span> = {glyph.answer}
              {glyph.hint && <span lang="ja" className="block text-sm text-ink-soft">{glyph.hint}</span>}
            </>
          )}
        </p>
      </Card>
      <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="Antworten">
        {options.map((option, k) => {
          const state = picked === undefined ? '' : option.char === glyph.char ? 'border-ok bg-ok-soft' : option.char === picked ? 'border-accent bg-accent-soft' : 'opacity-50'
          return (
            <button
              key={option.char} type="button" onClick={() => choose(option)} lang={mode === 'hoeren' ? 'ja' : undefined}
              className={cx('flex min-h-16 items-center justify-center gap-2 rounded-control border border-line bg-surface px-3 transition-colors hover:border-ink-soft', mode === 'hoeren' ? 'font-display text-3xl' : 'text-lg', state)}
            >
              <span className="hidden text-xs text-ink-soft md:inline">{k + 1}</span>
              {mode === 'hoeren' ? option.char : option.answer}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** Memory: Zeichen und Lesung/Bedeutung als Paare aufdecken. */
export function MemoryGame({ round, onDone }: GameProps) {
  const glyphs = round.slice(0, 6)
  const deck = useMemo(
    () => shuffle(glyphs.flatMap((g) => [{ key: `c${g.char}`, glyph: g, text: g.char, ja: true }, { key: `a${g.char}`, glyph: g, text: g.answer, ja: false }])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round],
  )
  const [open, setOpen] = useState<string[]>([])
  const [found, setFound] = useState<Set<string>>(new Set())
  const [moves, setMoves] = useState(0)

  function flip(key: string) {
    if (open.length === 2 || open.includes(key) || found.has(key.slice(1))) return
    const next = [...open, key]
    setOpen(next)
    if (next.length < 2) return
    setMoves((m) => m + 1)
    const [a, b] = next.map((k) => deck.find((d) => d.key === k)!)
    if (a.glyph.char === b.glyph.char) {
      const nowFound = new Set(found).add(a.glyph.char)
      setFound(nowFound)
      setOpen([])
      void speak(a.glyph.char)
      if (nowFound.size === glyphs.length) setTimeout(() => onDone({ right: glyphs.length, total: moves + 1, bestStreak: 0 }), 900)
    } else {
      setTimeout(() => setOpen([]), 900)
    }
  }

  return (
    <section>
      <GameHeader index={found.size} total={glyphs.length} streak={0} onQuit={() => onDone({ right: found.size, total: moves, bestStreak: 0 })} />
      <p className="mb-3 text-center text-sm text-ink-soft">Finde die Paare · {moves} Züge</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {deck.map((d) => {
          const shown = open.includes(d.key) || found.has(d.glyph.char)
          return (
            <button
              key={d.key} type="button" onClick={() => flip(d.key)} lang={d.ja && shown ? 'ja' : undefined}
              aria-label={shown ? d.text : 'Verdeckte Karte'}
              className={cx(
                'flex aspect-square items-center justify-center rounded-control border p-1 text-center transition-colors',
                found.has(d.glyph.char) ? 'border-ok bg-ok-soft' : shown ? 'border-accent bg-surface' : 'border-line bg-sunken hover:border-ink-soft',
                d.ja ? 'font-display text-4xl' : 'text-base',
              )}
            >
              {shown ? d.text : <span lang="ja" aria-hidden="true" className="font-display text-xl text-ink-soft/40">言</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** Nachzeichnen: erst die Strichreihenfolge ansehen, dann selbst schreiben. */
export function TraceGame({ round, cards, onDone }: GameProps) {
  const glyphs = round.filter((g) => g.svg)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'ansehen' | 'schreiben' | 'fertig'>('ansehen')
  const [replay, setReplay] = useState(0)
  const [right, setRight] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const glyph = glyphs[index]

  useEffect(() => { setPhase('ansehen'); setMistakes(0) }, [index])
  if (!glyph) return <p className="text-ink-soft">Für diese Zeichen gibt es keine Strichdaten.</p>

  function done(count: number) {
    setMistakes(count)
    setPhase('fertig')
    if (count <= 2) setRight((r) => r + 1)
    void rateGlyph(glyph, cards.get(glyph.char), count === 0 ? Rating.Good : count <= 2 ? Rating.Hard : Rating.Again)
  }
  const next = () => (index + 1 >= glyphs.length ? onDone({ right, total: glyphs.length, bestStreak: 0 }) : setIndex(index + 1))

  return (
    <section>
      <GameHeader index={index} total={glyphs.length} streak={0} onQuit={() => onDone({ right, total: index, bestStreak: 0 })} />
      <Card className="flex flex-col items-center gap-4">
        <p className="text-center">
          <span lang="ja" className="font-display text-3xl">{glyph.char}</span> <span className="text-ink-soft">= {glyph.answer}</span>
          {glyph.hint && <span lang="ja" className="block text-sm text-ink-soft">{glyph.hint}</span>}
        </p>
        {phase === 'ansehen' ? (
          <>
            <StrokeOrder file={glyph.svg} size={240} replayKey={replay} label={`Strichreihenfolge von ${glyph.char}`} />
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setReplay((r) => r + 1)}><Icon name="replay" /> Nochmal zeigen</Button>
              <Button variant="primary" onClick={() => setPhase('schreiben')}><Icon name="pen" /> Selbst schreiben</Button>
            </div>
          </>
        ) : (
          <>
            <TraceBoard key={`${glyph.char}-${index}`} file={glyph.svg} onDone={done} />
            {phase === 'fertig' ? (
              <div className="flex flex-col items-center gap-2" aria-live="polite">
                <p className="font-semibold">{mistakes === 0 ? 'Fehlerfrei geschrieben' : `Geschafft, mit ${mistakes} ${mistakes === 1 ? 'Fehlversuch' : 'Fehlversuchen'}`}</p>
                <Button variant="primary" onClick={next} autoFocus>Weiter <Icon name="arrowRight" /></Button>
              </div>
            ) : (
              <p className="max-w-xs text-center text-sm text-ink-soft">Schreib Strich für Strich in der richtigen Reihenfolge. Der rote Punkt zeigt, wo es losgeht.</p>
            )}
          </>
        )}
      </Card>
    </section>
  )
}
