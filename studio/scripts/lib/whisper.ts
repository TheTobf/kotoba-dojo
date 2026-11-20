/**
 * Lokale Spracherkennung mit whisper.cpp (MIT-Lizenz) über @remotion/install-whisper-cpp.
 * Beim ersten Mal werden Programm und Modell nach studio/.tools/ geladen (einmalig, ~1,6 GB für large-v3-turbo).
 * Ergebnis: Wörter mit Start/Ende in Sekunden.
 */
import { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe, type WhisperModel } from '@remotion/install-whisper-cpp'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { TWord } from './align'
import { TOOLS_DIR } from './paths'

const VERSION = process.env.KOTOBA_WHISPER_VERSION ?? '1.7.5'
const MODEL = (process.env.KOTOBA_WHISPER_MODEL ?? 'large-v3-turbo') as WhisperModel

export async function ensureWhisper(): Promise<string> {
  const dir = join(TOOLS_DIR, 'whisper.cpp')
  mkdirSync(TOOLS_DIR, { recursive: true })
  if (!existsSync(dir)) {
    console.log(`Lade whisper.cpp ${VERSION} (einmalig) …`)
    await installWhisperCpp({ to: dir, version: VERSION, printOutput: false })
  }
  await downloadWhisperModel({ model: MODEL, folder: dir, printOutput: false, onProgress: (d, t) => { if (t && d === t) console.log(`Modell ${MODEL} geladen.`) } })
  return dir
}

/** 16-kHz-WAV → Wörter (deutsch) */
export async function transcribeGerman(wav16k: string): Promise<TWord[]> {
  const whisperPath = await ensureWhisper()
  const result = await transcribe({ inputPath: wav16k, whisperPath, whisperCppVersion: VERSION, model: MODEL, tokenLevelTimestamps: true, language: 'de', splitOnWord: true, printOutput: false })
  const { captions } = toCaptions({ whisperCppOutput: result })
  return captions.map((c) => ({ text: c.text.trim(), start: c.startMs / 1000, end: c.endMs / 1000 })).filter((w) => w.text && !/^\[.*\]$/.test(w.text))
}
