import { describe, expect, it } from 'vitest'
import { KotobaDB, exportBackup, getSettings, importBackup } from './db'

describe('Backup', () => {
  it('überträgt Karten und Profil von Gerät A nach Gerät B', async () => {
    const a = new KotobaDB('test-a')
    await a.cards.put({
      id: 'vokabel:w0001', kind: 'vokabel', refId: 'w0001', due: 123, stability: 1, difficulty: 5,
      elapsed_days: 0, scheduled_days: 1, learning_steps: 0, reps: 1, lapses: 0, state: 1,
    })
    await a.profile.put({ id: 'me', xp: 42, streak: 3, bestStreak: 3, achievements: [], unlockedThemes: [], activeDays: {} })
    const json = JSON.parse(JSON.stringify(await exportBackup(a)))

    const b = new KotobaDB('test-b')
    await importBackup(json, b)
    expect(await b.cards.count()).toBe(1)
    expect((await b.profile.get('me'))?.xp).toBe(42)
  })

  it('lehnt fremde Dateien ab', async () => {
    await expect(importBackup({ app: 'anki' } as never, new KotobaDB('test-c'))).rejects.toThrow()
  })

  it('liefert Standard-Einstellungen (6 neue Karten/Tag = 1 Lektion)', async () => {
    expect((await getSettings(new KotobaDB('test-d'))).newPerDay).toBe(6)
  })
})
