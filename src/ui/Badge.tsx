/** Kleines Etikett, z. B. „Pro“ oder die Pflicht-Kennzeichnung „KI“. */
import type { ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

type Tone = 'neutral' | 'accent' | 'ok'

const TONES: Record<Tone, string> = {
  neutral: 'border-line text-ink-soft',
  accent: 'border-accent text-accent',
  ok: 'border-ok text-ok',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap', TONES[tone], className)}>
      {children}
    </span>
  )
}

/** Kennzeichnet eine Figur als KI. Wird überall gezeigt, wo eine KI-Figur auftaucht. */
export function AiBadge() {
  return (
    <Badge>
      <Icon name="robot" size={14} />
      KI
    </Badge>
  )
}
