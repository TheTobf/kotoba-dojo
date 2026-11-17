/** Lerndaten (Wörter und Beispielsätze) – statische JSON-Dateien, die der Service Worker offline bereithält. */

/** Furigana-Abschnitt: `r` nur bei Kanji, z. B. 食べる → [{s:'食',r:'た'},{s:'べる'}] */
export interface Furi {
  s: string
  r?: string
}

/** Rolle eines Satzteils (für die Markierung beim Satzbau). */
export type Role = 'subjekt' | 'objekt' | 'verb' | 'partikel' | 'sonst'

export interface Token {
  s: string
  f?: Furi[]
  /** Das Wort, um das es auf der Karte geht. */
  target?: boolean
  role?: Role
}

export interface Word {
  id: string
  /** Position in der Lernreihenfolge. */
  rank: number
  lesson: number
  surface: string
  reading: string
  romaji: string
  pos: string
  meaningsDe: string[]
  /** Enthaltene Kanji (verweisen auf Kanji.char). */
  kanji: string[]
  sentenceIds: string[]
}

export interface Kanji {
  char: string
  /** Häufigkeitsrang. */
  rank: number
  strokes: number
  onyomi: string[]
  kunyomi: string[]
  meaningsDe: string[]
  wordIds: string[]
  /** Datei mit den Strichen (KanjiVG), relativ zu /data/. */
  svg?: string
}

export type WritingStage = 'hiragana' | 'hiragana-dakuten' | 'katakana' | 'katakana-dakuten' | 'kanji'

export interface Kana {
  char: string
  romaji: string
  script: 'hiragana' | 'katakana'
  stage: Exclude<WritingStage, 'kanji'>
  row: number
  svg?: string
}

export interface Sentence {
  id: string
  wordId: string
  tokens: Token[]
  ja: string
  kana: string
  romaji: string
  de: string
  /** Kurze Grammatik-Notiz auf Deutsch. */
  grammar: string
  /** Satzteile für „Sätze bauen“ (aneinandergereiht ergeben sie den Satz). */
  chunks?: string[]
  source: 'tatoeba' | 'claude'
  tatoebaId?: number
}

export interface LearnData {
  words: Word[]
  wordsById: Map<string, Word>
  sentences: Map<string, Sentence>
}

let cache: Promise<LearnData> | undefined

export function loadData(): Promise<LearnData> {
  cache ??= Promise.all([
    fetch('/data/words.json').then((r) => r.json() as Promise<Word[]>),
    fetch('/data/sentences.json').then((r) => r.json() as Promise<Sentence[]>),
  ]).then(([words, sentences]) => ({
    words: [...words].sort((a, b) => a.rank - b.rank),
    wordsById: new Map(words.map((w) => [w.id, w])),
    sentences: new Map(sentences.map((s) => [s.id, s])),
  }))
  // Bei einem Ladefehler beim nächsten Versuch neu laden statt den Fehler zu behalten.
  cache.catch(() => (cache = undefined))
  return cache
}

let kanaCache: Promise<Kana[]> | undefined
export function loadKana(): Promise<Kana[]> {
  kanaCache ??= fetch('/data/kana.json').then((r) => r.json() as Promise<Kana[]>)
  kanaCache.catch(() => (kanaCache = undefined))
  return kanaCache
}

let kanjiCache: Promise<Map<string, Kanji>> | undefined
export function loadKanji(): Promise<Map<string, Kanji>> {
  kanjiCache ??= fetch('/data/kanji.json')
    .then((r) => r.json() as Promise<Kanji[]>)
    .then((list) => new Map(list.map((k) => [k.char, k])))
  kanjiCache.catch(() => (kanjiCache = undefined))
  return kanjiCache
}

const strokeCache = new Map<string, Promise<string[]>>()
/** SVG-Pfade der Striche (109×109-Raster von KanjiVG), in Schreibreihenfolge. */
export function loadStrokes(file: string): Promise<string[]> {
  let entry = strokeCache.get(file)
  if (!entry) {
    entry = fetch(`/data/${file}`).then((r) => r.json() as Promise<string[]>)
    entry.catch(() => strokeCache.delete(file))
    strokeCache.set(file, entry)
  }
  return entry
}
