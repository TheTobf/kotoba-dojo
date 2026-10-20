/**
 * Verknüpft erzeugte/heruntergeladene Audiodateien (public/audio/manifest.json) mit Wörtern und Sätzen.
 * Ein Eintrag gilt nur, solange der Text gleich geblieben ist – ändert sich ein Satz, wird neu erzeugt.
 */
import { createHash } from 'node:crypto'
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

/** VOICEVOX-Stimmen, abwechselnd (Tobias' Wahl). */
export const VOICES = [
  { name: '四国めたん', style: 'ノーマル' },
  { name: '青山龍星', style: 'ノーマル' },
] as const

/**
 * Satzteile der Satzbau-Übung mit Lesung und Stimme. Die Lesung kommt aus den Tokens (die Teile liegen immer auf
 * Token-Grenzen), damit z. B. 人 als ひと gesprochen wird, wenn der Satz es so meint. Gesprochen wird mit der Stimme
 * des Satzes; bei Tatoeba-Aufnahmen (echte Sprecher) mit einer festen VOICEVOX-Stimme je Satz.
 * Gleicher Text + Lesung + Stimme → eine Datei für alle Sätze.
 */
export function chunkTeile(s: Sentence) {
  const stimme = s.audioCredit?.startsWith('VOICEVOX:') ? s.audioCredit.slice(9)
    : VOICES[[...s.id].reduce((a, c) => a + c.charCodeAt(0), 0) % VOICES.length].name
  const teile: { text: string; kana: string; stimme: string; key: string; file: string }[] = []
  let t = 0
  for (const text of s.chunks) {
    let surface = '', kana = ''
    while (surface.length < text.length && t < s.tokens.length) {
      const tk = s.tokens[t++]
      surface += tk.s
      kana += tk.f ? tk.f.map((f) => f.r ?? f.s).join('') : tk.s
    }
    if (surface !== text) return []            // Teile nicht auf Token-Grenzen – dann lieber gar keine Aufnahmen
    const key = `${text}|${kana}|${stimme}`
    teile.push({ text, kana, stimme, key, file: `c/${createHash('sha1').update(key).digest('hex').slice(0, 12)}.mp3` })
  }
  return teile
}

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
    // erst nach dem Satz: die Stimme der Satzteile richtet sich nach seiner Aufnahme
    const teile = chunkTeile(s).map((c) => {
      const e = m[`c:${c.key}`]
      return e && e.text === c.key && existsSync(join(AUDIO_DIR, e.file)) ? `audio/${e.file}` : ''
    })
    if (teile.some(Boolean)) s.chunkAudio = teile
    else delete s.chunkAudio
  }
}
