/** Einstellung „Tägliche Erinnerung“ im Profil. */
import { useEffect, useState } from 'react'
import { isIosBrowser } from './AccountNudge'
import { canRemind, disableReminder, enableReminder, hasServiceWorker, reminderState } from '../lib/reminders'
import { Button } from '../ui/Button'
import { Toggle } from '../ui/Field'

export function ReminderSettings() {
  const [state, setState] = useState(reminderState)
  const [time, setTime] = useState(state?.time ?? '19:00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [workerReady, setWorkerReady] = useState(true)
  useEffect(() => { void hasServiceWorker().then(setWorkerReady) }, [])

  async function enable(at = time) {
    setBusy(true)
    setError(undefined)
    try { setState(await enableReminder(at)) } catch (e) { setError(e instanceof Error ? e.message : 'Hat nicht geklappt.') } finally { setBusy(false) }
  }
  async function disable() {
    setBusy(true)
    await disableReminder()
    setState(null)
    setBusy(false)
  }

  const hint = isIosBrowser()
    ? 'Auf dem iPhone geht das nur, wenn du Kotoba Dojo über „Teilen → Zum Home-Bildschirm“ installiert hast.'
    : !canRemind() ? 'Dieser Browser kann keine Erinnerungen anzeigen.' : !workerReady ? 'Funktioniert erst in der veröffentlichten App.' : 'Kommt nur, wenn du an dem Tag noch nicht gelernt hast.'

  return (
    <div className="py-1">
      <Toggle label="Tägliche Erinnerung" hint={hint} checked={!!state} onChange={(on) => void (on ? enable() : disable())} />
      {state && (
        <div className="flex items-center justify-between gap-4 pb-3">
          <label htmlFor="reminder-time" className="text-sm text-ink-soft">Uhrzeit</label>
          <div className="flex items-center gap-2">
            <input
              id="reminder-time" type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="min-h-11 rounded-control border border-line bg-surface px-3"
            />
            {time !== state.time && <Button size="sm" loading={busy} onClick={() => void enable(time)}>Speichern</Button>}
          </div>
        </div>
      )}
      {error && <p role="alert" className="pb-3 text-sm text-accent">{error}</p>}
    </div>
  )
}
