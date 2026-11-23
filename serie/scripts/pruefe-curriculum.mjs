// Doppelprüfung des Lehrplans: (1) Romaji ↔ Kana (wanakana), (2) Lesung der Kanji ↔ Kana (kuromoji-Wörterbuch).
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const w = require('wanakana'); const kuromoji = require('kuromoji');
const datei = process.argv[2] ?? new URL('../curriculum/curriculum.json', import.meta.url).pathname;
const { eintraege } = JSON.parse(fs.readFileSync(datei, 'utf8'));
const VOK = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' };
// Hiragana, Satzzeichen weg, ー → Vokal der vorigen Silbe
function norm(s) {
  let h = w.toHiragana(s.replace(/Wi-Fi/g, 'わいふぁい').replace(/IC/g, 'あいしー'), { passRomaji: true }).replace(/[、。？！?!\s・]/g, '');
  let r = '';
  for (const ch of h) {
    if (ch === 'ー' && r) { const ro = w.toRomaji(r.at(-1)); r += VOK[ro.at(-1)] ?? ''; } else r += ch;
  }
  return r;
}
function romajiZuKana(ro) {
  return ro.toLowerCase().replace(/[,.?!]/g, '').split(/\s+/).map((t) => {
    t = t.replace(/-/g, '');
    if (t === 'wa') return 'は'; if (t === 'o') return 'を'; if (t === 'e') return 'へ';
    if (t === 'konnichiwa') return 'こんにちは'; if (t === 'konbanwa') return 'こんばんは';
    return w.toHiragana(t);
  }).join('');
}
const tok = await new Promise((ok, err) => kuromoji.builder({ dicPath: path.join(path.dirname(require.resolve('kuromoji')), '..', 'dict') }).build((e, t) => (e ? err(e) : ok(t))));
const geprueft = JSON.parse(fs.readFileSync(new URL('../curriculum/lesung-geprueft.json', import.meta.url), 'utf8')).saetze;
let fehler = 0;
for (const e of eintraege) {
  const k = norm(e.kana), r = norm(romajiZuKana(e.romaji));
  if (k !== r) { fehler++; console.log(`✗ ${e.id} Romaji≠Kana: ${e.romaji} → ${r} / ${k}`); }
  const lesung = norm(tok.tokenize(e.ja.replace(/Wi-Fi/g, 'ワイファイ').replace(/IC/g, 'アイシー')).map((t) => (t.reading && t.reading !== '*' ? t.reading : t.surface_form)).join(''));
  if (lesung !== k && !geprueft[e.ja]) console.log(`? ${e.id} Lesung (kuromoji) ${lesung} ≠ ${k}  [${e.ja}]`);
  for (const f of ['ja', 'kana', 'romaji', 'de', 'situation', 'niveau', 'thema', 'art']) if (e[f] == null || e[f] === '') { fehler++; console.log(`✗ ${e.id} Feld fehlt: ${f}`); }
}
const ids = new Set(eintraege.map((e) => e.ja)); if (ids.size !== eintraege.length) { fehler++; console.log('✗ doppelte Sätze'); }
console.log(`${eintraege.length} Einträge, ${fehler} Fehler, ${eintraege.filter((e) => e.pruefen).length} mit [PRÜFEN]`);
process.exit(fehler ? 1 : 0);
