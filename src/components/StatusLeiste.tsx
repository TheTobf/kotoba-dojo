import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { aktuellerStreak, levelInfo, rangFuer } from '../motivation'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../types'

/** Streak-Flamme, Tagesziel-Ring und Level – kompakt für Kopfzeile/Seitenleiste. */
export default function StatusLeiste({ kompakt = false }: { kompakt?: boolean }) {
  const p = { ...DEFAULT_PROFILE, ...useLiveQuery(() => db.profile.get('me')) }
  const s = { ...DEFAULT_SETTINGS, ...useLiveQuery(() => db.settings.get('me')) }
  const heute = p.activeDays[new Date().toISOString().slice(0, 10)] ?? 0
  const ziel = Math.min(1, heute / s.dailyGoal)
  const streak = aktuellerStreak(p)
  const lv = levelInfo(p.xp)
  const rang = rangFuer(lv.level)
  const R = 15, U = 2 * Math.PI * R

  return (
    <Link to="/statistik" className={`flex items-center gap-3 ${kompakt ? '' : 'rounded-xl p-3 hover:bg-black/5 dark:hover:bg-white/5'}`}
      title={`Tagesziel: ${heute}/${s.dailyGoal} · ${p.xp} XP`}>
      <span className={`flex items-center gap-0.5 font-bold tabular-nums ${streak ? 'text-orange-500' : 'opacity-40 grayscale'}`}>
        🔥{streak}
      </span>
      <svg width={34} height={34} viewBox="0 0 36 36" aria-label={`Tagesziel ${Math.round(ziel * 100)} %`}>
        <circle cx={18} cy={18} r={R} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={4} />
        <circle cx={18} cy={18} r={R} fill="none" strokeWidth={4} strokeLinecap="round"
          className={ziel >= 1 ? 'stroke-matcha' : 'stroke-sakura'}
          strokeDasharray={U} strokeDashoffset={U * (1 - ziel)} transform="rotate(-90 18 18)" style={{ transition: 'stroke-dashoffset .5s' }} />
        <text x={18} y={22} textAnchor="middle" fontSize={ziel >= 1 ? 13 : 10} className="fill-current font-bold">{ziel >= 1 ? '✓' : heute}</text>
      </svg>
      <span className="flex flex-col leading-tight">
        <span className="text-xs font-bold"><span lang="ja">{rang.jp}</span> · Lv {lv.level}</span>
        {!kompakt && (
          <span className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <span className="block h-full bg-yuzu" style={{ width: `${lv.ratio * 100}%` }} />
          </span>
        )}
      </span>
    </Link>
  )
}
