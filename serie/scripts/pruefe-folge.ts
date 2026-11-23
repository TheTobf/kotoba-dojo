// Prüft episode.json (Format, Lehrplan, Regeln) und schreibt das Sprechskript recordings/epXX/script.md.
//   tsx scripts/pruefe-folge.ts ep01 [ep02 …] | --alle
import fs from 'node:fs';
import path from 'node:path';
import type { Episode } from '../src/folge/typen';
import { schreibeSkript } from './ausgabe';
import { alleEpisoden, epOrdner, ladeEpisode, ladeLehrplan, ladeVorlage, lies, p } from './lib/projekt';

const SZENEN = ['flughafen', 'bahnsteig', 'konbini', 'strasse', 'hotel', 'studio'];
const AKTIONEN = ['stehen', 'gehen', 'zeigen', 'verwirrt', 'freuen', 'winken', 'sprechen', 'erschrecken', 'traurig', 'verbeugen', 'rennen'];
const PRESETS = ['totale', 'halbnah', 'nah', 'gross', 'ueberSchulter', 'frosch', 'vogel', 'seite'];

export function pruefeFolge(id: string): { fehler: string[]; warnungen: string[]; schaetzungSek: number } {
  const ep: Episode = ladeEpisode(id), lp = ladeLehrplan(), v = ladeVorlage();
  const F: string[] = [], W: string[] = [];
  const ids = new Set<string>();
  if (ep.id !== id) F.push(`id „${ep.id}“ passt nicht zum Ordner ${id}`);
  for (const k of ['titel', 'problem', 'cliffhanger'] as const) if (!ep[k]) F.push(`${k} fehlt`);
  const istApp = id.startsWith('app') || ep.art === 'app';
  if (!istApp) {
    if (ep.neu.length < 1 || ep.neu.length > 2) F.push(`neu: ${ep.neu.length} Sätze (Regel: 1–2)`);
    if (ep.folge > 1 && ep.wiederholung.length !== 1) F.push(`wiederholung: ${ep.wiederholung.length} (Regel: genau 1 aus früheren Folgen)`);
  }
  for (const c of [...ep.neu, ...ep.wiederholung]) { if (!lp[c]) F.push(`Lehrplan-ID ${c} unbekannt`); else if (lp[c].pruefen) F.push(`${c} ist noch [PRÜFEN]`); }
  // Wiederholung muss früher dran gewesen sein
  const frueher = new Set<string>();
  for (const e of alleEpisoden().filter((x) => x.startsWith('ep') && x < id)) ladeEpisode(e).neu.forEach((c) => frueher.add(c));
  lies<{ gelernt: string[] }>(p('curriculum', 'progress.json')).gelernt.forEach((c) => frueher.add(c));
  ep.wiederholung.forEach((c) => { if (!frueher.has(c)) F.push(`Wiederholung ${c} kam in keiner früheren Folge vor`); });
  ep.neu.forEach((c) => { if (frueher.has(c)) W.push(`${c} wurde schon früher gelernt – wirklich neu?`); });
  let sek = 0, woerter = 0;
  ep.segmente.forEach((s, i) => {
    if (ids.has(s.id)) F.push(`Segment-ID ${s.id} doppelt`); ids.add(s.id);
    if (s.art === 'erzaehler') {
      if (!s.text) F.push(`${s.id}: Text fehlt`);
      const n = (s.text ?? '').split(/\s+/).length; woerter += n; sek += n / 2.5 + 0.2;
      if (n > 16) W.push(`${s.id}: ${n} Wörter – lieber kürzer (gut sprechbar)`);
    } else if (s.art === 'japanisch') {
      const l = s.curriculum ? lp[s.curriculum] : null;
      if (s.curriculum && !l) F.push(`${s.id}: ${s.curriculum} unbekannt`);
      if (!s.curriculum && !(s.text && s.kana && s.romaji && s.de)) F.push(`${s.id}: freier Satz braucht text, kana, romaji, de`);
      if (!s.curriculum) W.push(`${s.id}: freier Satz „${s.text}“ – nicht im geprüften Lehrplan (doppelt prüfen!)`);
      if (!s.sprecher || !v.stimmen[s.sprecher]) F.push(`${s.id}: sprecher „${s.sprecher}“ nicht in stilvorlage.stimmen`);
      const kana = (l?.kana ?? s.kana ?? '').length; sek += (kana * 0.14 + 0.4) * (s.wiederholen ? 2.1 : 1);
    } else if (s.art === 'quiz') { sek += s.sek ?? v.schnitt.quizCountdownSek; if (ep.segmente[i + 1]?.art !== 'japanisch') F.push(`${s.id}: nach dem Quiz muss die japanische Auflösung kommen`); }
    else sek += s.sek ?? 0.6;
    sek += 0.25;
  });
  sek += v.schnitt.endeTeaserSek;
  if (!istApp && !ep.segmente.some((s) => s.art === 'quiz')) F.push('Kein Quiz-Moment');
  if (!ep.texte.some((t) => t.art === 'hook' && t.ab === ep.segmente[0]?.id)) F.push('Hook-Text am ersten Segment fehlt');
  ep.texte.forEach((t) => { if (!ids.has(t.ab)) F.push(`Text ab „${t.ab}“: Segment fehlt`); });
  if (!ep.shots.length || ep.shots[0].ab !== ep.segmente[0].id) F.push('Erster Shot muss beim ersten Segment beginnen');
  ep.shots.forEach((sh, i) => {
    if (!ids.has(sh.ab)) F.push(`Shot ${i + 1}: Segment „${sh.ab}“ fehlt`);
    if (!SZENEN.includes(sh.szene)) F.push(`Shot ${i + 1}: Szene „${sh.szene}“ gibt es nicht (${SZENEN.join(', ')})`);
    if (!PRESETS.includes(sh.kamera.preset)) F.push(`Shot ${i + 1}: Kamera „${sh.kamera.preset}“ unbekannt`);
    if (sh.kamera.fokus && !sh.kamera.fokus.includes(',') && !sh.figuren.some((f) => f.id === sh.kamera.fokus)) F.push(`Shot ${i + 1}: Fokus „${sh.kamera.fokus}“ ist keine Figur im Shot`);
    if (sh.kamera.preset === 'ueberSchulter' && !sh.figuren.some((f) => f.id === sh.kamera.gegen)) F.push(`Shot ${i + 1}: ueberSchulter braucht „gegen“`);
    sh.figuren.forEach((f) => { if (f.aktion && !AKTIONEN.includes(f.aktion)) F.push(`Shot ${i + 1}: Aktion „${f.aktion}“ unbekannt`); });
  });
  const lmin = v.laenge.minSek, lmax = v.laenge.maxSek;
  if (sek < lmin - 4 || sek > lmax + 4) W.push(`geschätzte Länge ${sek.toFixed(0)} s (Ziel ${lmin}–${lmax} s) – Text anpassen`);
  return { fehler: F, warnungen: W, schaetzungSek: sek };
}

if (process.argv[1]?.endsWith('pruefe-folge.ts')) {
  const args = process.argv.slice(2);
  const liste = args.includes('--alle') ? alleEpisoden() : args;
  let fehler = 0;
  for (const id of liste) {
    if (!fs.existsSync(path.join(epOrdner(id), 'episode.json'))) { console.log(`✗ ${id}: episode.json fehlt`); fehler++; continue; }
    const r = pruefeFolge(id);
    if (!r.fehler.length) schreibeSkript(id);
    console.log(`${r.fehler.length ? '✗' : '✓'} ${id} (≈ ${r.schaetzungSek.toFixed(0)} s)${r.fehler.length ? '' : ' → recordings/' + id + '/script.md'}`);
    r.fehler.forEach((f) => console.log('   ❌ ' + f)); r.warnungen.forEach((w) => console.log('   ⚠️ ' + w));
    fehler += r.fehler.length;
  }
  process.exit(fehler ? 1 : 0);
}
