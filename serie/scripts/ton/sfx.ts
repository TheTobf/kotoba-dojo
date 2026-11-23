// Selbst erzeugte Geräusche (keine fremden Sounds): Countdown-Tick und Auflösungs-Pling.
import fs from 'node:fs';
import path from 'node:path';
import { ffmpeg } from '../lib/werkzeuge';

export function sfx(ordner: string) {
  fs.mkdirSync(ordner, { recursive: true });
  const tick = path.join(ordner, 'tick.wav'), pling = path.join(ordner, 'pling.wav');
  if (!fs.existsSync(tick)) ffmpeg(['-f', 'lavfi', '-i', "aevalsrc='0.6*sin(2*PI*1320*t)*exp(-30*t)':s=48000:d=0.25", '-ac', '1', tick]);
  if (!fs.existsSync(pling)) ffmpeg(['-f', 'lavfi', '-i', "aevalsrc='0.35*(sin(2*PI*1046*t)+0.6*sin(2*PI*1568*t))*exp(-6*t)':s=48000:d=0.8", '-ac', '1', pling]);
  return { tick, pling };
}
