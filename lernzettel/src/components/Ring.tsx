interface Props {
  wert: number
  max: number
  groesse?: number
  farbe?: string
  dicke?: number
  children?: React.ReactNode
}

/** Fortschrittsring */
export default function Ring({ wert, max, groesse = 56, farbe = '#16a34a', dicke = 6, children }: Props) {
  const r = (groesse - dicke) / 2
  const u = 2 * Math.PI * r
  const anteil = max > 0 ? Math.min(1, wert / max) : 0
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: groesse, height: groesse }}>
      <svg width={groesse} height={groesse} className="-rotate-90" aria-hidden="true">
        <circle cx={groesse / 2} cy={groesse / 2} r={r} fill="none" strokeWidth={dicke} className="stroke-black/8 dark:stroke-white/10" />
        <circle
          cx={groesse / 2}
          cy={groesse / 2}
          r={r}
          fill="none"
          stroke={farbe}
          strokeWidth={dicke}
          strokeLinecap="round"
          strokeDasharray={u}
          strokeDashoffset={u * (1 - anteil)}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
