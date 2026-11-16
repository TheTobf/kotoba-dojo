/**
 * Erzeugt die Sprachaufnahmen der App (public/audio/*.mp3 + index.json).
 *
 * Aufruf:
 *   npm run audio:gen                 Stufe 1: Story, Missionen, Figuren (wenige Dutzend Sätze)
 *   npm run audio:gen -- --alles      zusätzlich der ganze Grundwortschatz (rund 4.000 Aufnahmen)
 *   npm run audio:gen -- --probe 5    nur die ersten 5 fehlenden Texte (zum Probehören)
 *
 * Schon vorhandene Aufnahmen werden nicht neu erzeugt. Aufnahmen zu Texten, die es nicht mehr gibt, werden gelöscht.
 *
 * QUELLE: Microsoft Azure Speech. Kommerzielle Nutzung der Ausgabe ist laut Microsofts Produktbedingungen nur in
 * der BEZAHLTEN Stufe (Standard S0) erlaubt – nicht in der Gratis-Stufe F0. Deshalb verlangt das Skript die
 * ausdrückliche Bestätigung AZURE_SPEECH_BEZAHLTE_STUFE=ja in .env.
 * Eine andere Quelle (z. B. VOICEVOX) braucht nur eine weitere Funktion wie `azure()` unten.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { audioKey, type AudioIndex } from '../shared/audio'
import { collectTexts } from './audio-texts'

try {
  process.loadEnvFile('.env')
} catch {
  // ohne .env müssen die Werte in der Umgebung stehen
}

interface Provider {
  /** Namensnennung, die in der App unter „Quellen & Lizenzen“ erscheint. */
  credit: string
  /** Macht aus einem Text eine MP3-Datei. */
  synthesize(text: string): Promise<Uint8Array>
}

function fail(message: string): never {
  console.error(`✖ ${message}`)
  process.exit(1)
}

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function azure(): Provider {
  const key = process.env.AZURE_SPEECH_KEY?.trim()
  const region = process.env.AZURE_SPEECH_REGION?.trim()
  const voice = process.env.AZURE_SPEECH_VOICE?.trim() || 'ja-JP-NanamiNeural'
  if (!key || !region) fail('AZURE_SPEECH_KEY und AZURE_SPEECH_REGION fehlen in .env (Region z. B. westeurope).')
  if (process.env.AZURE_SPEECH_BEZAHLTE_STUFE !== 'ja') {
    fail('Bitte bestätige in .env mit AZURE_SPEECH_BEZAHLTE_STUFE=ja, dass die Speech-Ressource die bezahlte Stufe (Standard S0) ist. Die Gratis-Stufe F0 erlaubt keine kommerzielle Nutzung.')
  }
  return {
    credit: `Stimme: Microsoft Azure Speech (${voice}).`,
    async synthesize(text) {
      const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'audio-gen',
        },
        body: `<speak version="1.0" xml:lang="ja-JP"><voice name="${voice}">${escapeXml(text)}</voice></speak>`,
      })
      if (!response.ok) throw new Error(`Azure antwortet mit ${response.status}: ${(await response.text()).slice(0, 200)}`)
      return new Uint8Array(await response.arrayBuffer())
    },
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetry<T>(work: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work()
    } catch (error) {
      if (attempt >= attempts) throw error
      await sleep(1000 * 2 ** attempt)
    }
  }
}

// ---------- Ablauf ----------

const args = process.argv.slice(2)
const all = args.includes('--alles')
const sampleIndex = args.indexOf('--probe')
const sample = sampleIndex >= 0 ? Number.parseInt(args[sampleIndex + 1] ?? '', 10) : undefined
if (sample !== undefined && !(sample > 0)) fail('Nach --probe muss eine Zahl stehen, z. B. --probe 5.')

const dir = join(import.meta.dirname, '../public/audio')
mkdirSync(dir, { recursive: true })

const texts = collectTexts({ all })
const wanted = new Map<string, string>()
for (const text of texts) wanted.set(await audioKey(text), text)

const provider = azure()
const missing = [...wanted].filter(([key]) => !existsSync(join(dir, `${key}.mp3`)))
const todo = sample ? missing.slice(0, sample) : missing
console.log(`${texts.length} Texte, ${missing.length} ohne Aufnahme, ${todo.length} werden jetzt erzeugt (${todo.reduce((n, [, t]) => n + [...t].length, 0)} Zeichen).`)

let done = 0
for (const [key, text] of todo) {
  const audio = await withRetry(() => provider.synthesize(text))
  if (audio.length < 500) fail(`Aufnahme für „${text}“ ist verdächtig klein – Abbruch.`)
  writeFileSync(join(dir, `${key}.mp3`), audio)
  done += 1
  if (done % 25 === 0 || done === todo.length) console.log(`  ${done} / ${todo.length}`)
  await sleep(120) // freundlich zum Dienst
}

// Aufräumen und Liste schreiben. Bei --probe bleiben vorhandene Dateien unangetastet.
const files = readdirSync(dir).filter((file) => file.endsWith('.mp3')).map((file) => file.slice(0, -4))
if (!sample && all) {
  for (const key of files.filter((k) => !wanted.has(k))) rmSync(join(dir, `${key}.mp3`))
}
const keys = readdirSync(dir).filter((file) => file.endsWith('.mp3')).map((file) => file.slice(0, -4)).sort()
const index: AudioIndex = { credit: keys.length ? provider.credit : '', keys }
writeFileSync(join(dir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`)
console.log(`✔ ${keys.length} Aufnahmen in public/audio, Liste aktualisiert.`)
