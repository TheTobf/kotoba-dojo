/**
 * Lädt alle Rohdaten nach scripts/raw/ (nicht im Git). Lizenzen: siehe SOURCES.md.
 * Aufruf: npm run data:download
 */
import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import bz2 from 'unbzip2-stream'

const RAW = join(import.meta.dirname, 'raw')
mkdirSync(RAW, { recursive: true })

const JMDICT = '3.6.2%2B20260921173324'
const TATOEBA = 'https://downloads.tatoeba.org/exports/per_language'

const FILES: { url: string; out: string; unpack?: 'bz2' | 'tgz' | 'zip' }[] = [
  { url: 'https://raw.githubusercontent.com/xorgy/japanese-lemmas/master/lemmas', out: 'leeds-lemmas.txt' },
  { url: `https://github.com/scriptin/jmdict-simplified/releases/download/${JMDICT}/jmdict-all-${JMDICT}.json.tgz`, out: 'jmdict-all.tgz', unpack: 'tgz' },
  { url: `https://github.com/scriptin/jmdict-simplified/releases/download/${JMDICT}/kanjidic2-en-${JMDICT}.json.tgz`, out: 'kanjidic2.tgz', unpack: 'tgz' },
  { url: 'https://github.com/KanjiVG/kanjivg/releases/download/r20250816/kanjivg-20250816-main.zip', out: 'kanjivg.zip', unpack: 'zip' },
  { url: `${TATOEBA}/jpn/jpn_sentences_detailed.tsv.bz2`, out: 'jpn_sentences.tsv', unpack: 'bz2' },
  { url: `${TATOEBA}/jpn/jpn_sentences_with_audio.tsv.bz2`, out: 'jpn_audio.tsv', unpack: 'bz2' },
  { url: `${TATOEBA}/jpn/jpn_transcriptions.tsv.bz2`, out: 'jpn_transcriptions.tsv', unpack: 'bz2' },
  { url: `${TATOEBA}/jpn/jpn-deu_links.tsv.bz2`, out: 'jpn-deu_links.tsv', unpack: 'bz2' },
  { url: `${TATOEBA}/jpn/jpn-eng_links.tsv.bz2`, out: 'jpn-eng_links.tsv', unpack: 'bz2' },
  { url: `${TATOEBA}/deu/deu_sentences.tsv.bz2`, out: 'deu_sentences.tsv', unpack: 'bz2' },
  { url: `${TATOEBA}/eng/eng_sentences.tsv.bz2`, out: 'eng_sentences.tsv', unpack: 'bz2' },
]

for (const f of FILES) {
  const target = join(RAW, f.out)
  if (existsSync(target)) { console.log('✓ vorhanden', f.out); continue }
  console.log('↓', f.url)
  const res = await fetch(f.url)
  if (!res.ok || !res.body) throw new Error(`${res.status} ${f.url}`)
  const body = Readable.fromWeb(res.body as never)
  if (f.unpack === 'bz2') await pipeline(body, bz2(), createWriteStream(target))
  else await pipeline(body, createWriteStream(target))
  if (f.unpack === 'tgz' || f.unpack === 'zip') {
    const dir = join(RAW, f.out.replace(/\.\w+$/, ''))
    mkdirSync(dir, { recursive: true })
    execFileSync('tar', ['-xf', target, '-C', dir])
  }
}
console.log('Fertig.')
