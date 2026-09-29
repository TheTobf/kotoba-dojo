import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Ereignis } from '../motivation'
import { koban, letzterTipp, muenzen } from '../koban'
import { coinSound, levelSound, setSoundPack, streakSound, unlockSound } from '../sfx'
import { ALLE_BELOHNUNGEN, NEKO } from '../content/pass'
import { DEFAULT_SETTINGS } from '../types'
import { zielPunkt } from './PassLeiste'

interface Toast { id: number; e: Ereignis }

const ART_NAME: Record<string, string> = {
  tier: 'Neues Tierchen', farbe: 'Neue Farbe', muster: 'Neues Kartenmuster', klang: 'Neues Klangpaket',
  titel: 'Neuer Titel', effekt: 'Neuer Bildschirmeffekt', stempel: 'Neuer Goshuin-Stempel', omamori: 'Glücksbringer',
}

function text(e: Ereignis): string {
  switch (e.typ) {
    case 'level': return e.rang ? `Neuer Rang: ${e.rang}! すごい！` : `Level ${e.level}! やったね！`
    case 'streak': return `${e.tage} Tage am Stück! 続けよう！`
    case 'tagesziel': return 'Tagesziel geschafft! お疲れさま！'
    case 'erfolg': return `${e.icon} ${e.name}: ${e.text}`
    case 'thema': return `Neues Farbthema freigeschaltet: ${e.name}`
    case 'pass': return `Reise-Pass ${e.saison} · Stufe ${e.stufe}: ${ART_NAME[e.belohnung.art]} – ${e.belohnung.icon} ${e.belohnung.name}${e.belohnung.jp ? ` ${e.belohnung.jp}` : ''}`
    case 'omamori': return `🧧 Dein Omamori hat den Streak gerettet (${e.tage} ${e.tage === 1 ? 'Tag' : 'Tage'} verpasst)`
    default: return ''
  }
}

interface Muenze { x: number; y: number; vx: number; vy: number; wert: number; frei: number; spin: number; da: boolean }

/** Hört auf Belohnungs-Ereignisse: Koban-Münzen, Toasts mit Begleiter, Sounds, Konfetti. */
export default function Belohnungen() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const konfettiCanvas = useRef<HTMLCanvasElement>(null)
  const muenzCanvas = useRef<HTMLCanvasElement>(null)
  const settings = { ...DEFAULT_SETTINGS, ...useLiveQuery(() => db.settings.get('me')) }
  const sRef = useRef(settings)
  sRef.current = settings
  const begleiter = ALLE_BELOHNUNGEN.find((b) => b.id === settings.companion) ?? NEKO
  const warteschlange = useRef<Ereignis[]>([])   // Pass-Meldungen warten, bis die Münzen angekommen sind
  const fliegt = useRef(false)

  useEffect(() => { setSoundPack(settings.soundPack) }, [settings.soundPack])

  useEffect(() => {
    let n = 0
    const sfx = () => ({ volume: sRef.current.volume, muted: sRef.current.muted })

    const zeigen = (e: Ereignis) => {
      const id = ++n
      setToasts((t) => [...t.slice(-2), { id, e }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
      if (e.typ === 'streak' || e.typ === 'omamori') streakSound(sfx())
      else if (e.typ === 'level') levelSound(sfx())
      else unlockSound(sfx())
      if (e.typ !== 'streak' && e.typ !== 'omamori') konfetti(konfettiCanvas.current)
      if (sRef.current.vibration && 'vibrate' in navigator) navigator.vibrate([20, 40, 20, 40, 60])
    }
    const nachMuenzen = () => {
      fliegt.current = false
      const q = warteschlange.current.splice(0)
      q.forEach((e, i) => setTimeout(() => zeigen(e), i * 700))
    }
    const sammeln = () => {
      const xp = koban.ausstehend
      if (xp <= 0 || fliegt.current) return
      fliegt.current = true
      muenzFlug(muenzCanvas.current, muenzen(xp), sfx, nachMuenzen)
    }

    const on = (ev: Event) => {
      const e = (ev as CustomEvent<Ereignis>).detail
      if (e.typ === 'xp') { koban.add(e.menge); return }
      if (e.typ === 'sammeln') { sammeln(); return }
      if (e.typ === 'pass' || fliegt.current || koban.ausstehend > 0) { warteschlange.current.push(e); return }
      zeigen(e)
    }
    // Beim Seitenwechsel ausstehende Münzen einsammeln
    const onNav = () => setTimeout(sammeln, 150)
    window.addEventListener('kotoba', on)
    window.addEventListener('hashchange', onNav)
    return () => { window.removeEventListener('kotoba', on); window.removeEventListener('hashchange', onNav) }
  }, [])

  return (
    <>
      <canvas ref={konfettiCanvas} className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />
      <canvas ref={muenzCanvas} className="pointer-events-none fixed inset-0 z-[62] h-full w-full" />
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[61] flex flex-col items-center gap-2 px-4 md:bottom-8">
        {toasts.map(({ id, e }) => (
          <div key={id} className="card pop-in flex max-w-md items-center gap-3 p-3 shadow-xl ring-2 ring-sakura/40">
            <span className="mascot text-4xl">{e.typ === 'pass' && e.belohnung.art === 'tier' ? e.belohnung.icon : begleiter.icon}</span>
            <span className="font-bold">{text(e)}</span>
          </div>
        ))}
      </div>
    </>
  )
}

/** Münzen spritzen am letzten Tipp heraus und werden dann magnetisch in die Pass-Leiste gezogen. */
function muenzFlug(c: HTMLCanvasElement | null, werte: number[], sfx: () => { volume: number; muted: boolean }, fertig: () => void) {
  const ctx = c?.getContext('2d')
  if (!c || !ctx) { werte.forEach((w) => koban.take(w)); fertig(); return }
  const dpr = devicePixelRatio
  c.width = innerWidth * dpr
  c.height = innerHeight * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const start = performance.now()
  const ms: Muenze[] = werte.map((wert, i) => {
    const a = Math.random() * Math.PI * 2
    const v = 3 + Math.random() * 6
    return { x: letzterTipp.x, y: letzterTipp.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, wert, frei: 260 + i * 35 + Math.random() * 120, spin: Math.random() * 6, da: false }
  })
  let angekommen = 0

  const frame = (now: number) => {
    const t = now - start
    const ziel = zielPunkt()
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    for (const m of ms) {
      if (m.da) continue
      if (t < m.frei) {
        // Herausspritzen mit Reibung
        m.vx *= 0.93; m.vy = m.vy * 0.93 + 0.15
      } else {
        // Magnet: Anziehung wächst mit der Zeit, Dämpfung verhindert Kreisen
        const dx = ziel.x - m.x, dy = ziel.y - m.y
        const d = Math.hypot(dx, dy) || 1
        const k = Math.min(3.2, 0.25 + (t - m.frei) / 220)
        m.vx = m.vx * 0.86 + (dx / d) * k * 2.2
        m.vy = m.vy * 0.86 + (dy / d) * k * 2.2
        if (d < 12 + Math.hypot(m.vx, m.vy)) {
          m.da = true
          angekommen++
          koban.take(m.wert)
          coinSound(angekommen, sfx())
          window.dispatchEvent(new Event('koban-treffer'))
          continue
        }
      }
      m.x += m.vx; m.y += m.vy; m.spin += 0.18
      zeichneKoban(ctx, m.x, m.y, m.spin)
    }
    if (angekommen < ms.length && t < 6000) requestAnimationFrame(frame)
    else {
      ms.filter((m) => !m.da).forEach((m) => koban.take(m.wert))
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      fertig()
    }
  }
  requestAnimationFrame(frame)
}

/** Koban 小判: ovale Goldmünze mit waagrechten Rillen; `spin` lässt sie sich drehen. */
function zeichneKoban(ctx: CanvasRenderingContext2D, x: number, y: number, spin: number) {
  const sx = Math.max(0.25, Math.abs(Math.cos(spin)))
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(sx, 1)
  const g = ctx.createRadialGradient(-3, -5, 1, 0, 0, 12)
  g.addColorStop(0, '#fff6c2'); g.addColorStop(0.45, '#f5c542'); g.addColorStop(1, '#b8860b')
  ctx.fillStyle = g
  ctx.strokeStyle = '#8a6508'
  ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = 'rgba(138,101,8,.55)'
  ctx.lineWidth = 0.8
  for (const yy of [-5, -2.5, 2.5, 5]) { ctx.beginPath(); ctx.moveTo(-4.5, yy); ctx.lineTo(4.5, yy); ctx.stroke() }
  ctx.fillStyle = 'rgba(138,101,8,.7)'
  ctx.fillRect(-1.6, -1.2, 3.2, 2.4)
  ctx.restore()
}

/** Kleines Konfetti ohne Bibliothek. */
function konfetti(c: HTMLCanvasElement | null) {
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  c.width = innerWidth * devicePixelRatio
  c.height = innerHeight * devicePixelRatio
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  const farben = ['#ff5fa2', '#3de0ff', '#7bd88f', '#ffd23f', '#9b7bff']
  const teile = Array.from({ length: 120 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.55,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 6,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
    w: 6 + Math.random() * 6, h: 4 + Math.random() * 4, f: farben[Math.floor(Math.random() * farben.length)],
  }))
  const start = performance.now()
  const frame = (t: number) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    for (const p of teile) {
      p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.f
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore()
    }
    if (t - start < 2600) requestAnimationFrame(frame)
    else ctx.clearRect(0, 0, innerWidth, innerHeight)
  }
  requestAnimationFrame(frame)
}
