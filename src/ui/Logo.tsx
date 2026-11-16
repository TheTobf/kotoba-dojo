/** Logo: roter Stempel (wie ein japanisches Namenssiegel) mit dem Zeichen 言 („Wort“) + Schriftzug. */
import { cx } from './cx'

export function Seal({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true" lang="ja"
      className={cx('inline-flex shrink-0 items-center justify-center rounded-[22%] bg-accent font-display leading-none text-on-accent', className)}
      style={{ width: size, height: size, fontSize: size * 0.62 }}
    >
      言
    </span>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <Seal />
      <span className="font-display text-lg leading-none tracking-tight whitespace-nowrap">Kotoba Dojo</span>
    </span>
  )
}
