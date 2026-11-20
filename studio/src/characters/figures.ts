/**
 * Figuren-Verzeichnis ohne Grafik: Größen (für die Kamera) und Aussehen der Personen-Vorlagen.
 * Personen sind bewusst schlicht und freundlich – echte Menschen im Alltag, keine Klischees.
 * Kleidung erinnert nie an echte Firmen (keine Firmenfarben-Kombinationen, keine Logos).
 */
export interface PersonLook {
  skin: string
  hair: string
  hairStyle: 'kurz' | 'seitenscheitel' | 'bob' | 'zopf' | 'glatze-grau'
  top: string
  /** zweite Farbe (Kragen, Weste, Schürze) */
  accent: string
  trousers: string
  hat?: 'dienstmuetze' | 'kappe'
  hatColor?: string
  glasses?: boolean
  nameTag?: boolean
  /** Größenfaktor (1 = normal) */
  scale?: number
}

export interface FigureMeta {
  /** Höhe der Augen über dem Boden (stehend) */
  eyeHeight: number
  /** Gesamthöhe */
  height: number
  person?: PersonLook
}

export const OLE_ID = 'ole'

export const FIGURES: Record<string, FigureMeta> = {
  ole: { eyeHeight: 1.43, height: 1.95 },
  /** nur Stimme, keine Figur im Bild (Durchsagen, Telefon) */
  stimme: { eyeHeight: 0, height: 0 },
  beamter: {
    eyeHeight: 2.5, height: 2.95,
    person: { skin: '#f0c9a0', hair: '#24201c', hairStyle: 'seitenscheitel', top: '#33415e', accent: '#e9e4d8', trousers: '#2b3247', hat: 'dienstmuetze', hatColor: '#2b3550', glasses: true },
  },
  mitarbeiterin: {
    eyeHeight: 2.5, height: 2.95,
    person: { skin: '#f3cfab', hair: '#2a211b', hairStyle: 'bob', top: '#6f8fb5', accent: '#f4f1ea', trousers: '#2f3442', nameTag: true },
  },
  kassiererin: {
    eyeHeight: 2.5, height: 2.95,
    person: { skin: '#eec39b', hair: '#3a2a20', hairStyle: 'zopf', top: '#f1efe8', accent: '#4f9a8f', trousers: '#31343b', nameTag: true, hat: 'kappe', hatColor: '#4f9a8f' },
  },
  rezeptionistin: {
    eyeHeight: 2.5, height: 2.95,
    person: { skin: '#f2cca6', hair: '#1f1a17', hairStyle: 'bob', top: '#3b3f52', accent: '#c9a45c', trousers: '#2c2f3c', nameTag: true },
  },
  reisender: {
    eyeHeight: 2.5, height: 2.95,
    person: { skin: '#e8b98f', hair: '#2b2420', hairStyle: 'kurz', top: '#8c6a9e', accent: '#d8d0c4', trousers: '#3d4654' },
  },
  reisende: {
    eyeHeight: 2.5, height: 2.95,
    person: { skin: '#f4d2b0', hair: '#5a3a26', hairStyle: 'zopf', top: '#d97c5a', accent: '#f3e3c7', trousers: '#46505e' },
  },
  opa: {
    eyeHeight: 2.5, height: 2.95,
    person: { skin: '#e9c19a', hair: '#cfcac3', hairStyle: 'glatze-grau', top: '#7c8b6f', accent: '#ece6da', trousers: '#4a4740', glasses: true },
  },
  helfer: {
    eyeHeight: 2.5, height: 2.95,
    person: { skin: '#edc49d', hair: '#1e1b18', hairStyle: 'kurz', top: '#4d7aa8', accent: '#e9eef3', trousers: '#2f3846', hat: 'kappe', hatColor: '#2f3846', nameTag: true },
  },
}

export function figureExists(id: string): boolean {
  return id in FIGURES
}
