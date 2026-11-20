/**
 * Alle Einblendungen einer Folge im Knete-Look: Hook-Titel, Satz-Zähler, Untertitel (Wort für Wort),
 * Lernkasten (Japanisch groß, Kana/Romaji/Deutsch klein, wortgenau mitlaufend), Quiz mit Countdown, Endkarte.
 * Alles bleibt in der TikTok-Sicherheitszone (nicht unten, nicht rechts).
 */
import type { CSSProperties } from 'react'
import { interpolate } from 'remotion'
import { ease, pop } from '../characters/actions'
import type { Mora, TCaption, TJa, TQuiz, Timeline } from '../episode/timeline'
import { LOOKS } from '../look/looks'

const L = LOOKS.knete
const FONT = `"${L.text.font}", "Noto Sans JP Variable", sans-serif`
const INK = L.palette.ink
const YELLOW = '#ffcf3f'
const CORAL = L.palette.accent
const BLUE = L.palette.accent2

const outline = (px: number): CSSProperties => ({ WebkitTextStroke: `${px}px ${INK}`, paintOrder: 'stroke fill' })

let measureCtx: CanvasRenderingContext2D | null = null
/** Textbreite in Pixeln mit der echten Schrift */
export function textWidth(text: string, size: number, weight = 900): number {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  measureCtx!.font = `${weight} ${size}px ${FONT}`
  return measureCtx!.measureText(text).width
}

/**
 * Schriftgröße, damit der Text in die Breite passt. Lange Sätze werden zweizeilig – getrennt hinter einem
 * Komma oder einer Partikel (を, は, が, に, で …), nie mitten im Wort.
 */
function fitJapanese(text: string, base: number, width: number): { size: number; lines: string[] } {
  if (textWidth(text, base) <= width) return { size: base, lines: [text] }
  const chars = [...text]
  let best: { lines: string[]; widest: number } | undefined
  for (let i = 2; i < chars.length - 3; i++) {
    // Partikel an einer Schriftgrenze (z. B. カタカナ+を, 漢字+は) – so wird nie ein Wort wie ありがとう zerrissen
    const hira = (c?: string) => !!c && /[ぁ-ゖ]/.test(c)
    const breakable = /[、，]/.test(chars[i]) || (/[をはがにでへとも]/.test(chars[i]) && (!hira(chars[i - 1]) || !hira(chars[i + 1])))
    if (!breakable) continue
    const lines = [chars.slice(0, i + 1).join(''), chars.slice(i + 1).join('')]
    const widest = Math.max(...lines.map((l) => textWidth(l, base)))
    if (!best || widest < best.widest) best = { lines, widest }
  }
  const lines = best?.lines ?? [chars.slice(0, Math.ceil(chars.length / 2)).join(''), chars.slice(Math.ceil(chars.length / 2)).join('')]
  let size = base
  while (size > 56 && Math.max(...lines.map((l) => textWidth(l, size))) > width) size -= 2
  return { size, lines }
}

export function Overlays({ tl, t }: { tl: Timeline; t: number }) {
  const safe = tl.safe
  const innerWidth = tl.width - safe.left - safe.right
  const ja = tl.ja.find((j) => t >= j.start && t < j.end)
  const quiz = tl.quiz.find((q) => t >= q.start && t < q.revealStart)
  const caption = tl.captions.find((c) => t >= c.start && t < c.end)
  const box = ja && !ja.quiz ? 'ja' : ja?.quiz && t >= (tl.quiz.find((q) => q.beat === ja.beat)?.revealStart ?? 0) ? 'ja' : undefined
  return (
    <>
      {t < tl.hook.end && <Hook tl={tl} t={t} width={innerWidth} />}
      {tl.kind === 'folge' && t >= tl.counter.showFrom && t < tl.endCard.start && <Counter tl={tl} t={t} />}
      {tl.kind === 'app' && (
        <div style={{ position: 'absolute', top: tl.safe.top - 10, right: tl.safe.right, fontFamily: FONT, fontWeight: 900, fontSize: 30, color: '#fff', background: 'rgba(42,35,64,0.85)', padding: '8px 20px', borderRadius: 999 }}>Werbung · meine eigene App</div>
      )}
      {quiz && <Quiz q={quiz} t={t} hint={tl.ja.find((j) => j.beat === quiz.beat)?.sentence.de ?? ''} width={innerWidth} safeTop={safe.top} bottom={safe.bottom} />}
      {box && ja && <LearnBox ja={ja} t={t} tl={tl} width={innerWidth} />}
      {caption && !(t >= tl.endCard.start + 0.25) && <Caption c={caption} t={t} tl={tl} raised={!!box} width={innerWidth} />}
      {t >= tl.endCard.start && <EndCard tl={tl} t={t} width={innerWidth} />}
      {tl.preview && (
        <div style={{ position: 'absolute', top: 40, right: 30, background: '#e2574c', color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 30, padding: '10px 20px', borderRadius: 999 }}>
          VORSCHAU · Ersatzstimmen
        </div>
      )}
    </>
  )
}

function Hook({ tl, t, width }: { tl: Timeline; t: number; width: number }) {
  const k = pop(t / 0.35)
  const out = ease((t - (tl.hook.end - 0.25)) / 0.25)
  const size = Math.min(tl.text.hook, Math.floor((width / Math.max(4, tl.hook.title.length)) * 1.75))
  return (
    <div style={{ position: 'absolute', top: tl.safe.top + 10, left: tl.safe.left, width, transform: `scale(${0.6 + 0.4 * k}) translateY(${-out * 40}px)`, transformOrigin: 'left top', opacity: 1 - out }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, color: '#fff', background: INK, display: 'inline-block', padding: '6px 16px', borderRadius: 999, marginBottom: 14 }}>{tl.titleLine}</div>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.05, color: '#fff', ...outline(16), textShadow: `0 10px 0 ${CORAL}` }}>{tl.hook.title}</div>
      {tl.hook.sub && (
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: Math.round(size * 0.5), marginTop: 12, color: YELLOW, ...outline(10), opacity: ease((t - 0.35) / 0.25) }}>{tl.hook.sub}</div>
      )}
    </div>
  )
}

function Counter({ tl, t }: { tl: Timeline; t: number }) {
  const passed = tl.counter.steps.filter((s) => t >= s.at)
  const value = passed.length ? passed[passed.length - 1].value : tl.counter.base
  const last = passed[passed.length - 1]
  const bump = last ? Math.max(0, 1 - (t - last.at) / 0.6) : 0
  const appear = ease((t - tl.counter.showFrom) / 0.3)
  return (
    <div style={{ position: 'absolute', top: tl.safe.top - 10, left: tl.safe.left, opacity: appear, transform: `scale(${1 + bump * 0.25})`, transformOrigin: 'left center', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(42,35,64,0.82)', borderRadius: 999, padding: '10px 26px 10px 14px' }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 34, color: '#fff', paddingLeft: 12 }}>Ole kann</div>
      <div style={{ width: 54, height: 54, borderRadius: 999, background: bump > 0 ? YELLOW : CORAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 34, color: INK }}>{value}</div>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 34, color: '#fff' }}>{value === 1 ? 'Satz' : 'Sätze'}</div>
    </div>
  )
}

function Caption({ c, t, tl, raised, width }: { c: TCaption; t: number; tl: Timeline; raised: boolean; width: number }) {
  const bottom = tl.safe.bottom + (raised ? 470 : 40)
  return (
    <div style={{ position: 'absolute', left: tl.safe.left, width, bottom, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: tl.text.untertitel, lineHeight: 1.18 }}>
      {c.words.map((w, i) => {
        const shown = t >= w.start - 0.04
        const active = t >= w.start && t < w.end + 0.05
        const k = pop((t - w.start + 0.04) / 0.18)
        return (
          <span key={i} style={{ display: 'inline-block', margin: '0 10px', color: active ? YELLOW : '#fff', ...outline(12), opacity: shown ? 1 : 0, transform: `scale(${shown ? 0.85 + 0.15 * k : 0.85})` }}>{w.text}</span>
        )
      })}
    </div>
  )
}

/** Anteil der schon gesprochenen Moren (0–1) */
function progress(moras: Mora[], t: number): number {
  if (!moras.length) return 0
  if (t >= moras[moras.length - 1].end) return 1
  const done = moras.filter((m) => t >= m.end).length
  const cur = moras.find((m) => t >= m.start && t < m.end)
  const part = cur ? (t - cur.start) / Math.max(0.01, cur.end - cur.start) : 0
  return (done + part) / moras.length
}

function Karaoke({ text, p, size, active }: { text: string; p: number; size: number; active: boolean }) {
  const chars = [...text]
  const letters = chars.filter((c) => !/[。、？！?!.\s]/.test(c)).length
  let seen = 0
  return (
    <>
      {chars.map((ch, i) => {
        const isLetter = !/[。、？！?!.\s]/.test(ch)
        if (isLetter) seen++
        const lit = active && (isLetter ? seen <= Math.ceil(p * letters - 1e-6) : seen <= Math.ceil(p * letters - 1e-6) && seen > 0)
        return <span key={i} style={{ color: lit ? YELLOW : '#fff', fontSize: size }}>{ch}</span>
      })}
    </>
  )
}

function LearnBox({ ja, t, tl, width }: { ja: TJa; t: number; tl: Timeline; width: number }) {
  const k = pop((t - ja.start) / 0.3)
  const out = ease((t - (ja.end - 0.2)) / 0.2)
  const small = ja.role === 'kontext'
  const inSlow = ja.slow && t >= ja.slow.start - 0.2
  const moras = inSlow ? ja.slow!.moras : ja.moras
  const p = progress(moras, t)
  const speaking = t >= moras[0]?.start && t <= (moras[moras.length - 1]?.end ?? 0) + 0.15
  const pad = 40
  const fit = fitJapanese(ja.sentence.ja, small ? 70 : tl.text.japanisch, width - pad * 2)
  const tag = ja.art === 'sagen' ? { text: 'SAGEN', bg: CORAL } : { text: 'HÖREN', bg: BLUE }
  return (
    <div style={{
      position: 'absolute', left: tl.safe.left, width, bottom: tl.safe.bottom + 30, background: 'rgba(42,35,64,0.88)', borderRadius: 40,
      padding: `${small ? 24 : 30}px ${pad}px ${small ? 26 : 32}px`, transform: `translateY(${(1 - k) * 60}px) scale(${0.94 + 0.06 * k})`, opacity: (0.2 + 0.8 * Math.min(1, k * 2)) * (1 - out), boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
        {!small && <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, color: '#fff', background: tag.bg, padding: '6px 18px', borderRadius: 999, letterSpacing: '0.06em' }}>{tag.text}</span>}
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: '#d9d4ea' }}>{ja.speakerLabel}</span>
        {inSlow && <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 28, color: INK, background: YELLOW, padding: '5px 16px', borderRadius: 999 }}>noch mal langsam</span>}
      </div>
      <div lang="ja" style={{ fontFamily: FONT, fontWeight: 900, lineHeight: 1.18 }}>
        {fit.lines.map((line, i) => {
          const before = fit.lines.slice(0, i).join('')
          const share = [...before.replace(/[。、？！\s]/g, '')].length / Math.max(1, [...ja.sentence.ja.replace(/[。、？！\s]/g, '')].length)
          const lineShare = [...line.replace(/[。、？！\s]/g, '')].length / Math.max(1, [...ja.sentence.ja.replace(/[。、？！\s]/g, '')].length)
          const lp = Math.max(0, Math.min(1, (p - share) / Math.max(0.01, lineShare)))
          return <div key={i}><Karaoke text={line} p={lp} size={fit.size} active={speaking || p >= 1} /></div>
        })}
      </div>
      {!small && (
        <>
          <div lang="ja" style={{ fontFamily: FONT, fontWeight: 700, color: '#fff', marginTop: 12, opacity: 0.95, lineHeight: 1.25 }}>
            <Karaoke text={ja.sentence.kana} p={p} size={Math.min(tl.text.kana, Math.floor((width - pad * 2) / Math.max(1, [...ja.sentence.kana].length)))} active={speaking || p >= 1} />
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: Math.round(tl.text.kana * 0.92), color: '#d9d4ea', marginTop: 2 }}>{ja.sentence.romaji}</div>
        </>
      )}
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: small ? 40 : tl.text.deutsch, color: '#fff', marginTop: small ? 8 : 10 }}>{ja.sentence.de}</div>
    </div>
  )
}

function Quiz({ q, t, hint, width, safeTop, bottom }: { q: TQuiz; t: number; hint: string; width: number; safeTop: number; bottom: number }) {
  const k = pop((t - q.start) / 0.35)
  const left = q.seconds - (t - q.countdownStart)
  const n = Math.max(1, Math.ceil(left - 1e-6))
  const frac = Math.max(0, Math.min(1, left - (n - 1)))
  const counting = t >= q.countdownStart
  const tick = counting ? pop((1 - frac) / 0.25) : 0
  const R = 92, C = 2 * Math.PI * R
  return (
    <>
    <div style={{ position: 'absolute', top: safeTop + 70, left: 64, width, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${0.7 + 0.3 * k})`, opacity: Math.min(1, k * 1.5) }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 88, color: '#fff', ...outline(16), textShadow: `0 10px 0 ${CORAL}`, textAlign: 'center', lineHeight: 1.05 }}>{q.question}</div>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: INK, background: YELLOW, padding: '10px 26px', borderRadius: 999, marginTop: 22, textAlign: 'center' }}>Auf Japanisch: „{hint.replace(/\s*\(.*\)\s*$/, '')}“</div>
    </div>
    <div style={{ position: 'absolute', bottom: bottom + 80, left: 64, width, display: 'flex', justifyContent: 'center' }}>
      {counting && (
        <svg width={240} height={240} style={{ transform: `scale(${0.9 + 0.1 * tick})` }}>
          <circle cx={120} cy={120} r={R + 14} fill="rgba(42,35,64,0.88)" />
          <circle cx={120} cy={120} r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={16} />
          <circle cx={120} cy={120} r={R} fill="none" stroke={YELLOW} strokeWidth={16} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 120 120)" />
          <text x={120} y={150} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={100} fill="#fff">{n}</text>
        </svg>
      )}
    </div>
    </>
  )
}

function EndCard({ tl, t, width }: { tl: Timeline; t: number; width: number }) {
  const k = pop((t - tl.endCard.start) / 0.4)
  const dim = interpolate(t, [tl.endCard.start, tl.endCard.start + 0.5], [0, 0.35], { extrapolateRight: 'clamp' })
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: `rgba(42,35,64,${dim})` }} />
      <div style={{ position: 'absolute', top: tl.safe.top + 200, left: tl.safe.left, width, textAlign: 'center', transform: `scale(${0.7 + 0.3 * k})`, opacity: Math.min(1, k * 1.4) }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 86, lineHeight: 1.08, color: '#fff', ...outline(16), textShadow: `0 10px 0 ${CORAL}` }}>{tl.endCard.text}</div>
        {tl.kind === 'folge' && <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: INK, background: YELLOW, display: 'inline-block', padding: '10px 28px', borderRadius: 999, marginTop: 26 }}>Fortsetzung folgt …</div>}
      </div>
    </>
  )
}
