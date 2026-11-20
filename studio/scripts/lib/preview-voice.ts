/**
 * Vorschau-Stimmen (nur für preview.mp4, nie für das fertige Video):
 * Deutsch: Windows-Sprachausgabe (SAPI), auf dem Mac `say`, unter Linux espeak-ng.
 * Japanisch ohne laufendes VOICEVOX: OpenJTalk (pyopenjtalk, falls KOTOBA_OPENJTALK_PY gesetzt), sonst espeak-ng.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { decodeAudio } from './ffmpeg'
import type { Audio } from './wav'

function run(cmd: string, args: string[], input?: string) {
  const r = spawnSync(cmd, args, { input, encoding: 'utf8', maxBuffer: 1 << 26 })
  if (r.error || r.status !== 0) throw new Error(`${cmd}: ${r.error?.message ?? r.stderr}`)
}

export function previewGerman(text: string): Audio {
  const dir = mkdtempSync(join(tmpdir(), 'kotoba-tts-'))
  try {
    const out = join(dir, 'de.wav')
    if (process.platform === 'win32') {
      const ps = [
        'Add-Type -AssemblyName System.Speech',
        '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
        "$v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'de-*' } | Select-Object -First 1",
        'if ($v) { $s.SelectVoice($v.VoiceInfo.Name) }',
        '$s.Rate = 1',
        `$s.SetOutputToWaveFile('${out.replace(/'/g, "''")}')`,
        `$s.Speak([IO.File]::ReadAllText('${join(dir, 'text.txt').replace(/'/g, "''")}'))`,
        '$s.Dispose()',
      ].join('; ')
      writeFileSync(join(dir, 'text.txt'), text, 'utf8')
      run('powershell', ['-NoProfile', '-Command', ps])
    } else if (process.platform === 'darwin') {
      const aiff = join(dir, 'de.aiff')
      run('say', ['-v', process.env.KOTOBA_SAY_VOICE ?? 'Anna', '-o', aiff, text])
      return decodeAudio(aiff)
    } else {
      run('espeak-ng', ['-v', 'de', '-s', '168', '-p', '45', '-w', out, text])
    }
    return decodeAudio(out)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Japanische Ersatzstimme. Gibt außerdem die Aussprache in Katakana zurück (für die Moren). */
export function previewJapanese(text: string, speed = 1): { audio: Audio; pron?: string } {
  const dir = mkdtempSync(join(tmpdir(), 'kotoba-ja-'))
  try {
    const out = join(dir, 'ja.wav')
    const py = process.env.KOTOBA_OPENJTALK_PY
    if (py) {
      const code = [
        'import sys, json, pyopenjtalk, numpy as np, wave',
        'text = sys.stdin.read()',
        `x, sr = pyopenjtalk.tts(text, speed=${speed})`,
        'x = np.clip(x, -32768, 32767).astype(np.int16)',
        `w = wave.open(${JSON.stringify(out)}, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(x.tobytes()); w.close()`,
        'print(pyopenjtalk.g2p(text, kana=True))',
      ].join('\n')
      const r = spawnSync(py, ['-I', '-c', code], { input: text, encoding: 'utf8' })
      if (r.status !== 0) throw new Error(`pyopenjtalk: ${r.stderr}`)
      return { audio: decodeAudio(out), pron: r.stdout.trim().split('\n').filter(Boolean).pop() }
    }
    run('espeak-ng', ['-v', 'ja', '-s', String(Math.round(150 * speed)), '-w', out, text])
    return { audio: decodeAudio(out) }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Katakana in Moren zerlegen (kleine ャュョァィゥェォ gehören zur vorigen) */
export function splitMoras(kata: string): string[] {
  const chars = [...kata.replace(/[、。？！?!.,\s'/_]/g, '')]
  const out: string[] = []
  for (const c of chars) {
    if (/[ャュョァィゥェォヮ]/.test(c) && out.length) out[out.length - 1] += c
    else out.push(c)
  }
  return out
}

void readFileSync
