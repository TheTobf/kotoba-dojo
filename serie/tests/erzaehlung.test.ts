import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anzeigeText, teile } from '../scripts/ton/erzaehlung';

test('Japanisch wird aus dem deutschen Text herausgelöst', () => {
  const t = teile('[[目的|mokuteki]] heißt Zweck. Sie will wissen: Warum?');
  assert.deepEqual(t.map((x) => x.art), ['jp', 'de']);
  assert.equal(t[0].art === 'jp' && t[0].lesung, '目的');
  assert.equal(t[1].art === 'de' && t[1].text, 'heißt Zweck. Sie will wissen: Warum?');
});

test('Satzzeichen hängen am Wort, eigene Lesung für VOICEVOX', () => {
  const t = teile('Wo ist … heißt [[はどこですか|wa doko desu ka|わどこですか]].');
  assert.equal(t.length, 2);
  assert.ok(t[1].art === 'jp' && t[1].lesung === 'わどこですか' && t[1].romaji === 'wa doko desu ka.');
});

test('Anzeige zeigt Romaji, Regie fällt raus', () => {
  assert.equal(anzeigeText('[[一泊|ippaku|いっぱく]]. Eine Nacht.'), 'ippaku. Eine Nacht.');
  assert.deepEqual(teile('(leise) Hallo'), [{ art: 'de', text: 'Hallo' }]);
});

test('Fragezeichen direkt nach Japanisch gehört zum Wort', () => {
  const t = teile('[[目的|mokuteki]]? Ist das etwas zu essen?');
  assert.ok(t[0].art === 'jp' && t[0].romaji === 'mokuteki?');
  assert.ok(t[1].art === 'de' && t[1].text === 'Ist das etwas zu essen?');
});
