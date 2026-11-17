/**
 * Lernfortschritt – liegt ausschließlich auf diesem Gerät (IndexedDB), nie auf dem Server.
 * Das gilt für Gratis und Pro gleichermaßen. Einzige Ausnahme sind die Fehler-Karteikarten aus KI-Gesprächen:
 * Die entstehen auf dem Server und werden von dort abgeholt (siehe srs.ts → syncMistakes).
 */
import Dexie, { type EntityTable } from 'dexie'
import type { MistakeCard } from '../../shared/api'

/**
 * Welche Übung eine Karte trainiert – jede hat ihren eigenen Wiederholungs-Zustand.
 *   wort    Vokabel aus dem Grundwortschatz (Karteikarte)
 *   satz    Satz aus einer Story-Folge (Karteikarte)
 *   fehler  Korrektur aus einem KI-Gespräch (Karteikarte)
 *   zeichen Kana oder Kanji im Schrift-Bereich
 */
export type CardKind = 'wort' | 'satz' | 'fehler' | 'zeichen'

/** Karten, die in der normalen Lernsitzung (Karteikarten) vorkommen. */
export const FLASHCARD_KINDS: CardKind[] = ['wort', 'satz', 'fehler']

/** Zustand einer Karte im Wiederholungs-System (FSRS). */
export interface CardState {
  /** `${kind}:${refId}` */
  id: string
  kind: CardKind
  refId: string
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: number
  /** Zeitpunkt der ersten Bewertung (für das Tageslimit neuer Karten). */
  introducedAt: number
}

export interface ReviewLogEntry {
  id?: number
  cardId: string
  rating: number
  at: number
}

export interface MissionProgress {
  missionId: string
  completedAt: number
}

export class KotobaDB extends Dexie {
  cards!: EntityTable<CardState, 'id'>
  reviewLog!: EntityTable<ReviewLogEntry, 'id'>
  missions!: EntityTable<MissionProgress, 'missionId'>
  mistakes!: EntityTable<MistakeCard, 'id'>

  constructor(name = 'kotoba-dojo-v2') {
    super(name)
    this.version(1).stores({
      cards: 'id, kind, due',
      reviewLog: '++id, cardId, at',
      missions: 'missionId',
      mistakes: 'id, createdAt',
    })
  }
}

export const db = new KotobaDB()

/** Sicherung des gesamten Lernfortschritts als Datei (für Gerätewechsel). */
export async function exportBackup(d: KotobaDB = db) {
  return {
    app: 'kotoba-dojo',
    version: 2,
    exportedAt: new Date().toISOString(),
    cards: await d.cards.toArray(),
    reviewLog: await d.reviewLog.toArray(),
    missions: await d.missions.toArray(),
    mistakes: await d.mistakes.toArray(),
  }
}
