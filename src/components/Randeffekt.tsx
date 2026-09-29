import { useEffect, useRef } from 'react'

/**
 * Dezente Partikel am linken und rechten Bildschirmrand (letzte Pass-Stufe jeder Saison).
 * sakura: Kirschblüten · momiji: Ahornblätter · yuki: Schnee · hotaru: Glühwürmchen
 */
export default function Randeffekt({ art }: { art: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || !art) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let w = 0, h = 0
    const groesse = () => {
      w = innerWidth; h = innerHeight
      c.width = w * devicePixelRatio; c.height = h * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }
    groesse()
    addEventListener('resize', groesse)

    // Randbreite: auf dem Handy schmal, am PC der Raum neben dem Inhalt
    const rand = () => Math.max(28, Math.min(w * 0.12, (w - 700) / 2))
    const neu = (start = false) => {
      const links = Math.random() < 0.5
      const x = links ? Math.random() * rand() : w - Math.random() * rand()
      return {
        x, y: start ? Math.random() * h : -20 - Math.random() * 60,
        vy: art === 'hotaru' ? 0 : art === 'yuki' ? 0.35 + Math.random() * 0.5 : 0.5 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2, r: Math.random() * Math.PI * 2,
        s: art === 'yuki' ? 1.5 + Math.random() * 2.5 : 6 + Math.random() * 5,
        links, leben: 0,
      }
    }
    const anzahl = art === 'hotaru' ? 14 : 22
    const ps = Array.from({ length: anzahl }, () => neu(true))
    let raf = 0
    let t = 0

    const frame = () => {
      t++
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        p.leben++
        if (art === 'hotaru') {
          p.x += Math.sin(t / 60 + p.phase) * 0.3
          p.y += Math.cos(t / 80 + p.phase) * 0.25
          const glow = 0.35 + 0.65 * Math.max(0, Math.sin(t / 40 + p.phase))
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9)
          g.addColorStop(0, `rgba(230,255,140,${0.9 * glow})`); g.addColorStop(1, 'rgba(230,255,140,0)')
          ctx.fillStyle = g
          ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill()
          if (p.leben > 900) ps[i] = { ...neu(true), leben: 0 }
          continue
        }
        p.y += p.vy
        p.x += Math.sin(t / 50 + p.phase) * 0.45 * (p.links ? 1 : -1)
        p.r += 0.015
        if (p.y > h + 20) { ps[i] = neu(); continue }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.r + Math.sin(t / 40 + p.phase) * 0.6)
        ctx.globalAlpha = 0.8
        if (art === 'yuki') {
          ctx.fillStyle = '#ffffff'
          ctx.shadowColor = '#9ec9ff'; ctx.shadowBlur = 4
          ctx.beginPath(); ctx.arc(0, 0, p.s, 0, Math.PI * 2); ctx.fill()
        } else if (art === 'momiji') {
          ctx.fillStyle = p.phase > 3 ? '#e2452b' : '#f08a24'
          blatt(ctx, p.s)
        } else {
          ctx.fillStyle = p.phase > 3 ? '#ffb7cf' : '#ffd1e0'
          bluetenblatt(ctx, p.s)
        }
        ctx.restore()
      }
      raf = requestAnimationFrame(frame)
    }
    const sichtbar = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(frame) }
    document.addEventListener('visibilitychange', sichtbar)
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', groesse)
      document.removeEventListener('visibilitychange', sichtbar)
      ctx.clearRect(0, 0, w, h)
    }
  }, [art])

  if (!art) return null
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-40 h-full w-full" />
}

/** Kirschblütenblatt mit Kerbe. */
function bluetenblatt(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath()
  ctx.moveTo(0, s)
  ctx.bezierCurveTo(s * 0.9, s * 0.4, s * 0.7, -s * 0.8, s * 0.15, -s)
  ctx.lineTo(0, -s * 0.7)
  ctx.lineTo(-s * 0.15, -s)
  ctx.bezierCurveTo(-s * 0.7, -s * 0.8, -s * 0.9, s * 0.4, 0, s)
  ctx.fill()
}

/** Vereinfachtes Ahornblatt (fünf Spitzen). */
function blatt(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? s : s * 0.45
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(-0.6, 0, 1.2, s * 1.1)
}
