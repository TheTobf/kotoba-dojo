// Findet die lokalen Werkzeuge. Alles kostenlos und lokal; nichts wird ins Internet geschickt.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { p } from './projekt';

export const WIN = process.platform === 'win32';
export const VOICEVOX_URL = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021';

export function hat(befehl: string): boolean {
  const r = spawnSync(WIN ? 'where' : 'which', [befehl], { encoding: 'utf8' });
  return r.status === 0;
}

export function ffmpeg(args: string[]) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
  return r.stderr;
}
export function ffmpegAusgabe(args: string[]) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
  return r.stderr;
}
export function dauer(datei: string): number {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', datei], { encoding: 'utf8' });
  return Number(r.stdout.trim());
}

// ---------- VOICEVOX ----------
export async function voicevoxErreichbar(): Promise<boolean> {
  try { const r = await fetch(VOICEVOX_URL + '/version', { signal: AbortSignal.timeout(1500) }); return r.ok; } catch { return false; }
}
/** Startet die VOICEVOX-Engine, falls sie installiert ist und noch nicht läuft (Windows/Mac/Linux). */
export async function starteVoicevox(): Promise<boolean> {
  if (await voicevoxErreichbar()) return true;
  const kandidaten = [
    process.env.VOICEVOX_ENGINE,
    WIN && path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'VOICEVOX', 'vv-engine', 'run.exe'),
    p('werkzeuge', 'voicevox', 'run.exe'), p('werkzeuge', 'voicevox', 'run'),
    '/Applications/VOICEVOX.app/Contents/Resources/vv-engine/run',
  ].filter(Boolean) as string[];
  const exe = kandidaten.find((k) => fs.existsSync(k));
  if (!exe) return false;
  spawn(exe, ['--host', '127.0.0.1', '--port', '50021'], { detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 90; i++) { if (await voicevoxErreichbar()) return true; await new Promise((r) => setTimeout(r, 1000)); }
  return false;
}

// ---------- whisper.cpp ----------
export function whisper(): { exe: string; modell: string } | null {
  const exeK = [process.env.WHISPER_EXE, p('werkzeuge', 'whisper', WIN ? 'whisper-cli.exe' : 'whisper-cli'), p('werkzeuge', 'whisper', 'Release', 'whisper-cli.exe'), 'whisper-cli'].filter(Boolean) as string[];
  const exe = exeK.find((k) => (k.includes(path.sep) ? fs.existsSync(k) : hat(k)));
  const modK = [process.env.WHISPER_MODELL, p('werkzeuge', 'whisper', 'ggml-small.bin'), p('werkzeuge', 'whisper', 'ggml-base.bin'), p('werkzeuge', 'whisper', 'ggml-medium.bin')].filter(Boolean) as string[];
  const modell = modK.find((k) => fs.existsSync(k));
  return exe && modell ? { exe, modell } : null;
}

// ---------- Vorschau-Stimmen (nur preview.mp4) ----------
export type VorschauDE = 'windows' | 'piper' | 'espeak' | null;
export function vorschauStimmeDE(): VorschauDE {
  if (WIN) return 'windows';
  if (fs.existsSync(p('werkzeuge', 'piper', 'de_DE-thorsten-medium.onnx')) && (hat('piper') || fs.existsSync(p('werkzeuge', 'piper', 'piper')))) return 'piper';
  if (hat('espeak-ng')) return 'espeak';
  return null;
}
export function sprichDE(text: string, wav: string, art: VorschauDE) {
  const roh = text.replace(/\([^)]*\)/g, '').trim();
  if (art === 'windows') {
    const tmp = path.join(os.tmpdir(), `serie-${process.pid}.txt`);
    fs.writeFileSync(tmp, roh, 'utf8');
    const ps = `Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; try { $s.SelectVoiceByHints('NotSet','NotSet',0,[Globalization.CultureInfo]'de-DE') } catch {}; $s.Rate=1; $s.SetOutputToWaveFile('${wav.replace(/'/g, "''")}'); $s.Speak([IO.File]::ReadAllText('${tmp.replace(/'/g, "''")}')); $s.Dispose()`;
    execFileSync('powershell', ['-NoProfile', '-Command', ps]);
  } else if (art === 'piper') {
    const exe = hat('piper') ? 'piper' : p('werkzeuge', 'piper', 'piper');
    execFileSync(exe, ['-m', p('werkzeuge', 'piper', 'de_DE-thorsten-medium.onnx'), '-f', wav], { input: roh });
  } else if (art === 'espeak') {
    execFileSync('espeak-ng', ['-v', 'de', '-s', '165', '-p', '45', '-w', wav, roh]);
  } else throw new Error('Keine Vorschau-Stimme gefunden (Windows-Sprachausgabe, piper oder espeak-ng).');
}
// Windows: „py -3“ (Python-Starter) – „python“ ist dort oft nur ein Store-Platzhalter
const PY: [string, string[]] = WIN && spawnSync('py', ['-3', '-c', 'pass']).status === 0 ? ['py', ['-3']] : [WIN ? 'python' : 'python3', []];
export function vorschauJapanischMoeglich(): boolean {
  return spawnSync(PY[0], [...PY[1], '-c', 'import pyopenjtalk'], { encoding: 'utf8' }).status === 0;
}
export function sprichJAVorschau(text: string, wav: string, tempo = 1, halbton = 0) {
  execFileSync(PY[0], [...PY[1], '-c', `import pyopenjtalk,sys,wave,numpy as np\nx,sr=pyopenjtalk.tts(sys.argv[1],speed=float(sys.argv[3]),half_tone=float(sys.argv[4]))\nw=wave.open(sys.argv[2],'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(np.clip(x,-32768,32767).astype(np.int16).tobytes());w.close()`, text, wav, String(tempo), String(halbton)]);
}
