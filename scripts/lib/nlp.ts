/**
 * Satz-Aufbereitung: Tokens, Furigana, Romaji, Satzteile, Satzrollen.
 */
import kuromoji, { type IpadicFeatures, type Tokenizer } from 'kuromoji'
import { join } from 'node:path'
import * as wk from 'wanakana'
import type { Furi, Role, Token } from '../../src/types'

export type KToken = IpadicFeatures

export function buildTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  const dicPath = join(import.meta.dirname, '../../node_modules/kuromoji/dict')
  return new Promise((res, rej) => kuromoji.builder({ dicPath }).build((e, t) => (e ? rej(e) : res(t))))
}

const KANJI = /[㐀-鿿々]/ // inkl. 々
export const hasKanji = (s: string) => KANJI.test(s)

/** Richtet eine Lesung an der Schreibweise aus: 食べる/たべる → 食(た)べる */
export function alignFurigana(surface: string, reading: string): Furi[] {
  if (!hasKanji(surface)) return [{ s: surface }]
  const parts = surface.match(/[㐀-鿿々]+|[^㐀-鿿々]+/g)!
  const re = new RegExp(
    '^' + parts.map((p) => (hasKanji(p) ? '(.+?)' : `(${escape(wk.toHiragana(p))})`)).join('') + '$',
  )
  const m = wk.toHiragana(reading).match(re)
  if (!m) return [{ s: surface, r: wk.toHiragana(reading) }]
  return parts.map((p, i) => (hasKanji(p) ? { s: p, r: m[i + 1] } : { s: p }))
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Tatoeba-Umschrift „[学生|がく|せい]です" → Abschnitte (pro Kanji getrennt, wo möglich). */
export function parseTranscription(text: string): Furi[] | null {
  const out: Furi[] = []
  const re = /\[([^\]|]+)\|([^\]]+)\]|([^[]+)/g
  for (const m of text.matchAll(re)) {
    if (m[3]) { out.push({ s: m[3] }); continue }
    const chars = [...m[1]]
    const readings = m[2].split('|')
    if (readings.length === chars.length) chars.forEach((c, i) => out.push(readings[i] ? { s: c, r: readings[i] } : { s: c }))
    else if (readings.length === 1) out.push({ s: m[1], r: readings[0] })
    else return null
  }
  return out
}

/** Verteilt Umschrift-Abschnitte auf Tokens. null, wenn ein Kanji-Abschnitt eine Token-Grenze kreuzt. */
function furiFromTranscription(tokens: KToken[], segs: Furi[]): Furi[][] | null {
  // Kana-Abschnitte dürfen an Token-Grenzen zerschnitten werden → zeichenweise aufspalten.
  const flat: Furi[] = segs.flatMap((f) => (f.r ? [f] : [...f.s].map((c) => ({ s: c }))))
  const result: Furi[][] = []
  let i = 0
  for (const t of tokens) {
    let len = 0
    const mine: Furi[] = []
    while (len < t.surface_form.length && i < flat.length) {
      mine.push(flat[i]); len += flat[i].s.length; i++
    }
    if (len !== t.surface_form.length) return null
    // benachbarte Kana zusammenfassen
    const merged: Furi[] = []
    for (const f of mine) {
      const last = merged.at(-1)
      if (!f.r && last && !last.r) last.s += f.s
      else merged.push({ ...f })
    }
    result.push(merged)
  }
  return i === flat.length ? result : null
}

const PARTICLE_ROMAJI: Record<string, string> = { は: 'wa', へ: 'e', を: 'o' }
const PUNCT: Record<string, string> = { '。': '.', '、': ',', '？': '?', '！': '!', '?': '?', '!': '!', '「': '"', '」': '"' }

/** Hängt das Token in der Romaji-Umschrift ohne Leerzeichen am vorigen Wort? (tabe-mashita, itte, ...) */
const COPULA = new Set(['だ', 'です', 'でし', 'だっ', 'でしょ', 'だろ'])
const isAttached = (t: KToken) =>
  (t.pos === '助動詞' && !COPULA.has(t.surface_form)) || t.pos === '記号' || t.pos_detail_1 === '接尾' ||
  (t.pos === '助詞' && t.pos_detail_1 === '接続助詞')

/** Startet ein Token einen neuen Satzteil (Bunsetsu)? */
const startsChunk = (t: KToken, prev?: KToken) =>
  !prev ? true
    : prev.pos === '接頭詞' && prev.surface_form !== '今' ? false // kuromoji hält 今 manchmal für ein Präfix
    : t.pos_detail_1 === '数' && prev.pos_detail_1 === '数' ? false // 三 + 千 = 三千
    : t.basic_form === 'する' && prev.pos_detail_1 === 'サ変接続' ? false // 電話する als ein Satzteil
    : !(t.pos === '助詞' || t.pos === '助動詞' || t.pos === '記号' || t.pos_detail_1 === '接尾' || t.pos_detail_1 === '非自立')

function roles(tokens: KToken[]): Role[] {
  const r: Role[] = tokens.map((t) =>
    t.pos === '助詞' ? 'partikel'
      : t.pos === '動詞' || t.pos === '形容詞' || t.pos === '助動詞' ? 'verb'
      : 'sonst')
  // Nomen-Gruppe vor は/が → Subjekt/Thema, vor を → Objekt
  tokens.forEach((t, i) => {
    if (t.pos !== '助詞' || !['は', 'が', 'を'].includes(t.surface_form)) return
    const role: Role = t.surface_form === 'を' ? 'objekt' : 'subjekt'
    for (let j = i - 1; j >= 0 && (tokens[j].pos === '名詞' || tokens[j].pos === '接頭詞'); j--) r[j] = role
  })
  return r
}

export interface Analysed {
  tokens: Token[]
  kana: string
  romaji: string
  chunks: string[]
  furiganaSource: 'tatoeba' | 'kuromoji'
  basics: string[]   // Grundformen der Inhaltswörter (für Schwierigkeitsbewertung)
}

export function analyse(
  tk: Tokenizer<IpadicFeatures>,
  ja: string,
  isTarget: (t: KToken) => boolean,
  transcription?: string,
  /** Lesungen erzwingen (Oberfläche → Hiragana), falls kuromoji falsch liest (日本 → にっぽん). */
  readingOverride: Record<string, string> = {},
): Analysed {
  const kt = tk.tokenize(ja)
  let furi: Furi[][] | null = null
  let furiganaSource: Analysed['furiganaSource'] = 'kuromoji'
  if (transcription) {
    const segs = parseTranscription(transcription)
    if (segs && segs.map((s) => s.s).join('') === ja) furi = furiFromTranscription(kt, segs)
    if (furi) furiganaSource = 'tatoeba'
  }
  furi ??= kt.map((t) => {
    const r = readingOverride[t.surface_form] ?? (t.reading !== '*' ? t.reading : undefined)
    return r ? alignFurigana(t.surface_form, r) : [{ s: t.surface_form }]
  })

  const rs = roles(kt)
  const tokens: Token[] = kt.map((t, i) => {
    const tok: Token = { s: t.surface_form, role: rs[i] }
    if (furi[i].some((f) => f.r)) tok.f = furi[i]
    if (t.basic_form !== '*' && t.basic_form !== t.surface_form) tok.b = t.basic_form
    if (isTarget(t)) tok.target = true
    return tok
  })

  // Katakana bleibt Katakana (コーヒー), damit Langvokale korrekt romanisiert werden.
  const kanaOf = (i: number) => furi[i].map((f) => f.r ?? f.s).join('')
  const kana = kt.map((_, i) => kanaOf(i)).join('')

  // Wörter bilden (Token + angehängte Tokens), erst dann romanisieren – sonst geht das kleine っ verloren.
  const groups: { kana: string; single?: KToken }[] = []
  kt.forEach((t, i) => {
    if (PUNCT[t.surface_form]) { groups.push({ kana: PUNCT[t.surface_form], single: t }); return }
    const numberRun = t.pos_detail_1 === '数' && kt[i - 1]?.pos_detail_1 === '数'
    if (i > 0 && (isAttached(t) || numberRun) && groups.length && !PUNCT[kt[i - 1].surface_form]) {
      const g = groups[groups.length - 1]
      g.kana += kanaOf(i); g.single = undefined
    } else groups.push({ kana: kanaOf(i), single: t })
  })
  let romaji = groups.map((g) => {
    if (g.single && PUNCT[g.single.surface_form]) return g.kana
    if (g.single?.pos === '助詞' && PARTICLE_ROMAJI[g.single.surface_form]) return PARTICLE_ROMAJI[g.single.surface_form]
    return wk.toRomaji(g.kana)
  }).join(' ')
  romaji = romaji.replace(/ ([.,?!"])/g, '$1').replace(/" /g, '"').trim()
  romaji = romaji.replace(/[a-z]/, (c) => c.toUpperCase()) // erster Buchstabe groß (auch nach „“)

  const chunks: string[] = []
  kt.forEach((t, i) => {
    if (t.pos === '記号' && chunks.length) chunks[chunks.length - 1] += t.surface_form
    else if (startsChunk(t, kt[i - 1]) || !chunks.length) chunks.push(t.surface_form)
    else chunks[chunks.length - 1] += t.surface_form
  })

  const basics = kt
    .filter((t) => ['名詞', '動詞', '形容詞', '副詞'].includes(t.pos) && t.pos_detail_1 !== '数' && t.pos_detail_1 !== '非自立')
    .map((t) => (t.basic_form === '*' ? t.surface_form : t.basic_form))

  return { tokens, kana, romaji, chunks, furiganaSource, basics }
}
