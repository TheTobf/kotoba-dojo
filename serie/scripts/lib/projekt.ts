// Pfade und Dateien des Serien-Projekts.
import fs from 'node:fs';
import path from 'node:path';
import type { CurriculumEintrag, Episode, Timing } from '../../src/folge/typen';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const p = (...t: string[]) => path.join(ROOT, ...t);
export const lies = <T,>(f: string): T => JSON.parse(fs.readFileSync(f, 'utf8')) as T;
export const schreib = (f: string, d: unknown) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 1) + '\n'); };

export const epOrdner = (id: string) => p('episodes', id);
export const aufnahmeOrdner = (id: string) => p('recordings', id);
export const ausgabeOrdner = (id: string) => p('out', id);
export const ladeEpisode = (id: string) => lies<Episode>(path.join(epOrdner(id), 'episode.json'));
export const ladeTiming = (id: string) => lies<Timing>(path.join(epOrdner(id), 'timing.json'));
export const ladeVorlage = () => lies<any>(p('style', 'stilvorlage.json'));
export const ladeSerie = () => lies<any>(p('serie.json'));
export function ladeLehrplan(): Record<string, CurriculumEintrag> {
  const c = lies<{ eintraege: CurriculumEintrag[] }>(p('curriculum', 'curriculum.json'));
  return Object.fromEntries(c.eintraege.map((e) => [e.id, e]));
}
export function alleEpisoden(): string[] {
  if (!fs.existsSync(p('episodes'))) return [];
  return fs.readdirSync(p('episodes')).filter((d) => fs.existsSync(path.join(epOrdner(d), 'episode.json'))).sort();
}
const AUDIO = ['m4a', 'mp3', 'wav', 'aac', 'ogg', 'opus', 'flac', 'webm', 'mp4', '3gp', 'amr'];
/** Eingangsordner (serie.json → eingangOrdner, z. B. OneDrive\Sprachmemos): Dateien mit „ep03“, „Folge 3“ oder „app-01“ im Namen
 *  werden nach recordings/<id>/voice.<endung> kopiert. */
export function holeAusEingang(id: string): string | null {
  const ordner = (ladeSerie().eingangOrdner as string | undefined)?.replace(/^~(?=$|[\\/])/, process.env.USERPROFILE ?? process.env.HOME ?? '~');
  if (!ordner || !fs.existsSync(ordner)) return null;
  const nr = id.startsWith('ep') ? Number(id.slice(2)) : null;
  const muster = nr !== null ? new RegExp(`(^|[^0-9a-z])(ep\\s*0*${nr}|folge\\s*0*${nr})([^0-9]|$)`, 'i') : new RegExp(`(^|[^0-9a-z])${id.replace('-', '[-\\s]?')}([^0-9]|$)`, 'i');
  const treffer = fs.readdirSync(ordner).filter((f) => AUDIO.includes(f.split('.').pop()!.toLowerCase()) && muster.test(f.replace(/\.[^.]+$/, '')))
    .map((f) => ({ f, t: fs.statSync(path.join(ordner, f)).mtimeMs })).sort((a, b) => b.t - a.t);
  if (!treffer.length) return null;
  const quelle = path.join(ordner, treffer[0].f), endung = treffer[0].f.split('.').pop()!.toLowerCase();
  fs.mkdirSync(aufnahmeOrdner(id), { recursive: true });
  const ziel = path.join(aufnahmeOrdner(id), `voice.${endung}`);
  fs.copyFileSync(quelle, ziel);
  return ziel;
}

/** Aufnahme finden: voice.m4a / .mp3 / .wav / … – sonst im Eingangsordner suchen. */
export function findeAufnahme(id: string): string | null {
  for (const e of AUDIO) {
    const f = path.join(aufnahmeOrdner(id), `voice.${e}`);
    if (fs.existsSync(f)) return f;
  }
  return holeAusEingang(id);
}
