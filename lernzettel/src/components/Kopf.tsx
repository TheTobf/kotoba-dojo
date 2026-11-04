import type { ReactNode } from 'react'

interface Props {
  titel: ReactNode
  zurueck?: string
  rechts?: ReactNode
  farbe?: string
}

/** Klebende Kopfzeile mit Zurück-Pfeil */
export default function Kopf({ titel, zurueck, rechts, farbe }: Props) {
  return (
    <header className="sicher-oben sticky top-0 z-20 border-b border-black/5 bg-papier/90 backdrop-blur-md dark:border-white/10 dark:bg-nacht/90">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-2">
        {zurueck && (
          <a href={zurueck} className="knopf size-11 shrink-0 px-0 text-2xl" aria-label="Zurück" style={{ color: farbe }}>
            ‹
          </a>
        )}
        <h1 className={`min-w-0 flex-1 truncate text-lg font-bold ${zurueck ? '' : 'px-2'}`}>{titel}</h1>
        {rechts}
      </div>
    </header>
  )
}
