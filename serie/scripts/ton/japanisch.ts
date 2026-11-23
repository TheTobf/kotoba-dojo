// Japanische Sätze: VOICEVOX (lokal) – oder in der Cloud-Testumgebung pyopenjtalk (nur Vorschau).
// Liefert pro Satz eine WAV und wortgenaue Phrasen-Zeiten für die Einblendung.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { dauer, ffmpeg, sprichJAVorschau, VOICEVOX_URL } from '../lib/werkzeuge';

const require = createRequire(import.meta.url);
type Tok = { surface_form: string; reading?: string; pos: string; pos_detail_1: string };
let tokenizer: { tokenize(s: string): Tok[] } | null = null;
async function tok() {
  if (!tokenizer) {
    const kuromoji = require('kuromoji');
    const dicPath = path.join(path.dirname(require.resolve('kuromoji')), '..', 'dict');
    tokenizer = await new Promise((ok, err) => kuromoji.builder({ dicPath }).build((e: Error, t: never) => (e ? err(e) : ok(t))));
  }
  return tokenizer!;
}
const KLEIN = new Set('ャュョァィゥェォヮ');
const moren = (kana: string) => [...kana].filter((c) => !KLEIN.has(c) && /[゠-ヿ぀-ゟ]/.test(c)).length;

/** Teilt einen Satz in Anzeige-Stücke (Wort + angehängte Partikel/Hilfsverben) mit Morenzahl. */
export async function stuecke(ja: string): Promise<{ w: string; m: number }[]> {
  const t = await tok();
  const out: { w: string; m: number }[] = [];
  for (const k of t.tokenize(ja.replace(/Wi-Fi/g, 'ワイファイ'))) {
    const anhaengen = out.length && (['助詞', '助動詞', '記号'].includes(k.pos) || k.pos_detail_1 === '接尾' || k.pos_detail_1 === '非自立');
    const m = k.pos === '記号' ? 0 : moren(k.reading && k.reading !== '*' ? k.reading : k.surface_form.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60)));
    if (anhaengen) { out[out.length - 1].w += k.surface_form; out[out.length - 1].m += m; } else out.push({ w: k.surface_form, m });
  }
  // Wi-Fi wieder herstellen
  return out.map((s) => ({ ...s, w: s.w.replace('ワイファイ', 'Wi-Fi') }));
}

let sprecherCache: { name: string; styles: { name: string; id: number }[] }[] | null = null;
export async function sprecherId(name: string, stil: string): Promise<number> {
  sprecherCache ??= await (await fetch(VOICEVOX_URL + '/speakers')).json();
  const s = sprecherCache!.find((x) => x.name === name);
  const st = s?.styles.find((x) => x.name === stil) ?? s?.styles[0];
  if (!st) throw new Error(`VOICEVOX-Sprecher „${name}“ nicht gefunden. Verfügbar: ${sprecherCache!.map((x) => x.name).join(', ')}`);
  return st.id;
}

type Mora = { consonant_length: number | null; vowel_length: number };
type AQ = { accent_phrases: { moras: Mora[]; pause_mora: Mora | null }[]; speedScale: number; prePhonemeLength: number; postPhonemeLength: number; volumeScale: number; outputSamplingRate: number };

/** Erzeugt WAV + Phrasen-Zeiten. stimme = Eintrag aus stilvorlage.stimmen. */
export async function japanisch(ja: string, stimme: { sprecher: string; stil: string; tempo: number }, wav: string, vorschau: boolean) {
  const st = await stuecke(ja);
  const gesamtM = st.reduce((a, b) => a + b.m, 0) || 1;
  let moraStarts: number[] = [];
  let dur: number;
  if (!vorschau) {
    const id = await sprecherId(stimme.sprecher, stimme.stil);
    const aq: AQ = await (await fetch(`${VOICEVOX_URL}/audio_query?speaker=${id}&text=${encodeURIComponent(ja)}`, { method: 'POST' })).json();
    aq.speedScale = stimme.tempo; aq.prePhonemeLength = 0.08; aq.postPhonemeLength = 0.12; aq.outputSamplingRate = 48000;
    const buf = Buffer.from(await (await fetch(`${VOICEVOX_URL}/synthesis?speaker=${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aq) })).arrayBuffer());
    fs.writeFileSync(wav + '.roh.wav', buf);
    let t = aq.prePhonemeLength / aq.speedScale;
    for (const ph of aq.accent_phrases) {
      for (const m of ph.moras) { moraStarts.push(t); t += ((m.consonant_length ?? 0) + m.vowel_length) / aq.speedScale; }
      if (ph.pause_mora) t += ((ph.pause_mora.consonant_length ?? 0) + ph.pause_mora.vowel_length) / aq.speedScale;
    }
    moraStarts.push(t);
  } else {
    sprichJAVorschau(ja, wav + '.roh.wav');
  }
  ffmpeg(['-i', wav + '.roh.wav', '-ac', '1', '-ar', '48000', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', wav]);
  fs.rmSync(wav + '.roh.wav');
  dur = dauer(wav);
  if (!moraStarts.length) { // Vorschau: gleichmäßig über die Sprechzeit verteilen
    const a = 0.08, e = Math.max(a + 0.3, dur - 0.12);
    moraStarts = Array.from({ length: gesamtM + 1 }, (_, i) => a + ((e - a) * i) / gesamtM);
  }
  const vv = moraStarts.length - 1;
  let cum = 0;
  const phrasen = st.map((s) => {
    const i0 = Math.round((cum / gesamtM) * vv); cum += s.m;
    const i1 = Math.round((cum / gesamtM) * vv);
    return { w: s.w, start: +moraStarts[Math.min(i0, vv)].toFixed(3), ende: +moraStarts[Math.min(Math.max(i1, i0 + 1), vv)].toFixed(3) };
  });
  return { dauer: dur, phrasen };
}

/** Hängt den Satz ein zweites Mal an (Wiederholung bei der Auflösung). */
export function verdoppeln(wav: string, pause = 0.7): number {
  const d = dauer(wav);
  const tmp = wav + '.2.wav';
  ffmpeg(['-i', wav, '-filter_complex', `[0]asplit[a][b];aevalsrc=0:d=${pause}:s=48000[s];[a][s][b]concat=n=3:v=0:a=1`, '-ar', '48000', '-ac', '1', tmp]);
  fs.renameSync(tmp, wav);
  return d + pause;
}
