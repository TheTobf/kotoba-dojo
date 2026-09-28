import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Kanji, Sentence, Word } from '../src/types'

const load = <T>(f: string): T => JSON.parse(readFileSync(join(import.meta.dirname, '../public/data', f), 'utf8'))
const words = load<Word[]>('words.json')
const sentences = load<Sentence[]>('sentences.json')
const kanji = load<Kanji[]>('kanji.json')
const byId = new Map(sentences.map((s) => [s.id, s]))

describe('Lerndaten', () => {
  it('Wörter sind in Lernreihenfolge und in Lektionen à 6 gruppiert', () => {
    words.forEach((w, i) => {
      expect(w.rank).toBe(i + 1)
      expect(w.lesson).toBe(Math.floor(i / 6) + 1)
    })
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length)
  })

  it('jedes Wort hat Bedeutung und einen Satz mit markiertem Zielwort', () => {
    for (const w of words) {
      expect(w.meaningsDe.length, w.surface).toBeGreaterThan(0)
      const s = byId.get(w.sentenceIds[0])
      expect(s, w.surface).toBeDefined()
      expect(s!.tokens.some((t) => t.target), `${w.surface}: ${s!.ja}`).toBe(true)
    }
  })

  it('Sätze sind vollständig und in sich stimmig', () => {
    for (const s of sentences) {
      expect(s.tokens.map((t) => t.s).join(''), s.ja).toBe(s.ja)
      expect(s.chunks.join(''), s.ja).toBe(s.ja)
      expect(s.de, s.ja).not.toBe('')
      expect(s.grammar, s.ja).not.toBe('')
      expect(s.romaji, s.ja).toMatch(/^"?[A-Z]/)
      for (const t of s.tokens) if (t.f) expect(t.f.map((f) => f.s).join(''), s.ja).toBe(t.s)
    }
  })

  it('alle Kanji haben deutsche Bedeutungen und Strichdaten', () => {
    for (const k of kanji) {
      expect(k.meaningsDe.length, k.char).toBeGreaterThan(0)
      expect(k.svg, k.char).toBeDefined()
    }
  })
})

describe('Ziele', () => {
  it('alle Schlüsselwörter der Japan-Situationen gibt es im Kurs', async () => {
    const { SITUATIONEN } = await import('../src/content/ziele')
    const surfaces = new Set(words.map((w) => w.surface))
    for (const s of SITUATIONEN) for (const x of s.words) expect(surfaces.has(x), `${s.id}: ${x}`).toBe(true)
  })
})
