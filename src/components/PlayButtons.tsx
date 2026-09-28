import { speak } from '../audio'

/** Abspielen normal + langsam; `credit` wird als Tooltip gezeigt (Lizenzpflicht). */
export default function PlayButtons({ text, file, credit, size = 'md' }: {
  text: string
  file?: string
  credit?: string
  size?: 'sm' | 'md'
}) {
  const cls = size === 'sm' ? 'h-9 w-9 text-base' : 'h-11 w-11 text-lg'
  return (
    <span className="inline-flex gap-1" title={credit}>
      <button type="button" aria-label="Abspielen" onClick={() => speak(text, file)}
        className={`${cls} rounded-full bg-sakura/15 text-sakura transition hover:bg-sakura/25 active:scale-90`}>
        🔊
      </button>
      <button type="button" aria-label="Langsam abspielen" onClick={() => speak(text, file, { slow: true })}
        className={`${cls} rounded-full bg-neon/15 transition hover:bg-neon/25 active:scale-90`}>
        🐢
      </button>
    </span>
  )
}
