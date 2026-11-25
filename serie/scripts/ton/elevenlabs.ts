// Deutsche Erzählung mit ElevenLabs (KI-Stimme). Schlüssel aus ELEVENLABS_API_KEY (Laptop: Benutzer-Umgebungsvariable).
// Jeder Satz wird zwischengespeichert (Hash aus Text+Stimme+Modell+Einstellungen) → nie doppelt bezahlt.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { WortZeit } from '../../src/folge/typen';
import { dauer, ffmpeg } from '../lib/werkzeuge';

const API = 'https://api.elevenlabs.io/v1';
export type ElStimme = { voiceId: string; name: string; modell: string; einstellungen: Record<string, unknown>; aussprache?: Record<string, string> };

export const elSchluessel = () => process.env.ELEVENLABS_API_KEY ?? null;
const kopf = () => ({ 'xi-api-key': elSchluessel() ?? '', 'Content-Type': 'application/json' });

export async function elKontingent(): Promise<{ tier: string; verbraucht: number; limit: number; rest: number; reset: number }> {
  const r = await fetch(`${API}/user/subscription`, { headers: kopf() });
  if (!r.ok) throw new Error(`ElevenLabs: Abo nicht lesbar (${r.status}) – Schlüssel prüfen`);
  const d = await r.json();
  return { tier: d.tier, verbraucht: d.character_count, limit: d.character_limit, rest: d.character_limit - d.character_count, reset: d.next_character_count_reset_unix };
}

/** Text für die Stimme vorbereiten: Regie raus, Makrons weg (ō → o), eigene Ausspracheregeln. */
export function sprechText(t: string, s: ElStimme) {
  let x = t.replace(/\([^)]*\)/g, '').replace(/[ōŌ]/g, 'o').replace(/[ūŪ]/g, 'u').replace(/\s+/g, ' ').trim();
  for (const [a, b] of Object.entries(s.aussprache ?? {})) x = x.split(a).join(b);
  return x;
}
export const elSchluesselFuer = (text: string, s: ElStimme) => crypto.createHash('sha1').update(JSON.stringify([text, s.voiceId, s.modell, s.einstellungen])).digest('hex').slice(0, 12);

/** Zeichen-Zeitmarken → Wort-Zeitmarken (Wörter des Originaltextes). */
export function woerterAusZeichen(originalWoerter: string[], zeichen: string[], start: number[], ende: number[]): WortZeit[] {
  const out: WortZeit[] = []; let i = 0;
  for (const w of originalWoerter) {
    while (i < zeichen.length && /\s/.test(zeichen[i])) i++;
    const a = i; let n = 0;
    // so viele nicht-Leerzeichen-Zeichen wie das gesprochene Wort hat (Aussprache-Ersetzungen können die Länge ändern → bis zum nächsten Leerzeichen)
    while (i < zeichen.length && !/\s/.test(zeichen[i])) { i++; n++; }
    if (!n) break;
    out.push({ w, start: +start[a].toFixed(3), ende: +ende[i - 1].toFixed(3) });
  }
  return out;
}

/** Erzeugt einen Satz (mit Zwischenspeicher). Gibt Datei + Wortzeiten zurück. davor/danach = Nachbarsätze für natürliche Betonung. */
export async function elSatz(text: string, s: ElStimme, ordner: string, davor?: string, danach?: string, lufs = -16) {
  const t = sprechText(text, s);
  const key = elSchluesselFuer(t, s);
  const wav = path.join(ordner, `el-${key}.wav`), meta = wav + '.json';
  if (fs.existsSync(meta)) return { datei: path.basename(wav), ...JSON.parse(fs.readFileSync(meta, 'utf8')), neu: 0 };
  const body = { text: t, model_id: s.modell, language_code: 'de', voice_settings: s.einstellungen, ...(davor ? { previous_text: sprechText(davor, s) } : {}), ...(danach ? { next_text: sprechText(danach, s) } : {}) };
  let r: Response | null = null;
  for (let v = 0; v < 4; v++) {
    r = await fetch(`${API}/text-to-speech/${s.voiceId}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', headers: kopf(), body: JSON.stringify(body) });
    if (r.status !== 429 && r.status < 500) break;
    await new Promise((ok) => setTimeout(ok, 2000 * (v + 1)));
  }
  const d = await r!.json();
  if (!r!.ok || !d.audio_base64) throw new Error(`ElevenLabs (${r!.status}): ${d?.detail?.message ?? JSON.stringify(d).slice(0, 200)}`);
  const mp3 = wav.replace(/\.wav$/, '.mp3');
  fs.writeFileSync(mp3, Buffer.from(d.audio_base64, 'base64'));
  const a = d.alignment;
  let woerter = woerterAusZeichen(text.replace(/\([^)]*\)/g, '').trim().split(/\s+/).filter(Boolean), a.characters, a.character_start_times_seconds, a.character_end_times_seconds);
  // Ränder kürzen (Stille vorn/hinten), Zeiten anpassen
  const vorn = Math.max(0, (woerter[0]?.start ?? 0) - 0.06), hinten = (woerter.at(-1)?.ende ?? a.character_end_times_seconds.at(-1)) + 0.15;
  ffmpeg(['-i', mp3, '-af', `atrim=${vorn.toFixed(3)}:${hinten.toFixed(3)},asetpts=PTS-STARTPTS,loudnorm=I=${lufs}:TP=-1.5:LRA=11`, '-ar', '48000', '-ac', '1', wav]);
  fs.rmSync(mp3);
  woerter = woerter.map((w) => ({ ...w, start: +(w.start - vorn).toFixed(3), ende: +(w.ende - vorn).toFixed(3) }));
  const m = { dauer: dauer(wav), woerter, zeichen: t.length };
  fs.writeFileSync(meta, JSON.stringify(m));
  return { datei: path.basename(wav), ...m, neu: t.length };
}

/** Wie viele Zeichen kostet eine Folge noch (ohne bereits Zwischengespeichertes)? */
export function elKosten(texte: string[], s: ElStimme, ordner: string) {
  return texte.reduce((sum, t) => { const x = sprechText(t, s); return sum + (fs.existsSync(path.join(ordner, `el-${elSchluesselFuer(x, s)}.wav.json`)) ? 0 : x.length); }, 0);
}
