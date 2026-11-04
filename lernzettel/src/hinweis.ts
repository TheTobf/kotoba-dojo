/** Kurze Meldung unten am Bildschirm (angezeigt von components/Hinweis.tsx) */
let setzen: ((t: string | null) => void) | null = null
let timer: ReturnType<typeof setTimeout> | undefined

export function zeigeHinweis(text: string): void {
  setzen?.(text)
  clearTimeout(timer)
  timer = setTimeout(() => setzen?.(null), 2600)
}

export function meldeAnzeige(fn: ((t: string | null) => void) | null): void {
  setzen = fn
}
