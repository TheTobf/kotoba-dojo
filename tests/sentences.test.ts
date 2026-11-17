/** Satzbau: Sätze auswählen, mischen, prüfen und Partikel-Lücken bauen; Grammatik-Beispiele. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GRAMMAR } from '../src/content/grammar'
import type { Sentence, Word } from '../src/lib/data'
import { examplesFor, orderIsCorrect, orderingSentences, particleTask, scramble } from '../src/lib/sentences'

const sentences = JSON.parse(readFileSync(join(import.meta.dirname, '../public/data/sentences.json'), 'utf8')) as Sentence[]
const words = JSON.parse(readFileSync(join(import.meta.dirname, '../public/data/words.json'), 'utf8')) as Word[]
const everyone = new Set(words.map((w) => w.id))

describe('Sätze bauen', () => {
  it('nimmt nur Sätze gelernter Wörter mit 3–6 verschiedenen Teilen', () => {
    const pool = orderingSentences(sentences, everyone)
    expect(pool.length).toBeGreaterThan(500)
    for (const s of pool) {
      expect(s.chunks!.length).toBeGreaterThanOrEqual(3)
      expect(s.chunks!.join('')).toBe(s.ja)
    }
    expect(orderingSentences(sentences, new Set())).toEqual([])
  })

  it('mischt nie in die richtige Reihenfolge und erkennt die richtige Lösung', () => {
    const s = orderingSentences(sentences, everyone)[0]
    for (let i = 0; i < 20; i++) expect(scramble(s.chunks!).join('')).not.toBe(s.ja)
    expect(orderIsCorrect(s.chunks!, s)).toBe(true)
    expect(orderIsCorrect([...s.chunks!].reverse(), s)).toBe(false)
  })
})

describe('Partikeln', () => {
  it('Lücke ist eine Partikel, Antwort unter 4 Möglichkeiten, nie zwei austauschbare', () => {
    let tested = 0
    for (const s of sentences.slice(0, 400)) {
      const task = particleTask(s)
      if (!task) continue
      tested++
      expect(s.tokens[task.index].s).toBe(task.answer)
      expect(task.options).toHaveLength(4)
      expect(task.options).toContain(task.answer)
      if (task.answer === 'は') expect(task.options).not.toContain('が')
      if (task.answer === 'に') expect(task.options).not.toContain('へ')
    }
    expect(tested).toBeGreaterThan(50)
  })
})

describe('Grammatik', () => {
  it('15 Lektionen, jede findet Beispiele in den Sätzen der App', () => {
    expect(GRAMMAR).toHaveLength(15)
    const byId = new Map(words.map((w) => [w.id, w]))
    for (const lesson of GRAMMAR) expect(examplesFor(lesson.pattern, sentences, byId, everyone).length, lesson.id).toBeGreaterThan(0)
  })
})
