/** Karte: ruhige Fläche mit feinem Rand. Grundbaustein für fast alle Inhalte. */
import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from './cx'

const BASE = 'rounded-card border border-line bg-surface'

export function Card({ className, padded = true, ...props }: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return <div className={cx(BASE, padded && 'p-5 sm:p-6', className)} {...props} />
}

/** Ganze Karte als Link (z. B. eine Folge in der Liste). */
export function LinkCard({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={cx(BASE, 'block p-5 transition-[border-color,box-shadow,transform] duration-200 ease-soft hover:-translate-y-0.5 hover:border-ink-soft hover:shadow-card sm:p-6', className)}
    >
      {children}
    </Link>
  )
}

/** Kleine Überschrift über einem Abschnitt, mit optionalem japanischem Begriff daneben. */
export function SectionTitle({ children, ja, action }: { children: ReactNode; ja?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-lg">
        {children}
        {ja && <span lang="ja" className="ml-2 font-sans text-xs font-normal tracking-widest text-ink-soft">{ja}</span>}
      </h2>
      {action}
    </div>
  )
}
