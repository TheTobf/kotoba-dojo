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
  // Ding (je nach Klangpaket)
  klangTon(1318.5, t + 0.12, 0.18 * volume)
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

/** Richtig: zwei helle Töne, pro Combo-Stufe einen Halbton höher (max. 1 Oktave). */
export function correctSound(combo: number, { volume, muted }: SfxOpts) {
  if (muted || volume <= 0) return
  const t = ac().currentTime
  const base = 880 * 2 ** (Math.min(combo, 12) / 12)
  if (pack) { klangTon(base, t, 0.14 * volume); klangTon(base * 1.5, t + 0.08, 0.1 * volume); return }
  tone(base, t, 0.18, 0.13 * volume)
  tone(base * 1.5, t + 0.07, 0.3, 0.12 * volume)
}

/** Falsch: kurzes, tiefes „Bonk“. */
export function wrongSound({ volume, muted }: SfxOpts) {
  if (muted || volume <= 0) return
  const t = ac().currentTime
  tone(196, t, 0.22, 0.14 * volume, 'triangle')
  tone(147, t + 0.09, 0.3, 0.12 * volume, 'triangle')
}

/** Streak: kurzes aufsteigendes Arpeggio mit „Feuer-Zischen“. */
export function streakSound({ volume, muted }: SfxOpts) {
  if (muted || volume <= 0) return
  const t = ac().currentTime
  ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, t + i * 0.06, 0.35, 0.1 * volume, 'triangle'))
}

/** Level-Up-Fanfare: Dur-Akkord, dann Oktave. */
export function levelSound({ volume, muted }: SfxOpts) {
  if (muted || volume <= 0) return
  const t = ac().currentTime
  ;[523.25, 659.25, 783.99].forEach((f) => tone(f, t, 0.35, 0.09 * volume, 'square'))
  ;[659.25, 783.99, 1046.5].forEach((f) => tone(f, t + 0.18, 0.4, 0.09 * volume, 'square'))
  ;[1046.5, 1318.5, 1568, 2093].forEach((f) => tone(f, t + 0.38, 0.8, 0.08 * volume))
}

// ---------- Klangpakete (Reise-Pass) ----------

let pack = ''
/** Klangpaket setzen ('' = Standard, 'koto' | 'kane' | 'uguisu' | 'furin'). */
export function setSoundPack(id: string) { pack = id }

/** Ein „Belohnungston“ im Stil des aktiven Klangpakets. */
function klangTon(freq: number, t: number, gain: number) {
  switch (pack) {
    case 'koto': { // gezupfte Saite: Dreieck, schneller Abfall, leichtes Absinken
      const c = ac(), o = c.createOscillator(), g = c.createGain()
      o.type = 'triangle'
      o.frequency.setValueAtTime(freq / 2 * 1.01, t)
      o.frequency.exponentialRampToValueAtTime(freq / 2, t + 0.15)
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * 1.4, t + 0.004)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.75)
      tone(freq, t, 0.25, gain * 0.25, 'sine')
      return
    }
    case 'kane': // Tempelglocke: tief, lange Obertöne
      tone(freq / 4, t, 2.2, gain * 0.9)
      tone(freq / 4 * 2.76, t, 1.4, gain * 0.35)
      tone(freq / 4 * 5.4, t, 0.8, gain * 0.15)
      return
    case 'uguisu': { // Vogelruf: zwei schnelle Pfeiftöne mit Glissando
      const c = ac()
      for (const [s, f0, f1] of [[0, freq, freq * 1.5], [0.14, freq * 1.3, freq * 1.9]] as const) {
        const o = c.createOscillator(), g = c.createGain()
        o.frequency.setValueAtTime(f0, t + s); o.frequency.exponentialRampToValueAtTime(f1, t + s + 0.1)
        g.gain.setValueAtTime(0, t + s); g.gain.linearRampToValueAtTime(gain, t + s + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, t + s + 0.13)
        o.connect(g).connect(c.destination); o.start(t + s); o.stop(t + s + 0.15)
      }
      return
    }
    case 'furin': // Windspiel: hohe, unharmonische Teiltöne, lang
      tone(freq * 2, t, 1.6, gain * 0.5)
      tone(freq * 2 * 2.76, t, 1.0, gain * 0.2)
      tone(freq * 2 * 5.4, t + 0.01, 0.6, gain * 0.1)
      tone(freq * 2.02, t + 0.35, 1.2, gain * 0.25)
      return
    default:
      tone(freq, t, 0.6, gain)
      tone(freq * 2, t, 0.35, gain / 3)
  }
}

/** Vorschau eines Klangpakets (Einstellungen / Pass). */
export function previewPack(id: string, opts: SfxOpts) {
  const alt = pack
  pack = id
  flipSound(opts)
  pack = alt
}

/** Koban-Münze landet in der Leiste: helles „Klimpern“, Tonhöhe steigt mit jeder Münze. */
export function coinSound(n: number, { volume, muted }: SfxOpts) {
  if (muted || volume <= 0) return
  const t = ac().currentTime
  const f = 1800 * 2 ** (Math.min(n, 24) / 24)
  tone(f, t, 0.08, 0.06 * volume, 'square')
  tone(f * 1.5, t + 0.02, 0.18, 0.07 * volume)
}