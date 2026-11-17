/** Strichreihenfolge ansehen (Animation) und selbst nachzeichnen. Striche: KanjiVG, 109×109-Raster. */
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { loadStrokes } from '../lib/data'
import { strokeMatches, type Point } from '../lib/writing'
import { cx } from './cx'

export function useStrokes(file?: string): string[] | undefined {
  const [paths, setPaths] = useState<string[]>()
  useEffect(() => {
    let active = true
    setPaths(undefined)
    if (file) loadStrokes(file).then((p) => active && setPaths(p), () => undefined)
    return () => { active = false }
  }, [file])
  return paths
}

const startOf = (d: string) => {
  const m = /M\s*([\d.]+)[ ,]([\d.]+)/.exec(d)
  return m ? { x: Number(m[1]), y: Number(m[2]) } : undefined
}

function Guides() {
  return (
    <g stroke="var(--color-line)" strokeDasharray="3 3" strokeWidth={0.6}>
      <line x1={54.5} y1={0} x2={54.5} y2={109} />
      <line x1={0} y1={54.5} x2={109} y2={54.5} />
    </g>
  )
}

/** Zeigt die Striche nacheinander, nummeriert. `replayKey` ändern = Animation neu starten. */
export function StrokeOrder({ file, size = 160, replayKey = 0, label }: { file?: string; size?: number; replayKey?: number; label: string }) {
  const paths = useStrokes(file)
  if (!paths) return <div style={{ width: size, height: size }} className="rounded-card bg-sunken" aria-hidden="true" />
  return (
    <svg key={replayKey} viewBox="0 0 109 109" width={size} height={size} role="img" aria-label={label} className="rounded-card bg-sunken text-ink">
      <Guides />
      {paths.map((d, i) => (
        <path
          key={i} d={d} pathLength={1} fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `stroke-draw 0.5s ${i * 0.6}s ease-in-out forwards` }}
        />
      ))}
      {paths.map((d, i) => {
        const p = startOf(d)
        return p && (
          <text key={`n${i}`} x={p.x - 5} y={p.y - 2} fontSize={8} fill="var(--color-accent)" style={{ opacity: 0, animation: `fade-in 0.2s ${i * 0.6}s forwards` }}>
            {i + 1}
          </text>
        )
      })}
    </svg>
  )
}

/**
 * Nachzeichnen: Strich für Strich in der richtigen Reihenfolge.
 * Nach zwei Fehlversuchen am selben Strich wird er hervorgehoben. `onDone(fehler)` kommt, wenn alle Striche sitzen.
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
  const [drawing, setDrawing] = useState<Point[]>()
  const [mistakes, setMistakes] = useState(0)
  const [missesHere, setMissesHere] = useState(0)
  const [flash, setFlash] = useState(false)

  useEffect(() => { setStep(0); setMistakes(0); setMissesHere(0) }, [file])

  const toPoint = (e: PointerEvent): Point => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 109, y: ((e.clientY - r.top) / r.height) * 109 }
  }

  const sample = (el: SVGPathElement): Point[] => {
    const length = el.getTotalLength()
    return Array.from({ length: 24 }, (_, i) => { const p = el.getPointAtLength((length * i) / 23); return { x: p.x, y: p.y } })
  }

  const finishStroke = () => {
    if (!drawing || !paths) return
    const el = refPaths.current[step]
    const ok = !!el && strokeMatches(drawing, sample(el))
    setDrawing(undefined)
    onStroke?.(ok)
    if (ok) {
      setMissesHere(0)
      setStep(step + 1)
      if (step + 1 >= paths.length) onDone(mistakes)
    } else {
      setMistakes((m) => m + 1)
      setMissesHere((m) => m + 1)
      setFlash(true)
      setTimeout(() => setFlash(false), 300)
    }
  }

  if (!paths) return <div className="aspect-square w-full max-w-72 rounded-card bg-sunken" aria-hidden="true" />
  const start = step < paths.length ? startOf(paths[step]) : undefined
  const showHint = step < paths.length && (missesHere >= 2 || (showGuide && step === 0 && missesHere === 0))
  return (
    <svg
      ref={svgRef} viewBox="0 0 109 109" role="img" aria-label={`Schreibfeld, Strich ${Math.min(step + 1, paths.length)} von ${paths.length}`}
      className={cx('aspect-square w-full max-w-72 touch-none rounded-card border-2 bg-surface text-ink transition-colors', flash ? 'border-accent' : 'border-line')}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); setDrawing([toPoint(e)]) }}
      onPointerMove={(e) => drawing && setDrawing([...drawing, toPoint(e)])}
      onPointerUp={finishStroke}
      onPointerCancel={() => setDrawing(undefined)}
    >
      <Guides />
      {paths.map((d, i) => (
        <path
          key={i} ref={(el) => { refPaths.current[i] = el }} d={d} fill="none" strokeLinecap="round" strokeLinejoin="round"
          stroke={i < step ? 'var(--color-ink)' : 'currentColor'} strokeWidth={i < step ? 5 : 4}
          strokeOpacity={i < step ? 1 : showGuide ? 0.14 : 0}
        />
      ))}
      {showHint && (
        <g>
          {missesHere >= 2 && <path d={paths[step]} fill="none" stroke="var(--color-accent)" strokeWidth={4} strokeLinecap="round" className="animate-pulse" />}
          {start && <circle cx={start.x} cy={start.y} r={3.5} fill="var(--color-accent)" />}
        </g>
      )}
      {drawing && (
        <polyline points={drawing.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--color-accent)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}
