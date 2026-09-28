/**
 * Kleine Belohnungs-Sounds, live per Web Audio erzeugt (keine Dateien, keine Lizenzen).
 * Lautstärke/Stumm kommen aus den Einstellungen.
 */
let ctx: AudioContext | undefined
let lastTick = 0

function ac() {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export interface SfxOpts { volume: number; muted: boolean }

function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g).connect(c.destination)
  o.start(start)
  o.stop(start + dur + 0.02)
}

/** „Swoosh“ (gefiltertes Rauschen) + helles „Ding“ beim Umdrehen. */
export function flipSound({ volume, muted }: SfxOpts) {
  if (muted || volume <= 0) return
  const c = ac()
  const t = c.currentTime
  const len = 0.22
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.2
  bp.frequency.setValueAtTime(600, t)
  bp.frequency.exponentialRampToValueAtTime(4000, t + len)
  const g = c.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.35 * volume, t + 0.06)
  g.gain.exponentialRampToValueAtTime(0.0001, t + len)
  src.connect(bp).connect(g).connect(c.destination)
  src.start(t)
  // Ding: Grundton + Oktave, leicht glockig
  tone(1318.5, t + 0.12, 0.6, 0.18 * volume)
  tone(2637, t + 0.12, 0.35, 0.06 * volume)
}

/** Leiser Tipp-Klick für die Schreibmaschine (max. alle 45 ms). */
export function tickSound({ volume, muted }: SfxOpts) {
  if (muted || volume <= 0) return
  const now = performance.now()
  if (now - lastTick < 45) return
  lastTick = now
  const c = ac()
  tone(2200 + Math.random() * 400, c.currentTime, 0.03, 0.05 * volume, 'square')
}

/** Rückmeldung nach der Bewertung: aufsteigend bei Gut/Einfach, dumpf bei Nochmal. */
export function rateSound(grade: number, { volume, muted }: SfxOpts) {
  if (muted || volume <= 0) return
  const t = ac().currentTime
  if (grade <= 1) tone(220, t, 0.18, 0.12 * volume, 'triangle')
  else if (grade === 2) tone(660, t, 0.2, 0.1 * volume)
  else {
    tone(880, t, 0.25, 0.12 * volume)
    tone(1318.5, t + 0.08, 0.35, 0.12 * volume)
    if (grade === 4) tone(1760, t + 0.16, 0.45, 0.1 * volume)
  }
}

/** Fanfare für neu Freigeschaltetes. */
export function unlockSound({ volume, muted }: SfxOpts) {
  if (muted || volume <= 0) return
  const t = ac().currentTime
  ;[1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.09, 0.5, 0.12 * volume))
}

export function vibrate(on: boolean, pattern: number | number[] = 12) {
  if (on && 'vibrate' in navigator) navigator.vibrate(pattern)
}
