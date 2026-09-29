import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Ereignis } from '../motivation'
import { streakSound, unlockSound, levelSound } from '../sfx'
import { DEFAULT_SETTINGS } from '../types'

interface Toast { id: number; e: Ereignis }

/** Maskottchen „Neko-Sensei“ mit wechselnder Laune. */
const LAUNE: Record<Ereignis['typ'], { face: string; says: (e: Ereignis) => string }> = {
  xp: { face: '😺', says: () => '' },
  level: { face: '😻', says: (e) => e.typ === 'level' ? (e.rang ? `Neuer Rang: ${e.rang}! すごい！` : `Level ${e.level}! やったね！`) : '' },
  streak: { face: '😸', says: (e) => e.typ === 'streak' ? `${e.tage} Tage am Stück! 続けよう！` : '' },
  tagesziel: { face: '😽', says: () => 'Tagesziel geschafft! お疲れさま！' },
  erfolg: { face: '🙀', says: (e) => e.typ === 'erfolg' ? `${e.icon} ${e.name}: ${e.text}` : '' },
  thema: { face: '😼', says: (e) => e.typ === 'thema' ? `Neues Farbthema freigeschaltet: ${e.name}` : '' },
}

/** Hört auf Belohnungs-Ereignisse: Toasts mit Maskottchen, Sounds, Konfetti und „+XP“. */
export default function Belohnungen() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [xp, setXp] = useState<{ id: number; n: number }[]>([])
  const canvas = useRef<HTMLCanvasElement>(null)
  const settings = { ...DEFAULT_SETTINGS, ...useLiveQuery(() => db.settings.get('me')) }
  const sRef = useRef(settings)
  sRef.current = settings

  useEffect(() => {
    let n = 0
    const on = (ev: Event) => {
      const e = (ev as CustomEvent<Ereignis>).detail
      const id = ++n
      const sfx = { volume: sRef.current.volume, muted: sRef.current.muted }
      if (e.typ === 'xp') {
        setXp((x) => [...x.slice(-3), { id, n: e.menge }])
        setTimeout(() => setXp((x) => x.filter((t) => t.id !== id)), 1200)
        return
      }
      setToasts((t) => [...t, { id, e }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
      if (e.typ === 'streak') streakSound(sfx)
      else if (e.typ === 'level') levelSound(sfx)
      else unlockSound(sfx)
      if (e.typ !== 'streak') konfetti(canvas.current)
      if (sRef.current.vibration && 'vibrate' in navigator) navigator.vibrate([20, 40, 20, 40, 60])
    }
    window.addEventListener('kotoba', on)
    return () => window.removeEventListener('kotoba', on)
  }, [])

  return (
    <>
      <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />
      <div className="pointer-events-none fixed top-3 right-3 z-[61] flex flex-col items-end gap-1">
        {xp.map((x) => (
          <div key={x.id} className="xp-float rounded-full bg-yuzu px-3 py-1 text-sm font-bold text-ink shadow">+{x.n} XP</div>
        ))}
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[61] flex flex-col items-center gap-2 px-4 md:bottom-8">
        {toasts.map(({ id, e }) => (
          <div key={id} className="card pop-in flex max-w-md items-center gap-3 p-3 shadow-xl ring-2 ring-sakura/40">
            <span className="mascot text-4xl">{LAUNE[e.typ].face}</span>
            <span className="font-bold">{LAUNE[e.typ].says(e)}</span>
          </div>
        ))}
      </div>
    </>
  )
}

/** Kleines Konfetti ohne Bibliothek. */
function konfetti(c: HTMLCanvasElement | null) {
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  c.width = innerWidth * devicePixelRatio
  c.height = innerHeight * devicePixelRatio
  ctx.scale(devicePixelRatio, devicePixelRatio)
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
