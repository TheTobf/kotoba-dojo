/** Aufnehmen und Tonkurven im Browser (für das Nachsprechen). Reine Berechnungen stehen in shadowing.ts. */
import { envelope, spokenSeconds, type Curve } from './shadowing'

let context: AudioContext | undefined
const audioContext = () => (context ??= new AudioContext())

export async function curveFrom(data: ArrayBuffer): Promise<Curve> {
  const buffer = await audioContext().decodeAudioData(data)
  const samples = buffer.getChannelData(0)
  return { points: envelope(samples), seconds: spokenSeconds(samples, buffer.sampleRate) }
}

export const canRecord = () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

export interface Recording {
  stop: () => void
  done: Promise<Blob>
}

/** Startet die Aufnahme; stoppt von selbst nach gut einer Sekunde Stille (sobald gesprochen wurde) oder nach `maxMs`. */
export async function record(onLevel?: (level: number) => void, maxMs = 12_000): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const recorder = new MediaRecorder(stream)
  const parts: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size) parts.push(e.data) }
  const ctx = audioContext()
  if (ctx.state === 'suspended') await ctx.resume()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)
  const buffer = new Float32Array(analyser.fftSize)
  const startedAt = Date.now()
  let spoke = false
  let silentSince = 0
  let frame = 0

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      cancelAnimationFrame(frame)
      source.disconnect()
      stream.getTracks().forEach((t) => t.stop())
      resolve(new Blob(parts, { type: recorder.mimeType || 'audio/webm' }))
    }
  })
  const stop = () => { if (recorder.state === 'recording') recorder.stop() }

  const watch = () => {
    analyser.getFloatTimeDomainData(buffer)
    let sum = 0
    for (const x of buffer) sum += x * x
    const level = Math.sqrt(sum / buffer.length)
    onLevel?.(Math.min(1, level * 8))
    const now = Date.now()
    if (level > 0.03) { spoke = true; silentSince = 0 } else if (spoke && !silentSince) silentSince = now
    if ((spoke && silentSince && now - silentSince > 1200) || now - startedAt > maxMs) return stop()
    frame = requestAnimationFrame(watch)
  }
  recorder.start()
  frame = requestAnimationFrame(watch)
  return { stop, done }
}
