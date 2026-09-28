/**
 * Erzeugt die Kana-Daten für den Schrift-Bereich:
 *   public/data/kana.json, public/data/kana-strokes/<hex>.json (KanjiVG)
 *   mit `--audio`: public/audio/k/<romaji>.mp3 (VOICEVOX 四国めたん, Engine muss laufen)
 *
 * Aufruf: npm run kana:build [-- --audio]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as wk from 'wanakana'
import { Mp3Encoder } from '@breezystack/lamejs'

const ROOT = join(import.meta.dirname, '..')
const RAW = join(ROOT, 'scripts/raw')
const OUT = join(ROOT, 'public/data')
const AUDIO = join(ROOT, 'public/audio/k')
const ENGINE = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021'

// Zeilen in klassischer Lernreihenfolge (a-Reihe, k-Reihe, …)
const BASIS = ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの', 'はひふへほ', 'まみむめも', 'やゆよ', 'らりるれろ', 'わをん']
const DAKUTEN = ['がぎぐげご', 'ざじずぜぞ', 'だぢづでど', 'ばびぶべぼ', 'ぱぴぷぺぽ']

export interface KanaOut {
  char: string
  romaji: string
  script: 'hiragana' | 'katakana'
  stage: 'hiragana' | 'hiragana-dakuten' | 'katakana' | 'katakana-dakuten'
  row: number
  svg?: string
  audio?: string
}

const list: KanaOut[] = []
mkdirSync(join(OUT, 'kana-strokes'), { recursive: true })

for (const script of ['hiragana', 'katakana'] as const) {
  for (const [rows, dak] of [[BASIS, false], [DAKUTEN, true]] as const) {
    rows.forEach((row, r) => {
      for (const h of row) {
        const char = script === 'hiragana' ? h : wk.toKatakana(h)
        let romaji = wk.toRomaji(h)
        if (h === 'を') romaji = 'wo'
        if (h === 'ぢ') romaji = 'ji (di)'
        if (h === 'づ') romaji = 'zu (du)'
        const hex = char.codePointAt(0)!.toString(16).padStart(5, '0')
        const svgFile = join(RAW, 'kanjivg/kanji', `${hex}.svg`)
        let svg: string | undefined
        if (existsSync(svgFile)) {
          const paths = [...readFileSync(svgFile, 'utf8').matchAll(/<path id="kvg:[^"]+-s\d+"[^>]* d="([^"]+)"/g)].map((m) => m[1])
          writeFileSync(join(OUT, 'kana-strokes', `${hex}.json`), JSON.stringify(paths))
          svg = `kana-strokes/${hex}.json`
        }
        const sound = wk.toRomaji(h === 'を' ? 'お' : h === 'ぢ' ? 'じ' : h === 'づ' ? 'ず' : h)
        list.push({
          char, romaji, script, row: r,
          stage: `${script}${dak ? '-dakuten' : ''}` as KanaOut['stage'],
          ...(svg && { svg }),
          audio: `audio/k/${sound}.mp3`,
        })
      }
    })
  }
}

// ---------- Audio (optional) ----------
if (process.argv.includes('--audio')) {
  mkdirSync(AUDIO, { recursive: true })
  const speakers: { name: string; styles: { name: string; id: number }[] }[] = await fetch(`${ENGINE}/speakers`).then((r) => r.json())
  const id = speakers.find((s) => s.name === '四国めたん')!.styles.find((s) => s.name === 'ノーマル')!.id
  const done = new Set<string>()
  for (const k of list) {
    const file = k.audio!.split('/').pop()!
    if (done.has(file) || existsSync(join(AUDIO, file))) { done.add(file); continue }
    done.add(file)
    const text = wk.toHiragana(file.replace('.mp3', ''))
    const q = await fetch(`${ENGINE}/audio_query?${new URLSearchParams({ text, speaker: String(id) })}`, { method: 'POST' }).then((r) => r.json())
    q.speedScale = 0.9
    const wav = Buffer.from(await (await fetch(`${ENGINE}/synthesis?speaker=${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q),
    })).arrayBuffer())
    writeFileSync(join(AUDIO, file), wavToMp3(wav))
    console.log('♪', text)
  }
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

writeFileSync(join(OUT, 'kana.json'), JSON.stringify(list))
console.log(`${list.length} Kana, ${list.filter((k) => k.svg).length} mit Strichen`)
