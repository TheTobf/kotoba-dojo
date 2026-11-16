/**
 * Spielt eine Mission ab: Die Figur sagt etwas, man antwortet auf Japanisch (Kana, Kanji oder Romaji)
 * und kommt nur mit einer passenden Antwort weiter. Wird für Probe-Missionen und Pro-Missionen benutzt.
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { checkAnswer, type Mission } from '../../../shared/mission'
import type { Phrase } from '../../../shared/api'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Icon } from '../../ui/Icon'
import { JaText, SpeakButton } from '../../ui/JaText'
import { Notice } from '../../ui/Notice'
import { ProgressBar } from '../../ui/ProgressBar'

/** Ab so vielen Fehlversuchen darf man sich die Lösung zeigen lassen. */
const SHOW_SOLUTION_AFTER = 2

type Feedback = { type: 'richtig'; model: Phrase } | { type: 'falsch' } | { type: 'loesung'; model: Phrase }

export function MissionPlayer({ mission, onComplete, afterComplete }: { mission: Mission; onComplete?: () => void; afterComplete?: ReactNode }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [input, setInput] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>()
  const [showHint, setShowHint] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [done, setDone] = useState(false)

  const step = mission.steps[stepIndex]
  const solved = feedback?.type === 'richtig' || feedback?.type === 'loesung'

  function submit(event: FormEvent) {
    event.preventDefault()
    if (solved || !input.trim()) return
    const result = checkAnswer(input, step)
    if (result.correct) {
      setFeedback({ type: 'richtig', model: result.model })
    } else {
      setAttempts((n) => n + 1)
      setFeedback({ type: 'falsch' })
    }
  }

  function next() {
    if (stepIndex + 1 >= mission.steps.length) {
      setDone(true)
      onComplete?.()
      return
    }
    setStepIndex((i) => i + 1)
    setInput('')
    setAttempts(0)
    setFeedback(undefined)
    setShowHint(false)
    setShowTranslation(false)
  }

  if (done) {
    return (
      <Card className="rise text-center sm:p-10">
        <p lang="ja" className="font-display text-5xl text-accent">達成</p>
        <h2 className="mt-6 text-2xl">Mission geschafft!</h2>
        <div className="mx-auto mt-6 max-w-sm rounded-control bg-sunken p-4 text-left">
          <p className="mb-1 text-xs tracking-widest text-ink-soft uppercase">{mission.character.name}</p>
          <JaText phrase={mission.ending} size="md" showTranslation />
        </div>
        <div className="mt-8">{afterComplete}</div>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <ProgressBar className="flex-1" value={stepIndex / mission.steps.length} label="Fortschritt der Mission" />
        <span className="text-sm text-ink-soft tabular-nums">Schritt {stepIndex + 1} / {mission.steps.length}</span>
      </div>

      <Card key={stepIndex} className="rise sm:p-8">
        <p className="text-xs tracking-widest text-ink-soft uppercase">{mission.character.name} · {mission.character.role}</p>
        <JaText phrase={step.says} size="lg" className="mt-3" showTranslation={showTranslation} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SpeakButton text={step.says.ja} />
          {!showTranslation && (
            <button type="button" className="text-sm text-ink-soft underline hover:text-ink" onClick={() => setShowTranslation(true)}>Übersetzung zeigen</button>
          )}
        </div>

        <div className="my-6 border-t border-line" />

        <form onSubmit={submit}>
          <label htmlFor="mission-answer" className="block">
            <span className="text-xs tracking-widest text-accent uppercase">Deine Aufgabe</span>
            <span className="mt-1 block font-display text-xl">{step.task}</span>
          </label>
          <div className="mt-4 flex gap-2">
            <input
              id="mission-answer" lang="ja" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              placeholder="Auf Japanisch oder in Romaji" value={input} disabled={solved}
              onChange={(e) => { setInput(e.target.value); if (feedback?.type === 'falsch') setFeedback(undefined) }}
              className="min-h-12 w-full min-w-0 rounded-control border border-line bg-surface px-4 transition-colors hover:border-ink-soft focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none disabled:opacity-70"
            />
            {!solved && <Button type="submit" variant="primary" disabled={!input.trim()}>Prüfen</Button>}
          </div>
        </form>

        <div className="mt-4 space-y-3" aria-live="polite">
          {feedback?.type === 'falsch' && (
            <Notice tone="warn" title="Noch nicht ganz">Versuch es noch einmal – der Tipp hilft dir auf die Sprünge.</Notice>
          )}
          {feedback?.type === 'richtig' && (
            <Notice tone="ok" title="Richtig!">
              <JaText phrase={feedback.model} size="sm" showTranslation className="mt-1" />
            </Notice>
          )}
          {feedback?.type === 'loesung' && (
            <Notice title="So hättest du es sagen können">
              <JaText phrase={feedback.model} size="sm" showTranslation className="mt-1" />
            </Notice>
          )}
          {showHint && !solved && (
            <Notice title="Tipp"><span lang="de">{step.hint}</span></Notice>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {solved ? (
            <>
              <Button variant="primary" onClick={next} autoFocus>
                {stepIndex + 1 >= mission.steps.length ? 'Mission abschließen' : 'Weiter'} <Icon name="arrowRight" />
              </Button>
              <SpeakButton text={feedback.model.ja} />
            </>
          ) : (
            <>
              {!showHint && (
                <Button size="sm" onClick={() => setShowHint(true)}><Icon name="hint" size={18} /> Ich weiß nicht weiter</Button>
              )}
              {attempts >= SHOW_SOLUTION_AFTER && (
                <Button size="sm" variant="ghost" onClick={() => setFeedback({ type: 'loesung', model: step.accepted[0] })}>Lösung zeigen</Button>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
