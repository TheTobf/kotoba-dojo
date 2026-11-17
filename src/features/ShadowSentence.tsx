/** Ein Satz beim Nachsprechen: anhören → nachsprechen → Original und eigene Aufnahme hintereinander → selbst einschätzen. */
import { useEffect, useRef, useState } from 'react'
import type { Sentence } from '../lib/data'
import { canRecord, curveFrom, record, type Recording } from '../lib/recorder'
import type { Curve, Verdict } from '../lib/shadowing'
import { playFile, recordingFor, speak } from '../lib/speech'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import { JaText } from '../ui/JaText'

function Wave({ points, label, tone }: { points?: number[]; label: string; tone: 'accent' | 'ink' }) {
  const n = points?.length ?? 0
  const path = n ? points!.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / (n - 1)) * 80},${10 - p * 9}`).join(' ') + ' ' + [...points!].reverse().map((p, i) => `L${((n - 1 - i) / (n - 1)) * 80},${10 + p * 9}`).join(' ') + ' Z' : ''
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-right text-xs text-ink-soft">{label}</span>
      <svg viewBox="0 0 80 20" preserveAspectRatio="none" role="img" aria-label={`Tonkurve ${label}`} className="h-10 flex-1 rounded-control bg-sunken">
        {n > 0 ? <path d={path} fill={tone === 'accent' ? 'var(--color-accent)' : 'var(--color-ink-soft)'} fillOpacity={0.7} /> : <line x1={0} y1={10} x2={80} y2={10} stroke="var(--color-line)" />}
      </svg>
    </div>
  )
}

export function ShadowSentence({ sentence, onVerdict }: { sentence: Sentence; onVerdict: (v: Verdict) => void }) {
  const [original, setOriginal] = useState<Curve & { url: string }>()
  const [mine, setMine] = useState<Curve & { url: string }>()
  const [recording, setRecording] = useState<Recording>()
  const [level, setLevel] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string>()
  const urlRef = useRef<string>(undefined)

  useEffect(() => {
    let active = true
    setMine(undefined)
    setError(undefined)
    recordingFor(sentence.ja).then(async (url) => {
      if (!url || !active) return
      const curve = await curveFrom(await (await fetch(url)).arrayBuffer()).catch(() => undefined)
      if (curve && active) setOriginal({ ...curve, url })
    })
    void speak(sentence.ja)
    return () => { active = false }
  }, [sentence])
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  async function playOriginal(slow = false) {
    if (original) await playFile(original.url, { slow })
    else await speak(sentence.ja, { slow, wait: true })
  }

  async function compare(url = mine?.url) {
    if (!url) return
    setPlaying(true)
    await playOriginal()
    await new Promise((r) => setTimeout(r, 250))
    await playFile(url)
    setPlaying(false)
  }

  async function start() {
    setError(undefined)
    try {
      const rec = await record(setLevel)
      setRecording(rec)
      const blob = await rec.done
      setRecording(undefined)
      setLevel(0)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      const curve = await curveFrom(await blob.arrayBuffer()).catch(() => ({ points: [], seconds: 0 }))
      setMine({ ...curve, url })
      void compare(url)
    } catch (e) {
      setRecording(undefined)
      setError((e as Error).name === 'NotAllowedError' ? 'Kein Zugriff auf das Mikrofon. Bitte in den Browser-Einstellungen erlauben.' : 'Die Aufnahme hat nicht geklappt.')
    }
  }

  return (
    <div className="space-y-5">
      <JaText phrase={sentence} tokens={sentence.tokens} size="lg" showTranslation />

      <div className="flex gap-2">
        <Button className="flex-1" disabled={playing || !!recording} onClick={() => void playOriginal()}><Icon name="sound" /> Anhören</Button>
        <Button className="flex-1" disabled={playing || !!recording} onClick={() => void playOriginal(true)}><Icon name="slow" /> Langsam</Button>
      </div>

      {!canRecord() ? (
        <p className="text-sm text-ink-soft">Dieser Browser kann nicht aufnehmen. Nachsprechen geht trotzdem: anhören und laut mitsprechen.</p>
      ) : recording ? (
        <button type="button" onClick={recording.stop} className="relative w-full overflow-hidden rounded-control bg-accent px-4 py-4 text-lg font-medium text-on-accent">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-on-accent/25 transition-[width]" style={{ width: `${level * 100}%` }} />
          <span className="relative flex items-center justify-center gap-2"><Icon name="mic" /> Ich höre zu … (antippen zum Stoppen)</span>
        </button>
      ) : (
        <Button variant="primary" size="lg" block disabled={playing} onClick={() => void start()}>
          <Icon name="mic" /> {mine ? 'Nochmal aufnehmen' : 'Nachsprechen'}
        </Button>
      )}
      {error && <p role="alert" className="text-sm text-accent">{error}</p>}

      {mine && (
        <div className="space-y-2">
          <Wave points={original?.points} label="Original" tone="accent" />
          <Wave points={mine.points} label="Du" tone="ink" />
          {original && mine.seconds > 0 && (
            <p className="text-center text-xs text-ink-soft">Länge: Original {original.seconds.toFixed(1)} s · du {mine.seconds.toFixed(1)} s</p>
          )}
          {!original && <p className="text-center text-xs text-ink-soft">Die Tonkurve des Originals erscheint, sobald es für diesen Satz eine eigene Aufnahme gibt.</p>}
          <Button block disabled={playing} onClick={() => void compare()}>
            <Icon name="replay" /> {playing ? 'Spielt …' : 'Original und ich hintereinander'}
          </Button>
          <div className="grid grid-cols-3 gap-2 pt-2" role="group" aria-label="Wie war es?">
            {([['nochmal', 'Nochmal'], ['fast', 'Fast'], ['passt', 'Passt']] as const).map(([v, label]) => (
              <button
                key={v} type="button" onClick={() => onVerdict(v)}
                className={cx('min-h-12 rounded-control border font-medium transition-colors', v === 'passt' ? 'border-ok bg-ok-soft text-ok hover:brightness-95' : 'border-line bg-surface hover:border-ink-soft')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
