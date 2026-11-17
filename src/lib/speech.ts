/**
 * Vorlesen. Reihenfolge:
 *   1. eigene Aufnahme, wenn es zu genau diesem Text eine gibt (public/audio/, siehe shared/audio.ts),
 *   2. sonst die japanische Stimme des Geräts (Web Speech API).
 *
 * Die früheren Audiodateien der privaten App werden bewusst NICHT verwendet (Lizenz). Neue Aufnahmen erzeugt
 * `npm run audio:gen` aus einer Quelle mit kommerzieller Lizenz – siehe docs/HANDOFF.md.
 */
import { audioKey, audioPath, type AudioIndex } from '../../shared/audio'

const hasDeviceSpeech = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export const canSpeak = () => typeof window !== 'undefined' && (hasDeviceSpeech() || typeof Audio !== 'undefined')

let index: Promise<{ credit: string; keys: Set<string> }> | undefined

/** Liste der vorhandenen Aufnahmen (einmal geladen). Fehlt sie oder ist man offline, gilt: keine Aufnahmen. */
export function loadAudioIndex() {
  index ??= fetch('/audio/index.json')
    .then((response) => response.json() as Promise<AudioIndex>)
    .then((data) => ({ credit: data.credit ?? '', keys: new Set(data.keys ?? []) }))
    .catch(() => ({ credit: '', keys: new Set<string>() }))
  return index
}

function japaneseVoice(): SpeechSynthesisVoice | undefined {
  return speechSynthesis.getVoices().find((voice) => voice.lang.replace('_', '-').toLowerCase().startsWith('ja'))
}

/** Gibt es auf diesem Gerät eine japanische Stimme? (Manche Browser laden die Liste verzögert.) */
export function hasJapaneseVoice(): boolean {
  return hasDeviceSpeech() && japaneseVoice() !== undefined
}

let playing: HTMLAudioElement | undefined
let request = 0

/** Spricht mit der Gerätestimme; das Ergebnis erfüllt sich, wenn die Stimme fertig ist. */
function speakWithDevice(text: string, slow: boolean): Promise<void> {
  if (!hasDeviceSpeech()) return Promise.resolve()
  return new Promise((done) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    utterance.rate = slow ? 0.65 : 0.95
    const voice = japaneseVoice()
    if (voice) utterance.voice = voice
    // Manche Browser melden das Ende nie – dann nach einer geschätzten Sprechdauer weitermachen.
    const fallback = setTimeout(done, 1200 + text.length * (slow ? 320 : 220))
    utterance.onend = utterance.onerror = () => { clearTimeout(fallback); done() }
    speechSynthesis.speak(utterance)
  })
}

/** Gibt es zu diesem Text eine eigene Aufnahme? Dann ihre Adresse, sonst undefined. */
export async function recordingFor(text: string): Promise<string | undefined> {
  const [{ keys }, key] = await Promise.all([loadAudioIndex(), audioKey(text)])
  return keys.has(key) ? audioPath(key) : undefined
}

/** Spielt eine Audiodatei ab; das Ergebnis erfüllt sich am Ende (oder sofort bei einem Fehler: `false`). */
export function playFile(url: string, { slow = false } = {}): Promise<boolean> {
  return new Promise((done) => {
    const audio = new Audio(url)
    audio.playbackRate = slow ? 0.7 : 1
    audio.preservesPitch = true
    playing = audio
    audio.onended = () => done(true)
    audio.onerror = () => done(false)
    audio.play().catch(() => done(false))
  })
}

/** Liest vor. Mit `wait` erfüllt sich das Ergebnis erst, wenn fertig gesprochen ist. */
export async function speak(text: string, { slow = false, wait = false } = {}): Promise<void> {
  if (!canSpeak()) return
  const mine = ++request
  playing?.pause()
  if (hasDeviceSpeech()) speechSynthesis.cancel()

  const file = await recordingFor(text)
  if (mine !== request) return // inzwischen wurde etwas anderes angetippt

  if (file) {
    const played = playFile(file, { slow })
    if (!wait) return
    if (await played) return
  }
  const spoken = speakWithDevice(text, slow)
  if (wait) await spoken
}
