// Hilfsskript: kompakte Übersicht eines Rang-Bereichs aus scripts/work/review.json zum manuellen Ergänzen.
// Aufruf: node scripts/dump-batch.mjs 201 300
import { readFileSync } from 'node:fs'
const [from, to] = process.argv.slice(2).map(Number)
const r = JSON.parse(readFileSync(new URL('./work/review.json', import.meta.url), 'utf8'))
for (const w of r.words.filter((w) => w.rank >= from && w.rank <= to)) {
  const c = w.chosen ?? {}
  console.log([w.rank, w.id, w.surface, w.reading, w.pos, w.de.slice(0, 3).join(';'), w.en.slice(0, 3).join(';'),
    c.tatoebaId ?? '-', c.ja ?? '-', c.de ?? '', c.en ?? ''].join('|'))
}
