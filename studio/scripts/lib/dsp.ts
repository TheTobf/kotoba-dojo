/**
 * Tonbearbeitung in reinem TypeScript (läuft überall gleich, keine Zusatzprogramme):
 * Hochpass, Rauschminderung, Sprach-Erkennung (laut/leise), Lautheit nach EBU R128, Begrenzer, Mischen, Effekte.
 * Alle Funktionen arbeiten mit Mono-Float32 bei 48 kHz.
 */
export const SR = 48000

/** Biquad-Filter (Direktform I) */
function biquad(x: Float32Array, b: number[], a: number[]): Float32Array {
  const y = new Float32Array(x.length)
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v
  }
  return y
}

/** Hochpass 2. Ordnung (Brummen, Wind, Tischgeräusche unter ~80 Hz weg) */
export function highpass(x: Float32Array, freq = 80, sr = SR): Float32Array {
  const w = (2 * Math.PI * freq) / sr, q = Math.SQRT1_2
  const alpha = Math.sin(w) / (2 * q), cos = Math.cos(w), a0 = 1 + alpha
  return biquad(x, [(1 + cos) / 2 / a0, -(1 + cos) / a0, (1 + cos) / 2 / a0], [1, (-2 * cos) / a0, (1 - alpha) / a0])
}

// ---------- FFT ----------
function fft(re: Float64Array, im: Float64Array, inverse: boolean) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n }
}

/**
 * Rauschminderung (spektrales Gating): Das Rauschprofil kommt aus den leisesten Stellen der Aufnahme,
 * darunter liegende Anteile werden gedämpft – sanft, damit die Stimme natürlich bleibt.
 */
export function denoise(x: Float32Array, { low = 1.6, high = 4, floor = 0.12 } = {}): Float32Array {
  const N = 1024, H = 256
  const win = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N))
  const frames = Math.max(1, Math.ceil((x.length - N) / H) + 1)
  const bins = N / 2 + 1
  const mags: Float32Array[] = []
  const energy = new Float64Array(frames)
  const re = new Float64Array(N), im = new Float64Array(N)
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) { re[i] = (x[f * H + i] ?? 0) * win[i]; im[i] = 0 }
    fft(re, im, false)
    const m = new Float32Array(bins)
    let e = 0
    for (let k = 0; k < bins; k++) { m[k] = Math.hypot(re[k], im[k]); e += m[k] * m[k] }
    mags.push(m); energy[f] = e
  }
  // Rauschprofil aus den leisesten 10 % der Abschnitte
  const order = [...energy.keys()].sort((a, b) => energy[a] - energy[b])
  const quiet = order.slice(0, Math.max(3, Math.floor(frames * 0.1)))
  const noise = new Float32Array(bins)
  for (const f of quiet) for (let k = 0; k < bins; k++) noise[k] += mags[f][k] / quiet.length
  const out = new Float32Array(x.length)
  const prev = new Float32Array(bins).fill(1)
  const norm = new Float32Array(x.length)
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) { re[i] = (x[f * H + i] ?? 0) * win[i]; im[i] = 0 }
    fft(re, im, false)
    const g = new Float32Array(bins)
    for (let k = 0; k < bins; k++) {
      // weiches Tor: bis 1,6× Rauschpegel stark dämpfen, ab 4× ungedämpft, dazwischen sanfter Übergang
      const snr = mags[f][k] / (noise[k] + 1e-9)
      const u = Math.max(0, Math.min(1, (snr - low) / (high - low)))
      g[k] = floor + (1 - floor) * u * u * (3 - 2 * u)
    }
    for (let k = 0; k < bins; k++) {
      // Glätten über Frequenz und Zeit (schnell auf, langsam zu) – verhindert „Blubbern“
      const s = (g[Math.max(0, k - 1)] + g[k] * 2 + g[Math.min(bins - 1, k + 1)]) / 4
      const v = s > prev[k] ? s : prev[k] * 0.6 + s * 0.4
      prev[k] = v
      re[k] *= v; im[k] *= v
      if (k > 0 && k < N / 2) { re[N - k] *= v; im[N - k] *= v }
    }
    fft(re, im, true)
    for (let i = 0; i < N; i++) {
      const o = f * H + i
      if (o < out.length) { out[o] += re[i] * win[i]; norm[o] += win[i] * win[i] }
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = norm[i] > 1e-6 ? out[i] / norm[i] : 0
  return out
}

/** Pegel je 10-ms-Stück in dB */
export function frameDb(x: Float32Array, sr = SR, ms = 10): Float32Array {
  const n = Math.round((sr * ms) / 1000)
  const frames = Math.ceil(x.length / n)
  const out = new Float32Array(frames)
  for (let f = 0; f < frames; f++) {
    let s = 0
    const end = Math.min(x.length, (f + 1) * n)
    for (let i = f * n; i < end; i++) s += x[i] * x[i]
    out[f] = 10 * Math.log10(s / Math.max(1, end - f * n) + 1e-12)
  }
  return out
}

export interface Region { start: number; end: number }

/** Wo wird gesprochen? Ergebnis in Sekunden. */
export function voicedRegions(x: Float32Array, sr = SR): Region[] {
  const db = frameDb(x, sr)
  const sorted = [...db].sort((a, b) => a - b)
  const floor = sorted[Math.floor(sorted.length * 0.1)] ?? -80
  const peak = sorted[Math.floor(sorted.length * 0.98)] ?? -20
  const threshold = Math.max(floor + 10, Math.min(peak - 28, -48), -60)
  const voiced = Array.from(db, (v) => v > threshold)
  // kleine Lücken (< 120 ms) füllen, Knackser (< 50 ms) entfernen
  fill(voiced, true, 12)
  fill(voiced, false, 5)
  const regions: Region[] = []
  let s = -1
  voiced.forEach((v, i) => {
    if (v && s < 0) s = i
    if (!v && s >= 0) { regions.push({ start: s / 100, end: i / 100 }); s = -1 }
  })
  if (s >= 0) regions.push({ start: s / 100, end: voiced.length / 100 })
  return regions
}

function fill(arr: boolean[], value: boolean, maxLen: number) {
  let i = 0
  while (i < arr.length) {
    if (arr[i] !== value) {
      let j = i
      while (j < arr.length && arr[j] !== value) j++
      if (i > 0 && j < arr.length && j - i <= maxLen) for (let k = i; k < j; k++) arr[k] = value
      i = j
    } else i++
  }
}

/** Lautheit (LUFS, ITU-R BS.1770 mit Gating) – bei 48 kHz */
export function loudness(x: Float32Array): number {
  const s1 = biquad(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585])
  const k = biquad(s1, [1, -2, 1], [1, -1.99004745483398, 0.99007225036621])
  const block = Math.round(0.4 * SR), step = Math.round(0.1 * SR)
  const z: number[] = []
  if (k.length < block) {
    let s = 0
    for (const v of k) s += v * v
    return -0.691 + 10 * Math.log10(s / Math.max(1, k.length) + 1e-12)
  }
  for (let i = 0; i + block <= k.length; i += step) {
    let s = 0
    for (let j = i; j < i + block; j++) s += k[j] * k[j]
    z.push(s / block)
  }
  const lufs = (v: number) => -0.691 + 10 * Math.log10(v + 1e-12)
  const abs = z.filter((v) => lufs(v) > -70)
  if (!abs.length) return -70
  const mean = abs.reduce((a, b) => a + b, 0) / abs.length
  const rel = abs.filter((v) => lufs(v) > lufs(mean) - 10)
  return lufs(rel.reduce((a, b) => a + b, 0) / Math.max(1, rel.length))
}

export const gain = (x: Float32Array, db: number) => { const g = Math.pow(10, db / 20); return x.map((v) => v * g) }

/** Auf Ziel-Lautheit bringen */
export function normalize(x: Float32Array, targetLufs: number): Float32Array {
  const l = loudness(x)
  return l <= -69 ? x : gain(x, targetLufs - l)
}

/** Sanfter Begrenzer mit Vorausschau: keine Übersteuerung, Spitzen höchstens `ceilingDb` */
export function limit(x: Float32Array, ceilingDb = -1.5): Float32Array {
  const ceil = Math.pow(10, ceilingDb / 20)
  const look = Math.round(0.005 * SR), release = Math.exp(-1 / (0.08 * SR))
  const out = new Float32Array(x.length)
  let env = 1
  for (let i = 0; i < x.length; i++) {
    let peak = 0
    for (let j = i; j < Math.min(x.length, i + look); j += 4) peak = Math.max(peak, Math.abs(x[j]))
    const want = peak > ceil ? ceil / peak : 1
    env = want < env ? want : 1 - (1 - env) * release
    out[i] = Math.max(-ceil, Math.min(ceil, x[i] * env))
  }
  return out
}

export function slice(x: Float32Array, from: number, to: number): Float32Array {
  return x.slice(Math.max(0, Math.round(from * SR)), Math.min(x.length, Math.round(to * SR)))
}

/** Ein- und Ausblenden gegen Knackser */
export function fade(x: Float32Array, inMs = 8, outMs = 25): Float32Array {
  const y = x.slice()
  const a = Math.min(y.length, Math.round((inMs / 1000) * SR)), b = Math.min(y.length, Math.round((outMs / 1000) * SR))
  for (let i = 0; i < a; i++) y[i] *= i / a
  for (let i = 0; i < b; i++) y[y.length - 1 - i] *= i / b
  return y
}

/**
 * Lange Pausen innerhalb eines Satzes kürzen (länger als maxPause → auf keep). Gibt die neue Aufnahme und eine
 * Umrechnung alter → neuer Zeiten zurück (damit die Wort-Zeiten weiter stimmen).
 */
export function shortenPauses(x: Float32Array, maxPause = 0.45, keep = 0.3): { audio: Float32Array; map: (t: number) => number } {
  const regions = voicedRegions(x)
  const cuts: { from: number; to: number }[] = []
  for (let i = 0; i < regions.length - 1; i++) {
    const gapStart = regions[i].end, gapEnd = regions[i + 1].start
    if (gapEnd - gapStart > maxPause) cuts.push({ from: gapStart + keep / 2, to: gapEnd - keep / 2 })
  }
  if (!cuts.length) return { audio: x, map: (t) => t }
  const parts: Float32Array[] = []
  let cursor = 0
  for (const c of cuts) { parts.push(fade(slice(x, cursor, c.from), cursor === 0 ? 0 : 10, 10)); cursor = c.to }
  parts.push(fade(slice(x, cursor, x.length / SR), 10, 0))
  const map = (t: number) => {
    let removed = 0
    for (const c of cuts) {
      if (t >= c.to) removed += c.to - c.from
      else if (t > c.from) return c.from - removed
    }
    return t - removed
  }
  return { audio: concat(parts), map }
}

export function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

/** Clip an Position (Sekunden) in die Spur mischen */
export function mixInto(track: Float32Array, clip: Float32Array, at: number, gainDb = 0) {
  const g = Math.pow(10, gainDb / 20)
  const o = Math.round(at * SR)
  for (let i = 0; i < clip.length && o + i < track.length; i++) if (o + i >= 0) track[o + i] += clip[i] * g
}

// ---------- eigene Effekte (selbst erzeugt, keine fremden Sounds) ----------
export function sfx(name: 'tick' | 'pling' | 'plus' | 'whoosh'): Float32Array {
  const len = { tick: 0.09, pling: 0.9, plus: 0.6, whoosh: 0.45 }[name]
  const n = Math.round(len * SR)
  const y = new Float32Array(n)
  let seed = 12345
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    switch (name) {
      case 'tick': y[i] = Math.sin(2 * Math.PI * 1320 * t) * Math.exp(-t * 60) * 0.8; break
      case 'pling': y[i] = (Math.sin(2 * Math.PI * 880 * t) * 0.6 + Math.sin(2 * Math.PI * 1320 * t) * 0.4 * (t > 0.08 ? 1 : 0)) * Math.exp(-t * 5) * 0.7; break
      case 'plus': {
        const f = t < 0.1 ? 660 : t < 0.2 ? 880 : 1100
        y[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-((t % 0.1) * 18)) * 0.6
        break
      }
      case 'whoosh': {
        const k = 0.02 + 0.25 * Math.sin((Math.PI * t) / len)
        lp += k * (rnd() - lp)
        y[i] = lp * Math.sin((Math.PI * t) / len) * 1.4
        break
      }
    }
  }
  return fade(y, 3, 20)
}
