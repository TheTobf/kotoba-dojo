/** Sprachaufnahmen: Fingerabdruck der Texte und die Liste der Texte, zu denen Aufnahmen erzeugt werden. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectTexts } from '../scripts/audio-texts'
import { audioKey, audioPath, type AudioIndex } from '../shared/audio'
import { EPISODES } from '../src/content/story'

describe('Fingerabdruck', () => {
  it('ist für denselben Text immer gleich, kurz und dateinamentauglich', async () => {
    const key = await audioKey('いくらですか。')
    expect(key).toMatch(/^[0-9a-f]{16}$/)
    expect(await audioKey('  いくらですか。 ')).toBe(key)
    expect(await audioKey('いくらですか')).not.toBe(key)
    expect(audioPath(key)).toBe(`/audio/${key}.mp3`)
  })
})

describe('Texte für Aufnahmen', () => {
  it('Stufe 1 enthält alle Story-Sätze, keine Dubletten und nichts ohne Laute', () => {
    const texts = collectTexts()
    for (const episode of EPISODES) for (const sentence of episode.sentences) expect(texts).toContain(sentence.ja)
    expect(new Set(texts).size).toBe(texts.length)
    expect(texts).not.toContain('……')
    expect(texts.length).toBeLessThan(200)
  })

  it('mit Grundwortschatz kommen Wörter (als Lesung) und Beispielsätze dazu', () => {
    const all = collectTexts({ all: true })
    expect(all.length).toBeGreaterThan(3000)
    expect(all).toContain('はい')
  })
})

describe('Liste der Aufnahmen', () => {
  it('nennt nur Dateien, die es gibt – und eine Namensnennung, sobald es Aufnahmen gibt', () => {
    const dir = join(import.meta.dirname, '../public/audio')
    const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as AudioIndex
    for (const key of index.keys) expect(() => readFileSync(join(dir, `${key}.mp3`))).not.toThrow()
    if (index.keys.length > 0) expect(index.credit).not.toBe('')
  })
})
