/** Formular-Bausteine: Textfeld, Häkchen und Auswahlkarte – jeweils mit sichtbarer Beschriftung. */
import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cx } from './cx'

const INPUT =
  'w-full rounded-control border border-line bg-surface px-4 text-ink placeholder:text-ink-soft/70 transition-colors hover:border-ink-soft focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25'

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string
}

export function TextField({ label, hint, error, className, id, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        id={inputId} className={cx(INPUT, 'min-h-12')} aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined} {...props}
      />
      {hint && !error && <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-ink-soft">{hint}</p>}
      {error && <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-sm text-accent">{error}</p>}
    </div>
  )
}

export function TextArea({ label, hint, error, className, id, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">{label}</label>
      <textarea id={inputId} rows={3} className={cx(INPUT, 'py-3')} aria-invalid={error ? true : undefined} {...props} />
      {hint && !error && <p className="mt-1.5 text-sm text-ink-soft">{hint}</p>}
      {error && <p role="alert" className="mt-1.5 text-sm text-accent">{error}</p>}
    </div>
  )
}

export function Checkbox({ children, className, ...props }: { children: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-3 text-sm', className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-accent" {...props} />
      <span>{children}</span>
    </label>
  )
}

/** Auswahl als große, antippbare Karte (z. B. Tarif wählen). */
export function RadioCard({ children, className, ...props }: { children: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-center gap-3 rounded-control border border-line bg-surface px-4 py-3 transition-colors hover:border-ink-soft has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
        className,
      )}
    >
      <input type="radio" className="size-5 shrink-0 accent-accent focus-visible:outline-none" {...props} />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  )
}

/** Ein/Aus-Schalter für Einstellungen. */
export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full bg-sunken ring-1 ring-line transition-colors peer-checked:bg-accent peer-checked:ring-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  )
}
