/** Titelbild (cover.jpg): Szene aus der Folge mit großem Titel – ohne App, ohne Werbung. */
import { AbsoluteFill } from 'remotion'
import type { Timeline } from '../episode/timeline'
import { useFonts } from '../fonts'
import { LOOKS } from '../look/looks'
import { EpisodeScene, fontText } from './EpisodeVideo'

const L = LOOKS.knete
const FONT = `"${L.text.font}", "Noto Sans JP Variable", sans-serif`

export type CoverProps = { timeline?: Timeline; at?: number; title?: string; ja?: string }

export function Cover({ timeline, at, title, ja }: CoverProps) {
  const ready = useFonts(fontText(timeline) + (title ?? '') + (ja ?? ''))
  if (!timeline) return <AbsoluteFill style={{ background: L.palette.ink }} />
  const t = at ?? timeline.ja[0]?.start ?? 3
  const { safe } = timeline
  const width = timeline.width - safe.left - safe.right
  const stroke = { WebkitTextStroke: `16px ${L.palette.ink}`, paintOrder: 'stroke fill' } as const
  return (
    <AbsoluteFill>
      {ready && <EpisodeScene tl={timeline} t={t} />}
      {ready && (
        <div style={{ position: 'absolute', top: safe.top + 20, left: safe.left, width }}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: '#fff', background: L.palette.ink, display: 'inline-block', padding: '8px 22px', borderRadius: 999 }}>Gestrandet in Japan · {timeline.titleLine}</div>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 112, lineHeight: 1.02, color: '#fff', marginTop: 18, ...stroke, textShadow: `0 12px 0 ${L.palette.accent}` }}>{title ?? timeline.hook.title}</div>
          {ja && <div lang="ja" style={{ fontFamily: FONT, fontWeight: 900, fontSize: 84, color: '#ffcf3f', marginTop: 18, ...stroke }}>{ja}</div>}
        </div>
      )}
    </AbsoluteFill>
  )
}
