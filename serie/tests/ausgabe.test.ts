import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { caption, learned, postplan, skript } from '../scripts/ausgabe';
import { ladeEpisode } from '../scripts/lib/projekt';
import { dauer } from '../scripts/lib/werkzeuge';
import { schneideZeile } from '../scripts/ton/aufnahme';

test('caption enthält Pflichtangaben', () => {
  const c = caption(ladeEpisode('ep01'));
  assert.match(c, /Staffel 1 · Folge 1/);
  assert.match(c, /VOICEVOX:|Open JTalk/);
  assert.match(c, /mit KI und Code erstellt/i);
  assert.match(c, /angepinnten Kommentar/);
  const tags = c.match(/#\w+/g) ?? [];
  assert.ok(tags.length >= 3 && tags.length <= 5, `3–5 Hashtags, sind ${tags.length}`);
  assert.doesNotMatch(c.split('— Vorschlag')[0], /App/, 'keine Werbung in der Beschreibung');
});

test('learned.json hat App-Satzformat mit Furigana', async () => {
  const l = await learned(ladeEpisode('ep01'));
  assert.equal(l.format, 'kotoba-dojo-lektion');
  assert.equal(l.saetze.length, 2);
  const s = l.saetze.find((x) => x.curriculumId === 'c030')!;
  assert.equal(s.tokens.map((t: { s: string }) => t.s).join(''), s.ja);
  assert.ok(s.tokens.some((t: { f?: { r: string }[] }) => t.f?.[0].r === 'たいざい'));
});

test('Skript nummeriert nur deutsche Sätze', () => {
  const s = skript(ladeEpisode('ep01'));
  assert.match(s, /\*\*1\.\*\*/);
  assert.match(s, /nicht einsprechen\): 滞在の目的は何ですか/);
  assert.doesNotMatch(s, /\*\*\d+\.\*\* .*観光/);
});

test('Postplan rechnet Vorlauf', () => {
  const r = postplan(new Date('2026-11-25T10:00:00'));
  assert.equal(r.geplant[0].datum, '2026-12-01');
  // Vorlauf = Anzahl fertiger Folgen am Stück ab Serienstart (heute liegt vor dem Start)
  let erwartet = 0; while (r.geplant[erwartet]?.fertig) erwartet++;
  assert.equal(r.vorlaufTage, erwartet);
  if (erwartet < 7) assert.match(r.md, /unter 7 Tagen/);
});

test('Zeile aus Aufnahme schneiden: lange Pause wird gekürzt, Wortzeiten verschoben', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'serie-'));
  const roh = path.join(tmp, 'roh.wav');
  // 1 s Ton, 2 s Stille, 1 s Ton
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', "aevalsrc='if(lt(t,1)+gt(t,3),0.3*sin(2*PI*220*t),0)':s=48000:d=4", roh]);
  const r = schneideZeile(roh, [{ w: 'Hallo', start: 0.1, ende: 0.9 }, { w: 'Welt', start: 3.1, ende: 3.9 }], path.join(tmp, 'z.wav'), -16);
  assert.ok(r.dauer < 2.4, `Dauer ${r.dauer}`);
  assert.ok(Math.abs(dauer(path.join(tmp, 'z.wav')) - r.dauer) < 0.08);
  assert.ok(r.woerter[1].start < 1.5, 'zweites Wort rückt nach vorn');
});
