/** Preise, Missions-Prüfung und Warteliste. */
import { afterAll, describe, expect, it } from 'vitest'
import { checkAnswer, normalizeAnswer, toTeaser } from '../shared/mission'
import { formatPrice, PLANS, yearlySavingsPercent } from '../shared/plans'
import { PRO_MISSIONS } from '../worker/content/missions'
import { disposeDatabase, json, TestApp } from './helpers'

afterAll(disposeDatabase)

describe('Preise', () => {
  it('stehen zentral in shared/plans.ts und werden als Endpreise formatiert', () => {
    expect(formatPrice(PLANS.monthly.priceCents)).toBe('4,99 €')
    expect(formatPrice(PLANS.yearly.priceCents)).toBe('39 €')
    expect(yearlySavingsPercent()).toBe(34)
  })
})

describe('Missionen: Antworten prüfen', () => {
  const step = PRO_MISSIONS[0].steps[1] // „Frag, wo das Bad ist.“

  it('akzeptiert Kanji, Kana und Romaji – unabhängig von Satzzeichen, Leerzeichen und Großschreibung', () => {
    for (const input of ['お風呂はどこですか。', 'おふろはどこですか', 'ofuro wa doko desu ka', 'Ofuro wa doko desu ka?', '  おふろ は どこ ですか？ ']) {
      expect(checkAnswer(input, step).correct, input).toBe(true)
    }
  })

  it('akzeptiert jede hinterlegte Variante und nennt die getroffene als Muster', () => {
    const result = checkAnswer('onsen wa doko desu ka', step)
    expect(result.correct).toBe(true)
    expect(result.model.ja).toBe('温泉はどこですか。')
  })

  it('lehnt falsche und leere Antworten ab und zeigt die Musterlösung', () => {
    for (const input of ['トイレはどこですか', 'ofuro', '', '   ', '。']) {
      const result = checkAnswer(input, step)
      expect(result.correct, input).toBe(false)
      expect(result.model).toBe(step.accepted[0])
    }
  })

  it('ist bei Vokallängen großzügig (kōhī = koohii = コーヒー)', () => {
    expect(normalizeAnswer('kōhī')).toBe(normalizeAnswer('koohii'))
    expect(normalizeAnswer('コーヒー')).toBe(normalizeAnswer('ko-hi-'))
    expect(normalizeAnswer('arigatou')).toBe(normalizeAnswer('ありがとう'))
  })

  it('die Vorschau einer Mission enthält keine Lösungen', () => {
    expect(JSON.stringify(toTeaser(PRO_MISSIONS[0]))).not.toContain('accepted')
  })

  it('jede Musterlösung der Pro-Missionen besteht ihre eigene Prüfung', () => {
    for (const mission of PRO_MISSIONS) {
      for (const s of mission.steps) {
        for (const option of s.accepted) {
          for (const form of [option.ja, option.kana, option.romaji]) expect(checkAnswer(form, s).correct, form).toBe(true)
        }
      }
    }
  })
})

describe('Warteliste', () => {
  it('Double-Opt-in: Adresse zählt erst nach Bestätigung über den Link aus der Mail', async () => {
    const t = await TestApp.create()
    expect((await t.post('/api/waitlist', { email: 'neu@example.com' })).status).toBe(400) // ohne Einwilligung
    expect(await json(await t.post('/api/waitlist', { email: 'Neu@example.com', consent: true }))).toEqual({ ok: true })

    const row = () => t.db.prepare('SELECT confirmed_at FROM waitlist WHERE email = ?').bind('neu@example.com').first<{ confirmed_at: number | null }>()
    expect((await row())!.confirmed_at).toBeNull()

    const token = t.mails.at(-1)!.text.match(/token=([0-9a-f]+)/)![1]
    expect((await t.post('/api/waitlist/confirm', { token: 'falsch' })).status).toBe(400)
    expect((await t.post('/api/waitlist/confirm', { token })).status).toBe(200)
    expect((await row())!.confirmed_at).toBe(t.now)
  })
})
