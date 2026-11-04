import { FAECHER, fachAktiv, fachById, findeFach } from './faecher'

/** uebung = Lernzettel zu einer Übung, klausur = Klausur-Zusammenfassung, extra = alles andere */
export type Typ = 'uebung' | 'klausur' | 'extra'

export interface Zettel {
  id: string
  fach: string
  typ: Typ
  titel: string
  uebung?: number
  teil?: number
  /** Stand (JJJJ-MM-TT) */
  datum?: string
  /** Ein Satz, worum es geht – erscheint in der Liste */
  kurz?: string
  /** Markdown ohne Kopfzeilen */
  inhalt: string
  /** nur auf diesem Gerät gespeichert (in der App eingefügt) */
  lokal: boolean
}

/** Kopfbereich zwischen --- und --- auslesen (einfache „schlüssel: wert“-Zeilen). */
export function leseKopf(text: string): { kopf: Record<string, string>; inhalt: string } {
  const t = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const m = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(t)
  if (!m) return { kopf: {}, inhalt: t }
  const kopf: Record<string, string> = {}
  for (const zeile of m[1].split('\n')) {
    const z = /^\s*([A-Za-zÄÖÜäöüß_-]+)\s*:\s*(.*?)\s*$/.exec(zeile)
    if (!z) continue
    let wert = z[2]
    if ((wert.startsWith('"') && wert.endsWith('"')) || (wert.startsWith("'") && wert.endsWith("'"))) wert = wert.slice(1, -1)
    kopf[z[1].toLowerCase().replace(/ü/g, 'ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe')] = wert
  }
  return { kopf, inhalt: t.slice(m[0].length) }
}

/** Entfernt einen ```markdown … ```-Rahmen, wie er beim Kopieren aus dem Chat entsteht. */
export function entferneCodeRahmen(text: string): string {
  const t = text.replace(/\r\n?/g, '\n').trim()
  const m = /^(`{3,}|~{3,})[ \t]*(?:markdown|md)?[ \t]*\n([\s\S]*?)\n\1[ \t]*$/i.exec(t)
  return m ? m[2] : t
}

export function leseTyp(wert: string | undefined): Typ | undefined {
  const w = (wert ?? '').trim().toLowerCase()
  if (['uebung', 'übung', 'ubung', 'tutorium', 'aufgabe'].includes(w)) return 'uebung'
  if (['klausur', 'zusammenfassung', 'klausur-zusammenfassung', 'pruefung', 'prüfung'].includes(w)) return 'klausur'
  if (['extra', 'thema', 'beispiel', 'vorlesung', 'sonstiges'].includes(w)) return 'extra'
  return undefined
}

function zahl(wert: string | undefined): number | undefined {
  if (wert === undefined || wert.trim() === '') return undefined
  const n = Number(wert.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/** Ersten #-Titel aus dem Text holen (falls im Kopf keiner steht). */
function titelAusText(inhalt: string): string | undefined {
  const m = /^#\s+(.+)$/m.exec(inhalt)
  return m?.[1].trim()
}

export interface Rohzettel {
  zettel: Zettel
  fehler: string[]
}

/**
 * Macht aus Text mit Kopfbereich einen Lernzettel.
 * `fach` aus dem Ordnernamen hat Vorrang vor `fach:` im Kopf.
 */
export function baueZettel(id: string, text: string, opt: { fach?: string; lokal?: boolean } = {}): Rohzettel {
  const fehler: string[] = []
  const { kopf, inhalt } = leseKopf(text)
  const fach = opt.fach ? fachById(opt.fach) : findeFach(kopf.fach ?? '')
  if (!fach) fehler.push(opt.fach ? `Unbekanntes Fach „${opt.fach}“` : `Fach fehlt oder unbekannt („${kopf.fach ?? ''}“)`)
  let typ = leseTyp(kopf.typ)
  if (!typ) {
    if (kopf.typ) fehler.push(`Unbekannter typ „${kopf.typ}“ (erlaubt: uebung, klausur, extra)`)
    else fehler.push('typ fehlt (uebung, klausur oder extra)')
    typ = kopf.uebung ? 'uebung' : 'extra'
  }
  const uebung = zahl(kopf.uebung)
  if (typ === 'uebung' && uebung === undefined) fehler.push('uebung: Nummer fehlt')
  const teil = zahl(kopf.teil)
  const titel = kopf.titel || titelAusText(inhalt) || ''
  if (!titel) fehler.push('titel fehlt')
  const datum = kopf.datum || kopf.stand || undefined
  if (datum && !/^\d{4}-\d{2}-\d{2}$/.test(datum)) fehler.push(`datum „${datum}“ nicht im Format JJJJ-MM-TT`)
  return {
    zettel: {
      id,
      fach: fach?.id ?? opt.fach ?? 'mathe',
      typ,
      titel: titel || id.split('/').pop() || id,
      uebung: typ === 'uebung' ? uebung : undefined,
      teil,
      datum,
      kurz: kopf.kurz || kopf.beschreibung || undefined,
      inhalt: inhalt.trim(),
      lokal: opt.lokal ?? false,
    },
    fehler,
  }
}

/** Pfad „…/inhalte/mathe/uebung-01-1-mengen.md“ → Fach + ID */
export function ausPfad(pfad: string): { fach: string; id: string } {
  const teile = pfad.replace(/\\/g, '/').split('/')
  const datei = teile.pop()!.replace(/\.md$/i, '')
  const fach = teile.pop() ?? ''
  return { fach, id: `${fach}/${datei}` }
}

const TYP_REIHENFOLGE: Record<Typ, number> = { klausur: 0, uebung: 1, extra: 2 }

export function vergleiche(a: Zettel, b: Zettel): number {
  return (
    TYP_REIHENFOLGE[a.typ] - TYP_REIHENFOLGE[b.typ] ||
    (a.uebung ?? 0) - (b.uebung ?? 0) ||
    (a.teil ?? 0) - (b.teil ?? 0) ||
    (a.datum ?? '').localeCompare(b.datum ?? '') ||
    a.titel.localeCompare(b.titel, 'de')
  )
}

export interface UebungsGruppe {
  nr: number
  zettel: Zettel[]
}

export interface FachInhalt {
  klausur: Zettel[]
  uebungen: UebungsGruppe[]
  extra: Zettel[]
}

export function gliedereFach(alle: Zettel[], fach: string): FachInhalt {
  const eigene = alle.filter((z) => z.fach === fach).sort(vergleiche)
  const uebungen: UebungsGruppe[] = []
  for (const z of eigene.filter((z) => z.typ === 'uebung')) {
    const nr = z.uebung ?? 0
    const g = uebungen.find((u) => u.nr === nr)
    if (g) g.zettel.push(z)
    else uebungen.push({ nr, zettel: [z] })
  }
  return {
    klausur: eigene.filter((z) => z.typ === 'klausur'),
    uebungen,
    extra: eigene.filter((z) => z.typ === 'extra'),
  }
}

/** Lernzettel eines Fachs in Lese-Reihenfolge (für Zurück/Weiter). */
export function reihenfolge(alle: Zettel[], fach: string): Zettel[] {
  const g = gliedereFach(alle, fach)
  return [...g.klausur, ...g.uebungen.flatMap((u) => u.zettel), ...g.extra]
}

/**
 * Was diese Woche durchgearbeitet werden soll:
 * Gibt es schon Klausur-Lernzettel, sind es nur diese – sonst alle Übungs-Lernzettel.
 */
export function wochenListe(alle: Zettel[], fach: string, heute: Date): Zettel[] {
  const f = fachById(fach)
  if (!f || !fachAktiv(f, heute)) return []
  const g = gliedereFach(alle, fach)
  return g.klausur.length ? g.klausur : g.uebungen.flatMap((u) => u.zettel)
}

export function wochenListeAlle(alle: Zettel[], heute: Date): Zettel[] {
  return FAECHER.flatMap((f) => wochenListe(alle, f.id, heute))
}

/** „Übung 3 · Teil 2“, „Klausur-Lernzettel“, … */
export function bezeichnung(z: Zettel): string {
  const teil = z.teil ? ` · Teil ${z.teil}` : ''
  if (z.typ === 'uebung') return `Übung ${z.uebung ?? '?'}${teil}`
  if (z.typ === 'klausur') return `Klausur-Lernzettel${teil}`
  return `Extra${teil}`
}

/** Markdown/Formeln grob entfernen, damit die Suche und Vorschau lesbar sind. */
export function klartext(md: string): string {
  return md
    .replace(/^>\s?\[![^\]]+\]\s*/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`|$\\]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface Treffer {
  zettel: Zettel
  ausschnitt?: string
  imTitel: boolean
}

export function suche(alle: Zettel[], frage: string): Treffer[] {
  const woerter = frage.toLowerCase().split(/\s+/).filter(Boolean)
  if (!woerter.length) return []
  const treffer: Treffer[] = []
  for (const z of alle) {
    const kopf = `${z.titel} ${z.kurz ?? ''} ${bezeichnung(z)} ${fachById(z.fach)?.name ?? ''}`.toLowerCase()
    const text = klartext(z.inhalt)
    const klein = text.toLowerCase()
    if (!woerter.every((w) => kopf.includes(w) || klein.includes(w))) continue
    const imTitel = woerter.every((w) => kopf.includes(w))
    let ausschnitt: string | undefined
    const pos = woerter.map((w) => klein.indexOf(w)).find((p) => p >= 0)
    if (pos !== undefined) {
      const von = Math.max(0, pos - 40)
      ausschnitt = (von > 0 ? '…' : '') + text.slice(von, pos + 80).trim() + (pos + 80 < text.length ? '…' : '')
    }
    treffer.push({ zettel: z, ausschnitt, imTitel })
  }
  return treffer.sort((a, b) => Number(b.imTitel) - Number(a.imTitel) || vergleiche(a.zettel, b.zettel))
}

/** Lernzettel als Markdown-Datei mit Kopfbereich (zum Teilen/Sichern). */
export function alsMarkdown(z: Zettel): string {
  const zeilen = ['---', `titel: ${z.titel}`, `fach: ${z.fach}`, `typ: ${z.typ}`]
  if (z.uebung !== undefined) zeilen.push(`uebung: ${z.uebung}`)
  if (z.teil !== undefined) zeilen.push(`teil: ${z.teil}`)
  if (z.datum) zeilen.push(`datum: ${z.datum}`)
  if (z.kurz) zeilen.push(`kurz: ${z.kurz}`)
  zeilen.push('---', '', z.inhalt, '')
  return zeilen.join('\n')
}

/** Vorschlag für den Dateinamen im Repo: uebung-03-2-kettenregel.md */
export function dateiname(z: Zettel): string {
  const slug = z.titel
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const teil = z.teil ? `-${z.teil}` : ''
  if (z.typ === 'uebung') return `uebung-${String(z.uebung ?? 0).padStart(2, '0')}${teil}-${slug}.md`
  if (z.typ === 'klausur') return `klausur${teil}-${slug}.md`
  return `extra${teil}-${slug}.md`
}
