/** Hinweis-Kasten für Rückmeldungen: Erfolg, Hinweis, Fehler. */
import type { ReactNode } from 'react'
import { cx } from './cx'

type Tone = 'info' | 'ok' | 'warn' | 'error'

const TONES: Record<Tone, string> = {
  info: 'border-line bg-sunken text-ink',
  ok: 'border-ok/40 bg-ok-soft text-ink',
  warn: 'border-warn/40 bg-warn-soft text-ink',
  error: 'border-accent/50 bg-accent-soft text-ink',
}

export function Notice({ tone = 'info', title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-control border px-4 py-3 text-sm', TONES[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cx(title && 'mt-0.5')}>{children}</div>}
    </div>
  )
}
