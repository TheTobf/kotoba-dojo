/**
 * Der eine Knopf der App. Varianten:
 *   primary   – die wichtigste Aktion einer Ansicht (Akzentfarbe, höchstens einer pro Bereich)
 *   secondary – alles andere
 *   ghost     – unauffällig, z. B. „Abbrechen“
 * Mit `to` wird daraus ein interner Link, mit `href` ein normaler Link – das Aussehen bleibt gleich.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from './cx'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,transform] duration-150 ease-soft active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong',
  secondary: 'border border-line bg-surface text-ink hover:border-ink-soft',
  ghost: 'text-ink-soft hover:bg-sunken hover:text-ink',
}

const SIZES: Record<Size, string> = {
  sm: 'min-h-10 px-3.5 text-sm',
  md: 'min-h-12 px-5',
  lg: 'min-h-14 px-7 text-lg',
}

interface CommonProps {
  variant?: Variant
  size?: Size
  /** Volle Breite (auf dem Handy der Normalfall für Hauptaktionen). */
  block?: boolean
  className?: string
  children: ReactNode
}

type ButtonProps = CommonProps &
  (
    | ({ to: string; href?: never } & { state?: unknown })
    | { href: string; to?: never; target?: string; rel?: string }
    | ({ to?: never; href?: never; loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>)
  )

export function Button(props: ButtonProps) {
  const { variant = 'secondary', size = 'md', block, className, children, ...rest } = props
  const classes = cx(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)

  if ('to' in rest && rest.to !== undefined) {
    return <Link to={rest.to} state={rest.state} className={classes}>{children}</Link>
  }
  if ('href' in rest && rest.href !== undefined) {
    return <a href={rest.href} target={rest.target} rel={rest.rel} className={classes}>{children}</a>
  }
  const { loading, disabled, type = 'button', ...buttonProps } = rest as { loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...buttonProps}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
      {children}
    </button>
  )
}

/** Runder Icon-Knopf (z. B. Vorlesen). `label` wird Screenreadern vorgelesen. */
export function IconButton({ label, className, children, ...props }: { label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button" aria-label={label} title={label}
      className={cx('inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:border-ink-soft hover:text-ink', className)}
      {...props}
    >
      {children}
    </button>
  )
}
