import { frageBloecke } from './markdown'

/**
 * Testfragen (Multiple Choice) stehen im Lernzettel als Kasten:
 *
 * > [!FRAGE]
 * > Was ist die Ableitung von $e^{2x}$?
 * > - [ ] $e^{2x}$
 * > - [x] $2e^{2x}$
 * > - [ ] $2x\,e^{2x-1}$
 * > - [ ] $\ln(2x)$
 * >
 * > Kettenregel: äußere mal innere Ableitung.
 *
 * Genau 4 Antworten, genau eine mit [x]; Text nach den Antworten = Erklärung.
 */
export interface Antwort {
  text: string
  richtig: boolean
}

export interface Frage {
  frage: string
  antworten: Antwort[]
  erklaerung: string
}

const ANTWORT = /^\s*[-*+]\s+\[( |x|X)\]\s*(.*)$/

export function parseFrage(koerper: string): { frage: Frage; fehler: string[] } {
  const frageZeilen: string[] = []
  const antworten: Antwort[] = []
  const erklaerung: string[] = []
  for (const zeile of koerper.split('\n')) {
    const m = ANTWORT.exec(zeile)
    if (m && !erklaerung.length) antworten.push({ text: m[2].trim(), richtig: m[1] !== ' ' })
    else if (!antworten.length) frageZeilen.push(zeile)
    else erklaerung.push(zeile)
  }
  const frage: Frage = {
    frage: frageZeilen.join('\n').trim(),
    antworten,
    erklaerung: erklaerung
      .join('\n')
      .trim()
      .replace(/^\**(erklärung|erklaerung|begründung|warum)\**\s*:\s*\**\s*/i, '')
      .trim(),
  }
  const fehler: string[] = []
  if (!frage.frage) fehler.push('Fragetext fehlt')
  if (antworten.length !== 4) fehler.push(`${antworten.length} statt 4 Antworten`)
  const richtige = antworten.filter((a) => a.richtig).length
  if (richtige !== 1) fehler.push(`${richtige} statt genau 1 richtigen Antwort`)
  if (antworten.some((a) => !a.text)) fehler.push('leere Antwort')
  if (new Set(antworten.map((a) => a.text)).size !== antworten.length) fehler.push('doppelte Antworten')
  if (!frage.erklaerung) fehler.push('Erklärung fehlt')
  return { frage, fehler }
}

/** Alle gültigen Testfragen eines Lernzettels (+ Fehlermeldungen zu kaputten) */
export function leseFragen(md: string): { fragen: Frage[]; fehler: string[] } {
  const fragen: Frage[] = []
  const fehler: string[] = []
  frageBloecke(md).forEach((b, i) => {
    const r = parseFrage(b)
    if (r.fehler.length) fehler.push(`Frage ${i + 1}: ${r.fehler.join(', ')}`)
    // Nur Fehler, die den Test unbrauchbar machen, schließen die Frage aus
    if (r.frage.frage && r.frage.antworten.length >= 2 && r.frage.antworten.filter((a) => a.richtig).length === 1) fragen.push(r.frage)
  })
  return { fragen, fehler }
}

/** Kurzer, stabiler Schlüssel aus dem Fragetext (für die Statistik pro Frage) */
export function frageKey(zettelId: string, f: Frage): string {
  let h = 5381
  const text = f.frage.replace(/\s+/g, ' ').trim()
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return `${zettelId}#${(h >>> 0).toString(36)}`
}

export function mische<T>(liste: readonly T[], zufall: () => number = Math.random): T[] {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface FrageStat {
  /** wie oft richtig / falsch */
  r: number
  f: number
  /** letzte Antwort richtig? */
  zuletzt: boolean
}

/**
 * Für den Abschlusstest: zuerst Fragen, die zuletzt falsch waren, dann noch nie gestellte, dann der Rest –
 * innerhalb dieser Gruppen zufällig. Die Auswahl wird am Ende gemischt.
 */
export function waehleFragen<T extends { key: string }>(
  alle: readonly T[],
  stats: Record<string, FrageStat>,
  anzahl: number,
  zufall: () => number = Math.random,
): T[] {
  const prio = (k: string) => {
    const s = stats[k]
    if (!s) return 2
    return s.zuletzt ? 1 : 3
  }
  const auswahl = alle
    .map((x) => ({ x, p: prio(x.key) + zufall() }))
    .sort((a, b) => b.p - a.p)
    .slice(0, anzahl)
    .map((e) => e.x)
  return mische(auswahl, zufall)
}

export function bewertung(quote: number): { text: string; emoji: string } {
  if (quote >= 0.9) return { emoji: '🏆', text: 'Klausurreif – richtig stark!' }
  if (quote >= 0.75) return { emoji: '💪', text: 'Gut! Schau dir die Fehler noch einmal an.' }
  if (quote >= 0.5) return { emoji: '📖', text: 'Halb geschafft – lies die markierten Stellen im Lernzettel nochmal.' }
  return { emoji: '🌱', text: 'Noch nicht sicher – Lernzettel nochmal durchgehen und dann neu versuchen.' }
}
