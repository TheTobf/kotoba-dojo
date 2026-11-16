/**
 * Sammelt alle japanischen Texte, die die App vorlesen kann – genau so, wie sie an `speak()` übergeben werden.
 * Stufe 1 (Standard): Story-Folgen, Probe-Missionen, Pro-Missionen, KI-Figuren.
 * Stufe 2 (`all`): zusätzlich der Grundwortschatz (Lesung jedes Wortes und sein Beispielsatz).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHARACTERS } from '../shared/characters'
import type { Mission } from '../shared/mission'
import { EPISODES } from '../src/content/story'
import { TRIAL_MISSIONS } from '../src/content/trialMissions'
import { KNOWN_MISTAKES, REPLIES } from '../worker/ai/mock'
import { PRO_MISSIONS } from '../worker/content/missions'

const missionTexts = (mission: Mission) => [
  ...mission.steps.flatMap((step) => [step.says.ja, ...step.accepted.map((phrase) => phrase.ja)]),
  mission.ending.ja,
]

/** Texte ohne Laute (z. B. „……“) brauchen keine Aufnahme. */
const speakable = (text: string) => /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text)

export function collectTexts({ all = false } = {}): string[] {
  const texts: string[] = [
    ...EPISODES.flatMap((episode) => episode.sentences.map((sentence) => sentence.ja)),
    ...[...TRIAL_MISSIONS, ...PRO_MISSIONS].flatMap(missionTexts),
    ...CHARACTERS.map((character) => character.greeting.ja),
    ...Object.values(REPLIES).flat().map((phrase) => phrase.ja),
    ...KNOWN_MISTAKES.map((mistake) => mistake.better.ja),
  ]
  if (all) {
    const data = join(import.meta.dirname, '../public/data')
    const words = JSON.parse(readFileSync(join(data, 'words.json'), 'utf8')) as { reading: string }[]
    const sentences = JSON.parse(readFileSync(join(data, 'sentences.json'), 'utf8')) as { ja: string }[]
    texts.push(...words.map((word) => word.reading), ...sentences.map((sentence) => sentence.ja))
  }
  return [...new Set(texts.map((text) => text.trim()).filter(speakable))]
}
