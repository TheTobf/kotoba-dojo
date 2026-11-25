// Erzähltext mit eingebettetem Japanisch: [[目的|mokuteki]] oder [[はどこですか|wa doko desu ka|わどこですか]]
//   1. Feld: Japanisch (Anzeige/Lehrinhalt) · 2.: Romaji (Untertitel) · 3. (optional): Lesung für die Sprachausgabe.
// Der deutsche Teil spricht ElevenLabs bzw. die Vorschau-Stimme, der japanische Teil VOICEVOX – nie die deutsche Stimme.
export type Teil = { art: 'de'; text: string } | { art: 'jp'; ja: string; romaji: string; lesung: string };

const MUSTER = /\[\[([^|\]]+)\|([^|\]]+)(?:\|([^\]]+))?\]\]/g;

export function teile(text: string): Teil[] {
  const out: Teil[] = []; let ab = 0;
  const sauber = text.replace(/\([^)]*\)/g, '');
  for (const m of sauber.matchAll(MUSTER)) {
    const davor = sauber.slice(ab, m.index);
    if (davor.trim()) out.push({ art: 'de', text: davor.trim() });
    out.push({ art: 'jp', ja: m[1].trim(), romaji: m[2].trim(), lesung: (m[3] ?? m[1]).trim() });
    ab = m.index! + m[0].length;
  }
  const rest = sauber.slice(ab);
  if (rest.trim()) out.push({ art: 'de', text: rest.trim() });
  // Teile nur aus Satzzeichen ("?", ".") an den Vorgänger hängen
  const z: Teil[] = [];
  for (const t of out) {
    if (t.art === 'de' && !/[\p{L}\p{N}]/u.test(t.text) && z.length) { const v = z[z.length - 1]; if (v.art === 'jp') v.romaji += t.text; else v.text += t.text; }
    else if (t.art === 'de' && z.at(-1)?.art === 'jp') {
      // führende Satzzeichen („? Ist das …“) gehören zum japanischen Wort davor
      const m = /^([^\p{L}\p{N}\s…]+)\s*/u.exec(t.text);
      if (m) { (z.at(-1) as { romaji: string }).romaji += m[1]; t.text = t.text.slice(m[0].length); }
      z.push(t);
    } else z.push(t);
  }
  return z;
}

/** Text so, wie er im Untertitel/Skript steht (Japanisch als Romaji). */
export const anzeigeText = (text: string) => text.replace(MUSTER, (_, _ja, ro) => ro);
export const hatJapanisch = (text: string) => MUSTER.test(text) && ((MUSTER.lastIndex = 0), true);
