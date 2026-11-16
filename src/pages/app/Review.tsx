/**
 * Lernsitzung: eine Karte nach der anderen. Karte aufdecken, ehrlich bewerten, weiter.
 * Tastatur: Leertaste/Enter = aufdecken · 1–4 = bewerten.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { findEpisode } from '../../content/story'
import { loadData } from '../../lib/data'
import { db } from '../../lib/db'
import { useSettings } from '../../lib/settings'
import { speak } from '../../lib/speech'
import { buildSession, GRADES, previewIntervals, rate, type Grade, type Scope, type SessionEntry } from '../../lib/srs'
import { PageHeader } from '../../layouts/AppLayout'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Flashcard } from '../../ui/Flashcard'
import { JaText, SpeakButton } from '../../ui/JaText'
import { Notice } from '../../ui/Notice'
import { ProgressBar } from '../../ui/ProgressBar'

/** Karten, die in weniger als so vielen Minuten wieder fällig sind, kommen in derselben Sitzung noch einmal. */
const REQUEUE_MINUTES = 15

export function Component() {
  const [params] = useSearchParams()
  const { newPerDay } = useSettings()
  const episode = findEpisode(params.get('folge') ?? '')
  const scope = useMemo<Scope>(
    () => (episode ? { type: 'folge', episodeId: episode.id } : params.get('fehler') ? { type: 'fehler' } : { type: 'alles' }),
    [episode, params],
  )

  const [queue, setQueue] = useState<SessionEntry[]>()
  const [position, setPosition] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const total = useRef(0)

  // Die Sitzung wird einmal beim Öffnen zusammengestellt und ändert sich währenddessen nicht.
  useEffect(() => {
    let active = true
    Promise.all([loadData(), db.cards.toArray(), db.mistakes.toArray()])
      .then(([data, cards, mistakes]) => {
        if (!active) return
        const session = buildSession({ cards, scope, newPerDay, data, mistakes })
        total.current = session.length
        setQueue(session)
      })
      .catch(() => active && setError('Die Lerndaten konnten nicht geladen werden. Bitte lade die Seite neu.'))
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  const current = queue?.[position]
  const intervals = useMemo(() => (current ? previewIntervals(current.state) : []), [current])

  const flip = useCallback(() => {
    if (!current || flipped) return
    setFlipped(true)
  }, [current, flipped])

  const grade = useCallback(
    async (value: Grade) => {
      if (!current || !flipped || saving) return
      setSaving(true)
      try {
        const state = await rate(current.item, current.state, value)
        if (state.due - Date.now() < REQUEUE_MINUTES * 60_000) setQueue((q) => [...(q ?? []), { item: current.item, state }])
        setFlipped(false)
        setPosition((p) => p + 1)
      } catch {
        setError('Die Bewertung konnte nicht gespeichert werden. Bitte versuch es noch einmal.')
      } finally {
        setSaving(false)
      }
    },
    [current, flipped, saving],
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|BUTTON|A)$/.test(event.target.tagName) && event.key !== ' ') return
      if (!flipped && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault()
        flip()
      } else if (flipped && ['1', '2', '3', '4'].includes(event.key)) {
        void grade(GRADES[Number(event.key) - 1].grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flip, flipped, grade])

  const back = episode ? { to: `/app/story/folge/${episode.id}`, label: `Folge ${episode.number}` } : { to: '/app/lernen', label: 'Lernen' }
  const title = episode ? `Lektion: ${episode.title}` : scope.type === 'fehler' ? 'Fehlerkarten' : 'Lernsitzung'

  if (error && !queue) return <><PageHeader title={title} back={back} /><Notice tone="error">{error}</Notice></>
  if (!queue) return <><PageHeader title={title} back={back} /><p className="text-ink-soft">Karten werden vorbereitet …</p></>

  if (!current) {
    const nothing = total.current === 0
    return (
      <>
        <PageHeader title={title} back={back} />
        <Card className="rise text-center sm:p-10">
          <p lang="ja" className="font-display text-5xl text-accent">{nothing ? '休憩' : 'お疲れ様'}</p>
          <h2 className="mt-6 text-2xl">{nothing ? 'Gerade ist nichts fällig' : 'Geschafft!'}</h2>
          <p className="mt-2 text-ink-soft">
            {nothing ? 'Schau später wieder vorbei oder lerne eine Story-Lektion.' : `Du hast ${total.current} ${total.current === 1 ? 'Karte' : 'Karten'} gelernt. „Otsukaresama“ – gute Arbeit.`}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to="/app/story" variant="primary">Zur Story</Button>
            <Button to="/app">Zum Start</Button>
          </div>
        </Card>
      </>
    )
  }

  const { item } = current
  return (
    <>
      <PageHeader title={title} back={back} />
      <div className="mb-5 flex items-center gap-3">
        <ProgressBar className="flex-1" value={queue.length ? position / queue.length : 0} label="Fortschritt der Sitzung" />
        <span className="text-sm text-ink-soft tabular-nums">{position + 1} / {queue.length}</span>
      </div>

      <Flashcard
        key={`${item.cardId}-${position}`} label={item.label} flipped={flipped} onFlip={flip}
        front={
          <>
            <JaText phrase={item} tokens={item.tokens} size={item.kind === 'wort' ? 'xl' : 'lg'} align="center" />
            <SpeakButton text={item.ja} className="mt-6" />
          </>
        }
        back={
          <div className="space-y-5">
            <div>
              <JaText phrase={item} tokens={item.tokens} size="md" />
              <p className="mt-3 font-display text-2xl">{item.de}</p>
            </div>
            {item.example && (
              <div className="border-t border-line pt-4">
                <p className="mb-2 text-xs tracking-widest text-ink-soft uppercase">Beispiel</p>
                <JaText phrase={item.example} tokens={item.example.tokens} size="md" showTranslation />
                <SpeakButton text={item.example.ja} className="mt-3" />
              </div>
            )}
            {item.note && <p className="rounded-control bg-sunken px-4 py-3 text-sm">{item.note}</p>}
          </div>
        }
      />

      {error && <Notice tone="error" className="mt-4">{error}</Notice>}

      <div className="mt-6">
        {!flipped ? (
          <Button variant="primary" size="lg" block onClick={flip}>Antwort zeigen</Button>
        ) : (
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Wie gut wusstest du es?">
            {GRADES.map(({ grade: value, label }, index) => (
              <button
                key={value} type="button" disabled={saving} onClick={() => void grade(value)}
                className="flex min-h-16 flex-col items-center justify-center rounded-control border border-line bg-surface px-1 transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
              >
                <span className="font-medium">{label}</span>
                <span className="text-xs text-ink-soft">{intervals[index]}</span>
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 hidden text-center text-xs text-ink-soft md:block">
          Tastatur: Leertaste = aufdecken · 1–4 = bewerten
        </p>
      </div>
      {flipped && item.kind !== 'wort' && <AutoSpeak text={item.ja} />}
    </>
  )
}

/** Liest einen Satz beim Aufdecken einmal vor (nach einer Nutzeraktion, deshalb erlaubt der Browser den Ton). */
function AutoSpeak({ text }: { text: string }) {
  useEffect(() => { speak(text) }, [text])
  return null
}
