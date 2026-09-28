// ---------- Statische Lerndaten (von /scripts erzeugt, als JSON ausgeliefert) ----------

export type Quelle = 'tatoeba' | 'jmdict' | 'claude' | 'manuell'

export type Wortart =
  | 'Nomen' | 'Verb' | 'i-Adjektiv' | 'na-Adjektiv' | 'Adverb'
  | 'Partikel' | 'Pronomen' | 'Hilfsverb' | 'Konjunktion' | 'Zählwort' | 'Ausdruck' | 'Sonstiges'

export interface Word {
  id: string            // z. B. "w0001"
  rank: number          // Häufigkeitsrang (1 = häufigstes)
  lesson: number        // Lektion à 20 Einträge
  surface: string       // Schreibweise (Kanji/Kana)
  reading: string       // Lesung in Hiragana
  romaji: string
  pos: Wortart
  meaningsDe: string[]
  meaningSource: Quelle
  kanji: string[]       // enthaltene Kanji, verweisen auf Kanji.char
  sentenceIds: string[]
  jlpt?: number
  emoji?: string
  image?: string
}

/** Ein Satz, vorab tokenisiert. Die Tokens ergeben aneinandergereiht den Satz. */
export interface Token {
  s: string             // Oberfläche
  r?: string            // Furigana (nur wenn Kanji enthalten)
  role?: 'subjekt' | 'objekt' | 'verb' | 'partikel' | 'sonst'
  target?: boolean      // Zielwort
}

export interface Sentence {
  id: string
  wordId: string
  tokens: Token[]
  ja: string
  kana: string
  romaji: string
  de: string
  grammar: string       // kurze Grammatik-Notiz auf Deutsch
  chunks: string[]      // Satzteile für die Satzbau-Übung
  source: Quelle
  tatoebaId?: number
  audio?: string        // Pfad zur Audiodatei
  audioCredit?: string
}

export interface Kanji {
  char: string
  rank: number
  strokes: number
  onyomi: string[]
  kunyomi: string[]
  meaningsDe: string[]
  wordIds: string[]
  svg?: string          // KanjiVG-Pfade
}

// ---------- Nutzerdaten (IndexedDB) ----------

/** Welche Übung eine Karte trainiert – jede hat ihren eigenen FSRS-Zustand. */
export type CardKind = 'vokabel' | 'quiz' | 'zeichen'

export interface CardState {
  id: string            // `${kind}:${refId}`
  kind: CardKind
  refId: string         // Word.id oder Zeichen
  due: number           // Zeitstempel (ms)
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number         // ts-fsrs State
  last_review?: number
  knownSkip?: boolean   // per „Kenn ich schon" übersprungen
}

export interface ReviewLogEntry {
  id?: number
  cardId: string
  kind: CardKind
  rating: number        // 1 Nochmal … 4 Einfach
  at: number
  durationMs?: number
}

export interface Profile {
  id: 'me'
  xp: number
  streak: number
  bestStreak: number
  lastActiveDay?: string   // YYYY-MM-DD
  achievements: string[]
  unlockedThemes: string[]
  activeDays: Record<string, number> // Tag → Anzahl Karten (Heatmap)
}

export interface Settings {
  id: 'me'
  newPerDay: number
  dailyGoal: number
  dailyGoalType: 'karten' | 'minuten'
  theme: 'hell' | 'dunkel' | 'system'
  furigana: boolean
  autoplayAudio: boolean
  volume: number        // 0..1
  muted: boolean
  vibration: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'me',
  newPerDay: 15,
  dailyGoal: 20,
  dailyGoalType: 'karten',
  theme: 'system',
  furigana: true,
  autoplayAudio: true,
  volume: 0.7,
  muted: false,
  vibration: true,
}

export const DEFAULT_PROFILE: Profile = {
  id: 'me',
  xp: 0,
  streak: 0,
  bestStreak: 0,
  achievements: [],
  unlockedThemes: ['sakura'],
  activeDays: {},
}
