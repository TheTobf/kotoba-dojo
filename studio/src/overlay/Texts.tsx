/** Text-Einblendungen im Look: Hook-Titel und Lern-Untertitel (Japanisch groß, darunter Kana/Romaji und Deutsch). */
import type { CSSProperties } from 'react'
import { SAFE_ZONE, type Look } from '../look/looks'

export function HookTitle({ look, text, sub }: { look: Look; text: string; sub?: string }) {
  const t = look.text
  // Papier und Holzschnitt: Titel auf einem Papierschild, damit er vor jedem Hintergrund lesbar bleibt.
  const label: CSSProperties = look.id === 'knete' ? {} : {
    background: look.palette.paper, padding: '26px 34px 28px', borderRadius: look.id === 'washi' ? 18 : 6,
    boxShadow: look.id === 'washi' ? '0 14px 0 rgba(43,38,33,0.12)' : `8px 8px 0 ${look.palette.ink}`,
    border: look.id === 'holzschnitt' ? `5px solid ${look.palette.ink}` : 'none',
    transform: look.id === 'washi' ? 'rotate(-1.5deg)' : 'none', display: 'inline-block',
  }
  const style: CSSProperties = {
    ...label,
    position: 'absolute', top: SAFE_ZONE.top + 10, left: SAFE_ZONE.left, maxWidth: 1080 - SAFE_ZONE.left - SAFE_ZONE.right,
    fontFamily: t.font, fontWeight: 900, fontSize: 92, lineHeight: 1.1, color: look.id === 'knete' ? '#ffffff' : t.jaColor,
    WebkitTextStroke: look.id === 'knete' ? `14px ${t.jaStroke}` : undefined, paintOrder: 'stroke fill',
    textShadow: look.id === 'knete' ? t.jaShadow : 'none', letterSpacing: '-0.01em',
  }
  return (
    <div style={style}>
      {look.id === 'holzschnitt' && <div style={{ width: 120, height: 10, background: look.palette.accent, marginBottom: 22 }} />}
      {text}
      {sub && <div style={{ fontSize: 46, fontWeight: 700, marginTop: 14, WebkitTextStroke: look.id === 'knete' ? `8px ${t.jaStroke}` : undefined, color: look.id === 'knete' ? '#ffffff' : look.palette.accent }}>{sub}</div>}
    </div>
  )
}

export function LearnLine({ look, ja, kana, romaji, de, label }: { look: Look; ja: string; kana: string; romaji: string; de: string; label?: string }) {
  const t = look.text
  const box: CSSProperties = {
    position: 'absolute', left: SAFE_ZONE.left, right: SAFE_ZONE.right, bottom: SAFE_ZONE.bottom + 20,
    background: t.boxBg, border: t.boxBorder === 'transparent' ? 'none' : `5px solid ${t.boxBorder}`, borderRadius: t.boxRadius,
    padding: '34px 40px 30px', boxShadow: look.id === 'washi' ? '0 18px 0 rgba(43,38,33,0.10)' : 'none',
  }
  return (
    <div style={box}>
      {label && (
        <div style={{ fontFamily: t.font, fontWeight: 700, fontSize: 34, color: look.id === 'knete' ? '#ffcf3f' : look.palette.accent, marginBottom: 10 }}>{label}</div>
      )}
      <div lang="ja" style={{ fontFamily: t.font, fontWeight: t.weight, fontSize: 104, lineHeight: 1.15, color: look.id === 'knete' ? '#ffffff' : t.jaColor }}>{ja}</div>
      <div lang="ja" style={{ fontFamily: t.font, fontWeight: 500, fontSize: 40, color: t.small, marginTop: 12, opacity: 0.9 }}>{kana} · {romaji}</div>
      <div style={{ fontFamily: t.font, fontWeight: 700, fontSize: 46, color: t.small, marginTop: 8 }}>{de}</div>
      {look.id === 'holzschnitt' && (
        <div style={{ position: 'absolute', top: -34, right: 36, width: 86, height: 86, background: look.palette.accent, color: '#f6ead3', fontFamily: t.font, fontWeight: 700, fontSize: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-6deg)', borderRadius: 8 }}>話</div>
      )}
    </div>
  )
}
