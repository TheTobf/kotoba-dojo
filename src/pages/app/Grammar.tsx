/** Satzbau und Grammatik: Sätze aus Teilen bauen, Partikeln einsetzen und 15 kurze Grammatik-Lektionen. */
import { useMemo, useState } from 'react'
import { GRAMMAR } from '../../content/grammar'
import type { LearnData, Sentence } from '../../lib/data'
import { useCards, useLearnData } from '../../lib/hooks'
import { recordActivity, XP } from '../../lib/progress'
import { examplesFor, orderIsCorrect, orderingSentences, particleTask, scramble } from '../../lib/sentences'
import { speak } from '../../lib/speech'
import { shuffle } from '../../lib/writing'
import { PageHeader } from '../../layouts/AppLayout'
import { Button, IconButton } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { cx } from '../../ui/cx'
import { Icon } from '../../ui/Icon'
import { JaText, RoleLegend, SpeakButton } from '../../ui/JaText'
import { Notice } from '../../ui/Notice'
import { ProgressBar } from '../../ui/ProgressBar'

type Tab = 'bauen' | 'partikeln' | 'grammatik'
const ROUND = 8
const TABS: { id: Tab; label: string }[] = [
  { id: 'bauen', label: 'Sätze bauen' },
  { id: 'partikeln', label: 'Partikeln' },
  { id: 'grammatik', label: 'Grammatik' },
]

type Result = { right: number; total: number }

export function Component() {
  const { data, failed } = useLearnData()
  const cards = useCards()
  const [tab, setTab] = useState<Tab>('bauen')
  const [round, setRound] = useState<Sentence[]>()
  const [result, setResult] = useState<Result>()
  const learned = useMemo(() => new Set((cards ?? []).filter((c) => c.kind === 'wort').map((c) => c.refId)), [cards])
  const sentences = useMemo(() => (data ? [...data.sentences.values()] : []), [data])
  const header = <PageHeader ja="文法" title="Satzbau" lead="Wie japanische Sätze funktionieren – zum Ausprobieren." back={{ to: '/app/lernen', label: 'Lernen' }} />

  if (failed) return <>{header}<Notice tone="error">Die Lerndaten konnten nicht geladen werden.</Notice></>
  if (!data || !cards) return <>{header}<p className="text-ink-soft">Wird geladen …</p></>

  const pool = tab === 'bauen' ? orderingSentences(sentences, learned) : sentences.filter((s) => learned.has(s.wordId) && particleTask(s))
  const finish = (r: Result) => { setRound(undefined); setResult(r); window.scrollTo({ top: 0 }) }

  if (round) {
    return (
      <>
        <PageHeader title={tab === 'bauen' ? 'Sätze bauen' : 'Partikeln'} />
        {tab === 'bauen' ? <OrderRound round={round} onDone={finish} /> : <ParticleRound round={round} onDone={finish} />}
      </>
    )
  }

  return (
    <>
      {header}
      <div className="mb-6 flex gap-1 rounded-control border border-line bg-surface p-1" role="tablist" aria-label="Bereich">
        {TABS.map((t) => (
          <button
            key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setResult(undefined) }}
            className={cx('min-h-10 flex-1 rounded-[calc(var(--radius-control)-2px)] px-2 text-sm transition-colors', tab === t.id ? 'bg-accent-soft font-semibold text-accent' : 'text-ink-soft hover:text-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'grammatik' ? (
        <GrammarLessons data={data} sentences={sentences} learned={learned} />
      ) : (
        <>
          {result && result.total > 0 && (
            <Notice tone="ok" className="mb-6" title={`${result.right} von ${result.total} richtig`}>
              {result.right === result.total ? 'Fehlerfrei – 完璧。' : 'Die schwierigen Sätze kommen in einer neuen Runde wieder.'}
            </Notice>
          )}
          <Card>
            <p>
              {tab === 'bauen'
                ? 'Bring die Satzteile in die richtige Reihenfolge. Merke: Das Verb steht im Japanischen am Ende.'
                : 'Setz die passende Partikel ein: は・が・を・に・で・へ・と・も・の・から・まで.'}
            </p>
            {pool.length >= 3 ? (
              <>
                <p className="mt-2 text-sm text-ink-soft">{pool.length} passende Sätze aus deinen gelernten Wörtern</p>
                <Button variant="primary" block className="mt-5" onClick={() => { setResult(undefined); setRound(shuffle(pool).slice(0, ROUND)) }}>Runde starten</Button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-soft">Dafür brauchst du erst ein paar gelernte Wörter mit längeren Beispielsätzen.</p>
                <Button to="/app/lernen/sitzung" variant="primary" className="mt-5">Karteikarten lernen</Button>
              </>
            )}
          </Card>
        </>
      )}
    </>
  )
}

function RoundHeader({ index, total, onQuit }: { index: number; total: number; onQuit: () => void }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <IconButton label="Runde beenden" onClick={onQuit}><Icon name="close" /></IconButton>
      <ProgressBar className="flex-1" value={index / total} label="Fortschritt der Runde" />
      <span className="text-sm text-ink-soft tabular-nums">{index + 1} / {total}</span>
    </div>
  )
}

function Solution({ sentence, ok }: { sentence: Sentence; ok: boolean }) {
  return (
    <div className="space-y-3 border-t border-line pt-4" aria-live="polite">
      <p className={cx('font-semibold', ok ? 'text-ok' : 'text-accent')}>{ok ? 'Richtig' : 'So wäre es richtig:'}</p>
      <div className="flex items-start justify-between gap-3">
        <JaText phrase={sentence} tokens={sentence.tokens} size="md" roles />
        <SpeakButton text={sentence.ja} className="shrink-0" />
      </div>
      {sentence.grammar && <p className="rounded-control bg-sunken px-4 py-3 text-sm">{sentence.grammar}</p>}
      <RoleLegend />
    </div>
  )
}

function OrderRound({ round, onDone }: { round: Sentence[]; onDone: (r: Result) => void }) {
  const [index, setIndex] = useState(0)
  const [right, setRight] = useState(0)
  const sentence = round[index]
  const tiles = useMemo(() => scramble(sentence.chunks ?? []).map((text, key) => ({ text, key })), [sentence])
  const [placed, setPlaced] = useState<number[]>([])
  const [ok, setOk] = useState<boolean>()

  function check() {
    const correct = orderIsCorrect(placed.map((k) => tiles[k].text), sentence)
    setOk(correct)
    if (correct) setRight((r) => r + 1)
    void recordActivity(correct ? XP.exerciseRight : XP.exerciseWrong)
    setTimeout(() => void speak(sentence.ja), 300)
  }
  function next() {
    if (index + 1 >= round.length) return onDone({ right, total: round.length })
    setPlaced([]); setOk(undefined); setIndex(index + 1)
  }

  return (
    <section>
      <RoundHeader index={index} total={round.length} onQuit={() => onDone({ right, total: index })} />
      <Card className="space-y-5">
        <div>
          <p className="text-xs tracking-widest text-ink-soft uppercase">Bau den Satz</p>
          <p className="mt-1 font-display text-xl">{sentence.de}</p>
        </div>
        <div className="flex min-h-16 flex-wrap items-center gap-2 rounded-control border-2 border-dashed border-line p-2" aria-label="Dein Satz">
          {placed.length === 0 && <span className="px-1 text-sm text-ink-soft">Tippe die Teile in der richtigen Reihenfolge an …</span>}
          {placed.map((k) => (
            <button
              key={k} type="button" lang="ja" disabled={ok !== undefined} onClick={() => setPlaced(placed.filter((x) => x !== k))}
              className="rounded-control bg-accent-soft px-3 py-2 font-display text-xl text-accent" aria-label={`${tiles[k].text} entfernen`}
            >
              {tiles[k].text}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {tiles.map(({ text, key }) => (
            <button
              key={key} type="button" lang="ja" disabled={placed.includes(key) || ok !== undefined}
              onClick={() => { setPlaced([...placed, key]); void speak(text) }}
              className={cx('rounded-control border border-line bg-surface px-3 py-2 font-display text-xl transition-colors hover:border-accent', placed.includes(key) && 'invisible')}
            >
              {text}
            </button>
          ))}
        </div>
        {ok !== undefined && <Solution sentence={sentence} ok={ok} />}
      </Card>
      <div className="mt-4">
        {ok === undefined
          ? <Button variant="primary" size="lg" block disabled={placed.length !== tiles.length} onClick={check}>Prüfen</Button>
          : <Button variant="primary" size="lg" block onClick={next} autoFocus>Weiter <Icon name="arrowRight" /></Button>}
      </div>
    </section>
  )
}

function ParticleRound({ round, onDone }: { round: Sentence[]; onDone: (r: Result) => void }) {
  const [index, setIndex] = useState(0)
  const [right, setRight] = useState(0)
  const task = useMemo(() => particleTask(round[index])!, [round, index])
  const [chosen, setChosen] = useState<string>()

  function choose(particle: string) {
    if (chosen) return
    setChosen(particle)
    const correct = particle === task.answer
    if (correct) setRight((r) => r + 1)
    void recordActivity(correct ? XP.exerciseRight : XP.exerciseWrong)
    setTimeout(() => void speak(task.sentence.ja), 300)
  }
  function next() {
    if (index + 1 >= round.length) return onDone({ right, total: round.length })
    setChosen(undefined); setIndex(index + 1)
  }

  return (
    <section>
      <RoundHeader index={index} total={round.length} onQuit={() => onDone({ right, total: index })} />
      <Card className="space-y-4">
        <p className="text-xs tracking-widest text-ink-soft uppercase">Welche Partikel fehlt?</p>
        {!chosen && <JaText phrase={task.sentence} tokens={task.sentence.tokens} size="lg" gapAt={task.index} />}
        <p>{task.sentence.de}</p>
        {chosen && <Solution sentence={task.sentence} ok={chosen === task.answer} />}
      </Card>
      <div className="mt-4">
        {!chosen ? (
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Partikeln">
            {task.options.map((p) => (
              <button key={p} type="button" lang="ja" onClick={() => choose(p)} className="min-h-16 rounded-control border border-line bg-surface font-display text-2xl transition-colors hover:border-accent hover:bg-accent-soft">
                {p}
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

function GrammarLessons({ data, sentences, learned }: { data: LearnData; sentences: Sentence[]; learned: Set<string> }) {
  return (
    <div className="space-y-2">
      {GRAMMAR.map((lesson, n) => (
        <details key={lesson.id} className="group rounded-card border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent tabular-nums">{n + 1}</span>
            <span className="flex-1 font-medium">{lesson.title}</span>
            <span lang="ja" className="text-ink-soft">{lesson.ja}</span>
            <Icon name="arrowRight" size={18} className="text-ink-soft transition-transform group-open:rotate-90" />
          </summary>
          <div className="space-y-3 border-t border-line p-4">
            {lesson.text.map((t, k) => <p key={k}>{t}</p>)}
            {lesson.formula && <p lang="ja" className="rounded-control bg-sunken px-4 py-3 text-center font-display text-lg">{lesson.formula}</p>}
            <p className="text-xs tracking-widest text-ink-soft uppercase">Beispiele aus deinen Sätzen</p>
            <ul className="space-y-2">
              {examplesFor(lesson.pattern, sentences, data.wordsById, learned).map((s) => (
                <li key={s.id} className="rounded-control border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <JaText phrase={s} tokens={s.tokens} size="md" roles showTranslation />
                    <SpeakButton text={s.ja} className="shrink-0" />
                  </div>
                </li>
              ))}
            </ul>
            <RoleLegend />
          </div>
        </details>
      ))}
    </div>
  )
}
