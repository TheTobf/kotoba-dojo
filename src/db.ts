import Dexie, { type EntityTable } from 'dexie'
import {
  DEFAULT_PROFILE, DEFAULT_SETTINGS,
  type CardState, type Profile, type ReviewLogEntry, type Settings,
} from './types'

/** Nur Nutzerdaten liegen in IndexedDB – die Lerninhalte kommen als statisches JSON. */
export class KotobaDB extends Dexie {
  cards!: EntityTable<CardState, 'id'>
  reviewLog!: EntityTable<ReviewLogEntry, 'id'>
  profile!: EntityTable<Profile, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'kotoba-dojo') {
    super(name)
    this.version(1).stores({
      cards: 'id, kind, refId, due, state',
      reviewLog: '++id, cardId, kind, at',
      profile: 'id',
      settings: 'id',
    })
  }
}

export const db = new KotobaDB()

export async function getSettings(d: KotobaDB = db): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await d.settings.get('me')) }
}

export async function getProfile(d: KotobaDB = db): Promise<Profile> {
  return { ...DEFAULT_PROFILE, ...(await d.profile.get('me')) }
}

export interface Backup {
  app: 'kotoba-dojo'
  version: 1
  exportedAt: string
  cards: CardState[]
  reviewLog: ReviewLogEntry[]
  profile?: Profile
  settings?: Settings
}

export async function exportBackup(d: KotobaDB = db): Promise<Backup> {
  return {
    app: 'kotoba-dojo',
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: await d.cards.toArray(),
    reviewLog: await d.reviewLog.toArray(),
    profile: await d.profile.get('me'),
    settings: await d.settings.get('me'),
  }
}

/** Ersetzt alle Nutzerdaten durch das Backup. */
export async function importBackup(backup: Backup, d: KotobaDB = db): Promise<void> {
  if (backup.app !== 'kotoba-dojo') throw new Error('Keine Kotoba-Dojo-Sicherung')
  await d.transaction('rw', [d.cards, d.reviewLog, d.profile, d.settings], async () => {
    await Promise.all([d.cards.clear(), d.reviewLog.clear(), d.profile.clear(), d.settings.clear()])
    await d.cards.bulkPut(backup.cards)
    await d.reviewLog.bulkPut(backup.reviewLog)
    if (backup.profile) await d.profile.put(backup.profile)
    if (backup.settings) await d.settings.put(backup.settings)
  })
}
