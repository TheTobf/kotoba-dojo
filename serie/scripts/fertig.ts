// /fertig: alle Folgen/App-Videos mit Aufnahme, aber ohne fertiges Video → verarbeiten, prüfen, rendern.
//   tsx scripts/fertig.ts [--nur-kontrolle] [ep03 …]
import fs from 'node:fs';
import path from 'node:path';
import { alleEpisoden, ausgabeOrdner, findeAufnahme } from './lib/projekt';
import { rendere } from './render';

const args = process.argv.slice(2);
const nurKontrolle = args.includes('--nur-kontrolle');
const gewaehlt = args.filter((a) => !a.startsWith('--'));
const liste = (gewaehlt.length ? gewaehlt : alleEpisoden()).filter((id) => findeAufnahme(id) && (gewaehlt.length || !fs.existsSync(path.join(ausgabeOrdner(id), 'video.mp4'))));
if (!liste.length) { console.log('Nichts zu tun: keine neue Aufnahme gefunden (recordings/<folge>/voice.m4a).'); process.exit(0); }
let ok = 0;
for (const id of liste) {
  console.log(`\n▶ ${id}`);
  try {
    const r = await rendere(id, { vorschau: false, nurKontrolle });
    console.log(`✓ ${id} ${nurKontrolle ? 'geprüft' : 'fertig'} in ${r.sek.toFixed(0)} s – Bericht: ${path.relative(process.cwd(), r.berichtDatei)}`);
    r.bericht.warnungen.forEach((w) => console.log('  ⚠️ ' + w));
    ok++;
  } catch (e) { console.log(`✗ ${id}: ${(e as Error).message}`); }
}
console.log(`\n${ok}/${liste.length} erledigt.`);
