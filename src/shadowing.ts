import { assetUrl } from './data'
import type { Sentence, Word } from './types'

/**
 * Shadowing: Original hören, nachsprechen, vergleichen.
 * Aufnahmen bleiben nur im Speicher (Blob) – nichts wird gespeichert oder hochgeladen.
 */

/** Sätze für eine Runde: gelernte zuerst, dann in Lernreihenfolge (Reise-Block vorn); kurze zuerst, mit Audio bevorzugt. */
export function shadowSaetze(words: Word[], sentences: Map<string, Sentence>, learned: Set<string>, n = 8, rand = Math.random) {
  const kandidaten = [...words]
    .sort((a, b) => (learned.has(a.id) ? 0 : 1) - (learned.has(b.id) ? 0 : 1) || a.rank - b.rank)
    .map((w) => ({ s: sentences.get(w.sentenceIds[0]), gelernt: learned.has(w.id) }))
    .filter((x): x is { s: Sentence; gelernt: boolean } => !!x.s && x.s.ja.length >= 3 && x.s.ja.length <= 24)
  // aus den ersten passenden etwas mischen, damit nicht immer dieselben kommen
  const vorrat = kandidaten.slice(0, Math.max(n * 3, learned.size ? 40 : 16))
  return vorrat
    .map(({ s, gelernt }) => ({ s, k: (gelernt ? 0 : 10) + rand() + (s.audio ? 0 : 0.6) + s.ja.length / 60 }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.s)
    .sort((a, b) => a.ja.length - b.ja.length)
}

/** Lautstärke-Hüllkurve (0..1) in `bins` Abschnitten – für die Tonkurven. Stille am Anfang/Ende wird abgeschnitten. */
export function huellkurve(samples: Float32Array, bins = 80, schwelle = 0.02): number[] {
  let a = 0
  let b = samples.length - 1
  while (a < b && Math.abs(samples[a]) < schwelle) a++
  while (b > a && Math.abs(samples[b]) < schwelle) b--
  const len = Math.max(1, b - a)
  const out: number[] = []
  for (let i = 0; i < bins; i++) {
    const s = a + Math.floor((len * i) / bins)
    const e = a + Math.floor((len * (i + 1)) / bins)
    let sum = 0
    for (let j = s; j < e; j++) sum += samples[j] * samples[j]
    out.push(Math.sqrt(sum / Math.max(1, e - s)))
  }
  const max = Math.max(...out, 1e-6)
  return out.map((x) => x / max)
}

let ctx: AudioContext | undefined
const audioCtx = () => (ctx ??= new AudioContext())

/** Gesprochene Dauer in Sekunden – ohne Stille am Anfang und Ende. */
export function sprechDauer(samples: Float32Array, rate: number, schwelle = 0.02) {
  let a = 0
  let b = samples.length - 1
  while (a < b && Math.abs(samples[a]) < schwelle) a++
  while (b > a && Math.abs(samples[b]) < schwelle) b--
  return Math.max(0, b - a) / rate
}

async function dekodiere(buf: ArrayBuffer) {
  const b = await audioCtx().decodeAudioData(buf)
  const d = b.getChannelData(0)
  return { kurve: huellkurve(d), dauer: sprechDauer(d, b.sampleRate) }
}

export const kurveAusDatei = async (file: string) => dekodiere(await (await fetch(assetUrl(file))).arrayBuffer())
export const kurveAusBlob = async (blob: Blob) => dekodiere(await blob.arrayBuffer())

/** Spielt eine URL ab und wartet, bis sie fertig ist. */
export function abspielen(url: string, volume = 1, rate = 1) {
  return new Promise<void>((ok) => {
    const a = new Audio(url)
    a.volume = volume
    a.playbackRate = rate
    a.preservesPitch = true
    a.onended = () => ok()
    a.onerror = () => ok()
    a.play().catch(() => ok())
  })
}

export interface Aufnahme { stop: () => void; fertig: Promise<Blob> }

/** Startet die Aufnahme; stoppt automatisch nach ~1,2 s Stille (sobald gesprochen wurde) oder nach `maxMs`. */
export async function aufnehmen(onPegel?: (p: number) => void, maxMs = 12_000): Promise<Aufnahme> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const rec = new MediaRecorder(stream)
  const teile: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && teile.push(e.data)
  const c = audioCtx()
  if (c.state === 'suspended') await c.resume()
  const quelle = c.createMediaStreamSource(stream)
  const ana = c.createAnalyser()
  ana.fftSize = 1024
  quelle.connect(ana)
  const daten = new Float32Array(ana.fftSize)
  const start = Date.now()
  let gesprochen = false
  let stilleSeit = 0
  let raf = 0

  const fertig = new Promise<Blob>((ok) => {
    rec.onstop = () => {
      cancelAnimationFrame(raf)
      quelle.disconnect()
      stream.getTracks().forEach((t) => t.stop())
      ok(new Blob(teile, { type: rec.mimeType || 'audio/webm' }))
    }
  })
  const stop = () => { if (rec.state === 'recording') rec.stop() }

  const pruefe = () => {
    ana.getFloatTimeDomainData(daten)
    let sum = 0
    for (const x of daten) sum += x * x
    const pegel = Math.sqrt(sum / daten.length)
    onPegel?.(Math.min(1, pegel * 8))
    const jetzt = Date.now()
    if (pegel > 0.03) { gesprochen = true; stilleSeit = 0 } else if (gesprochen && !stilleSeit) stilleSeit = jetzt
    if ((gesprochen && stilleSeit && jetzt - stilleSeit > 1200) || jetzt - start > maxMs) return stop()
    raf = requestAnimationFrame(pruefe)
  }
  rec.start()
  raf = requestAnimationFrame(pruefe)
  return { stop, fertig }
}

export const kannAufnehmen = () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
