/**
 * VOICEVOX (lokal, kostenlos): japanische Sätze sprechen lassen – mit Lesungs-Prüfung.
 * Die Engine läuft auf dem Laptop (run.exe --host 127.0.0.1 --port 50021). VOICEVOX_URL überschreibt die Adresse.
 *
 * Lesungs-Prüfung: Die Aussprache, die VOICEVOX aus dem Satz macht, wird mit unserer geprüften Umschrift
 * (Romaji im Lehrplan) verglichen. Weicht sie ab, sprechen wir aus der Kana-Schreibweise. Passt es dann immer
 * noch nicht, bricht die Pipeline ab, statt falsches Japanisch auszugeben.
 */
import { toHiragana, toKatakana } from 'wanakana'
import type { Mora } from '../../src/episode/timeline'

const BASE = () => process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021'

interface MoraQ { text: string; consonant_length: number | null; vowel_length: number }
interface AccentPhrase { moras: MoraQ[]; pause_mora: MoraQ | null }
export interface AudioQuery {
  accent_phrases: AccentPhrase[]
  speedScale: number
  prePhonemeLength: number
  postPhonemeLength: number
  outputSamplingRate: number
  outputStereo: boolean
  kana?: string
  [key: string]: unknown
}
export interface Speaker { name: string; speaker_uuid: string; styles: { name: string; id: number }[] }

export async function isRunning(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE()}/version`, { signal: AbortSignal.timeout(1500) })
    return r.ok
  } catch { return false }
}

export async function speakers(): Promise<Speaker[]> {
  const r = await fetch(`${BASE()}/speakers`)
  if (!r.ok) throw new Error(`VOICEVOX /speakers: ${r.status}`)
  return (await r.json()) as Speaker[]
}

export async function resolveStyle(name: string, style: string): Promise<{ id: number; uuid: string }> {
  const list = await speakers()
  const sp = list.find((s) => s.name === name)
  if (!sp) throw new Error(`VOICEVOX-Stimme „${name}“ ist nicht installiert. Vorhanden: ${list.map((s) => s.name).join(', ')}`)
  const st = sp.styles.find((s) => s.name === style) ?? sp.styles[0]
  return { id: st.id, uuid: sp.speaker_uuid }
}

/** Nutzungsbedingungen einer Stimme aus der Engine (Markdown) */
export async function speakerPolicy(uuid: string): Promise<string> {
  const r = await fetch(`${BASE()}/speaker_info?speaker_uuid=${encodeURIComponent(uuid)}`)
  if (!r.ok) throw new Error(`VOICEVOX /speaker_info: ${r.status}`)
  const info = (await r.json()) as { policy: string }
  return info.policy
}

async function audioQuery(text: string, speaker: number): Promise<AudioQuery> {
  const r = await fetch(`${BASE()}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, { method: 'POST' })
  if (!r.ok) throw new Error(`VOICEVOX audio_query: ${r.status} ${await r.text()}`)
  return (await r.json()) as AudioQuery
}

async function synthesis(query: AudioQuery, speaker: number): Promise<Buffer> {
  const r = await fetch(`${BASE()}/synthesis?speaker=${speaker}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query) })
  if (!r.ok) throw new Error(`VOICEVOX synthesis: ${r.status} ${await r.text()}`)
  return Buffer.from(await r.arrayBuffer())
}

const VOWEL_OF: Record<string, string> = {}
for (const [v, row] of Object.entries({ ア: 'アカガサザタダナハバパマヤャラワ', イ: 'イキギシジチヂニヒビピミリ', ウ: 'ウクグスズツヅヌフブプムユュルヴ', エ: 'エケゲセゼテデネヘベペメレ', オ: 'オコゴソゾトドノホボポモヨョロヲ' })) {
  for (const ch of row) VOWEL_OF[ch] = v
}

/** Aussprache vereinheitlichen, damit „トーキョー“ = „トウキョウ“ = „トオキョオ“ gilt */
export function normalizePron(k: string): string {
  const s = k.replace(/[ァ-ヴ]/g, (c) => c).replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/['/_、。，．,.?？!！・「」\s]/g, '')
    .replace(/ヲ/g, 'オ').replace(/ヂ/g, 'ジ').replace(/ヅ/g, 'ズ')
  let out = ''
  for (const ch of s) {
    const prev = out[out.length - 1]
    if (ch === 'ー' && prev) out += VOWEL_OF[prev] ?? prev
    else out += ch
  }
  // 言う wird „yū“ gesprochen, geschrieben aber „iu“ – beides gilt
  return out.replace(/([オコゴソゾトドノホボポモヨョロ])ウ/g, '$1オ').replace(/([エケゲセゼテデネヘベペメレ])イ/g, '$1エ').replace(/イウ/g, 'ユウ').replace(/ユオ/g, 'ユウ')
}

/** Erwartete Aussprache aus der geprüften Umschrift (Hepburn mit Längungsstrichen) */
export function expectedPron(romaji: string): string {
  const r = romaji.toLowerCase().replace(/ā/g, 'aa').replace(/ī/g, 'ii').replace(/ū/g, 'uu').replace(/ē/g, 'ee').replace(/ō/g, 'ou')
    .replace(/[.,!?…“”"„«»「」『』()]/g, ' ')
  // Bindestrich und Apostroph trennen Silben („hachiman-en“ = ハチマン・エン): Teile einzeln umwandeln
  return normalizePron(r.split(/[\s\-'’]+/).filter(Boolean).map((w) => toKatakana(w)).join(''))
}

/** Hiragana genau nach Aussprache (は→わ, を→お) – letzte Sicherung, falls VOICEVOX Kanji/Kana falsch liest */
export function pronHiragana(romaji: string): string {
  const r = romaji.toLowerCase().replace(/ā/g, 'aa').replace(/ī/g, 'ii').replace(/ū/g, 'uu').replace(/ē/g, 'ee').replace(/ō/g, 'ou')
  const end = /\?\s*$/.test(romaji) ? '？' : '。'
  return r.replace(/[“”"„«»「」『』()]/g, '').split(/[.,!?…]+/).map((part) => part.split(/[\s\-'’]+/).filter(Boolean).map((w) => toHiragana(w)).join('')).filter(Boolean).join('、') + end
}

export function pronOfQuery(q: AudioQuery): string {
  return normalizePron(q.accent_phrases.map((p) => p.moras.map((m) => m.text).join('')).join(''))
}

export interface JaClip { wav: Buffer; moras: Mora[]; usedText: string; pron: string }

/** Satz sprechen. speed < 1 = langsamer. Wirft einen Fehler, wenn die Aussprache nicht stimmt. */
export async function speak({ ja, kana, romaji, speaker, speed = 1 }: { ja: string; kana: string; romaji: string; speaker: number; speed?: number }): Promise<JaClip> {
  const want = expectedPron(romaji)
  // 1. Originalsatz (beste Betonung) · 2. Kana-Schreibweise · 3. Hiragana aus der Umschrift (Aussprache exakt)
  const candidates = [ja, kana, pronHiragana(romaji)]
  let usedText = ja
  let q: AudioQuery | undefined
  const heard: string[] = []
  for (const text of candidates) {
    const query = await audioQuery(text, speaker)
    heard.push(pronOfQuery(query))
    if (pronOfQuery(query) === want) { q = query; usedText = text; break }
  }
  if (!q) throw new Error(`Aussprache von „${ja}“ passt nicht: VOICEVOX „${heard.join(' / ')}“, erwartet „${want}“ (aus „${romaji}“). Bitte im Lehrplan prüfen.`)
  q.speedScale = speed
  q.prePhonemeLength = 0.08
  q.postPhonemeLength = 0.12
  q.outputSamplingRate = 48000
  q.outputStereo = false
  const wav = await synthesis(q, speaker)
  return { wav, moras: moraTimes(q), usedText, pron: pronOfQuery(q) }
}

/** Mora-Zeiten aus der Abfrage (für Lippenbewegung und mitlaufende Kana) */
export function moraTimes(q: AudioQuery): Mora[] {
  const out: Mora[] = []
  let t = q.prePhonemeLength / q.speedScale
  for (const p of q.accent_phrases) {
    for (const m of p.moras) {
      const d = ((m.consonant_length ?? 0) + m.vowel_length) / q.speedScale
      out.push({ kana: m.text, start: t, end: t + d })
      t += d
    }
    if (p.pause_mora) t += p.pause_mora.vowel_length / q.speedScale
  }
  return out
}
