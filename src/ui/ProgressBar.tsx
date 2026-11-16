/** Fortschrittsbalken (0 … 1). Für Screenreader mit Beschriftung und Prozentwert. */
import { cx } from './cx'

export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      className={cx('h-1.5 overflow-hidden rounded-full bg-sunken', className)}
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-soft" style={{ width: `${percent}%` }} />
    </div>
  )
}
