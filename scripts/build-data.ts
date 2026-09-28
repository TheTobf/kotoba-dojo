/**
 * Baut die Lerndaten aus den Rohdaten (scripts/raw) + manuellen Ergänzungen (scripts/manual).
 * Aufruf: npm run data:build -- [Anzahl Wörter, Standard 200]
 *
 * Ausgabe:
 *   public/data/words.json, sentences.json, kanji.json, strokes/<hex>.json
 *   scripts/work/review.json – Kandidaten + offene Punkte zur manuellen Prüfung
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import * as wk from 'wanakana'
import { analyse, buildTokenizer, hasKanji, type KToken } from './lib/nlp'
import { attachAudio } from './lib/audio-manifest'
import type { Kanji, Sentence, Word, Wortart } from '../src/types'

const N = Number(process.argv[2] ?? 200)
const ROOT = join(import.meta.dirname, '..')
const RAW = join(ROOT, 'scripts/raw')
const OUT = join(ROOT, 'public/data')
const WORK = join(ROOT, 'scripts/work')
const LESSON_SIZE = 5
const MAX_LEN = 26

const readJson = <T>(p: string, fallback: T): T => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback)
async function* lines(file: string) {
  for await (const l of createInterface({ input: createReadStream(join(RAW, file), 'utf8'), crlfDelay: Infinity })) yield l
}

// ---------- Manuelle Ergänzungen ----------
interface ManualWord {
  skip?: boolean
  meaningsDe?: string[]
  emoji?: string
  pos?: Wortart
  sentence?: { tatoebaId?: number; ja?: string; de?: string; grammar?: string }
}
// Ergänzungen sind auf mehrere Dateien verteilt (words.json, words-0201.json, …; kanji*.json).
const mergeDir = <T>(prefix: string): Record<string, T> =>
  Object.assign({}, ...readdirSync(join(ROOT, 'scripts/manual'))
    .filter((f) => f.startsWith(prefix) && f.endsWith('.json')).sort()
    .map((f) => readJson<Record<string, T>>(join(ROOT, 'scripts/manual', f), {})))
const manualWords = mergeDir<ManualWord>('words')
const manualKanji = mergeDir<string[]>('kanji')
const lemmaCfg = readJson<{
  skip: string[]; include: string[]; reading: Record<string, string>; entry: Record<string, string>; furigana: Record<string, string>
}>(join(ROOT, 'scripts/manual/lemmas.json'), { skip: [], include: [], reading: {}, entry: {}, furigana: {} })
const skipLemma = new Set(lemmaCfg.skip)
const includeLemma = new Set(lemmaCfg.include)

// ---------- Häufigkeitsliste ----------
console.time('lemmas')
const lemmaRank = new Map<string, number>()
readFileSync(join(RAW, 'leeds-lemmas.txt'), 'utf8').split('\n').forEach((l, i) => {
  const lemma = l.trim().split(/\s+/)[1]
  if (lemma && !lemmaRank.has(lemma)) lemmaRank.set(lemma, i + 1)
})
console.timeEnd('lemmas')

// ---------- JMdict ----------
console.time('jmdict')
interface JEntry {
  id: string
  kanji: { common: boolean; text: string; tags: string[] }[]
  kana: { common: boolean; text: string; tags: string[]; appliesToKanji: string[] }[]
  sense: { partOfSpeech: string[]; appliesToKanji: string[]; appliesToKana: string[]; misc: string[]; gloss: { lang: string; text: string }[] }[]
}
const jm: { words: JEntry[] } = JSON.parse(readFileSync(join(RAW, 'jmdict-all/jmdict-all-3.6.2.json'), 'utf8'))
const byKanji = new Map<string, JEntry[]>()
const byKana = new Map<string, JEntry[]>()
const push = (m: Map<string, JEntry[]>, k: string, e: JEntry) => (m.get(k) ?? m.set(k, []).get(k)!).push(e)
for (const e of jm.words) {
  e.kanji.forEach((k) => push(byKanji, k.text, e))
  e.kana.forEach((k) => push(byKana, k.text, e))
}
console.timeEnd('jmdict')

const isUk = (e: JEntry) => e.kanji.length === 0 || e.sense[0]?.misc.includes('uk')

/** Wie ein Wort im Satzkorpus tatsächlich vorkommt (aus der kuromoji-Analyse). */
interface Usage { content: number; func: number; readings: Map<string, number>; pos: Map<string, number>; ctype: Map<string, number> }
const usage = new Map<string, Usage>()
const CONTENT_POS = new Set(['名詞', '動詞', '形容詞', '副詞', '連体詞', '接続詞', '感動詞'])
const isContent = (t: KToken) => CONTENT_POS.has(t.pos) && t.pos_detail_1 !== '接尾' && t.pos_detail_1 !== '数'
const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)
const top = (m?: Map<string, number>) => [...(m ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0]

function posMatches(jpos: string, kpos?: string, ctype?: string): boolean {
  switch (kpos) {
    case '動詞':
      if (ctype?.startsWith('一段')) return jpos === 'v1' || jpos === 'v1-s'
      if (ctype?.startsWith('五段')) return jpos.startsWith('v5')
      if (ctype?.startsWith('サ変')) return jpos.startsWith('vs')
      if (ctype?.startsWith('カ変')) return jpos === 'vk'
      return jpos.startsWith('v')
    case '形容詞': return jpos.startsWith('adj-i')
    case '名詞': return /^(n|pn|adj-na|adj-no|vs$)/.test(jpos)
    case '副詞': return jpos.startsWith('adv')
    case '連体詞': return jpos === 'adj-pn'
    case '接続詞': return jpos === 'conj'
    case '感動詞': return jpos === 'int'
    default: return false
  }
}

/** Wählt Eintrag + Lesung passend zur tatsächlichen Verwendung im Korpus. */
function lookup(lemma: string): { entry: JEntry; reading: string } | undefined {
  const kanaLemma = wk.isKana(lemma)
  const c = (kanaLemma ? byKana.get(lemma) : byKanji.get(lemma)) ?? []
  const u = usage.get(lemma)
  const domReading = kanaLemma ? wk.toHiragana(lemma) : lemmaCfg.reading[lemma] ?? top(u?.readings)
  const domPos = top(u?.pos)
  const domCtype = top(u?.ctype)
  const score = (e: JEntry) => {
    const kanaOk = !kanaLemma && domReading && e.kana.some((k) => k.text === domReading &&
      (k.appliesToKanji.includes('*') || k.appliesToKanji.includes(lemma)))
    const posOk = e.sense.slice(0, 2).some((s) => s.partOfSpeech.some((p) => posMatches(p, domPos, domCtype)))
    const common = (kanaLemma ? e.kana : e.kanji).some((f) => f.text === lemma && f.common)
    return (kanaOk ? 4 : 0) + (posOk ? 2 : 0) + (common ? 1 : 0) + (kanaLemma && isUk(e) ? 0.5 : 0)
  }
  const forced = lemmaCfg.entry[lemma]
  const entry = forced ? jm.words.find((e) => e.id === forced) : [...c].sort((a, b) => score(b) - score(a))[0]
  if (!entry) return
  const reading = kanaLemma ? lemma
    : entry.kana.find((k) => k.text === domReading && (k.appliesToKanji.includes('*') || k.appliesToKanji.includes(lemma)))?.text
      ?? (entry.kana.find((k) => k.appliesToKanji.includes('*') || k.appliesToKanji.includes(lemma)) ?? entry.kana[0]).text
  return { entry, reading }
}

const FUNC_POS = new Set(['prt', 'aux', 'aux-v', 'aux-adj', 'suf', 'n-suf', 'pref', 'cop', 'cop-da'])
function wortart(pos: string[]): Wortart {
  const p = pos[0] ?? ''
  if (/^v[15kz]|^vs-/.test(p)) return 'Verb'
  if (p === 'adj-i' || p === 'adj-ix') return 'i-Adjektiv'
  if (p === 'adj-na') return 'na-Adjektiv'
  if (p === 'adj-pn') return 'Adnominal'
  if (p.startsWith('adv')) return 'Adverb'
  if (p === 'pn') return 'Pronomen'
  if (p === 'conj') return 'Konjunktion'
  if (p === 'int') return 'Interjektion'
  if (p === 'ctr') return 'Zählwort'
  if (p === 'exp') return 'Ausdruck'
  if (p.startsWith('n') || p === 'vs') return 'Nomen'
  return 'Sonstiges'
}

// ---------- Tatoeba ----------
console.time('tatoeba')
const jpn = new Map<number, { text: string; owner: string }>()
for await (const l of lines('jpn_sentences.tsv')) {
  const [id, , text, owner] = l.split('\t')
  if (text && [...text].length <= MAX_LEN && !/[A-Za-zＡ-Ｚａ-ｚ0-9０-９]/.test(text)) jpn.set(+id, { text, owner })
}
async function loadTranslations(linksFile: string, sentFile: string) {
  const links = new Map<number, number[]>()
  for await (const l of lines(linksFile)) {
    const [a, b] = l.split('\t').map(Number)
    if (jpn.has(a)) (links.get(a) ?? links.set(a, []).get(a)!).push(b)
  }
  const wanted = new Set([...links.values()].flat())
  const texts = new Map<number, string>()
  for await (const l of lines(sentFile)) {
    const [id, , text] = l.split('\t')
    if (wanted.has(+id)) texts.set(+id, text)
  }
  const out = new Map<number, string>()
  for (const [j, ts] of links) {
    // kürzeste Übersetzung nehmen (meist die direkteste)
    const best = ts.map((t) => texts.get(t)).filter(Boolean).sort((x, y) => x!.length - y!.length)[0]
    if (best) out.set(j, best)
  }
  return out
}
const deu = await loadTranslations('jpn-deu_links.tsv', 'deu_sentences.tsv')
const eng = await loadTranslations('jpn-eng_links.tsv', 'eng_sentences.tsv')
const AUDIO_OK = new Set(['CC BY 4.0', 'CC BY-NC 4.0', 'CC0 1.0'])
const audio = new Map<number, { audioId: number; user: string; license: string }>()
for await (const l of lines('jpn_audio.tsv')) {
  const [id, audioId, user, license] = l.split('\t')
  if (AUDIO_OK.has(license) && !audio.has(+id)) audio.set(+id, { audioId: +audioId, user, license })
}
const transcription = new Map<number, string>()
for await (const l of lines('jpn_transcriptions.tsv')) {
  const [id, , script, , text] = l.split('\t')
  if (script === 'Hrkt') transcription.set(+id, text)
}
console.timeEnd('tatoeba')

// ---------- Tokenisierung der Kandidatensätze ----------
console.time('tokenize')
const tk = await buildTokenizer()
const basicIndex = new Map<string, number[]>()
const sentBasics = new Map<number, string[]>()
for (const [id] of jpn) {
  if (!deu.has(id) && !eng.has(id)) continue
  const toks = tk.tokenize(jpn.get(id)!.text)
  const bs = new Set<string>()
  for (const t of toks) {
    const b = t.basic_form === '*' ? t.surface_form : t.basic_form
    bs.add(b); bs.add(t.surface_form)
    const u = usage.get(b) ?? usage.set(b, { content: 0, func: 0, readings: new Map(), pos: new Map(), ctype: new Map() }).get(b)!
    if (isContent(t)) {
      u.content++
      inc(u.pos, t.pos)
      if (t.conjugated_type !== '*') inc(u.ctype, t.conjugated_type)
      // Lesung nur bei unflektierten Formen verlässlich
      if (t.surface_form === b && t.reading && t.reading !== '*') inc(u.readings, wk.toHiragana(t.reading))
    } else if (['助詞', '助動詞'].includes(t.pos) || t.pos_detail_1 === '接尾') u.func++
  }
  for (const b of bs) (basicIndex.get(b) ?? basicIndex.set(b, []).get(b)!).push(id)
  sentBasics.set(id, toks
    .filter((t) => ['名詞', '動詞', '形容詞', '副詞'].includes(t.pos) && t.pos_detail_1 !== '数' && t.pos_detail_1 !== '非自立')
    .map((t) => (t.basic_form === '*' ? t.surface_form : t.basic_form)))
}
console.timeEnd('tokenize')

// ---------- Wörter auswählen ----------
interface Picked { entry: JEntry; reading: string; lemma: string; rank: number }
const picked: Picked[] = []
const skipped: { lemma: string; why: string }[] = []
const seen = new Set<string>()
for (const [lemma, rank] of lemmaRank) {
  if (picked.length >= N) break
  if (!/[぀-ヿ㐀-鿿]/.test(lemma)) continue
  if (skipLemma.has(lemma)) { skipped.push({ lemma, why: 'manuell ausgeschlossen' }); continue }
  const u = usage.get(lemma)
  if (!includeLemma.has(lemma)) {
    if (!u || u.content < 3) { skipped.push({ lemma, why: 'kaum als eigenständiges Wort belegt' }); continue }
    if (u.func > u.content) { skipped.push({ lemma, why: 'meist Partikel/Hilfsverb/Suffix' }); continue }
  }
  const found = lookup(lemma)
  if (!found) { skipped.push({ lemma, why: 'nicht in JMdict' }); continue }
  const e = found.entry
  if (e.sense.flatMap((s) => s.partOfSpeech).every((p) => FUNC_POS.has(p))) {
    skipped.push({ lemma, why: 'nur Partikel/Hilfsverb/Affix' }); continue
  }
  const id = `w${e.id}`
  if (seen.has(id)) { skipped.push({ lemma, why: 'Dublette' }); continue }
  if (manualWords[id]?.skip) { skipped.push({ lemma, why: 'manuell ausgeschlossen' }); continue }
  seen.add(id)
  picked.push({ entry: e, reading: found.reading, lemma, rank })
}

// ---------- Sätze wählen ----------
const words: Word[] = []
const sentences: Sentence[] = []
const review: unknown[] = []
const usedSentences = new Set<number>()
/** Muttersprachler-Aufnahmen, die gen-audio herunterlädt (statt TTS). */
const tatoebaAudio: { sentenceId: string; audioId: number; user: string; license: string }[] = []

for (const [idx, p] of picked.entries()) {
  const e = p.entry
  const id = `w${e.id}`
  const m = manualWords[id] ?? {}
  const kanaForm = wk.isKana(p.lemma)
  const reading = p.reading
  // Schreibweise: Kana, wenn das Wort üblicherweise in Kana geschrieben wird, sonst die gängige Kanji-Form.
  const mainKanji = e.kanji.find((k) => k.text === p.lemma) ?? e.kanji.find((k) => k.common && !k.tags.includes('rK')) ?? e.kanji[0]
  // Katakana-Wörter (イラク) und Kana-Wörter mit seltener Kanji-Form (其れから, 嗚呼) bleiben in Kana.
  const keepKana = kanaForm && (wk.isKatakana(p.lemma) || !mainKanji?.common)
  const surface = isUk(e) || !mainKanji || keepKana ? (kanaForm ? p.lemma : reading) : kanaForm ? mainKanji.text : p.lemma
  const senses = e.sense.filter((s) =>
    (s.appliesToKana.includes('*') || s.appliesToKana.includes(reading)) &&
    (kanaForm || s.appliesToKanji.includes('*') || s.appliesToKanji.includes(p.lemma)))
  const gl = (lang: string) => [...new Set(senses.flatMap((s) => s.gloss.filter((g) => g.lang === lang).map((g) => g.text)))]
  const de = gl('ger').filter((g) => g.length <= 40).slice(0, 4)
  const en = gl('eng').slice(0, 5)
  const pos = m.pos ?? wortart(senses[0]?.partOfSpeech ?? e.sense[0].partOfSpeech)
  // Lesung nur als Suchform, wenn das Wort in Kana geschrieben wird (sonst passt き aus 来る zu 気).
  const forms = new Set([p.lemma, surface, ...e.kanji.map((k) => k.text), ...(wk.isKana(surface) ? [reading] : [])])
  const relaxed = includeLemma.has(p.lemma)
  const isTarget = (t: KToken) => {
    const posOk = isContent(t) || (relaxed && t.pos === '名詞')
    if (!posOk || !(forms.has(t.basic_form) || forms.has(t.surface_form))) return false
    // unflektierte Kanji-Wörter: Lesung muss passen (分 ≠ 十分, 日 als ひ ≠ にち)
    if (t.surface_form === t.basic_form && hasKanji(t.surface_form) && t.reading && t.reading !== '*')
      return wk.toHiragana(t.reading) === reading
    return true
  }

  // Kandidaten nach Schwierigkeit bewerten
  const limit = Math.max(1500, p.rank * 3)
  const cands = [...new Set(forms)].flatMap((f) => basicIndex.get(f) ?? [])
    .filter((sid, i, a) => a.indexOf(sid) === i && !usedSentences.has(sid))
    .map((sid) => {
      const s = jpn.get(sid)!
      const hard = sentBasics.get(sid)!.filter((b) => (lemmaRank.get(b) ?? 99999) > limit).length
      const score = hard * 10 + [...s.text].length * 0.15 + (deu.has(sid) ? 0 : 4)
        + (audio.has(sid) ? -3 : 0) + (transcription.has(sid) ? -1 : 0) + (s.owner === '\\N' ? 3 : 0)
      return { sid, score }
    })
    .sort((a, b) => a.score - b.score)
    // nur Sätze, in denen das Zielwort wirklich als dieses Wort vorkommt
    .filter((c) => tk.tokenize(jpn.get(c.sid)!.text).some(isTarget))
    .slice(0, 4)

  const choiceId = m.sentence?.tatoebaId ?? (m.sentence?.ja ? undefined : cands[0]?.sid)
  let sentence: Sentence | undefined
  if (choiceId || m.sentence?.ja) {
    const ja = choiceId ? jpn.get(choiceId)!.text : m.sentence!.ja!
    // Eigene Sätze enthalten das Wort garantiert: Lesung des Zielworts erzwingen, Zielwort großzügig erkennen.
    const a = choiceId
      ? analyse(tk, ja, isTarget, transcription.get(choiceId), lemmaCfg.furigana)
      : analyse(tk, ja,
          (t) => t.pos !== '助詞' && t.pos !== '助動詞' && (forms.has(t.basic_form) || [...forms].some((f) => t.surface_form.includes(f))),
          undefined, { ...lemmaCfg.furigana, [surface]: reading })
    const au = choiceId ? audio.get(choiceId) : undefined
    if (choiceId) usedSentences.add(choiceId)
    sentence = {
      id: `s${choiceId ?? e.id + 'c'}`,
      wordId: id,
      ja,
      tokens: a.tokens,
      kana: a.kana,
      romaji: a.romaji,
      de: m.sentence?.de ?? (choiceId ? deu.get(choiceId) : undefined) ?? '',
      grammar: m.sentence?.grammar ?? '',
      chunks: a.chunks,
      source: choiceId ? 'tatoeba' : 'claude',
      furiganaSource: a.furiganaSource,
      ...(choiceId && { tatoebaId: choiceId }),
    }
    if (au) tatoebaAudio.push({ sentenceId: sentence.id, audioId: au.audioId, user: au.user, license: au.license })
    sentences.push(sentence)
  }

  const meaningsDe = m.meaningsDe ?? de
  words.push({
    id, rank: idx + 1, lesson: Math.floor(idx / LESSON_SIZE) + 1,
    surface, reading, romaji: wk.toRomaji(reading), pos,
    meaningsDe,
    meaningSource: m.meaningsDe ? 'claude' : 'jmdict',
    kanji: [...new Set([...surface].filter(hasKanji))],
    sentenceIds: sentence ? [sentence.id] : [],
    ...(m.emoji && { emoji: m.emoji }),
  })

  const todo = [
    !meaningsDe.length && 'meaningsDe',
    !sentence && 'sentence',
    sentence && !sentence.de && 'de',
    sentence && !sentence.grammar && 'grammar',
    !m.emoji && 'emoji',
  ].filter(Boolean)
  review.push({
    id, rank: idx + 1, surface, reading, pos, leedsRank: p.rank, de, en, todo,
    chosen: sentence && { tatoebaId: sentence.tatoebaId, ja: sentence.ja, de: sentence.de, en: sentence.tatoebaId ? eng.get(sentence.tatoebaId) : undefined },
    alternatives: cands.slice(1).map((c) => ({ tatoebaId: c.sid, ja: jpn.get(c.sid)!.text, de: deu.get(c.sid), en: eng.get(c.sid), audio: audio.has(c.sid) })),
  })
}

// ---------- Kanji ----------
console.time('kanji')
interface KD {
  literal: string
  misc: { strokeCounts: number[]; frequency: number | null }
  readingMeaning: { groups: { readings: { type: string; value: string }[]; meanings: { lang: string; value: string }[] }[] } | null
}
const kd: { characters: KD[] } = JSON.parse(readFileSync(join(RAW, 'kanjidic2/kanjidic2-en-3.6.2.json'), 'utf8'))
const kdMap = new Map(kd.characters.map((c) => [c.literal, c]))
const kanjiUse = new Map<string, string[]>()
for (const w of words) for (const k of w.kanji) (kanjiUse.get(k) ?? kanjiUse.set(k, []).get(k)!).push(w.id)

rmSync(join(OUT, 'strokes'), { recursive: true, force: true })
mkdirSync(join(OUT, 'strokes'), { recursive: true })
const kanji: Kanji[] = []
const kanjiReview: unknown[] = []
for (const [char, wordIds] of kanjiUse) {
  const c = kdMap.get(char)
  const groups = c?.readingMeaning?.groups ?? []
  const reads = (t: string) => groups.flatMap((g) => g.readings.filter((r) => r.type === t).map((r) => r.value))
  const hex = char.codePointAt(0)!.toString(16).padStart(5, '0')
  const svgFile = join(RAW, 'kanjivg/kanji', `${hex}.svg`)
  if (existsSync(svgFile)) {
    const paths = [...readFileSync(svgFile, 'utf8').matchAll(/<path id="kvg:[^"]+-s\d+"[^>]* d="([^"]+)"/g)].map((m) => m[1])
    writeFileSync(join(OUT, 'strokes', `${hex}.json`), JSON.stringify(paths))
  }
  const meaningsDe = manualKanji[char] ?? []
  kanji.push({
    char,
    rank: c?.misc.frequency ?? 9999,
    strokes: c?.misc.strokeCounts[0] ?? 0,
    onyomi: reads('ja_on'),
    kunyomi: reads('ja_kun'),
    meaningsDe,
    wordIds,
    ...(existsSync(svgFile) && { svg: `strokes/${hex}.json` }),
  })
  if (!meaningsDe.length) kanjiReview.push({ char, en: groups.flatMap((g) => g.meanings.filter((m) => m.lang === 'en').map((m) => m.value)).slice(0, 4) })
}
kanji.sort((a, b) => a.rank - b.rank)
console.timeEnd('kanji')

// ---------- Schreiben ----------
mkdirSync(OUT, { recursive: true })
mkdirSync(WORK, { recursive: true })
attachAudio(words, sentences)
writeFileSync(join(WORK, 'tatoeba-audio.json'), JSON.stringify(tatoebaAudio, null, 1))
writeFileSync(join(OUT, 'words.json'), JSON.stringify(words))
writeFileSync(join(OUT, 'sentences.json'), JSON.stringify(sentences))
writeFileSync(join(OUT, 'kanji.json'), JSON.stringify(kanji))
writeFileSync(join(WORK, 'review.json'), JSON.stringify({ words: review, kanji: kanjiReview, skipped }, null, 1))

const count = (k: string) => review.filter((r) => (r as { todo: string[] }).todo.includes(k)).length
console.log(`\n${words.length} Wörter, ${sentences.length} Sätze, ${kanji.length} Kanji`)
console.log(`Sätze mit Audio: ${sentences.filter((s) => s.audio).length}, Furigana von Tatoeba: ${sentences.filter((s) => s.furiganaSource === 'tatoeba').length}`)
console.log(`Offen → Bedeutung: ${count('meaningsDe')}, Satz: ${count('sentence')}, dt. Übersetzung: ${count('de')}, Grammatik: ${count('grammar')}, Emoji: ${count('emoji')}, Kanji-Bedeutung: ${kanjiReview.length}`)
console.log(`Übersprungen: ${skipped.length}`)
