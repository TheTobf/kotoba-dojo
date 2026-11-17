/** Lernserie, Tagesziel und Level auf einen Blick (Start-Seite) und ausführlich (Profil). */
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { dayKeyBefore } from '../lib/day'
import { ACHIEVEMENTS, currentStreak, doneToday, emptyProfile, levelInfo, rankFor, type Profile } from '../lib/progress'
import { useSettings } from '../lib/settings'
import { Card } from '../ui/Card'
import { cx } from '../ui/cx'
import { ProgressBar } from '../ui/ProgressBar'

export function useProfile(): Profile {
  return useLiveQuery(async () => ({ ...emptyProfile(), ...(await db.profile.get('me')) }), [], emptyProfile())
}

/** Kompakte Zeile: Lernserie · Tagesziel · Level. */
export function ProgressStrip() {
  const profile = useProfile()
  const { dailyGoal } = useSettings()
  const streak = currentStreak(profile)
  const today = doneToday(profile)
  const level = levelInfo(profile.xp)
  const rank = rankFor(level.level)
  return (
    <div className="grid grid-cols-3 gap-2">
      <Card padded={false} className="px-4 py-3">
        <p className="text-xs tracking-widest text-ink-soft uppercase">Serie</p>
        <p className="font-display text-xl tabular-nums">{streak} {streak === 1 ? 'Tag' : 'Tage'}</p>
      </Card>
      <Card padded={false} className="px-4 py-3">
        <p className="text-xs tracking-widest text-ink-soft uppercase">Tagesziel</p>
        <p className="font-display text-xl tabular-nums">{Math.min(today, dailyGoal)} / {dailyGoal}</p>
        <ProgressBar className="mt-1.5" value={today / dailyGoal} label="Tagesziel" />
      </Card>
      <Card padded={false} className="px-4 py-3">
        <p className="text-xs tracking-widest text-ink-soft uppercase">Level {level.level}</p>
        <p lang="ja" className="font-display text-xl">{rank.ja}</p>
        <ProgressBar className="mt-1.5" value={level.ratio} label={`Fortschritt bis Level ${level.level + 1}`} />
      </Card>
    </div>
  )
}

/** Lernkalender der letzten 12 Wochen. */
function Calendar({ profile }: { profile: Profile }) {
  const days = Array.from({ length: 84 }, (_, i) => dayKeyBefore(83 - i))
  const shade = (n: number) => (n === 0 ? 'bg-sunken' : n < 10 ? 'bg-accent/30' : n < 25 ? 'bg-accent/60' : 'bg-accent')
  return (
    <div className="max-w-xs">
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label={`An ${days.filter((d) => profile.activeDays[d]).length} der letzten 84 Tage gelernt`}>
        {days.map((day) => (
          <span key={day} title={`${day}: ${profile.activeDays[day] ?? 0} Übungen`} className={cx('aspect-square rounded-[3px]', shade(profile.activeDays[day] ?? 0))} />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-soft">Die letzten 12 Wochen. Je dunkler, desto mehr geübt.</p>
    </div>
  )
}

function AchievementList({ items, earned }: { items: typeof ACHIEVEMENTS; earned: Set<string> }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((a) => {
        const done = earned.has(a.id)
        return (
          <li key={a.id} className={cx('flex items-center gap-3 rounded-control border px-3 py-2', done ? 'border-line bg-surface' : 'border-dashed border-line')}>
            <span lang="ja" aria-hidden="true" className={cx('flex size-9 shrink-0 items-center justify-center rounded-[22%] font-display', done ? 'bg-accent text-on-accent' : 'bg-sunken text-ink-soft')}>{a.mark}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{a.name}{!done && <span className="font-normal text-ink-soft"> · offen</span>}</span>
              <span className="block text-xs text-ink-soft">{a.text}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Ausführliche Ansicht im Profil: Level, Serie, Kalender, Erfolge. */
export function ProgressDetails() {
  const profile = useProfile()
  const level = levelInfo(profile.xp)
  const rank = rankFor(level.level)
  const earned = new Set(profile.achievements)
  return (
    <Card className="space-y-6">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-xl">Level {level.level} <span lang="ja" className="ml-1">{rank.ja}</span> <span className="text-base text-ink-soft">{rank.de}</span></p>
          <p className="text-sm text-ink-soft tabular-nums">{profile.xp} Punkte</p>
        </div>
        <ProgressBar className="mt-2" value={level.ratio} label={`Fortschritt bis Level ${level.level + 1}`} />
        <p className="mt-1 text-sm text-ink-soft">Noch {level.need - level.into} Punkte bis Level {level.level + 1}.</p>
      </div>
      <div className="flex gap-8">
        <div><p className="font-display text-2xl tabular-nums">{currentStreak(profile)}</p><p className="text-sm text-ink-soft">Tage in Folge</p></div>
        <div><p className="font-display text-2xl tabular-nums">{profile.bestStreak}</p><p className="text-sm text-ink-soft">beste Serie</p></div>
      </div>
      <Calendar profile={profile} />
      <div>
        <p className="mb-3 font-semibold">Erfolge <span className="font-normal text-ink-soft">· {ACHIEVEMENTS.filter((a) => earned.has(a.id)).length} von {ACHIEVEMENTS.length}</span></p>
        {/* Erreichte Erfolge und die nächsten drei offenen; der Rest klappt auf. */}
        <AchievementList items={[...ACHIEVEMENTS.filter((a) => earned.has(a.id)), ...ACHIEVEMENTS.filter((a) => !earned.has(a.id)).slice(0, 3)]} earned={earned} />
        {ACHIEVEMENTS.filter((a) => !earned.has(a.id)).length > 3 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-ink-soft hover:text-ink">Alle offenen Erfolge zeigen</summary>
            <div className="mt-3"><AchievementList items={ACHIEVEMENTS.filter((a) => !earned.has(a.id)).slice(3)} earned={earned} /></div>
          </details>
        )}
      </div>
    </Card>
  )
}
