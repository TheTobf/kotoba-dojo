// /skripte: alle Skripte ohne Aufnahme in recordings/AUFNAHME.md (zum Einsprechen am Stück).
import fs from 'node:fs';
import path from 'node:path';
import { skript } from './ausgabe';
import { alleEpisoden, ausgabeOrdner, findeAufnahme, ladeEpisode, p } from './lib/projekt';

const offen = alleEpisoden().filter((id) => !findeAufnahme(id) && !fs.existsSync(path.join(ausgabeOrdner(id), 'video.mp4')));
const teile = offen.map((id) => skript(ladeEpisode(id)).replace(/^# /, '## '));
const md = [
  '# Aufnahmen – am Stück einsprechen', '',
  `${offen.length} Skript(e). **Pro Folge eine eigene Aufnahme** (Sprachmemo), gespeichert als \`recordings/<folge>/voice.m4a\`.`,
  'Tipps: ruhiger Raum, Handy ca. 20 cm vor dem Mund, zwischen den Sätzen kurz Luft holen. Versprochen? Satz einfach nochmal von vorn.',
  'Japanische Stellen und Quiz-Pausen **nicht** sprechen – die setze ich automatisch ein.', '',
  ...teile.flatMap((t) => [t, '---', '']),
].join('\n');
fs.writeFileSync(p('recordings', 'AUFNAHME.md'), md);
console.log(`✓ recordings/AUFNAHME.md (${offen.length} Skripte: ${offen.join(', ') || '–'})`);
