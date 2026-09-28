import { useEffect, useRef, useState } from 'react'
import { loadStrokes } from '../data'
import { strokeMatches, type Pt } from '../schrift'

export function useStrokes(file?: string) {
  const [paths, setPaths] = useState<string[]>()
  useEffect(() => {
    setPaths(undefined)
    if (file) loadStrokes(file).then(setPaths)
  }, [file])
  return paths
}

/** Zeigt die Strichreihenfolge als Animation (ein Strich nach dem anderen, mit Nummern). */
export function StrokeOrder({ file, size = 160, replayKey = 0 }: { file?: string; size?: number; replayKey?: number }) {
  const paths = useStrokes(file)
  if (!paths) return <div style={{ width: size, height: size }} />
  return (
    <svg key={replayKey} viewBox="0 0 109 109" width={size} height={size} className="rounded-xl bg-black/[0.03] dark:bg-white/[0.05]">
      <Grid />
      {paths.map((d, i) => (
        <path key={i} d={d} pathLength={1} fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `stroke-draw 0.5s ${i * 0.6}s ease-in-out forwards` }} />
      ))}
      {paths.map((d, i) => {
        const m = /M\s*([\d.]+)[ ,]([\d.]+)/.exec(d)
        return m && (
          <text key={`n${i}`} x={+m[1] - 5} y={+m[2] - 2} fontSize={8} className="fill-sakura" style={{ opacity: 0, animation: `fade-in 0.2s ${i * 0.6}s forwards` }}>{i + 1}</text>
        )
      })}
    </svg>
  )
}

function Grid() {
  return (
    <g stroke="currentColor" strokeOpacity={0.1} strokeDasharray="3 3">
      <line x1={54.5} y1={0} x2={54.5} y2={109} />
      <line x1={0} y1={54.5} x2={109} y2={54.5} />
    </g>
  )
}

/**
 * Nachzeichnen: Strich für Strich in der richtigen Reihenfolge.
 * Ruft `onDone(fehler)` auf, wenn alle Striche sitzen.
 */
export function TraceBoard({ file, onStroke, onDone, showGuide = true }: {
  file?: string
  onStroke?: (ok: boolean) => void
  onDone: (mistakes: number) => void
  showGuide?: boolean
}) {
  const paths = useStrokes(file)
  const svgRef = useRef<SVGSVGElement>(null)
  const refPaths = useRef<(SVGPathElement | null)[]>([])
  const [step, setStep] = useState(0)
  const [drawing, setDrawing] = useState<Pt[]>()
  const [mistakes, setMistakes] = useState(0)
  const [miss, setMiss] = useState(0)     // Fehlversuche am aktuellen Strich
  const [flash, setFlash] = useState(false)

  useEffect(() => { setStep(0); setMistakes(0); setMiss(0) }, [file])

  const toPt = (e: React.PointerEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 109, y: ((e.clientY - r.top) / r.height) * 109 }
  }

  const sample = (el: SVGPathElement) => {
    const len = el.getTotalLength()
    return Array.from({ length: 24 }, (_, i) => { const p = el.getPointAtLength((len * i) / 23); return { x: p.x, y: p.y } })
  }

  const end = () => {
    if (!drawing || !paths) return
    const el = refPaths.current[step]
    const ok = !!el && strokeMatches(drawing, sample(el))
    setDrawing(undefined)
    onStroke?.(ok)
    if (ok) {
      setMiss(0)
      if (step + 1 >= paths.length) { setStep(step + 1); onDone(mistakes) } else setStep(step + 1)
    } else {
      setMistakes((m) => m + 1)
      setMiss((m) => m + 1)
      setFlash(true)
      setTimeout(() => setFlash(false), 300)
    }
  }

  if (!paths) return <div className="aspect-square w-full max-w-72" />
  return (
    <svg ref={svgRef} viewBox="0 0 109 109"
      className={`aspect-square w-full max-w-72 touch-none rounded-2xl bg-paper-2 ring-1 transition dark:bg-ink-2 ${flash ? 'ring-4 ring-rose-400' : 'ring-black/10 dark:ring-white/15'}`}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); setDrawing([toPt(e)]) }}
      onPointerMove={(e) => drawing && setDrawing([...drawing, toPt(e)])}
      onPointerUp={end} onPointerCancel={() => setDrawing(undefined)}>
      <Grid />
      {paths.map((d, i) => (
        <path key={i} ref={(el) => { refPaths.current[i] = el }} d={d} fill="none" strokeLinecap="round" strokeLinejoin="round"
          stroke="currentColor"
          strokeWidth={i < step ? 5 : 4}
          strokeOpacity={i < step ? 1 : showGuide ? 0.12 : 0}
          className={i < step ? 'text-sakura' : ''} />
      ))}
      {/* Tipp nach 2 Fehlversuchen: aktueller Strich blinkt mit Startpunkt */}
      {step < paths.length && (miss >= 2 || (showGuide && step === 0 && miss === 0)) && (() => {
        const m = /M\s*([\d.]+)[ ,]([\d.]+)/.exec(paths[step])
        return (
          <g className="text-neon">
            {miss >= 2 && <path d={paths[step]} fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" className="animate-pulse" />}
            {m && <circle cx={+m[1]} cy={+m[2]} r={3.5} fill="currentColor" className="animate-ping" style={{ transformOrigin: `${m[1]}px ${m[2]}px` }} />}
          </g>
        )
      })()}
      {drawing && (
        <polyline points={drawing.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth={4}
          strokeLinecap="round" strokeLinejoin="round" className="text-ink dark:text-paper" />
      )}
    </svg>
  )
}
