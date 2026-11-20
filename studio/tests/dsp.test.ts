import { describe, expect, it } from 'vitest'
import { SR, denoise, limit, loudness, normalize, shortenPauses, voicedRegions } from '../scripts/lib/dsp'
import { readWav, writeWav } from '../scripts/lib/wav'

const sine = (sec: number, amp: number, f = 997) => Float32Array.from({ length: Math.round(sec * SR) }, (_, i) => amp * Math.sin((2 * Math.PI * f * i) / SR))
let seed = 1
const noise = (sec: number, amp: number) => Float32Array.from({ length: Math.round(sec * SR) }, () => amp * (((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1))
const cat = (...p: Float32Array[]) => { const o = new Float32Array(p.reduce((n, x) => n + x.length, 0)); let k = 0; for (const x of p) { o.set(x, k); k += x.length } return o }
const rmsDb = (x: Float32Array) => 10 * Math.log10(x.reduce((s, v) => s + v * v, 0) / x.length)

describe('Tonbearbeitung', () => {
  it('misst Lautheit nach EBU R128 (Sinus 997 Hz, Spitze 0,1 ≈ -23 LUFS)', () => {
    expect(loudness(sine(3, 0.1))).toBeCloseTo(-23.0, 0)
  })

  it('bringt auf Ziel-Lautheit', () => {
    expect(loudness(normalize(sine(3, 0.02), -16))).toBeCloseTo(-16, 0)
  })

  it('Begrenzer hält Spitzen unter der Grenze', () => {
    const y = limit(sine(1, 1.5), -1.5)
    expect(Math.max(...y.map(Math.abs))).toBeLessThanOrEqual(Math.pow(10, -1.5 / 20) + 1e-6)
  })

  it('Rauschminderung: Rauschen in Pausen deutlich leiser, Stimme bleibt', () => {
    const tone = sine(1, 0.3, 440), hiss = noise(1, 0.01)
    const x = cat(noise(1, 0.01), tone.map((v, i) => v + hiss[i]), noise(1, 0.01))
    const y = denoise(x)
    const before = rmsDb(x.subarray(0, SR)), after = rmsDb(y.subarray(SR * 0.1, SR * 0.9))
    expect(before - after).toBeGreaterThan(8)
    expect(rmsDb(y.subarray(SR * 1.2, SR * 1.8))).toBeGreaterThan(rmsDb(x.subarray(SR * 1.2, SR * 1.8)) - 1.5)
  })

  it('findet gesprochene Stellen', () => {
    const x = cat(noise(0.5, 0.002), sine(0.8, 0.3, 300), noise(0.6, 0.002), sine(0.5, 0.3, 300), noise(0.5, 0.002))
    const r = voicedRegions(x)
    expect(r.length).toBe(2)
    expect(r[0].start).toBeCloseTo(0.5, 1)
    expect(r[1].end).toBeCloseTo(2.4, 1)
  })

  it('kürzt lange Pausen und rechnet Zeiten um', () => {
    const x = cat(sine(0.5, 0.3, 300), noise(1.2, 0.001), sine(0.5, 0.3, 300))
    const { audio, map } = shortenPauses(x, 0.45, 0.3)
    expect(audio.length / SR).toBeCloseTo(1.3, 1)
    expect(map(0.2)).toBeCloseTo(0.2, 2)
    expect(map(1.9)).toBeCloseTo(1.0, 1)
  })

  it('WAV hin und zurück', () => {
    const a = { sampleRate: SR, samples: sine(0.1, 0.5) }
    const b = readWav(writeWav(a))
    expect(b.sampleRate).toBe(SR)
    expect(b.samples[100]).toBeCloseTo(a.samples[100], 3)
  })
})
