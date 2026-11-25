// Ausgabedateien: caption.txt, learned.json, script.md, POSTPLAN.md
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { CurriculumEintrag, Episode } from '../src/folge/typen';
import { anzeigeText } from './ton/erzaehlung';
import { alleEpisoden, aufnahmeOrdner, ausgabeOrdner, findeAufnahme, ladeEpisode, ladeLehrplan, ladeSerie, ladeVorlage, p } from './lib/projekt';

const require = createRequire(import.meta.url);

/** Sprecher, die in der Folge vorkommen → Pflicht-Namensnennung. */
export function voicevoxCredits(ep: Episode): string[] {
  const v = ladeVorlage();
  const namen = new Set(ep.segmente.filter((s) => s.art === 'japanisch').map((s) => v.stimmen[s.sprecher ?? 'knoe']?.sprecher).filter(Boolean));
  return [...namen].map((n) => `VOICEVOX:${n}`);
}

/** Namensnennung der Erzählstimme, wenn ElevenLabs genutzt wurde (im Free-Plan Pflicht, sonst Transparenz). */
export function erzaehlerCredit(ep: Episode): string {
  const f = path.join(p('episodes', ep.id), 'timing.json');
  if (!fs.existsSync(f)) return '';
  const t = JSON.parse(fs.readFileSync(f, 'utf8'));
  return t.quelle === 'elevenlabs' ? `, Erzählung: ElevenLabs (elevenlabs.io)` : '';
}

export function caption(ep: Episode): string {
  const lp = ladeLehrplan(), serie = ladeSerie();
  const neu = ep.neu.map((id) => lp[id]).filter(Boolean);
  const wdh = ep.wiederholung.map((id) => lp[id]).filter(Boolean);
  const tags = [...serie.hashtagsBasis, ...(ep.staffel === 1 ? ['#japanreise'] : ['#lernenmittiktok'])].slice(0, 5);
  return [
    `${ep.titel} – Gestrandet in Japan, Staffel ${ep.staffel} · Folge ${ep.folge}`,
    '',
    `${ep.problem}`,
    '',
    'Heute gelernt:',
    ...neu.map((e) => `• ${e.ja} (${e.romaji}) – ${e.de}`),
    ...wdh.map((e) => `↺ Wiederholung: ${e.ja} (${e.romaji}) – ${e.de}`),
    '',
    `Nächste Folge morgen! ${ep.naechste ?? ''}`.trim(),
    '',
    tags.join(' '),
    '',
    `Stimmen: ${voicevoxCredits(ep).join(', ')}${erzaehlerCredit(ep)}`,
    erzaehlerCredit(ep) ? 'Erzählstimme ist KI-generiert. Video mit KI und Code erstellt.' : 'Deutsche Erzählung: selbst gesprochen. Video mit KI und Code erstellt.',
    '',
    ...(erzaehlerCredit(ep) ? ['⚠️ BEIM POSTEN: TikTok → „KI-generierte Inhalte“ einschalten (YouTube: „Veränderte oder synthetische Inhalte“ → Ja).', ''] : []),
    '— Vorschlag für den angepinnten Kommentar —',
    `„Wo kann ich das üben?“ → Alle Sätze aus der Serie kannst du in meiner Lern-App wiederholen – Link in meiner Bio. Welchen Satz hättest du gesagt? 👇`,
    '',
  ].join('\n');
}

export function appCaption(ep: Episode): string {
  return [
    `${ep.titel}`, '', ep.problem, '',
    'Die App findest du über den Link in meiner Bio.', '',
    '#japanischlernen #japanisch #lernapp', '',
    ...(voicevoxCredits(ep).length ? [`Stimmen: ${voicevoxCredits(ep).join(', ')}`] : []),
    'Werbung für meine eigene App. Video mit KI und Code erstellt.', '',
    '⚠️ BEIM POSTEN: TikTok → „Weitere Optionen“ → „Offenlegung von Inhalten“ → „Deine Marke“ aktivieren',
    '   (YouTube: „Bezahlte Werbung“ anhaken · Instagram: „Werbekennzeichnung“ bzw. im Text „Werbung“ lassen).', '',
    '— Vorschlag für den angepinnten Kommentar —',
    '„Was für eine Funktion soll als Nächstes kommen? Schreib’s mir 👇“', '',
  ].join('\n');
}

export async function furigana(ja: string) {
  const kuromoji = require('kuromoji');
  const dicPath = path.join(path.dirname(require.resolve('kuromoji')), '..', 'dict');
  const t = await new Promise<any>((ok, err) => kuromoji.builder({ dicPath }).build((e: Error, x: unknown) => (e ? err(e) : ok(x))));
  const kata2hira = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  return t.tokenize(ja).map((k: any) => /[一-鿿]/.test(k.surface_form) && k.reading ? { s: k.surface_form, f: [{ s: k.surface_form, r: kata2hira(k.reading) }] } : { s: k.surface_form });
}

/** learned.json – Lektion für die App (Format „kotoba-dojo-lektion“, Felder wie der App-Typ Sentence). */
export async function learned(ep: Episode) {
  const lp = ladeLehrplan();
  const satz = async (e: CurriculumEintrag, rolle: 'neu' | 'wiederholung') => ({
    id: `gij-${e.id}`, curriculumId: e.id, rolle, art: e.art, ja: e.ja, kana: e.kana, romaji: e.romaji, de: e.de,
    situation: e.situation, niveau: e.niveau, tokens: await furigana(e.ja), source: 'claude',
  });
  return {
    format: 'kotoba-dojo-lektion', version: 1,
    titel: `Gestrandet in Japan – S${ep.staffel}F${ep.folge}: ${ep.titel}`,
    quelle: { serie: 'Gestrandet in Japan', staffel: ep.staffel, folge: ep.folge, episode: ep.id },
    saetze: [...(await Promise.all(ep.neu.map((id) => satz(lp[id], 'neu')))), ...(await Promise.all(ep.wiederholung.map((id) => satz(lp[id], 'wiederholung'))))],
  };
}

/** Sprechskript: nummerierte deutsche Sätze; japanische Stellen nur markiert. */
export function skript(ep: Episode): string {
  const lp = ladeLehrplan();
  let n = 0;
  const zeilen = ep.segmente.map((s) => {
    if (s.art === 'erzaehler') { n++; return `**${n}.** ${s.regie ? `*(${s.regie})* ` : ''}${(s.text ?? '').replace(/\[\[[^|\]]+\|([^|\]]+)(\|[^\]]+)?\]\]/g, '_$1_')}`; }
    if (s.art === 'japanisch') { const ja = s.curriculum ? lp[s.curriculum].ja : s.text; return `> 🔇 *Hier kommt Japanisch (VOICEVOX, nicht einsprechen): ${ja}*`; }
    if (s.art === 'quiz') return `> ⏱ *Quiz-Countdown (3 Sekunden Stille – nichts sprechen)*`;
    return `> *(kurze Pause)*`;
  });
  return [
    `# ${ep.id.toUpperCase()} – ${ep.titel}`,
    '',
    `Staffel ${ep.staffel} · Folge ${ep.folge}. Lies nur die **nummerierten** Sätze. Versprecher? Einfach den ganzen Satz nochmal sagen – ich nehme die letzte gute Version.`,
    `Speichern als \`recordings/${ep.id}/voice.m4a\` (mp3/wav gehen auch).`,
    '',
    ...zeilen.flatMap((z) => [z, '']),
  ].join('\n');
}

export function schreibeSkript(id: string) {
  const ep = ladeEpisode(id);
  fs.mkdirSync(aufnahmeOrdner(id), { recursive: true });
  fs.writeFileSync(path.join(aufnahmeOrdner(id), 'script.md'), skript(ep));
}

/** Postplan: Folgen ab startdatum täglich; App-Videos am appVideoWochentag. */
export function postplan(heute = new Date()): { md: string; vorlaufTage: number; fertig: number; geplant: { id: string; datum: string; fertig: boolean; aufnahme: boolean }[] } {
  const serie = ladeSerie();
  const start = new Date(serie.startdatum + 'T12:00:00');
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const tage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const eps = alleEpisoden().filter((e) => e.startsWith('ep'));
  const apps = alleEpisoden().filter((e) => e.startsWith('app'));
  const geplant = eps.map((id, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return { id, datum: iso(d), fertig: fs.existsSync(path.join(ausgabeOrdner(id), 'video.mp4')), aufnahme: Boolean(findeAufnahme(id)) }; });
  const appPlan = apps.map((id, i) => { const d = new Date(start); const wt = tage.indexOf(serie.appVideoWochentag); while (d.getDay() !== wt) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 7 * i); return { id, datum: iso(d), fertig: fs.existsSync(path.join(ausgabeOrdner(id), 'video.mp4')), aufnahme: Boolean(findeAufnahme(id)) }; });
  // Vorlauf = Tage bis zum ersten Folgen-Termin ohne fertiges Video
  const heuteIso = iso(heute);
  const ersteLuecke = geplant.find((g) => !g.fertig && g.datum >= heuteIso);
  const letzterTermin = geplant.length ? geplant[geplant.length - 1].datum : heuteIso;
  const luecke = ersteLuecke?.datum ?? (() => { const d = new Date(letzterTermin + 'T12:00:00'); d.setDate(d.getDate() + 1); return iso(d); })();
  // Vorlauf = Posttage ab heute (bzw. ab Serienstart), die schon mit fertigen Videos abgedeckt sind
  const ab = heuteIso > iso(start) ? heuteIso : iso(start);
  const vorlaufTage = Math.max(0, Math.round((new Date(luecke + 'T12:00:00').getTime() - new Date(ab + 'T12:00:00').getTime()) / 864e5));
  const zeile = (g: { id: string; datum: string; fertig: boolean; aufnahme: boolean }) => {
    const d = new Date(g.datum + 'T12:00:00');
    const st = g.fertig ? '✅ fertig' : g.aufnahme ? '🎙 Aufnahme da → /fertig' : '⏳ Aufnahme fehlt';
    const ep = ladeEpisode(g.id);
    return `| ${tage[d.getDay()].slice(0, 2)} ${g.datum} ${serie.postUhrzeit} | ${g.id} | ${ep.titel} | ${st} | ${g.fertig ? `out/${g.id}/video.mp4` : ''} |`;
  };
  const md = [
    '# Postplan – Gestrandet in Japan', '',
    `Stand: ${heuteIso} · Vorlauf: **${vorlaufTage} Tage** ${vorlaufTage < serie.vorlaufZielTage ? '⚠️ unter 7 Tagen – bitte Aufnahmen machen (/skripte)' : '✓'}`, '',
    '## Folgen (täglich)', '', '| Termin | Folge | Titel | Status | Datei |', '|---|---|---|---|---|', ...geplant.map(zeile), '',
    '## App-Videos (wöchentlich, Werbung – beim Posten „Offenlegung von Inhalten → Deine Marke“ aktivieren)', '',
    '| Termin | Video | Titel | Status | Datei |', '|---|---|---|---|---|', ...(appPlan.length ? appPlan.map(zeile) : ['| – | – | noch keins (/appvideo) | | |']), '',
  ].join('\n');
  return { md, vorlaufTage, fertig: geplant.filter((g) => g.fertig).length, geplant };
}
export function schreibePostplan() { const r = postplan(); fs.mkdirSync(p('out'), { recursive: true }); fs.writeFileSync(p('out', 'POSTPLAN.md'), r.md); return r; }
