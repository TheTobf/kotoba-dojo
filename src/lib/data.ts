/** Lerndaten (Wörter und Beispielsätze) – statische JSON-Dateien, die der Service Worker offline bereithält. */

/** Furigana-Abschnitt: `r` nur bei Kanji, z. B. 食べる → [{s:'食',r:'た'},{s:'べる'}] */
export interface Furi {
  s: string
  r?: string
}

export interface Token {
  s: string
  f?: Furi[]
  /** Das Wort, um das es auf der Karte geht. */
  target?: boolean
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
  sentenceIds: string[]
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
