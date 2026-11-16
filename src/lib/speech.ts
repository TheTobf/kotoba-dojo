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

function speakWithDevice(text: string, slow: boolean) {
  if (!hasDeviceSpeech()) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = slow ? 0.65 : 0.95
  const voice = japaneseVoice()
  if (voice) utterance.voice = voice
  speechSynthesis.speak(utterance)
}

export async function speak(text: string, { slow = false } = {}): Promise<void> {
  if (!canSpeak()) return
  const mine = ++request
  playing?.pause()
  if (hasDeviceSpeech()) speechSynthesis.cancel()

  const [{ keys }, key] = await Promise.all([loadAudioIndex(), audioKey(text)])
  if (mine !== request) return // inzwischen wurde etwas anderes angetippt

  if (keys.has(key)) {
    const audio = new Audio(audioPath(key))
    audio.playbackRate = slow ? 0.7 : 1
    audio.preservesPitch = true
    playing = audio
    try {
      await audio.play()
      return
    } catch {
      // Datei fehlt oder der Browser blockiert das Abspielen → Gerätestimme
    }
  }
  speakWithDevice(text, slow)
}
