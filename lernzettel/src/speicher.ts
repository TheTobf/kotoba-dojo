import { useSyncExternalStore } from 'react'
import { FAECHER } from './faecher'
import type { Zettel } from './zettel'
import { leseTyp } from './zettel'

export type Design = 'auto' | 'hell' | 'dunkel'

/** Alles, was nur auf diesem Gerät gespeichert wird. */
export interface Zustand {
  version: 1
  /** Lernzettel-ID → Wochen, in denen er durchgearbeitet wurde („2026-W45“) */
  gelesen: Record<string, string[]>
  /** „2026-W45|mathe/uebung-01“ → abgehakte Checklisten-Punkte (gilt nur diese Woche) */
  haken: Record<string, number[]>
  /** Fach-ID → Klausurtermin JJJJ-MM-TT */
  klausur: Record<string, string>
  /** In der App eingefügte Lernzettel */
  eigene: Zettel[]
  /** Schriftgröße der Lernzettel (1 = normal) */
  schrift: number
  design: Design
  zuletzt?: { id: string; zeit: number }
}

const KEY = 'lernzettel-v1'

export function leer(): Zustand {
  return { version: 1, gelesen: {}, haken: {}, klausur: {}, eigene: [], schrift: 1, design: 'auto' }
}

function istObjekt(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function istZettel(x: unknown): x is Zettel {
  return (
    istObjekt(x) &&
    typeof x.id === 'string' &&
    typeof x.fach === 'string' &&
    typeof x.titel === 'string' &&
    typeof x.inhalt === 'string' &&
    leseTyp(String(x.typ)) !== undefined
  )
}

/** Unbekanntes JSON vorsichtig in einen gültigen Zustand übernehmen. */
export function bereinige(roh: unknown): Zustand {
  const z = leer()
  if (!istObjekt(roh)) return z
  if (istObjekt(roh.gelesen)) {
    for (const [id, wochen] of Object.entries(roh.gelesen)) {
      if (Array.isArray(wochen)) z.gelesen[id] = [...new Set(wochen.filter((w): w is string => typeof w === 'string'))].sort()
    }
  }
  if (istObjekt(roh.haken)) {
    for (const [k, liste] of Object.entries(roh.haken)) {
      if (Array.isArray(liste)) z.haken[k] = liste.filter((n): n is number => Number.isInteger(n))
    }
  }
  if (istObjekt(roh.klausur)) {
    for (const [fach, datum] of Object.entries(roh.klausur)) {
      if (typeof datum === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(datum) && FAECHER.some((f) => f.id === fach)) z.klausur[fach] = datum
    }
  }
  if (Array.isArray(roh.eigene)) {
    z.eigene = roh.eigene.filter(istZettel).map((e) => ({ ...e, typ: leseTyp(e.typ)!, lokal: true }))
  }
  if (typeof roh.schrift === 'number' && roh.schrift >= 0.8 && roh.schrift <= 1.6) z.schrift = roh.schrift
  if (roh.design === 'hell' || roh.design === 'dunkel' || roh.design === 'auto') z.design = roh.design
  if (istObjekt(roh.zuletzt) && typeof roh.zuletzt.id === 'string' && typeof roh.zuletzt.zeit === 'number') {
    z.zuletzt = { id: roh.zuletzt.id, zeit: roh.zuletzt.zeit }
  }
  return z
}

/** Haken älterer Wochen wegwerfen – die Checklisten fangen jede Woche neu an. */
export function aufraeumen(z: Zustand, woche: string): Zustand {
  const haken: Record<string, number[]> = {}
  for (const [k, v] of Object.entries(z.haken)) if (k.startsWith(`${woche}|`) && v.length) haken[k] = v
  return { ...z, haken }
}

function lesen(): Zustand {
  try {
    const text = localStorage.getItem(KEY)
    return text ? bereinige(JSON.parse(text)) : leer()
  } catch {
    return leer()
  }
}

let zustand: Zustand | null = null
const hoerer = new Set<() => void>()
let speicherFehler = false

function aktuell(): Zustand {
  zustand ??= lesen()
  return zustand
}

export function aendere(fn: (z: Zustand) => Zustand): void {
  zustand = fn(aktuell())
  try {
    localStorage.setItem(KEY, JSON.stringify(zustand))
    speicherFehler = false
  } catch {
    speicherFehler = true
  }
  hoerer.forEach((h) => h())
}

export function hatSpeicherFehler(): boolean {
  return speicherFehler
}

function abonniere(h: () => void): () => void {
  hoerer.add(h)
  const beiFremdAenderung = (e: StorageEvent) => {
    if (e.key === KEY) {
      zustand = lesen()
      h()
    }
  }
  window.addEventListener('storage', beiFremdAenderung)
  return () => {
    hoerer.delete(h)
    window.removeEventListener('storage', beiFremdAenderung)
  }
}

export function useZustand(): Zustand {
  return useSyncExternalStore(abonniere, aktuell, aktuell)
}

export function nurFuerTests(z: Zustand | null): void {
  zustand = z
}

// ---------- Aktionen ----------

export function istGelesen(z: Zustand, id: string, woche: string): boolean {
  return z.gelesen[id]?.includes(woche) ?? false
}

export function zuletztGelesen(z: Zustand, id: string): string | undefined {
  return z.gelesen[id]?.at(-1)
}

export function setzeGelesen(id: string, woche: string, an: boolean): void {
  aendere((z) => {
    const alt = z.gelesen[id] ?? []
    const neu = an ? [...new Set([...alt, woche])].sort() : alt.filter((w) => w !== woche)
    const gelesen = { ...z.gelesen }
    if (neu.length) gelesen[id] = neu
    else delete gelesen[id]
    return { ...z, gelesen }
  })
}

export function hakenKey(woche: string, id: string): string {
  return `${woche}|${id}`
}

export function setzeHaken(id: string, woche: string, nr: number, an: boolean): void {
  aendere((z) => {
    const sauber = aufraeumen(z, woche)
    const k = hakenKey(woche, id)
    const alt = sauber.haken[k] ?? []
    const neu = an ? [...new Set([...alt, nr])].sort((a, b) => a - b) : alt.filter((n) => n !== nr)
    return { ...sauber, haken: { ...sauber.haken, [k]: neu } }
  })
}

export function setzeKlausur(fach: string, datum: string): void {
  aendere((z) => {
    const klausur = { ...z.klausur }
    if (datum) klausur[fach] = datum
    else delete klausur[fach]
    return { ...z, klausur }
  })
}

export function speichereEigenen(neu: Zettel): void {
  aendere((z) => ({ ...z, eigene: [...z.eigene.filter((e) => e.id !== neu.id), { ...neu, lokal: true }] }))
}

export function loescheEigenen(id: string): void {
  aendere((z) => {
    const gelesen = { ...z.gelesen }
    delete gelesen[id]
    return { ...z, eigene: z.eigene.filter((e) => e.id !== id), gelesen }
  })
}

export function merkeZuletzt(id: string): void {
  aendere((z) => ({ ...z, zuletzt: { id, zeit: Date.now() } }))
}

export function setzeSchrift(schrift: number): void {
  aendere((z) => ({ ...z, schrift: Math.min(1.6, Math.max(0.8, Math.round(schrift * 100) / 100)) }))
}

export function setzeDesign(design: Design): void {
  aendere((z) => ({ ...z, design }))
}

// ---------- Sicherung ----------

export function sicherungAlsText(z: Zustand): string {
  return JSON.stringify({ app: 'lernzettel', erstellt: new Date().toISOString(), ...z }, null, 2)
}

/** Sicherung mit dem aktuellen Stand zusammenführen (nichts geht verloren). */
export function fuehreZusammen(z: Zustand, sicherung: Zustand): Zustand {
  const gelesen = { ...z.gelesen }
  for (const [id, wochen] of Object.entries(sicherung.gelesen)) {
    gelesen[id] = [...new Set([...(gelesen[id] ?? []), ...wochen])].sort()
  }
  const eigene = [...z.eigene]
  for (const e of sicherung.eigene) if (!eigene.some((x) => x.id === e.id)) eigene.push(e)
  return { ...z, gelesen, eigene, klausur: { ...z.klausur, ...sicherung.klausur } }
}

export function ladeSicherung(text: string): { eigene: number; gelesen: number } {
  let roh: unknown
  try {
    roh = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist keine gültige Sicherung.')
  }
  if (!istObjekt(roh) || roh.app !== 'lernzettel') throw new Error('Das ist keine Lernzettel-Sicherung.')
  const s = bereinige(roh)
  aendere((z) => fuehreZusammen(z, s))
  return { eigene: s.eigene.length, gelesen: Object.keys(s.gelesen).length }
}
