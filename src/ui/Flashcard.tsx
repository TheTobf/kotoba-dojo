/**
 * Karteikarte mit Vorder- und Rückseite, die sich beim Aufdecken dreht.
 * Bedienung: antippen/klicken oder über den Knopf der Seite (Leertaste) – siehe pages/app/Review.tsx.
 */
import type { ReactNode } from 'react'
import { cx } from './cx'

export function Flashcard({
  front, back, flipped, onFlip, label,
}: {
  front: ReactNode
  back: ReactNode
  flipped: boolean
  onFlip: () => void
  /** Kleine Zeile oben, z. B. „Folge 1“. */
  label?: string
}) {
  const face = 'flip-face flex min-h-[19rem] flex-col rounded-card border border-line bg-surface p-6 shadow-card sm:min-h-[21rem] sm:p-8'
  return (
    <div className="flip-scene">
      <div
        className="flip-card cursor-pointer" data-flipped={flipped}
        onClick={() => { if (!flipped) onFlip() }}
      >
        <div className={face} aria-hidden={flipped}>
          {label && <p className="text-xs tracking-widest text-ink-soft uppercase">{label}</p>}
          <div className="flex flex-1 flex-col items-center justify-center py-4">{front}</div>
          <p className={cx('text-center text-sm text-ink-soft', flipped && 'invisible')}>Antippen zum Aufdecken</p>
        </div>
        <div className={cx(face, 'flip-back')} aria-hidden={!flipped}>
          {label && <p className="text-xs tracking-widest text-ink-soft uppercase">{label}</p>}
          <div className="flex flex-1 flex-col justify-center py-4">{back}</div>
        </div>
      </div>
    </div>
  )
}
