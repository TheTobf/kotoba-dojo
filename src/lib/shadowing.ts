/**
 * Nachsprechen (Shadowing): Satz hören, sofort nachsprechen, beides vergleichen, selbst einschätzen.
 * Die eigene Aufnahme bleibt nur im Arbeitsspeicher des Geräts – sie wird nie gespeichert oder verschickt.
 * Die Tonkurve des Originals gibt es nur, wenn zu dem Satz eine eigene Aufnahme vorliegt (nicht bei der Gerätestimme).
 */
import type { LearnData, Sentence } from './data'

/** Punkte je Selbsteinschätzung. */
export const SHADOW_XP = { nochmal: 2, fast: 6, passt: 12 } as const
export type Verdict = keyof typeof SHADOW_XP

/** Sätze für eine Runde: aus gelernten Wörtern zuerst, kurze zuerst, etwas gemischt. */
export function shadowSentences(data: LearnData, learned: Set<string>, count = 8, random = Math.random): Sentence[] {
  const candidates = data.words
    .map((w) => ({ sentence: data.sentences.get(w.sentenceIds[0]), learned: learned.has(w.id), rank: w.rank }))
    .filter((x): x is { sentence: Sentence; learned: boolean; rank: number } => !!x.sentence && x.sentence.ja.length >= 3 && x.sentence.ja.length <= 24)
    .sort((a, b) => Number(b.learned) - Number(a.learned) || a.rank - b.rank)
  const pool = candidates.slice(0, Math.max(count * 3, learned.size ? 40 : 16))
  return pool
    .map((x) => ({ s: x.sentence, key: (x.learned ? 0 : 10) + random() + x.sentence.ja.length / 60 }))
    .sort((a, b) => a.key - b.key)
    .slice(0, count)
    .map((x) => x.s)
    .sort((a, b) => a.ja.length - b.ja.length)
}

/** Stille am Anfang und Ende abschneiden: Index des ersten und letzten hörbaren Werts. */
function trim(samples: Float32Array, threshold: number): [number, number] {
  let start = 0
  let end = samples.length - 1
  while (start < end && Math.abs(samples[start]) < threshold) start++
  while (end > start && Math.abs(samples[end]) < threshold) end--
  return [start, end]
}

/** Lautstärke-Verlauf (0 … 1) in `bins` Abschnitten – für die Tonkurven. */
export function envelope(samples: Float32Array, bins = 80, threshold = 0.02): number[] {
  const [start, end] = trim(samples, threshold)
  const length = Math.max(1, end - start)
  const out: number[] = []
  for (let i = 0; i < bins; i++) {
    const from = start + Math.floor((length * i) / bins)
    const to = start + Math.floor((length * (i + 1)) / bins)
    let sum = 0
    for (let j = from; j < to; j++) sum += samples[j] * samples[j]
    out.push(Math.sqrt(sum / Math.max(1, to - from)))
  }
  const max = Math.max(...out, 1e-6)
  return out.map((x) => x / max)
}

/** Gesprochene Dauer in Sekunden (ohne Stille am Anfang und Ende). */
export function spokenSeconds(samples: Float32Array, sampleRate: number, threshold = 0.02): number {
  const [start, end] = trim(samples, threshold)
  return Math.max(0, end - start) / sampleRate
}

export interface Curve {
  points: number[]
  seconds: number
}
