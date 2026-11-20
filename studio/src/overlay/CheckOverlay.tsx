/**
 * Selbstkontrolle: zeichnet Sicherheitszone, Einstellung und die Umrisse der Figuren ins Standbild und meldet
 * Probleme (Figur angeschnitten, Gesicht von Text verdeckt) als „[KONTROLLE] …“ in die Konsole.
 * Das Render-Skript sammelt diese Meldungen ein.
 */
import { FIGURES } from '../characters/figures'
import type { FrameState } from '../compositions/EpisodeVideo'
import type { Timeline } from '../episode/timeline'
import { SCENES, type V3 } from '../scenes/registry'
import { project } from '../three/camera'

interface Rect { x: number; y: number; w: number; h: number }
/** Anteil von a, der von b überdeckt wird (0–1) */
const overlap = (a: Rect, b: Rect) => {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  return (w * h) / Math.max(1, a.w * a.h)
}

export function figureRects(tl: Timeline, fs: FrameState): { who: string; main: boolean; faceVisible: boolean; body: Rect; face: Rect }[] {
  const scene = SCENES[fs.beat.scene]
  if (scene.insert) return []
  return fs.placed.map(({ actor, place }) => {
    const meta = FIGURES[actor.figure] ?? FIGURES.ole
    const seated = !!scene.spots[actor.at]?.seated
    const H = meta.height - (seated ? 0.15 : 0)
    const half = actor.figure === 'ole' ? 0.78 : 0.5
    const d = [fs.cam.pos[0] - place.pos[0], 0, fs.cam.pos[2] - place.pos[2]]
    const l = Math.hypot(d[0], d[2]) || 1
    const right: V3 = [d[2] / l, 0, -d[0] / l]
    const pts: V3[] = [
      [place.pos[0], seated ? 1.3 : 0, place.pos[2]],
      [place.pos[0], H, place.pos[2]],
      [place.pos[0] + right[0] * half, H * 0.45, place.pos[2] + right[2] * half],
      [place.pos[0] - right[0] * half, H * 0.45, place.pos[2] - right[2] * half],
    ].map((p) => p as V3)
    const sp = pts.map((p) => project(fs.cam, tl.width, tl.height, p))
    const xs = sp.map((p) => p.x), ys = sp.map((p) => p.y)
    const body = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
    const eye = meta.eyeHeight - (seated ? 0.15 : 0)
    const c = project(fs.cam, tl.width, tl.height, [place.pos[0], eye - 0.05, place.pos[2]])
    const top = project(fs.cam, tl.width, tl.height, [place.pos[0], eye + 0.35, place.pos[2]])
    const r = Math.abs(c.y - top.y)
    // Gesicht nur prüfen, wenn die Figur ungefähr zur Kamera schaut (sonst sieht man den Hinterkopf)
    const facing = (Math.sin(place.yaw) * d[0] + Math.cos(place.yaw) * d[2]) / l
    return { who: actor.who, main: actor.main, faceVisible: facing > 0.15, body, face: { x: c.x - r, y: c.y - r, w: r * 2, h: r * 1.8 } }
  })
}

/** Bereiche, in denen gerade Text steht (grob, für die Kontrolle) */
export function textRects(tl: Timeline, t: number): { name: string; r: Rect }[] {
  const w = tl.width - tl.safe.left - tl.safe.right
  const out: { name: string; r: Rect }[] = []
  if (t < tl.hook.end) out.push({ name: 'Hook', r: { x: tl.safe.left, y: tl.safe.top, w, h: 300 } })
  const ja = tl.ja.find((j) => t >= j.start && t < j.end)
  const quiz = tl.quiz.find((q) => t >= q.start && t < q.revealStart)
  if (ja && (!ja.quiz || !quiz)) out.push({ name: 'Lernkasten', r: { x: tl.safe.left, y: tl.height - tl.safe.bottom - 30 - (ja.role === 'kontext' ? 250 : 420), w, h: ja.role === 'kontext' ? 250 : 420 } })
  if (quiz) {
    out.push({ name: 'Quiz', r: { x: tl.safe.left, y: tl.safe.top + 70, w, h: 300 } })
    if (t >= quiz.countdownStart) out.push({ name: 'Countdown', r: { x: tl.safe.left + w / 2 - 120, y: tl.height - tl.safe.bottom - 80 - 240, w: 240, h: 240 } })
  }
  if (tl.captions.some((c) => t >= c.start && t < c.end)) out.push({ name: 'Untertitel', r: { x: tl.safe.left, y: tl.height - tl.safe.bottom - (ja ? 470 : 40) - 150, w, h: 150 } })
  // Endkarte darf das Bild bewusst überdecken (Schluss) – wird nicht als Problem gezählt
  return out
}

export function checkProblems(tl: Timeline, fs: FrameState): string[] {
  const problems: string[] = []
  const close = /nah|front|schulter|ueber/.test(fs.shot.preset)
  const texts = textRects(tl, fs.t)
  for (const f of figureRects(tl, fs).filter((x) => x.main)) {
    const inFrame = (r: Rect) => r.x >= 0 && r.y >= 0 && r.x + r.w <= tl.width && r.y + r.h <= tl.height
    const visible = (r: Rect) => r.x + r.w > 0 && r.x < tl.width && r.y + r.h > 0 && r.y < tl.height
    if (!visible(f.face)) continue
    if (!close && !inFrame(f.body)) problems.push(`${f.who} ist angeschnitten (Einstellung ${fs.shot.preset})`)
    if (!f.faceVisible) continue
    if (!inFrame(f.face)) problems.push(`Gesicht von ${f.who} ist angeschnitten (${fs.shot.preset})`)
    for (const tr of texts) if (overlap(f.face, tr.r) > 0.3) problems.push(`${tr.name} verdeckt das Gesicht von ${f.who} (${fs.shot.preset})`)
  }
  return problems
}

export function CheckOverlay({ tl, fs }: { tl: Timeline; fs: FrameState }) {
  const problems = checkProblems(tl, fs)
  for (const p of problems) console.log(`[KONTROLLE] ${p}`)
  const { safe } = tl
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: 'sans-serif' }}>
      <div style={{ position: 'absolute', left: safe.left, top: safe.top, right: safe.right, bottom: safe.bottom, border: '4px dashed rgba(0,200,255,0.9)' }} />
      {figureRects(tl, fs).map((f) => (
        <div key={f.who}>
          <div style={{ position: 'absolute', left: f.body.x, top: f.body.y, width: f.body.w, height: f.body.h, border: '3px solid rgba(0,255,120,0.9)' }} />
          <div style={{ position: 'absolute', left: f.face.x, top: f.face.y, width: f.face.w, height: f.face.h, border: '3px solid rgba(255,0,200,0.9)', borderRadius: 999 }} />
        </div>
      ))}
      {textRects(tl, fs.t).map((r) => (
        <div key={r.name} style={{ position: 'absolute', left: r.r.x, top: r.r.y, width: r.r.w, height: r.r.h, border: '3px dotted rgba(255,200,0,0.9)' }} />
      ))}
      <div style={{ position: 'absolute', left: 10, bottom: 10, right: 10, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 26, padding: 12, lineHeight: 1.3 }}>
        {fs.t.toFixed(2)} s · Abschnitt {fs.beat.index + 1} ({fs.beat.kind}) · {fs.beat.scene} · {fs.shot.preset} / {fs.shot.move}
        {problems.map((p) => <div key={p} style={{ color: '#ff7070' }}>⚠ {p}</div>)}
      </div>
    </div>
  )
}
