import { useEffect, useState } from 'react'

/**
 * Schreibt `text` Buchstabe für Buchstabe von links nach rechts (wie in Wagotabi).
 * `skip` zeigt sofort alles; `onTick` wird pro Zeichen aufgerufen (für den Tipp-Klick).
 */
export default function Typewriter({ text, active, skip, speedMs = 32, onTick, className }: {
  text: string
  active: boolean
  skip?: boolean
  speedMs?: number
  onTick?: () => void
  className?: string
}) {
  const [n, setN] = useState(0)
  const chars = Array.from(text)

  useEffect(() => { setN(0) }, [text])

  useEffect(() => {
    if (!active || skip || n >= chars.length) return
    const t = setTimeout(() => {
      setN((x) => x + 1)
      if (chars[n] !== ' ') onTick?.()
    }, n === 0 ? 250 : speedMs)
    return () => clearTimeout(t)
  }, [active, skip, n, chars, speedMs, onTick])

  const shown = skip ? chars.length : active ? n : 0
  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{chars.slice(0, shown).join('')}</span>
      {shown < chars.length && active && <span aria-hidden className="animate-pulse text-sakura">▍</span>}
      {/* unsichtbarer Rest hält die Höhe stabil */}
      <span aria-hidden className="invisible">{chars.slice(shown).join('')}</span>
    </span>
  )
}
