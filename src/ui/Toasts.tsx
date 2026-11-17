/**
 * Ruhige Rückmeldungen am unteren Rand: Level erreicht, Lernserie, Tagesziel, neuer Erfolg.
 * Kommt aus recordActivity (src/lib/progress.ts). Für Screenreader über aria-live.
 */
import { useEffect, useState } from 'react'
import { PROGRESS_EVENT, type ProgressEvent } from '../lib/progress'
import { Icon } from './Icon'

interface Toast {
  id: number
  mark: string
  title: string
  text?: string
}

function toToast(event: ProgressEvent, id: number): Toast {
  switch (event.type) {
    case 'level':
      return { id, mark: '昇', title: `Level ${event.level} erreicht`, text: event.rank ? `Neuer Rang: ${event.rank}` : undefined }
    case 'streak':
      return { id, mark: '続', title: `${event.days} Tage in Folge`, text: 'Deine Lernserie wächst.' }
    case 'goal':
      return { id, mark: '的', title: 'Tagesziel geschafft', text: `${event.goal} Übungen heute. お疲れ様!` }
    case 'achievement':
      return { id, mark: event.mark, title: `Erfolg: ${event.name}`, text: event.text }
  }
}

const SHOW_MS = 4000

export function Toasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    let next = 0
    const onEvent = (e: Event) => {
      const toast = toToast((e as CustomEvent<ProgressEvent>).detail, next++)
      setToasts((list) => [...list.slice(-2), toast])
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== toast.id)), SHOW_MS)
    }
    window.addEventListener(PROGRESS_EVENT, onEvent)
    return () => window.removeEventListener(PROGRESS_EVENT, onEvent)
  }, [])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-5 md:bottom-6"
    >
      {toasts.map((t) => (
        <div key={t.id} role="status" className="rise pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-raised">
          <span lang="ja" aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[22%] bg-accent font-display text-lg text-on-accent">{t.mark}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t.title}</span>
            {t.text && <span className="block text-sm text-ink-soft">{t.text}</span>}
          </span>
          <button type="button" aria-label="Meldung schließen" className="text-ink-soft hover:text-ink" onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}>
            <Icon name="close" size={18} />
          </button>
        </div>
      ))}
    </div>
  )
}
