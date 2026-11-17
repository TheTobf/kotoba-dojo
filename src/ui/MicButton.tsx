/**
 * Mikrofon-Knopf: Antippen, auf Japanisch sprechen, fertig. Vor der ersten Nutzung erklärt ein Fenster,
 * dass der Browser den Ton zur Erkennung an seinen Hersteller schickt – erst nach Zustimmung geht es los.
 * Ohne Unterstützung im Browser wird der Knopf gar nicht gezeigt.
 */
import { useEffect, useRef, useState } from 'react'
import { canListen, listen, LISTEN_ERROR_TEXT } from '../lib/listen'
import { updateSettings, useSettings } from '../lib/settings'
import { Button } from './Button'
import { cx } from './cx'
import { Dialog } from './Dialog'
import { Icon } from './Icon'

export function MicButton({ onPartial, onResult, disabled, className }: {
  onPartial?: (text: string) => void
  onResult: (text: string) => void
  disabled?: boolean
  className?: string
}) {
  const { micConsent } = useSettings()
  const [listening, setListening] = useState(false)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string>()
  const stop = useRef<() => void>(undefined)

  useEffect(() => () => stop.current?.(), [])
  if (!canListen()) return null

  function start() {
    setError(undefined)
    setListening(true)
    stop.current = listen({
      onPartial,
      onFinal: (text) => { if (text) onResult(text) },
      onError: (e) => setError(LISTEN_ERROR_TEXT[e]),
      onEnd: () => setListening(false),
    })
  }

  function toggle() {
    if (listening) { stop.current?.(); setListening(false); return }
    if (!micConsent) { setAsking(true); return }
    start()
  }

  return (
    <>
      <button
        type="button" onClick={toggle} disabled={disabled}
        aria-label={listening ? 'Zuhören beenden' : 'Auf Japanisch sprechen'} aria-pressed={listening}
        className={cx(
          'relative inline-flex size-12 shrink-0 items-center justify-center rounded-control border transition-colors disabled:opacity-50',
          listening ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface text-ink hover:border-accent hover:text-accent',
          className,
        )}
      >
        {listening && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-control bg-accent/30" />}
        <Icon name="mic" />
      </button>
      {listening && <span className="sr-only" role="status">Ich höre zu …</span>}
      {error && <p role="alert" className="basis-full text-sm text-accent">{error}</p>}
      {asking && (
        <Dialog title="Mit dem Mikrofon antworten" onClose={() => setAsking(false)}>
          <div className="space-y-4">
            <p>Du kannst deine Antworten auf Japanisch einsprechen statt sie zu tippen.</p>
            <p className="text-sm text-ink-soft">
              Die Erkennung übernimmt dein Browser. Dafür schickt er den Ton an seinen Hersteller (bei Chrome an Google, bei Safari an Apple).
              Kotoba Dojo speichert keine Aufnahmen. Du kannst das jederzeit im Profil wieder ausschalten.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="primary" onClick={() => { updateSettings({ micConsent: true }); setAsking(false); start() }}>Einverstanden, los geht’s</Button>
              <Button variant="ghost" onClick={() => setAsking(false)}>Lieber tippen</Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  )
}
