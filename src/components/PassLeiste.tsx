import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { koban } from '../koban'
import { aktuelleSaison, stufeAus } from '../pass'
import { STUFEN_PRO_SAISON } from '../content/pass'

/** Reise-Pass-Fortschritt; Ziel der Koban-Münzen (id="pass-ziel"). */
export default function PassLeiste() {
  const p = useLiveQuery(() => db.profile.get('me'))
  const offen = useSyncExternalStore(koban.subscribe, () => koban.ausstehend)
  const [puls, setPuls] = useState(0)
  const saison = aktuelleSaison()
  const xp = Math.max(0, (p?.seasonXp?.[saison.id] ?? 0) - offen)
  const { stufe, ratio, fertig } = stufeAus(xp)

  useEffect(() => {
    const on = () => setPuls((x) => x + 1)
    window.addEventListener('koban-treffer', on)
    return () => window.removeEventListener('koban-treffer', on)
  }, [])

  return (
    <Link to="/pass" className="flex items-center gap-2 px-4 py-1.5 md:px-8" aria-label="Reise-Pass">
      <span className="text-sm">{saison.icon}</span>
      <span className="shrink-0 text-xs font-bold tabular-nums">
        {fertig ? 'MAX' : `Stufe ${stufe}`}<span className="font-normal opacity-50">/{STUFEN_PRO_SAISON}</span>
      </span>
      <span id="pass-ziel" className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-yuzu to-amber-500 transition-[width] duration-150"
          style={{ width: `${(fertig ? 1 : ratio) * 100}%` }} />
        {puls > 0 && <span key={puls} className="koban-puls absolute inset-0 rounded-full" />}
      </span>
      <span className="text-sm">🪙</span>
    </Link>
  )
}

/** Bildschirmposition, an der die Münzen „einrasten“: Ende der Füllung. */
export function zielPunkt() {
  const el = document.getElementById('pass-ziel')
  if (!el) return { x: window.innerWidth / 2, y: 20 }
  const r = el.getBoundingClientRect()
  const fill = el.firstElementChild?.getBoundingClientRect()
  return { x: Math.max(r.left + 6, (fill?.right ?? r.left) - 4), y: r.top + r.height / 2 }
}
