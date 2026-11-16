/** Lernlogik auf dem Gerät: Sitzung zusammenstellen und Karten bewerten (mit einer Test-IndexedDB). */
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { EPISODES } from '../src/content/story'
import type { LearnData, Word } from '../src/lib/data'
import { KotobaDB } from '../src/lib/db'
import { buildSession, cardId, episodeProgress, formatInterval, itemsForEpisode, rate, Rating, startOfDay } from '../src/lib/srs'

const word = (n: number): Word => ({
  id: `w${n}`, rank: n, lesson: 1, surface: `語${n}`, reading: `ご${n}`, romaji: `go${n}`, pos: 'Nomen', meaningsDe: [`Wort ${n}`], sentenceIds: [`s${n}`],
})
const words = [1, 2, 3, 4, 5].map(word)
const data: LearnData = {
  words,
  wordsById: new Map(words.map((w) => [w.id, w])),
  sentences: new Map(words.map((w) => [`s${w.rank}`, { id: `s${w.rank}`, wordId: w.id, tokens: [], ja: 'これは例です。', kana: 'これはれいです。', romaji: 'Kore wa rei desu.', de: 'Das ist ein Beispiel.', grammar: 'Notiz', source: 'claude' as const }])),
}
const NOW = new Date(2026, 10, 16, 12, 0, 0).getTime()
const DAY = 86_400_000

let d: KotobaDB
beforeEach(async () => {
  d = new KotobaDB(`test-${Math.random()}`)
})

describe('Lernsitzung', () => {
  it('neue Wörter kommen in Lernreihenfolge und nur bis zum Tageslimit', () => {
    const session = buildSession({ cards: [], scope: { type: 'alles' }, newPerDay: 3, data, mistakes: [], now: NOW })
    expect(session.map((e) => e.item.refId)).toEqual(['w1', 'w2', 'w3'])
    expect(session[0].item).toMatchObject({ ja: '語1', de: 'Wort 1', example: { de: 'Das ist ein Beispiel.' }, note: 'Notiz' })
  })

  it('heute schon eingeführte Wörter zählen gegen das Tageslimit', async () => {
    const [first] = buildSession({ cards: [], scope: { type: 'alles' }, newPerDay: 2, data, mistakes: [], now: NOW })
    await rate(first.item, undefined, Rating.Good, d, NOW)
    const cards = await d.cards.toArray()
    const next = buildSession({ cards, scope: { type: 'alles' }, newPerDay: 2, data, mistakes: [], now: NOW + 1000 })
    expect(next.map((e) => e.item.refId)).toEqual(['w2'])
  })

  it('fällige Wiederholungen kommen vor neuen Karten', async () => {
    const [first] = buildSession({ cards: [], scope: { type: 'alles' }, newPerDay: 1, data, mistakes: [], now: NOW })
    const state = await rate(first.item, undefined, Rating.Good, d, NOW)
    const later = state.due + DAY
    const session = buildSession({ cards: await d.cards.toArray(), scope: { type: 'alles' }, newPerDay: 1, data, mistakes: [], now: later })
    expect(session.map((e) => e.item.refId)).toEqual(['w1', 'w2'])
    expect(session[0].state?.id).toBe(cardId('wort', 'w1'))
  })

  it('eine Story-Lektion enthält genau die Sätze der Folge', () => {
    const episode = EPISODES[0]
    const session = buildSession({ cards: [], scope: { type: 'folge', episodeId: episode.id }, newPerDay: 0, data, mistakes: [], now: NOW })
    expect(session).toHaveLength(episode.sentences.length)
    expect(session.every((e) => e.item.kind === 'satz' && e.item.label === `Folge ${episode.number}`)).toBe(true)
  })

  it('Fehlerkarten aus Gesprächen werden als neue Karten eingereiht', () => {
    const mistakes = [{ id: 'm1', ja: 'コーヒーが好きです。', kana: 'コーヒーがすきです。', romaji: 'Kōhī ga suki desu.', de: 'Ich mag Kaffee.', note: 'が statt を', createdAt: 1 }]
    const session = buildSession({ cards: [], scope: { type: 'fehler' }, newPerDay: 5, data, mistakes, now: NOW })
    expect(session.map((e) => e.item.cardId)).toEqual(['fehler:m1'])
  })
})

describe('Bewerten', () => {
  it('speichert Zustand und Protokoll; „Gut“ schiebt die Karte weiter weg als „Nochmal“', async () => {
    const [a, b] = itemsForEpisode(EPISODES[0])
    const good = await rate(a, undefined, Rating.Good, d, NOW)
    const again = await rate(b, undefined, Rating.Again, d, NOW)
    expect(good.due).toBeGreaterThan(again.due)
    expect(await d.cards.count()).toBe(2)
    expect(await d.reviewLog.count()).toBe(2)
    expect(good.introducedAt).toBe(NOW)
  })

  it('wiederholtes „Gut“ vergrößert die Abstände', async () => {
    const [item] = itemsForEpisode(EPISODES[0])
    let state = await rate(item, undefined, Rating.Good, d, NOW)
    const intervals: number[] = []
    let now = NOW
    for (let i = 0; i < 4; i++) {
      now = state.due + 1000
      state = await rate(item, state, Rating.Good, d, now)
      intervals.push(state.due - now)
    }
    expect(intervals.at(-1)!).toBeGreaterThan(intervals[0])
    expect(state.introducedAt).toBe(NOW)
  })

  it('Fortschritt einer Folge zählt gelernte Sätze', async () => {
    const episode = EPISODES[0]
    const items = itemsForEpisode(episode)
    await rate(items[0], undefined, Rating.Good, d, NOW)
    await rate(items[1], undefined, Rating.Good, d, NOW)
    expect(episodeProgress(episode, await d.cards.toArray())).toBeCloseTo(2 / episode.sentences.length)
  })
})

describe('Hilfsfunktionen', () => {
  it('der Lerntag beginnt um 4 Uhr', () => {
    const twoAm = new Date(2026, 10, 16, 2, 0).getTime()
    expect(new Date(startOfDay(twoAm)).getDate()).toBe(15)
    expect(new Date(startOfDay(NOW)).getHours()).toBe(4)
  })

  it('Abstände werden lesbar formatiert', () => {
    expect(formatInterval(60_000)).toBe('1 Min.')
    expect(formatInterval(3 * 3_600_000)).toBe('3 Std.')
    expect(formatInterval(DAY)).toBe('1 Tag')
    expect(formatInterval(12 * DAY)).toBe('12 Tage')
    expect(formatInterval(400 * DAY)).toBe('1,1 J.')
  })
})
