// Verarbeitet deine Sprachmemo-Aufnahme: säubern, Spracherkennung (whisper.cpp), Abgleich mit dem Skript,
// Versprecher/doppelte Sätze aussortieren (die letzte gute Version gewinnt), Pausen kürzen, Lautstärke angleichen.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { WortZeit } from '../../src/folge/typen';
import { ffmpeg } from '../lib/werkzeuge';

export type Wort = { w: string; start: number; ende: number };
export const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-zäöüß0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) { const tmp = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; }
  }
  return d[b.length];
}
const aehnlich = (a: string, b: string) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

/** whisper.cpp ausführen (Wort-Zeitmarken). */
export function erkenne(exe: string, modell: string, wav16k: string): Wort[] {
  const basis = wav16k.replace(/\.wav$/, '');
  execFileSync(exe, ['-m', modell, '-f', wav16k, '-l', 'de', '-ml', '1', '-sow', '-oj', '-of', basis, '-np'], { stdio: ['ignore', 'ignore', 'pipe'] });
  return whisperJsonZuWoertern(JSON.parse(fs.readFileSync(basis + '.json', 'utf8')));
}
export function whisperJsonZuWoertern(j: { transcription: { text: string; offsets: { from: number; to: number } }[] }): Wort[] {
  return j.transcription.map((s) => ({ w: s.text.trim(), start: s.offsets.from / 1000, ende: s.offsets.to / 1000 })).filter((x) => norm(x.w));
}

export type Treffer = { zeile: number; von: number; bis: number; score: number; versuche: number };
/** Ordnet jeder Skriptzeile das passende Stück der Aufnahme zu. Mehrfach gesprochene Zeilen: letzte gute Version. */
export function abgleichen(zeilen: string[], woerter: Wort[]): (Treffer | null)[] {
  const W = woerter.map((w) => norm(w.w));
  const kandidaten = (zi: number, ab: number) => {
    const ziel = norm(zeilen[zi]), n = ziel.split(' ').length, out: { von: number; bis: number; score: number }[] = [];
    for (let a = ab; a < W.length; a++) for (let len = Math.max(1, n - 2); len <= n + 3 && a + len <= W.length; len++) {
      const sc = aehnlich(W.slice(a, a + len).join(' '), ziel);
      if (sc >= 0.55) out.push({ von: a, bis: a + len - 1, score: sc });
    }
    return out;
  };
  const erg: (Treffer | null)[] = [];
  let zeiger = 0;
  for (let i = 0; i < zeilen.length; i++) {
    const k = kandidaten(i, zeiger);
    if (!k.length) { erg.push(null); continue; }
    // Grenze: erster guter Treffer der nächsten Zeile
    let grenze = W.length;
    if (i + 1 < zeilen.length) { const n = kandidaten(i + 1, k[0].von + 1).filter((x) => x.score >= 0.7); if (n.length) grenze = n[0].von; }
    const imBereich = k.filter((x) => x.von < grenze);
    const pool = imBereich.length ? imBereich : k;
    const best = Math.max(...pool.map((x) => x.score));
    // Alle Versuche (sich nicht überlappend) zählen; der letzte mit Score ≥ best − 0.08 gewinnt
    const gute = pool.filter((x) => x.score >= Math.max(0.62, best - 0.08));
    const wahl = gute.reduce((a, b) => (b.von > a.von || (b.von === a.von && b.score > a.score) ? b : a));
    const versuche = new Set(pool.filter((x) => x.score >= 0.62).map((x) => Math.round(x.von / 3))).size;
    erg.push({ zeile: i, von: wahl.von, bis: wahl.bis, score: +wahl.score.toFixed(2), versuche });
    zeiger = wahl.bis + 1;
  }
  return erg;
}

/** Schneidet eine Zeile aus der gesäuberten Aufnahme, kürzt lange Pausen (> 0.45 s → 0.3 s), normalisiert. */
export function schneideZeile(sauber: string, woerter: Wort[], ziel: string, lufs: number): { dauer: number; woerter: WortZeit[] } {
  const vor = 0.08, nach = 0.15, maxPause = 0.45, neuPause = 0.3;
  const stuecke: { a: number; b: number }[] = [];
  let a = Math.max(0, woerter[0].start - vor);
  for (let i = 1; i < woerter.length; i++) {
    if (woerter[i].start - woerter[i - 1].ende > maxPause) { stuecke.push({ a, b: woerter[i - 1].ende + neuPause / 2 }); a = woerter[i].start - neuPause / 2; }
  }
  stuecke.push({ a, b: woerter[woerter.length - 1].ende + nach });
  // neue Wortzeiten
  const neu: WortZeit[] = []; let off = 0;
  for (const st of stuecke) {
    for (const w of woerter) if (w.start >= st.a - 0.001 && w.start < st.b) neu.push({ w: w.w, start: +(w.start - st.a + off).toFixed(3), ende: +(Math.min(w.ende, st.b) - st.a + off).toFixed(3) });
    off += st.b - st.a;
  }
  const filt = stuecke.map((s, i) => `[0]atrim=${s.a.toFixed(3)}:${s.b.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, s.b - s.a - 0.015).toFixed(3)}:d=0.015[s${i}]`).join(';');
  const cat = stuecke.map((_, i) => `[s${i}]`).join('') + `concat=n=${stuecke.length}:v=0:a=1,loudnorm=I=${lufs}:TP=-1.5:LRA=11[o]`;
  ffmpeg(['-i', sauber, '-filter_complex', `${filt};${cat}`, '-map', '[o]', '-ar', '48000', '-ac', '1', ziel]);
  return { dauer: +off.toFixed(3), woerter: neu };
}

export function saeubern(eingang: string, ordner: string) {
  fs.mkdirSync(ordner, { recursive: true });
  const w16 = path.join(ordner, 'erkennung-16k.wav'), sauber = path.join(ordner, 'aufnahme-sauber.wav');
  ffmpeg(['-i', eingang, '-ac', '1', '-ar', '16000', '-af', 'highpass=f=80', w16]);
  ffmpeg(['-i', eingang, '-ac', '1', '-ar', '48000', '-af', 'highpass=f=80,afftdn=nr=12:nf=-50,acompressor=threshold=-22dB:ratio=2.5:attack=5:release=90', sauber]);
  return { w16, sauber };
}
