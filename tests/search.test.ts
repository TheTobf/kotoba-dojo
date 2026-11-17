/** Wortsuche mit den echten Wörtern der App. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Word } from '../src/lib/data'
import { searchWords } from '../src/lib/search'

const words = JSON.parse(readFileSync(join(import.meta.dirname, '../public/data/words.json'), 'utf8')) as Word[]
const first = (q: string) => searchWords(words, q)[0]?.surface

describe('Wortsuche', () => {
  it('findet über Deutsch, Kanji, Kana und Romaji dasselbe Wort', () => {
    expect(first('Wasser')).toBe('水')
    expect(first('水')).toBe('水')
    expect(first('みず')).toBe('水')
    expect(first('mizu')).toBe('水')
  })

  it('genauer Treffer schlägt Teiltreffer, Groß- und Kleinschreibung egal', () => {
    expect(first('JA')).toBe('はい')
    expect(searchWords(words, 'essen').slice(0, 3).map((w) => w.surface)).toContain('食べる')
  })

  it('leere Suche liefert nichts, Treffer sind begrenzt', () => {
    expect(searchWords(words, '  ')).toEqual([])
    expect(searchWords(words, 'e').length).toBeLessThanOrEqual(60)
  })
})
