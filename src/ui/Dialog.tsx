/**
 * Fenster über der Seite (nutzt das eingebaute <dialog>: Escape schließt, Fokus bleibt im Fenster).
 * Schließt nur über den Knopf oder Escape – ein Tipp daneben beendet nichts (wichtig beim Schreiben mit dem Finger).
 */
import { useEffect, useRef, type ReactNode } from 'react'
import { IconButton } from './Button'
import { Icon } from './Icon'

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [])
  return (
    <dialog
      ref={ref} aria-label={title} onCancel={(e) => { e.preventDefault(); onClose() }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-card border border-line bg-surface p-0 text-ink shadow-raised backdrop:bg-ink/40"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="text-lg">{title}</h2>
        <IconButton label="Schließen" onClick={onClose}><Icon name="close" /></IconButton>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  )
}
