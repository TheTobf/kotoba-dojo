/**
 * Rahmen für die Rechtsseiten. Alle Texte sind ein GERÜST: Stellen mit <Fill> müssen vor dem Start ausgefüllt
 * und die Seiten rechtlich geprüft werden (siehe docs/HANDOFF.md).
 */
import type { ReactNode } from 'react'
import { FILL_IN } from '../../../../shared/legal'
import { Notice } from '../../../ui/Notice'

/** Auffällig markierter Platzhalter, z. B. <Fill>Name und Anschrift</Fill>. */
export function Fill({ children }: { children?: ReactNode }) {
  return (
    <mark className="rounded bg-warn-soft px-1.5 py-0.5 font-medium text-warn">
      {FILL_IN}{children ? <> {children}</> : null}
    </mark>
  )
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-site px-5 py-8 sm:px-8 md:py-14">
      <article className="prose-kd">
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">Stand: {updated}</p>
        <Notice tone="warn" title="Entwurf – noch nicht rechtsverbindlich" className="no-print my-6">
          Diese Seite ist ein Gerüst. Gelb markierte Stellen müssen ausgefüllt und der Text vor dem Start rechtlich geprüft werden.
        </Notice>
        {children}
      </article>
    </div>
  )
}
