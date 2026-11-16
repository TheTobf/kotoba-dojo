/**
 * Missionen: kurze Szenen, in denen man nur mit dem richtigen japanischen Satz weiterkommt.
 * Dieselbe Logik prüft die Gratis-Probe-Missionen (auf dem Gerät) und die Pro-Story-Missionen.
 */
import { toHiragana, toRomaji } from 'wanakana'
import type { Phrase } from './api'

export interface MissionStep {
  /** Was die Figur sagt, bevor man antwortet. */
  says: Phrase
  /** Aufgabe auf Deutsch, z. B. „Bestelle einen grünen Tee.“ */
  task: string
  /** Akzeptierte Antworten; die erste ist die Musterlösung. */
  accepted: Phrase[]
  /** Tipp auf Deutsch für „Ich weiß nicht weiter“. */
  hint: string
}

export interface Mission {
  id: string
  title: string
  place: string
  summary: string
  character: { name: string; role: string }
  steps: MissionStep[]
  /** Schlusssatz der Figur nach dem letzten Schritt. */
  ending: Phrase
}

/** Was auch Nicht-Pro-Nutzer von einer Pro-Mission sehen dürfen (für den Upgrade-Screen). */
export type MissionTeaser = Pick<Mission, 'id' | 'title' | 'place' | 'summary'> & { steps: number }

const MACRONS: Record<string, string> = { ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ee', ō: 'oo' }

/** Welche Vokal-Kana einen vorangehenden Vokal nur verlängern (こう → „kō“, えい → „ē“). */
const LENGTHENS: Record<string, string> = { a: 'あ', i: 'い', u: 'う', e: 'えい', o: 'おう' }

/**
 * Macht Eingaben vergleichbar: Romaji und Katakana werden zu Hiragana; Satzzeichen, Leerzeichen und
 * Vokallängen fallen weg. „Koohii o kudasai“, „kōhī o kudasai“ und „コーヒーをください。“ sind danach gleich.
 * Bewusst großzügig: In einer Mission soll ein Tippfehler bei der Vokallänge niemanden aufhalten.
 */
export function normalizeAnswer(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[āīūēō]/g, (m) => MACRONS[m])
    .replace(/[\s\u3000。、．，.,!?！？「」『』'’"“”・~〜]/g, '')
  const hiragana = toHiragana(cleaned, { convertLongVowelMark: false })

  let out = ''
  let previousVowel = ''
  for (const char of hiragana) {
    if (char === 'ー' || char === '-') continue
    if (previousVowel && LENGTHENS[previousVowel]?.includes(char)) continue
    out += char
    const lastLetter = toRomaji(char).slice(-1)
    previousVowel = 'aiueo'.includes(lastLetter) ? lastLetter : ''
  }
  return out
}

export interface AnswerResult {
  correct: boolean
  /** Die Musterlösung – bei richtiger Antwort die Variante, die getroffen wurde. */
  model: Phrase
}

export function checkAnswer(input: string, step: MissionStep): AnswerResult {
  const given = normalizeAnswer(input)
  if (given) {
    for (const option of step.accepted) {
      const candidates = [option.ja, option.kana, option.romaji].map(normalizeAnswer)
      if (candidates.includes(given)) return { correct: true, model: option }
    }
  }
  return { correct: false, model: step.accepted[0] }
}

export function toTeaser(mission: Mission): MissionTeaser {
  return { id: mission.id, title: mission.title, place: mission.place, summary: mission.summary, steps: mission.steps.length }
}
