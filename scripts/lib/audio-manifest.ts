/**
 * Verknüpft erzeugte/heruntergeladene Audiodateien (public/audio/manifest.json) mit Wörtern und Sätzen.
 * Ein Eintrag gilt nur, solange der Text gleich geblieben ist – ändert sich ein Satz, wird neu erzeugt.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Sentence, Word } from '../../src/types'

export interface AudioEntry { file: string; text: string; credit: string }
export type Manifest = Record<string, AudioEntry>

export const AUDIO_DIR = join(import.meta.dirname, '../../public/audio')
export const MANIFEST = join(AUDIO_DIR, 'manifest.json')

export const loadManifest = (): Manifest => (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {})

/** Text, der gesprochen wird: bei Wörtern die Lesung, bei Sätzen der Satz. */
export const wordText = (w: Word) => w.reading
export const sentenceText = (s: Sentence) => s.ja

export function attachAudio(words: Word[], sentences: Sentence[], m: Manifest = loadManifest()) {
  for (const w of words) {
    const e = m[w.id]
    if (e && e.text === wordText(w) && existsSync(join(AUDIO_DIR, e.file))) {
      w.audio = `audio/${e.file}`; w.audioCredit = e.credit
    }
  }
  for (const s of sentences) {
    const e = m[s.id]
    if (e && e.text === sentenceText(s) && existsSync(join(AUDIO_DIR, e.file))) {
      s.audio = `audio/${e.file}`; s.audioCredit = e.credit
    } else {
      delete s.audio; delete s.audioCredit
    }
  }
}
