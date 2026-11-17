/** Quiz mit Lückentext: auswählen, eintippen oder hören – nur mit Wörtern, die man schon gelernt hat. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toHiragana } from 'wanakana'
import type { LearnData } from '../../lib/data'
import { useCards, useLearnData } from '../../lib/hooks'
import { noteCombo } from '../../lib/progress'
import { answerOf, checkTyped, choicesFor, quizCardId, quizQueue, verdict, type QuizItem, type QuizMode } from '../../lib/quiz'
import { speak } from '../../lib/speech'
import { rate, Rating } from '../../lib/srs'
import { PageHeader } from '../../layouts/AppLayout'
import { Button, IconButton } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { cx } from '../../ui/cx'
import { RadioCard } from '../../ui/Field'
import { Icon } from '../../ui/Icon'
import { JaText, SpeakButton } from '../../ui/JaText'
import { Notice } from '../../ui/Notice'
import { ProgressBar } from '../../ui/ProgressBar'

type ModeChoice = QuizMode | 'gemischt'

const MODES: { id: ModeChoice; label: string; text: string }[] = [
  { id: 'auswahl', label: 'Auswählen', text: 'Vier Möglichkeiten, eine passt in die Lücke' },
  { id: 'tippen', label: 'Eintippen', text: 'Romaji tippen, es wird automatisch zu Kana' },
  { id: 'hoeren', label: 'Hören', text: 'Den Satz nur hören, dann das Wort wählen' },
  { id: 'gemischt', label: 'Gemischt', text: 'Alle drei abwechselnd' },
]

interface Run {
  items: QuizItem[]
  modes: QuizMode[]
  index: number
  streak: number
  right: number
  total: number
  wrong: string[]
  retried: Set<string>
}

export function Component() {
  const { data, failed } = useLearnData()
  const cards = useCards()
  const [mode, setMode] = useState<ModeChoice>('auswahl')
  const [run, setRun] = useState<Run>()
  const [result, setResult] = useState<Pick<Run, 'right' | 'total' | 'wrong'>>()
  const queue = useMemo(() => (data && cards ? quizQueue(data, cards) : []), [data, cards])
  const header = <PageHeader ja="クイズ" title="Quiz" lead="Ein Satz, eine Lücke: Welches Wort fehlt?" back={{ to: '/app/lernen', label: 'Lernen' }} />

  if (failed) return <>{header}<Notice tone="error">Die Lerndaten konnten nicht geladen werden.</Notice></>
  if (!data || !cards) return <>{header}<p className="text-ink-soft">Wird geladen …</p></>

  const learned = new Set(cards.filter((c) => c.kind === 'wort').map((c) => c.refId))

  if (run) {
    return (
      <>
        <PageHeader title="Quiz" />
        <Round
          key={run.index} data={data} run={run} learned={learned} onUpdate={setRun}
          onFinish={(r) => { setRun(undefined); setResult({ right: r.right, total: r.total, wrong: r.wrong }); window.scrollTo({ top: 0 }) }}
        />
      </>
    )
  }

  const start = () => {
    const pick = (i: number): QuizMode => (mode === 'gemischt' ? (['auswahl', 'tippen', 'hoeren'] as const)[i % 3] : mode)
    setResult(undefined)
    setRun({ items: queue, modes: queue.map((_, i) => pick(i)), index: 0, streak: 0, right: 0, total: 0, wrong: [], retried: new Set() })
  }

  return (
    <>
      {header}
      {result && result.total > 0 && (
        <Card className="mb-6 text-center">
          <p lang="ja" className="font-display text-4xl text-accent">{verdict(result.right, result.total).ja}</p>
          <p className="mt-2 font-semibold">{verdict(result.right, result.total).de}: {result.right} von {result.total} richtig</p>
          {result.wrong.length > 0 && <p className="mt-1 text-sm text-ink-soft">Nochmal anschauen: <span lang="ja">{[...new Set(result.wrong)].join('、')}</span></p>}
        </Card>
      )}

      {learned.size < 4 ? (
        <Card className="text-center">
          <p className="text-ink-soft">Das Quiz fragt nur Wörter ab, die du schon gelernt hast. Lerne zuerst ein paar Karteikarten.</p>
          <Button to="/app/lernen/sitzung" variant="primary" className="mt-4">Karteikarten lernen</Button>
        </Card>
      ) : (
        <>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">Art</legend>
            {MODES.map((m) => (
              <RadioCard key={m.id} name="quiz-mode" checked={mode === m.id} onChange={() => setMode(m.id)}>
                <span className="block font-medium">{m.label}</span>
                <span className="block text-sm text-ink-soft">{m.text}</span>
              </RadioCard>
            ))}
          </fieldset>
          <Card className="mt-6 text-center">
            {queue.length ? (
              <>
                <p className="text-ink-soft">{queue.length} Lückensätze aus deinen {learned.size} gelernten Wörtern</p>
                <Button variant="primary" size="lg" block className="mt-4" onClick={start}>Quiz starten</Button>
              </>
            ) : (
              <p className="text-ink-soft">Gerade ist nichts fällig. Lerne neue Karteikarten oder schau später wieder rein.</p>
            )}
          </Card>
        </>
      )}
    </>
  )
}

function Round({ data, run, learned, onUpdate, onFinish }: {
  data: LearnData
  run: Run
  learned: Set<string>
  onUpdate: (run: Run) => void
  onFinish: (run: Run) => void
}) {
  const item = run.items[run.index]
  const mode = run.modes[run.index] ?? 'auswahl'
  const answer = answerOf(item.sentence)
  const [outcome, setOutcome] = useState<{ ok: boolean; given: string }>()
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const choices = useMemo(() => choicesFor(item.word, item.sentence, data, learned), [item, data, learned])

  useEffect(() => {
    if (mode === 'hoeren') void speak(item.sentence.ja)
    if (mode === 'tippen') setTimeout(() => inputRef.current?.focus(), 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = useCallback(async (given: string) => {
    if (outcome) return
    const ok = mode === 'tippen' ? checkTyped(given, item.sentence) : given === answer.surface
    setOutcome({ ok, given })
    if (mode !== 'hoeren') setTimeout(() => void speak(item.sentence.ja), 300)
    // Nur der erste Versuch zählt; falsche Wörter kommen am Ende der Runde noch einmal.
    const retry = run.retried.has(item.word.id)
    const streak = ok ? run.streak + 1 : 0
    let card = item.card
    if (!retry) {
      noteCombo(streak)
      card = await rate({ cardId: quizCardId(item.word.id), kind: 'quiz', refId: item.word.id }, item.card, ok ? Rating.Good : Rating.Again)
    }
    onUpdate({
      ...run,
      items: !ok && !retry ? [...run.items, { ...item, card }] : run.items,
      modes: !ok && !retry ? [...run.modes, mode] : run.modes,
      retried: ok ? run.retried : new Set(run.retried).add(item.word.id),
      streak,
      right: run.right + (ok && !retry ? 1 : 0),
      total: run.total + (retry ? 0 : 1),
      wrong: ok || retry ? run.wrong : [...run.wrong, item.word.surface],
    })
  }, [outcome, mode, item, answer, run, onUpdate])

  const next = useCallback(() => {
    if (run.index + 1 >= run.items.length) onFinish(run)
    else onUpdate({ ...run, index: run.index + 1 })
  }, [run, onFinish, onUpdate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (outcome && e.key === 'Enter') { e.preventDefault(); next(); return }
      if (!outcome && mode !== 'tippen' && ['1', '2', '3', '4'].includes(e.key)) void submit(choices[Number(e.key) - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [outcome, mode, choices, submit, next])

  const hideText = mode === 'hoeren' && !outcome
  const prompt = mode === 'auswahl' ? 'Was fehlt?' : mode === 'tippen' ? 'Tippe das fehlende Wort' : 'Hör zu: Welches Wort kommt vor?'

  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <IconButton label="Quiz beenden" onClick={() => onFinish(run)}><Icon name="close" /></IconButton>
        <ProgressBar className="flex-1" value={run.index / run.items.length} label="Fortschritt des Quiz" />
        <span className="min-w-14 text-right text-sm text-ink-soft tabular-nums">{run.streak >= 3 ? `${run.streak} in Folge` : `${run.index + 1} / ${run.items.length}`}</span>
      </div>

      <Card className={cx('space-y-4 transition-colors', outcome && (outcome.ok ? 'border-ok' : 'border-accent'))}>
        <p className="text-xs tracking-widest text-ink-soft uppercase">{prompt}</p>
        {hideText ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <SpeakButton text={item.sentence.ja} />
            <p className="text-sm text-ink-soft">Antippen zum Anhören</p>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <JaText phrase={item.sentence} tokens={item.sentence.tokens} size="lg" hideTarget={!outcome} />
            {outcome && <SpeakButton text={item.sentence.ja} className="shrink-0" />}
          </div>
        )}
        {(!hideText || outcome) && <p>{item.sentence.de}</p>}
        {mode === 'tippen' && !outcome && <p className="text-sm text-ink-soft">Hinweis: {item.word.meaningsDe[0]} ({item.word.pos})</p>}
        {outcome && (
          <Notice tone={outcome.ok ? 'ok' : 'error'} title={outcome.ok ? 'Richtig' : 'Leider falsch'}>
            <span lang="ja" className="font-semibold">{answer.surface}</span>
            {answer.surface !== answer.kana && <span lang="ja" className="text-ink-soft"> ({answer.kana})</span>}
            {' · '}{item.word.meaningsDe.join(', ')}
            {!outcome.ok && outcome.given && <span className="block text-ink-soft">Deine Antwort: <span lang="ja">{outcome.given}</span></span>}
          </Notice>
        )}
      </Card>

      <div className="mt-4">
        {mode === 'tippen' && !outcome ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void submit(input) }}>
            <label htmlFor="quiz-input" className="sr-only">Fehlendes Wort</label>
            <input
              id="quiz-input" ref={inputRef} lang="ja" value={input} autoComplete="off" autoCapitalize="off" spellCheck={false}
              onChange={(e) => setInput(toHiragana(e.target.value, { IMEMode: true }))} placeholder="z. B. taberu → たべる"
              className="min-h-12 w-full min-w-0 rounded-control border border-line bg-surface px-4 text-xl hover:border-ink-soft focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none"
            />
            <Button type="submit" variant="primary" disabled={!input.trim()}>Prüfen</Button>
          </form>
        ) : !outcome ? (
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Antworten">
            {choices.map((c, i) => (
              <button
                key={c} type="button" lang="ja" onClick={() => void submit(c)}
                className="flex min-h-16 items-center justify-center gap-2 rounded-control border border-line bg-surface px-3 font-display text-xl transition-colors hover:border-accent hover:bg-accent-soft"
              >
                <span className="hidden font-sans text-xs text-ink-soft md:inline">{i + 1}</span>{c}
              </button>
            ))}
          </div>
        ) : (
          <Button variant="primary" size="lg" block onClick={next} autoFocus>Weiter <Icon name="arrowRight" /></Button>
        )}
      </div>
    </section>
  )
}
