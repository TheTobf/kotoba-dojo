/**
 * Automodus (Shadowing freihändig, z. B. im Zug): Satz hören → nachsprechen → vergleichen →
 * per Sprachbefehl „passt / fast / nochmal / stopp“ antworten. Hier steckt nur die Logik
 * (Befehle erkennen, Reihenfolge der Sätze) – ohne Audio, damit sie testbar bleibt.
 */

export type Befehl = 'passt' | 'fast' | 'nochmal' | 'stopp'
export type Urteil = Exclude<Befehl, 'stopp'>

/** Wie oft derselbe Satz per „nochmal“ hintereinander drankommt, bevor es weitergeht. */
export const MAX_VERSUCHE = 3
/** Nach so vielen Sätzen ohne Antwort in Folge pausiert der Automodus. */
export const STILLE_PAUSE = 3
/** „Fast“-Sätze kommen nach so vielen anderen Sätzen noch einmal (einmal pro Satz). */
export const FAST_ABSTAND = 4

/**
 * Wörter (und Verhörer der Spracherkennung) je Befehl. Reihenfolge = Vorrang:
 * „stopp“ gewinnt immer, damit Aufhören sicher klappt.
 */
const WOERTER: [Befehl, string[]][] = [
  ['stopp', ['stopp', 'stop', 'halt', 'ende', 'aufhören', 'aufhoeren', 'schluss', 'beenden', 'pause', 'tschüss']],
  ['nochmal', ['nochmal', 'noch mal', 'nochmals', 'noch einmal', 'wieder', 'wiederholen', 'wiederholung', 'zurück']],
  ['fast', ['fast', 'fass', 'vast', 'fasst', 'knapp', 'beinahe', 'halb', 'mittel', 'geht so']],
  ['passt', ['passt', 'pass', 'past', 'paßt', 'gut', 'super', 'perfekt', 'okay', 'ok', 'weiter', 'ja', 'richtig', 'top', 'prima', 'klasse']],
]

/** Erkennt einen Befehl in erkanntem Text (ganze Wörter bzw. Wortpaare, Groß/klein egal). */
export function befehlAus(text: string): Befehl | undefined {
  const w = text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean)
  const teile = new Set([...w, ...w.slice(1).map((x, i) => `${w[i]} ${x}`)])
  for (const [befehl, liste] of WOERTER) if (liste.some((x) => teile.has(x))) return befehl
  return undefined
}

export interface AutoStand<T extends { id: string }> {
  schlange: T[]                       // [0] = aktueller Satz
  versuche: number                    // wie oft der aktuelle Satz schon dran war
  stille: number                      // Sätze in Folge ohne Antwort
  zurueckgestellt: string[]           // „fast“-Sätze, die schon einmal neu eingereiht wurden
  zaehler: Record<Urteil | 'still', number>
}

export function autoStart<T extends { id: string }>(saetze: T[]): AutoStand<T> {
  return { schlange: saetze, versuche: 1, stille: 0, zurueckgestellt: [], zaehler: { passt: 0, fast: 0, nochmal: 0, still: 0 } }
}

/**
 * Nächster Schritt nach einer Antwort (`undefined` = keine Antwort → zählt wie „fast“).
 * `nachschub` liefert neue Sätze, wenn die Schlange knapp wird (Automodus läuft endlos).
 * Gibt den neuen Stand zurück und ob pausiert werden soll; der alte Stand bleibt unverändert.
 */
export function autoWeiter<T extends { id: string }>(st: AutoStand<T>, antwort: Urteil | undefined, nachschub: () => T[]) {
  const zaehler = { ...st.zaehler, [antwort ?? 'still']: st.zaehler[antwort ?? 'still'] + 1 }
  const stille = antwort ? 0 : st.stille + 1
  const [aktuell, ...rest] = st.schlange
  let schlange = rest
  let versuche = 1
  let zurueckgestellt = st.zurueckgestellt

  if (antwort === 'nochmal' && st.versuche < MAX_VERSUCHE) {
    schlange = st.schlange
    versuche = st.versuche + 1
  } else if (antwort !== 'passt' && aktuell && !zurueckgestellt.includes(aktuell.id)) {
    // fast, keine Antwort oder zu oft „nochmal“: später in dieser Runde noch einmal (aber nur einmal)
    schlange = [...rest.slice(0, FAST_ABSTAND), aktuell, ...rest.slice(FAST_ABSTAND)]
    zurueckgestellt = [...zurueckgestellt, aktuell.id]
  }
  if (schlange.length < 3) {
    const drin = new Set(schlange.map((s) => s.id))
    schlange = [...schlange, ...nachschub().filter((s) => !drin.has(s.id))]
  }
  return {
    stand: { schlange, versuche, stille, zurueckgestellt, zaehler },
    pausieren: stille >= STILLE_PAUSE,
  }
}

/** Liefert reihum Sätze aus einem Vorrat (für den endlosen Nachschub). */
export function reihum<T>(vorrat: T[], n = 6) {
  let pos = 0
  return () => {
    if (!vorrat.length) return []
    const out = Array.from({ length: Math.min(n, vorrat.length) }, (_, i) => vorrat[(pos + i) % vorrat.length])
    pos = (pos + out.length) % vorrat.length
    return out
  }
}
