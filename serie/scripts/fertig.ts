// /fertig: alle Folgen/App-Videos mit Aufnahme, aber ohne fertiges Video → verarbeiten, prüfen, rendern.
//   tsx scripts/fertig.ts [--nur-kontrolle] [ep03 …]
import fs from 'node:fs';
import path from 'node:path';
import { alleEpisoden, ausgabeOrdner, findeAufnahme, ladeVorlage } from './lib/projekt';
import { rendere } from './render';

const args = process.argv.slice(2);
const nurKontrolle = args.includes('--nur-kontrolle');
const gewaehlt = args.filter((a) => !a.startsWith('--'));
// Mit ElevenLabs braucht keine Folge eine Aufnahme → alle noch nicht fertigen Folgen (der Reihe nach, höchstens --max N)
const el = ladeVorlage().erzaehler?.quelle === 'elevenlabs' && Boolean(process.env.ELEVENLABS_API_KEY);
const maxArg = args.find((a) => a.startsWith('--max='));
const max = maxArg ? Number(maxArg.split('=')[1]) : Infinity;
const liste = (gewaehlt.length ? gewaehlt : alleEpisoden()).filter((id) => (findeAufnahme(id) || el) && (gewaehlt.length || !fs.existsSync(path.join(ausgabeOrdner(id), 'video.mp4')))).slice(0, max);
if (!liste.length) { console.log(el ? 'Nichts zu tun: alle geplanten Folgen sind fertig. Neue Staffel mit /staffel planen.' : 'Nichts zu tun: keine neue Aufnahme gefunden (recordings/<folge>/voice.m4a).'); process.exit(0); }
let ok = 0;
for (const id of liste) {
  console.log(`\n▶ ${id}`);
  try {
    const r = await rendere(id, { vorschau: false, nurKontrolle });
    console.log(`✓ ${id} ${nurKontrolle ? 'geprüft' : 'fertig'} in ${r.sek.toFixed(0)} s – Bericht: ${path.relative(process.cwd(), r.berichtDatei)}`);
    r.bericht.warnungen.forEach((w) => console.log('  ⚠️ ' + w));
    ok++;
  } catch (e) { console.log(`✗ ${id}: ${(e as Error).message}`); if (/Guthaben/.test((e as Error).message)) break; }
}
console.log(`\n${ok}/${liste.length} erledigt.`);
