import { assetUrl } from './data'

let current: HTMLAudioElement | undefined

/**
 * Spielt eine Audiodatei ab; ohne Datei (oder bei Fehler) spricht die Browser-Stimme (ja-JP).
 * `slow` verlangsamt auf 70 % bei gleicher Tonhöhe.
 */
export async function speak(text: string, file?: string, { slow = false, volume = 1 } = {}) {
  current?.pause()
  speechSynthesis?.cancel()
  if (file) {
    const a = new Audio(assetUrl(file))
    a.playbackRate = slow ? 0.7 : 1
    a.preservesPitch = true
    a.volume = volume
    current = a
    try { await a.play(); return } catch { /* Fallback unten */ }
  }
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = slow ? 0.6 : 0.95
  u.volume = volume
  const ja = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ja'))
  if (ja) u.voice = ja
  speechSynthesis.speak(u)
}
