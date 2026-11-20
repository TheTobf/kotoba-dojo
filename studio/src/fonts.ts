/**
 * Schriften liegen im Projekt (npm-Pakete von Fontsource, SIL Open Font License) – nichts wird aus dem Netz geladen.
 * Vor dem ersten Bild wartet Remotion, bis die Schriften für den benötigten Text geladen sind.
 */
import '@fontsource/zen-maru-gothic/500.css'
import '@fontsource/zen-maru-gothic/700.css'
import '@fontsource/zen-maru-gothic/900.css'
import '@fontsource/noto-serif-jp/700.css'
import '@fontsource-variable/noto-sans-jp'
import { useEffect, useState } from 'react'
import { continueRender, delayRender } from 'remotion'

export const FONT_SPECS = ['500 40px "Zen Maru Gothic"', '700 40px "Zen Maru Gothic"', '900 40px "Zen Maru Gothic"', '700 40px "Noto Serif JP"', '400 40px "Noto Sans JP Variable"']

/** Lädt alle Schriften für genau diese Zeichen (die Pakete sind nach Zeichenbereichen aufgeteilt). */
export function useFonts(text: string): boolean {
  const [ready, setReady] = useState(false)
  const [handle] = useState(() => delayRender('Schriften laden'))
  useEffect(() => {
    Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec, text + 'AaÄöü0123456789')))
      .catch(() => undefined)
      .then(() => { setReady(true); continueRender(handle) })
  }, [handle, text])
  return ready
}
