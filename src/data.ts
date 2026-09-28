import type { Kana, Kanji, Sentence, Word } from './types'

const url = (p: string) => `${import.meta.env.BASE_URL}${p}`

let cache: Promise<LearnData> | undefined

export interface LearnData {
  words: Word[]
  sentences: Map<string, Sentence>
  kanji: Map<string, Kanji>
}

/** Lädt die statischen Lerndaten einmalig (vom Service Worker offline gecacht). */
export function loadData(): Promise<LearnData> {
  cache ??= Promise.all([
    fetch(url('data/words.json')).then((r) => r.json() as Promise<Word[]>),
    fetch(url('data/sentences.json')).then((r) => r.json() as Promise<Sentence[]>),
    fetch(url('data/kanji.json')).then((r) => r.json() as Promise<Kanji[]>),
  ]).then(([words, sentences, kanji]) => ({
    words,
    sentences: new Map(sentences.map((s) => [s.id, s])),
    kanji: new Map(kanji.map((k) => [k.char, k])),
  }))
  return cache
}

export const assetUrl = url

let kanaCache: Promise<Kana[]> | undefined
export function loadKana(): Promise<Kana[]> {
  kanaCache ??= fetch(url('data/kana.json')).then((r) => r.json() as Promise<Kana[]>)
  return kanaCache
}

const strokeCache = new Map<string, Promise<string[]>>()
/** SVG-Pfade der Striche (109×109-Raster von KanjiVG), in Schreibreihenfolge. */
export function loadStrokes(file: string): Promise<string[]> {
  if (!strokeCache.has(file)) strokeCache.set(file, fetch(url(`data/${file}`)).then((r) => r.json() as Promise<string[]>))
  return strokeCache.get(file)!
}
