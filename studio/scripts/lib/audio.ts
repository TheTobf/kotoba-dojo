/**
 * Ton einer Folge herstellen:
 *  1. Deutsch: deine Aufnahme säubern (Hochpass, Rauschminderung), mit whisper Wörter erkennen, mit dem Skript
 *     abgleichen, pro Satz die beste (letzte gute) Fassung ausschneiden, lange Pausen kürzen, Lautstärke angleichen.
 *     Ohne Aufnahme (Vorschau): Ersatzstimme.
 *  2. Japanisch: VOICEVOX mit Lesungs-Prüfung (Vorschau ohne VOICEVOX: OpenJTalk/espeak).
 *  3. Zeitplan bauen und alles zu mix.wav mischen (Effekte selbst erzeugt, keine Musik).
 */
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Episode } from '../../src/episode/schema'
import { buildTimeline, type AudioInfo, type JaAudio, type LineAudio, type Timeline } from '../../src/episode/timeline'
import { evenWordTimes, matchScript, type LineMatch, type TWord } from './align'
import { SR, compress, concat, denoise, fade, highpass, loudness, master, mixInto, normalize, sfx, shortenPauses, slice, voicedRegions, gain } from './dsp'
import { decodeAudio, ffmpeg } from './ffmpeg'
import { APPVIDEOS_DIR, OUT_DIR, workDir } from './paths'
import { previewGerman, previewJapanese, splitMoras } from './preview-voice'
import { counterBase, introducedBefore, loadCurriculum, loadStyle, voiceOf, type Style } from './project'
import * as voicevox from './voicevox'
import { readWav, writeWav } from './wav'

export interface AudioResult { timeline: Timeline; report: string[]; preview: boolean }

const write = (file: string, samples: Float32Array) => writeFileSync(file, writeWav({ sampleRate: SR, samples }))
const read = (file: string) => decodeAudio(file, SR).samples
const hash = (...parts: unknown[]) => createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 16)

/** Hauptfunktion: Ton + Zeitplan. recording = Pfad zur Sprachaufnahme oder undefined (dann Vorschau). */
export async function produceAudio(ep: Episode, recording: string | undefined, opts: { allowPreviewJapanese: boolean }): Promise<AudioResult> {
  const style = loadStyle()
  const work = workDir(ep.id)
  for (const d of ['lines', 'ja', 'sfx']) mkdirSync(join(work, d), { recursive: true })
  const report: string[] = []
  const preview = !recording
  const lines = recording ? await narrationFromRecording(ep, recording, style, work, report) : narrationPreview(ep, style, work)
  const ja = await japaneseClips(ep, style, work, report, opts.allowPreviewJapanese || preview)
  const usedPreviewJa = Object.values(ja).some((j) => j.file.includes('vorschau'))
  const curriculum = loadCurriculum()
  // App-Videos dürfen kürzer sein (Werbung: 20–60 s)
  const rules = ep.id.startsWith('app-') ? { ...style, format: { ...style.format, laengeMin: 20, laengeMax: 60 } } : style
  for (const b of ep.beats) if (b.screen) copyFileSync(join(APPVIDEOS_DIR, ep.id, b.screen), join(work, b.screen.replace(/[\\/]/g, '_')))
  const timeline = buildTimeline({
    episode: { ...ep, beats: ep.beats.map((b) => (b.screen ? { ...b, screen: b.screen.replace(/[\\/]/g, '_') } : b)) }, style: rules, curriculum,
    audio: { lines, ja, preview: preview || usedPreviewJa } satisfies AudioInfo,
    counterBase: counterBase(ep.id),
    knownBefore: new Set(introducedBefore(ep.id).keys()),
  })
  report.push(...timeline.warnings.map((w) => `⚠ ${w}`))
  mix(timeline, style, work, report)
  writeFileSync(join(work, 'timeline.json'), JSON.stringify(timeline, null, 1))
  writeFileSync(join(work, 'audio-bericht.md'), `# Ton ${ep.id}\n\n${report.map((r) => `- ${r}`).join('\n')}\n`)
  return { timeline, report, preview: timeline.preview }
}

// ---------------- Deutsch: Aufnahme ----------------

async function narrationFromRecording(ep: Episode, file: string, style: Style, work: string, report: string[]): Promise<Record<number, LineAudio>> {
  const script = ep.beats.flatMap((b) => (b.kind === 'erzaehler' ? b.lines : []))
  const raw = read(file)
  report.push(`Aufnahme: ${file.split(/[\\/]/).pop()} · ${(raw.length / SR).toFixed(1)} s`)
  const clean = denoise(highpass(raw, 80))
  const cleanFile = join(work, 'stimme-gesaeubert.wav')
  write(cleanFile, clean)
  // Spracherkennung (zwischengespeichert, solange die Aufnahme gleich bleibt)
  const st = statSync(file)
  const key = hash(file, st.size, st.mtimeMs)
  const cacheFile = join(work, `erkennung-${key}.json`)
  let words: TWord[]
  if (existsSync(cacheFile)) words = JSON.parse(readFileSync(cacheFile, 'utf8'))
  else {
    const { transcribeGerman } = await import('./whisper')
    const wav16 = join(work, 'stimme-16k.wav')
    writeFileSync(wav16, ffmpeg(['-y', '-i', cleanFile, '-ac', '1', '-ar', '16000', '-acodec', 'pcm_s16le', '-f', 'wav', 'pipe:1']))
    console.log('Spracherkennung läuft (whisper.cpp, lokal) …')
    words = await transcribeGerman(wav16)
    writeFileSync(cacheFile, JSON.stringify(words))
  }
  const matches = matchScript(script.map((l) => ({ n: l.n, text: l.text })), words)
  return cutTakes(matches, clean, style, work, report)
}

/** Ausschneiden, an Sprechpausen ausrichten, Pausen kürzen, gemeinsame Lautstärke */
export function cutTakes(matches: LineMatch[], clean: Float32Array, style: Style, work: string, report: string[]): Record<number, LineAudio> {
  const regions = voicedRegions(clean)
  const missing = matches.filter((m) => !m.take).map((m) => m.n)
  if (missing.length) throw new Error(`Diese Sätze fehlen in der Aufnahme oder wurden nicht erkannt: ${missing.join(', ')}. Bitte nachsprechen (eigene Datei voice.m4a ersetzen) oder Skript anpassen.`)
  const cut: { n: number; audio: Float32Array; words: TWord[] }[] = []
  for (const m of matches) {
    const take = m.take!
    // Anfang/Ende an die echte Stimme anlegen (whisper liegt oft 0,1–0,3 s daneben)
    const startRegion = regions.find((r) => r.end > take.start - 0.05 && r.start < take.start + 0.35)
    const endRegion = [...regions].reverse().find((r) => r.start < take.end + 0.05 && r.end > take.end - 0.35)
    const s = Math.max(0, Math.min(take.start, startRegion?.start ?? take.start) - 0.06)
    const e = Math.max(take.end, endRegion?.end ?? take.end) + 0.1
    const piece = slice(clean, s, e)
    const { audio, map } = shortenPauses(piece)
    const words = m.words.map((w) => ({ text: w.text, start: Math.max(0, map(w.start - s)), end: Math.max(0, map(w.end - s)) }))
    cut.push({ n: m.n, audio: fade(audio, 8, 30), words })
    const versions = m.takes.length
    const flag = take.score < 0.85 ? ` ⚠ nur ${(take.score * 100).toFixed(0)} % Übereinstimmung – bitte anhören (Versprecher?)` : ''
    report.push(`Satz ${m.n}: ${versions > 1 ? `${versions} Fassungen, genommen: Nr. ${m.takes.indexOf(take) + 1}` : '1 Fassung'} · ${(take.score * 100).toFixed(0)} %${flag}`)
  }
  // Kompressor (Schwelle 8 dB unter der Lautheit der Aufnahme), dann eine gemeinsame Verstärkung (klingt wie aus einem Guss)
  const before = loudness(concat(cut.map((c) => c.audio)))
  for (const c of cut) c.audio = compress(c.audio, { thresholdDb: before - 8 })
  const level = loudness(concat(cut.map((c) => c.audio)))
  const g = style.audio.stimmeLufs - level
  report.push(`Stimme: ${level.toFixed(1)} LUFS → ${style.audio.stimmeLufs} LUFS (${g >= 0 ? '+' : ''}${g.toFixed(1)} dB)`)
  const out: Record<number, LineAudio> = {}
  for (const c of cut) {
    const file = join('lines', `${String(c.n).padStart(2, '0')}.wav`)
    write(join(work, file), gain(c.audio, g))
    out[c.n] = { file, duration: c.audio.length / SR, words: c.words }
  }
  return out
}

// ---------------- Deutsch: Vorschau ----------------

function narrationPreview(ep: Episode, style: Style, work: string): Record<number, LineAudio> {
  const out: Record<number, LineAudio> = {}
  for (const b of ep.beats) {
    if (b.kind !== 'erzaehler') continue
    for (const l of b.lines) {
      const file = join('lines', `${String(l.n).padStart(2, '0')}-vorschau.wav`)
      const cache = join(OUT_DIR, '.cache', `de2-${hash(l.text)}.wav`)
      let audio: Float32Array
      if (existsSync(cache)) audio = readWav(readFileSync(cache)).samples
      else {
        const a = previewGerman(l.text).samples
        const r = voicedRegions(a)
        audio = r.length ? slice(a, Math.max(0, r[0].start - 0.03), r[r.length - 1].end + 0.08) : a
        audio = fade(normalize(compress(audio, { thresholdDb: loudness(audio) - 8 }), style.audio.stimmeLufs), 5, 25)
        mkdirSync(join(OUT_DIR, '.cache'), { recursive: true })
        write(cache, audio)
      }
      write(join(work, file), audio)
      const d = audio.length / SR
      out[l.n] = { file, duration: d, words: evenWordTimes(l.text, 0.03, d - 0.06) }
    }
  }
  return out
}

// ---------------- Japanisch ----------------

async function japaneseClips(ep: Episode, style: Style, work: string, report: string[], allowPreview: boolean): Promise<Record<string, JaAudio>> {
  const curriculum = loadCurriculum()
  const running = await voicevox.isRunning()
  if (!running && !allowPreview) throw new Error('VOICEVOX läuft nicht. Bitte starten: C:\\Users\\tobia\\Tools\\voicevox_engine\\windows-cpu\\run.exe --host 127.0.0.1 --port 50021')
  if (!running) report.push('⚠ VOICEVOX läuft nicht – japanische Ersatzstimme (nur Vorschau).')
  const out: Record<string, JaAudio> = {}
  const styleIds = new Map<string, number>()
  for (const [index, b] of ep.beats.entries()) {
    if (b.kind === 'erzaehler') continue
    const entry = curriculum.get(b.sentence)!
    const voiceKey = ep.cast[b.speaker].voice!
    const voice = voiceOf(style, voiceKey)
    const wantSlow = b.kind === 'quiz' ? style.schnitt.lernsatzLangsamWiederholen : (b.slow ?? (b.role === 'lernen' && style.schnitt.lernsatzLangsamWiederholen))
    const speeds: [string, number][] = [[String(index), 1], ...(wantSlow ? [[`${index}-slow`, style.schnitt.langsamFaktor] as [string, number]] : [])]
    for (const [key, speed] of speeds) {
      if (running) {
        if (!styleIds.has(voiceKey)) styleIds.set(voiceKey, (await voicevox.resolveStyle(voice.voicevox, voice.stil)).id)
        const id = styleIds.get(voiceKey)!
        const cacheBase = join(OUT_DIR, '.cache', `vv-${hash(entry.ja, entry.kana, entry.romaji, id, speed)}`)
        let audio: Float32Array, moras
        if (existsSync(`${cacheBase}.wav`)) {
          audio = read(`${cacheBase}.wav`)
          moras = JSON.parse(readFileSync(`${cacheBase}.json`, 'utf8'))
        } else {
          const clip = await voicevox.speak({ ja: entry.ja, kana: entry.kana, romaji: entry.romaji, speaker: id, speed })
          mkdirSync(join(OUT_DIR, '.cache'), { recursive: true })
          writeFileSync(`${cacheBase}-roh.wav`, clip.wav)
          audio = normalize(read(`${cacheBase}-roh.wav`), style.audio.japanischLufs)
          moras = clip.moras
          write(`${cacheBase}.wav`, audio)
          writeFileSync(`${cacheBase}.json`, JSON.stringify(moras))
          if (clip.usedText !== entry.ja) report.push(`Abschnitt ${index + 1}: VOICEVOX las „${entry.ja}“ anders – aus Kana gesprochen.`)
        }
        const file = join('ja', `${key}.wav`)
        write(join(work, file), audio)
        out[key] = { file, duration: audio.length / SR, moras }
      } else {
        const { audio: a, pron } = previewJapanese(entry.ja, speed)
        let audio = a.samples
        const r = voicedRegions(audio)
        if (r.length) audio = slice(audio, Math.max(0, r[0].start - 0.05), r[r.length - 1].end + 0.1)
        audio = fade(normalize(audio, style.audio.japanischLufs), 5, 25)
        const d = audio.length / SR
        const kata = pron ?? entry.kana
        if (pron && key === String(index)) {
          const ok = voicevox.normalizePron(pron) === voicevox.expectedPron(entry.romaji)
          report.push(`Abschnitt ${index + 1}: Zweitprüfung Lesung (OpenJTalk, nur Vorschau) ${ok ? 'stimmt' : `weicht ab: ${pron} ↔ ${entry.romaji} – OpenJTalk liest z. B. 何 oft als „nani“; VOICEVOX prüft beim fertigen Video erneut und spricht notfalls aus der Kana`}`)
        }
        const morasList = splitMoras(kata)
        const span = Math.max(0.2, d - 0.15)
        const moras = morasList.map((m, i) => ({ kana: m, start: 0.05 + (span * i) / morasList.length, end: 0.05 + (span * (i + 1)) / morasList.length }))
        const file = join('ja', `${key}-vorschau.wav`)
        write(join(work, file), audio)
        out[key] = { file, duration: d, moras }
      }
    }
  }
  return out
}

// ---------------- Mischen ----------------

export function mix(tl: Timeline, style: Style, work: string, report: string[]) {
  const n = Math.ceil(tl.duration * SR) + SR
  const track = new Float32Array(n)
  const voiceOnly = new Float32Array(n)
  const jaOnly = new Float32Array(n)
  const cache = new Map<string, Float32Array>()
  const effects = new Map<string, Float32Array>()
  for (const name of ['tick', 'pling', 'plus', 'whoosh'] as const) {
    const s = sfx(name)
    effects.set(`sfx/${name}.wav`, gain(s, style.audio.effekteLufs - loudness(s)))
  }
  for (const c of tl.clips) {
    let clip = effects.get(c.src) ?? cache.get(c.src)
    if (!clip) { clip = read(join(work, c.src)); cache.set(c.src, clip) }
    mixInto(track, clip, c.start)
    if (c.kind === 'voice') mixInto(voiceOnly, clip, c.start)
    if (c.kind === 'ja') mixInto(jaOnly, clip, c.start)
  }
  const final = master(track.subarray(0, Math.ceil(tl.duration * SR)), style.audio.gesamtLufs, style.audio.spitzeDb)
  write(join(work, 'mix.wav'), final)
  const lv = loudness(voiceOnly), lj = loudness(jaOnly), lt = loudness(final)
  const diff = Math.abs(lv - lj)
  report.push(`Mischung: gesamt ${lt.toFixed(1)} LUFS · Stimme ${lv.toFixed(1)} · Japanisch ${lj.toFixed(1)} · Unterschied ${diff.toFixed(1)} LU ${diff > 3 ? '⚠ unausgewogen' : '✓'}`)
  const [min, max] = tl.kind === 'app' ? [20, 60] : [style.format.laengeMin, style.format.laengeMax]
  report.push(`Länge: ${tl.duration.toFixed(1)} s ${tl.duration >= min && tl.duration <= max ? '✓' : `⚠ außerhalb ${min}–${max} s`}`)
}
