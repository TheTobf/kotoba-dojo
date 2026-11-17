/**
 * Spracheingabe: Japanisch ins Mikrofon sprechen statt tippen (Web Speech API des Browsers).
 *
 * Datenschutz: Die Erkennung macht der Browser, nicht Kotoba Dojo. Chrome schickt den Ton dafür an Google,
 * Safari an Apple (teils auf dem Gerät). Deshalb fragt die App vor der ersten Nutzung (MicButton) und
 * speichert selbst keine Aufnahmen. Firefox kann das nicht – dort bleibt nur das Tippen.
 */

interface RecognitionResultList {
  length: number
  [index: number]: { isFinal: boolean; 0: { transcript: string } }
}

interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: { resultIndex: number; results: RecognitionResultList }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type RecognitionConstructor = new () => Recognition

function recognitionClass(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const canListen = () => recognitionClass() !== undefined

export type ListenError = 'kein-zugriff' | 'nichts-gehoert' | 'kein-netz' | 'fehler'

export interface ListenHandlers {
  /** Zwischenstand, während noch gesprochen wird. */
  onPartial?: (text: string) => void
  /** Erkannter Satz, wenn eine Sprechpause kam. */
  onFinal: (text: string) => void
  onError?: (error: ListenError) => void
  /** Immer am Ende (auch nach Fehlern oder Abbruch). */
  onEnd?: () => void
}

const ERRORS: Record<string, ListenError> = {
  'not-allowed': 'kein-zugriff',
  'service-not-allowed': 'kein-zugriff',
  'audio-capture': 'kein-zugriff',
  'no-speech': 'nichts-gehoert',
  network: 'kein-netz',
}

export const LISTEN_ERROR_TEXT: Record<ListenError, string> = {
  'kein-zugriff': 'Kein Zugriff auf das Mikrofon. Erlaube es in den Einstellungen deines Browsers und versuch es noch einmal.',
  'nichts-gehoert': 'Ich habe nichts gehört. Tipp aufs Mikrofon und sprich gleich los.',
  'kein-netz': 'Die Spracherkennung braucht eine Internetverbindung.',
  fehler: 'Die Spracherkennung hat nicht geklappt. Du kannst die Antwort auch tippen.',
}

/** Startet das Zuhören auf Japanisch. Gibt eine Funktion zum Beenden zurück. */
export function listen({ onPartial, onFinal, onError, onEnd }: ListenHandlers): () => void {
  const Recognition = recognitionClass()
  if (!Recognition) {
    onError?.('fehler')
    onEnd?.()
    return () => undefined
  }
  const recognition = new Recognition()
  recognition.lang = 'ja-JP'
  recognition.interimResults = true
  recognition.continuous = false
  recognition.maxAlternatives = 1
  let finished = false

  recognition.onresult = (event) => {
    let text = ''
    let final = false
    for (let i = 0; i < event.results.length; i++) {
      text += event.results[i][0].transcript
      if (event.results[i].isFinal) final = true
    }
    if (final && !finished) {
      finished = true
      onFinal(text.trim())
    } else {
      onPartial?.(text.trim())
    }
  }
  recognition.onerror = (event) => {
    if (event.error === 'aborted') return
    finished = true
    onError?.(ERRORS[event.error] ?? 'fehler')
  }
  recognition.onend = () => onEnd?.()
  try {
    recognition.start()
  } catch {
    onError?.('fehler')
    onEnd?.()
  }
  return () => recognition.abort()
}
