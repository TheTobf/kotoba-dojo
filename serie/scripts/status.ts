// /status: fertige Folgen, Vorlauf in Tagen, fehlende Aufnahmen. Schreibt out/POSTPLAN.md neu.
import fs from 'node:fs';
import path from 'node:path';
import { schreibePostplan } from './ausgabe';
import { elKontingent, elSchluessel } from './ton/elevenlabs';
import { alleEpisoden, ausgabeOrdner, epOrdner, findeAufnahme, ladeEpisode, ladeSerie, lies, p } from './lib/projekt';

const serie = ladeSerie();
const plan = schreibePostplan();
const eps = alleEpisoden();
const zeilen = eps.map((id) => {
  const ep = ladeEpisode(id);
  const fertig = fs.existsSync(path.join(ausgabeOrdner(id), 'video.mp4'));
  const aufn = findeAufnahme(id);
  const vorschau = fs.existsSync(path.join(epOrdner(id), 'preview.mp4'));
  const st = fertig ? '✅ fertig' : aufn ? '🎙 Aufnahme da → /fertig' : elSchluessel() ? '🤖 bereit (ElevenLabs) → /fertig' : vorschau ? '👀 Vorschau, Aufnahme fehlt' : '⏳ Aufnahme fehlt';
  return { id, titel: ep.titel, st, fertig, aufn: Boolean(aufn) };
});
const prog = lies<{ gelernt: string[] }>(p('curriculum', 'progress.json'));
const lp = lies<{ eintraege: unknown[] }>(p('curriculum', 'curriculum.json'));
console.log(`Gestrandet in Japan – Stand ${new Date().toISOString().slice(0, 10)}`);
console.log(`Fertige Folgen: ${plan.fertig} von ${eps.filter((e) => e.startsWith('ep')).length} geplanten · Lehrplan: ${prog.gelernt.length}/${lp.eintraege.length} Sätze gelernt`);
console.log(`Vorlauf: ${plan.vorlaufTage} Tage${plan.vorlaufTage < serie.vorlaufZielTage ? '  ⚠️ UNTER 7 TAGEN – bitte Aufnahmen machen (/skripte)' : ''}`);
console.log('');
zeilen.forEach((z) => console.log(`  ${z.id.padEnd(7)} ${z.st.padEnd(28)} ${z.titel}`));
const fehlt = zeilen.filter((z) => !z.fertig && !z.aufn).map((z) => z.id);
console.log('');
console.log(elSchluessel() ? `Erzählung per ElevenLabs – keine Aufnahmen nötig. Noch nicht gerendert: ${zeilen.filter((z) => !z.fertig).map((z) => z.id).join(', ') || '–'}` : fehlt.length ? `Aufnahmen fehlen: ${fehlt.join(', ')} → /skripte fasst sie in recordings/AUFNAHME.md zusammen` : 'Keine Aufnahme fehlt.');
console.log('Postplan: out/POSTPLAN.md');
if (elSchluessel()) {
  try {
    const k = await elKontingent();
    const folgen = Math.floor(k.rest / 850);
    console.log(`ElevenLabs: ${k.rest} von ${k.limit} Zeichen übrig (Plan ${k.tier}) ≈ ${folgen} Folgen · Reset ${new Date(k.reset * 1000).toLocaleDateString('de-DE')}${folgen < 7 ? '  ⚠️ reicht keine Woche mehr' : ''}${k.tier === 'free' ? ' · Free-Plan: nicht kommerziell' : ''}`);
  } catch (e) { console.log('ElevenLabs: ' + (e as Error).message); }
} else console.log('ElevenLabs: kein Schlüssel (ELEVENLABS_API_KEY) – Erzählung nur per eigener Aufnahme.');
