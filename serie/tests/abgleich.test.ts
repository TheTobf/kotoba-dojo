import assert from 'node:assert/strict';
import { test } from 'node:test';
import { abgleichen, Wort } from '../scripts/ton/aufnahme';

function woerter(text: string, ab = 0): Wort[] { return text.split(' ').map((w, i) => ({ w, start: ab + i * 0.4, ende: ab + i * 0.4 + 0.3 })); }

test('Versprecher und doppelte Sätze: letzte gute Version gewinnt', () => {
  const zeilen = ['Knö landet in Tokio.', 'Und sofort gibt es ein Problem.', 'Der Beamte fragt etwas.'];
  const aufnahme = [
    ...woerter('Knö landet in Tokio.', 0),
    ...woerter('Und sofort gibt es ein Pro äh', 3),        // Versprecher
    ...woerter('Und sofort gibt es ein Problem.', 6),      // zweiter Versuch
    ...woerter('Der Beamte fragt etwas.', 10),
  ];
  const t = abgleichen(zeilen, aufnahme);
  assert.equal(t.length, 3);
  assert.ok(t.every(Boolean));
  assert.equal(aufnahme[t[1]!.von].start, 6, 'zweiter Versuch von Zeile 2');
  assert.equal(t[1]!.bis - t[1]!.von + 1, 6);
  assert.equal(aufnahme[t[2]!.von].start, 10);
});

test('ganz wiederholte Zeile nimmt die letzte', () => {
  const zeilen = ['Was sagst du jetzt?', 'Genau so geht das.'];
  const aufnahme = [...woerter('Was sagst du jetzt?', 0), ...woerter('Was sagst du jetzt?', 3), ...woerter('Genau so geht das.', 6)];
  const t = abgleichen(zeilen, aufnahme);
  assert.equal(aufnahme[t[0]!.von].start, 3);
  assert.equal(aufnahme[t[1]!.von].start, 6);
});

test('fehlende Zeile wird gemeldet (null)', () => {
  const t = abgleichen(['Hallo Welt heute.', 'Diese Zeile fehlt komplett hier.'], woerter('Hallo Welt heute.'));
  assert.ok(t[0]);
  assert.equal(t[1], null);
});

test('Eingangsordner: „Folge 3.m4a“ wird ep03 zugeordnet, ep13 nicht', async () => {
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const { holeAusEingang, p } = await import('../scripts/lib/projekt');
  const ein = fs.mkdtempSync(path.join(os.tmpdir(), 'eingang-'));
  fs.writeFileSync(path.join(ein, 'Folge 13.m4a'), 'x'); fs.writeFileSync(path.join(ein, 'Folge 3.m4a'), 'y');
  const serieDatei = p('serie.json'), alt = fs.readFileSync(serieDatei, 'utf8');
  try {
    fs.writeFileSync(serieDatei, JSON.stringify({ ...JSON.parse(alt), eingangOrdner: ein }));
    const ziel = holeAusEingang('ep99'); assert.equal(ziel, null);
    const z3 = holeAusEingang('ep03');
    assert.ok(z3 && fs.readFileSync(z3, 'utf8') === 'y');
    fs.rmSync(z3!);
  } finally { fs.writeFileSync(serieDatei, alt); }
});
