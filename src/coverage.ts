import { situationStatus } from './progress'
import { isLearned, startOfDay } from './srs'
import type { CardState, Word } from './types'

const DAY = 86_400_000

/**
 * Grobe Abdeckungskurve: Welcher Anteil der Wörter im gesprochenen Alltagsjapanisch
 * entfällt auf die häufigsten N Wörter? Stützpunkte [Rang, Abdeckung in %], dazwischen
 * linear in ln(Rang) – so verhält sich Sprachhäufigkeit (Zipf) ungefähr.
 * Das sind Erfahrungswerte aus Wortabdeckungs-Studien, keine Messung an deinem Material.
 */
const KURVE: [number, number][] = [
  [1, 4], [10, 22], [50, 40], [100, 49], [300, 63], [500, 69], [1000, 77],
  [2000, 84], [4000, 91], [8000, 96], [15000, 98.5],
]

/** Steigung je ln(Rang) pro Kurvenabschnitt; Wort mit Rang r trägt slope / r bei. */
const STEIGUNG = KURVE.slice(1).map(([r, c], i) => (c - KURVE[i][1]) / (Math.log(r) - Math.log(KURVE[i][0])))

/** Anteil (in Prozentpunkten) am Alltagsjapanisch, den ein Wort mit diesem Häufigkeitsrang ausmacht. */
export function wortAnteil(freqRank: number | undefined) {
  if (!freqRank || freqRank < 1 || freqRank >= KURVE[KURVE.length - 1][0]) return 0
  const i = KURVE.findIndex(([r]) => r > freqRank) - 1
  return STEIGUNG[Math.max(0, i)] / freqRank
}

/** Ab so vielen gelernten Wörtern zählen Partikel & Endungen voll (sie kommen über die Beispielsätze dazu). */
const GRAMMATIK_AB = 150

/**
 * Die häufigsten Ränge (の, に, は, を, が, て …) sind Partikel und Endungen – sie stehen nicht als
 * Vokabel im Kurs, machen aber gut ein Drittel des gesprochenen Japanisch aus. Ihr Anteil zählt hier
 * schrittweise mit, je mehr du gelernt hast (und damit Sätze und Grammatik gesehen hast).
 */
function grammatikAnteil(words: Word[], gelernt: number) {
  const imKurs = new Set(words.map((w) => w.freqRank))
  let fehlt = 0
  for (let r = 1; r <= 100; r++) if (!imKurs.has(r)) fehlt += wortAnteil(r)
  return fehlt * Math.min(1, gelernt / GRAMMATIK_AB)
}

/** Geschätzte Wortabdeckung (0–100) einer Menge gelernter Wörter – mit ehrlicher Unschärfe. */
export function abdeckung(words: Word[], learned: Set<string>) {
  const gelernt = words.filter((w) => learned.has(w.id))
  const mid = gelernt.reduce((s, w) => s + wortAnteil(w.freqRank), 0) + grammatikAnteil(words, gelernt.length)
  const spanne = Math.min(6, mid * 0.12 + 1) // Web-Häufigkeiten ≠ gesprochene Sprache → ± ein paar Punkte
  return {
    mid: Math.round(mid),
    low: Math.max(0, Math.round(mid - spanne)),
    high: Math.min(99, Math.round(mid + spanne)),
  }
}

/** Was die Abdeckung praktisch heißt – bewusst nüchtern, ohne Joker. */
export function stufe(pct: number) {
  if (pct < 50) return 'Du erkennst einzelne Wörter, aber noch keine Gespräche.'
  if (pct < 70) return 'Du schnappst Schlüsselwörter auf. Mit Gesten, Zeigen und Nachfragen kommst du durch Reise-Situationen.'
  if (pct < 80) return 'Langsame, einfache Gespräche gehen mit Nachfragen. Echtes Tempo ist noch zu schnell.'
  if (pct < 88) return 'Alltagsgespräche folgst du grob. Ein paar Lücken füllst du aus dem Zusammenhang.'
  return 'Du folgst vieles ohne Übersetzung – Lücken sind die Ausnahme.'
}

/**
 * Wie viele neue Wörter pro Tag du wirklich lernst: gemessen über die letzten bis zu 14 Tage,
 * erst ab 3 Lerntagen; vorher gilt das eingestellte Tageslimit.
 */
export function tempo(cards: CardState[], newPerDay: number, now = Date.now()) {
  const eingefuehrt = cards.filter((c) => c.kind === 'vokabel' && isLearned(c) && c.introducedAt)
  if (!eingefuehrt.length) return { proTag: newPerDay, gemessen: false }
  const erster = Math.min(...eingefuehrt.map((c) => c.introducedAt!))
  const tage = Math.min(14, Math.floor((startOfDay(now) - startOfDay(erster)) / DAY) + 1)
  if (tage < 3) return { proTag: newPerDay, gemessen: false }
  const seit = startOfDay(now) - (tage - 1) * DAY
  const neu = eingefuehrt.filter((c) => c.introducedAt! >= seit).length
  return { proTag: Math.round((neu / tage) * 10) / 10, gemessen: true }
}

/**
 * Hochrechnung bis zum Reisestart: Du lernst in Kursreihenfolge weiter (wie die Lernschlange)
 * und behältst, was du gelernt hast. Gibt Wortzahl, Abdeckung und bereite Situationen zurück.
 */
export function hochrechnung(words: Word[], learned: Set<string>, proTag: number, tageBis: number) {
  const k = Math.max(0, Math.round(proTag * tageBis))
  const neu = [...words].sort((a, b) => a.rank - b.rank).filter((w) => !learned.has(w.id)).slice(0, k)
  const spaeter = new Set([...learned, ...neu.map((w) => w.id)])
  const sit = situationStatus(words, spaeter)
  return {
    woerter: spaeter.size,
    abdeckung: abdeckung(words, spaeter),
    situationenBereit: sit.filter((x) => x.ready).length,
    situationen: sit.length,
  }
}
