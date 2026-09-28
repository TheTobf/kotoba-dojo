/**
 * Erzeugt Audio für Wörter und Sätze.
 *  1. Tatoeba-Muttersprachleraufnahmen (CC BY / CC BY-NC) werden heruntergeladen.
 *  2. Alles andere spricht VOICEVOX (lokale Engine, http://127.0.0.1:50021),
 *     abwechselnd 四国めたん und 青山龍星. Die Aussprache wird gegen unsere geprüfte Lesung
 *     abgeglichen; bei Abweichung wird mit der Lesung neu erzeugt.
 *
 * Aufruf: npm run data:build && npm run audio:gen && npm run data:build
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as wk from 'wanakana'
import { Mp3Encoder } from '@breezystack/lamejs'
import { AUDIO_DIR, MANIFEST, loadManifest, sentenceText, wordText } from './lib/audio-manifest'
import type { Sentence, Word } from '../src/types'

const ROOT = join(import.meta.dirname, '..')
const ENGINE = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021'
const VOICES = [
  { name: '四国めたん', style: 'ノーマル' },
  { name: '青山龍星', style: 'ノーマル' },
]

const words: Word[] = JSON.parse(readFileSync(join(ROOT, 'public/data/words.json'), 'utf8'))
const sentences: Sentence[] = JSON.parse(readFileSync(join(ROOT, 'public/data/sentences.json'), 'utf8'))
const tatoeba: { sentenceId: string; audioId: number; user: string; license: string }[] =
  JSON.parse(readFileSync(join(ROOT, 'scripts/work/tatoeba-audio.json'), 'utf8'))
const manifest = loadManifest()
for (const d of ['w', 's']) mkdirSync(join(AUDIO_DIR, d), { recursive: true })
const save = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1))
const isFresh = (id: string, text: string) => manifest[id]?.text === text

// ---------- 1. Tatoeba-Aufnahmen ----------
const tatoebaBySentence = new Map(tatoeba.map((t) => [t.sentenceId, t]))
for (const s of sentences) {
  const t = tatoebaBySentence.get(s.id)
  if (!t || isFresh(s.id, sentenceText(s))) continue
  const res = await fetch(`https://tatoeba.org/audio/download/${t.audioId}`)
  if (!res.ok) { console.warn('Tatoeba-Audio fehlt', s.id, res.status); continue }
  const file = `s/${s.id}.mp3`
  writeFileSync(join(AUDIO_DIR, file), Buffer.from(await res.arrayBuffer()))
  manifest[s.id] = { file, text: sentenceText(s), credit: `${t.user} (Tatoeba, ${t.license})` }
  console.log('↓ Tatoeba', s.ja)
}
save()

// ---------- 2. VOICEVOX ----------
const speakers: { name: string; styles: { name: string; id: number }[] }[] =
  await fetch(`${ENGINE}/speakers`).then((r) => r.json()).catch(() => {
    throw new Error(`VOICEVOX-Engine nicht erreichbar unter ${ENGINE} – bitte run.exe starten.`)
  })
const voiceIds = VOICES.map((v) => {
  const sp = speakers.find((s) => s.name === v.name)
  const st = sp?.styles.find((s) => s.name === v.style)
  if (!st) throw new Error(`Stimme ${v.name}/${v.style} nicht gefunden`)
  return { ...v, id: st.id }
})

/** Vergleichbare Lautform: Langvokale, Partikel-Aussprache und Satzzeichen vereinheitlichen. */
function norm(kana: string): string {
  let h = wk.toHiragana(kana.replace(/[^\p{Script=Hiragana}\p{Script=Katakana}ー]/gu, ''))
  h = h.replace(/いう/g, 'ゆう') // そういう wird „sō yū“ gesprochen
  h = h.replace(/ー/g, '').replace(/[はわ]/g, 'わ').replace(/[をお]/g, 'お').replace(/[へえ]/g, 'え')
  // おう/おお → お, えい/ええ → え, うう → う, いい → い (Langvokale wie ー behandeln)
  h = h.replace(/([おこそとのほもよろごぞどぼぽょ])[うお]/g, '$1').replace(/([えけせてねへめれげぜでべぺ])[いえ]/g, '$1')
  h = h.replace(/([うくすつぬふむゆるぐずづぶぷゅ])う/g, '$1').replace(/([いきしちにひみりぎじぢびぴ])い/g, '$1')
  return h
}

async function query(text: string, speaker: number) {
  const q = await fetch(`${ENGINE}/audio_query?${new URLSearchParams({ text, speaker: String(speaker) })}`, { method: 'POST' })
  if (!q.ok) throw new Error(`audio_query ${q.status}: ${text}`)
  return q.json() as Promise<{ kana: string; [k: string]: unknown }>
}

async function synth(q: object, speaker: number): Promise<Buffer> {
  const r = await fetch(`${ENGINE}/synthesis?speaker=${speaker}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q),
  })
  if (!r.ok) throw new Error(`synthesis ${r.status}`)
  return wavToMp3(Buffer.from(await r.arrayBuffer()))
}

function wavToMp3(wav: Buffer): Buffer {
  const sampleRate = wav.readUInt32LE(24)
  let off = 12
  while (wav.toString('ascii', off, off + 4) !== 'data') off += 8 + wav.readUInt32LE(off + 4)
  const len = wav.readUInt32LE(off + 4)
  const pcm = new Int16Array(wav.buffer.slice(wav.byteOffset + off + 8, wav.byteOffset + off + 8 + len))
  const enc = new Mp3Encoder(1, sampleRate, 48)
  const chunks: Uint8Array[] = []
  for (let i = 0; i < pcm.length; i += 1152) chunks.push(enc.encodeBuffer(pcm.subarray(i, i + 1152)))
  chunks.push(enc.flush())
  return Buffer.concat(chunks.map((c) => Buffer.from(c)))
}

const mismatches: { id: string; text: string; expected: string; got: string }[] = []

/** Spricht `text`, prüft gegen `expectedKana`, fällt ggf. auf `fallbackText` (Lesung) zurück. */
async function speak(id: string, file: string, key: string, text: string, expectedKana: string, fallbackText: string, n: number) {
  const v = voiceIds[n % voiceIds.length]
  let q = await query(text, v.id)
  if (norm(q.kana) !== norm(expectedKana)) {
    const q2 = await query(fallbackText, v.id)
    if (norm(q2.kana) !== norm(expectedKana)) mismatches.push({ id, text, expected: expectedKana, got: q2.kana })
    q = norm(q2.kana) === norm(expectedKana) || norm(q.kana) !== norm(expectedKana) ? q2 : q
  }
  writeFileSync(join(AUDIO_DIR, file), await synth(q, v.id))
  manifest[id] = { file, text: key, credit: `VOICEVOX:${v.name}` }
}

let n = 0
const todo = [
  ...words.filter((w) => !isFresh(w.id, wordText(w))).map((w) => ({ kind: 'w' as const, w })),
  ...sentences.filter((s) => !tatoebaBySentence.has(s.id) && !isFresh(s.id, sentenceText(s))).map((s) => ({ kind: 's' as const, s })),
]
console.log(`VOICEVOX: ${todo.length} Aufnahmen …`)
for (const t of todo) {
  n++
  if (t.kind === 'w') {
    await speak(t.w.id, `w/${t.w.id}.mp3`, wordText(t.w), t.w.surface, t.w.reading, t.w.reading, n)
  } else {
    const s = t.s
    const kanaText = s.tokens.map((tk) => (tk.f ? tk.f.map((f) => f.r ?? f.s).join('') : tk.s)).join('')
    await speak(s.id, `s/${s.id}.mp3`, sentenceText(s), s.ja, s.kana, kanaText, n)
  }
  if (n % 25 === 0) { save(); console.log(`  ${n}/${todo.length}`) }
}
save()
writeFileSync(join(ROOT, 'scripts/work/audio-mismatches.json'), JSON.stringify(mismatches, null, 1))
console.log(`Fertig. Abweichende Aussprache trotz Fallback: ${mismatches.length} (siehe scripts/work/audio-mismatches.json)`)
