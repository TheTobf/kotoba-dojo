import { befehlAus, type Befehl } from './automodus'

/**
 * Sprachbefehle über die Web-Speech-Spracherkennung des Browsers (Chrome: kostenlos, über Google,
 * braucht Internet). Gehört wird nur im kurzen Antwortfenster – die Nachsprech-Aufnahmen
 * laufen getrennt und bleiben auf dem Gerät.
 */

interface Alternative { transcript: string }
interface ErgebnisEvent { resultIndex: number; results: ArrayLike<ArrayLike<Alternative>> }
interface FehlerEvent { error: string }
export interface Erkenner {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: ErgebnisEvent) => void) | null
  onerror: ((e: FehlerEvent) => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}
export type ErkennerKlasse = new () => Erkenner

export type Problem = 'offline' | 'nicht-erlaubt' | 'nicht-unterstuetzt'

export function erkennerKlasse(): ErkennerKlasse | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: ErkennerKlasse; webkitSpeechRecognition?: ErkennerKlasse }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const kannBefehle = () => !!erkennerKlasse()

/**
 * Hört bis zu `ms` Millisekunden auf einen Befehl. Löst mit dem Befehl auf, sobald einer erkannt
 * ist (auch aus Zwischenergebnissen), sonst am Ende mit `undefined`. Probleme werden über
 * `onProblem` gemeldet; danach wird in diesem Fenster nicht mehr neu gestartet.
 */
export function befehlHoeren(ms: number, { signal, onProblem, Klasse = erkennerKlasse() }: {
  signal?: AbortSignal
  onProblem?: (p: Problem) => void
  Klasse?: ErkennerKlasse
} = {}): Promise<Befehl | undefined> {
  return new Promise((ok) => {
    if (!Klasse) { onProblem?.('nicht-unterstuetzt'); ok(undefined); return }
    const ende = Date.now() + ms
    let fertig = false
    let aufgeben = false
    let rec: Erkenner | undefined

    const schluss = (b?: Befehl) => {
      if (fertig) return
      fertig = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abbruch)
      try { rec?.abort() } catch { /* schon beendet */ }
      ok(b)
    }
    const abbruch = () => schluss(undefined)
    const timer = setTimeout(() => schluss(undefined), ms)
    signal?.addEventListener('abort', abbruch, { once: true })
    if (signal?.aborted) return schluss(undefined)

    const starten = () => {
      if (fertig || aufgeben) return
      rec = new Klasse()
      rec.lang = 'de-DE'
      rec.continuous = true
      rec.interimResults = true
      rec.maxAlternatives = 5
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const alts = e.results[i]
          for (let j = 0; j < alts.length; j++) {
            const b = befehlAus(alts[j].transcript)
            if (b) return schluss(b)
          }
        }
      }
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { aufgeben = true; onProblem?.('nicht-erlaubt') }
        else if (e.error === 'language-not-supported') { aufgeben = true; onProblem?.('nicht-unterstuetzt') }
        else if (e.error === 'network') { aufgeben = true; onProblem?.('offline') }
        // 'no-speech', 'aborted', 'audio-capture' …: einfach weiterversuchen, solange Zeit ist
      }
      // Chrome beendet die Erkennung nach einer Äußerung oder Stille – solange Zeit bleibt, neu starten
      rec.onend = () => { if (!fertig && !aufgeben && ende - Date.now() > 800) setTimeout(starten, 150) }
      try { rec.start() } catch { aufgeben = true; onProblem?.('nicht-unterstuetzt') }
    }
    starten()
  })
}
