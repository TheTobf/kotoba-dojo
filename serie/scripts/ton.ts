// Ton für eine Folge erzeugen → episodes/epXX/ton/*.wav + timing.json
//   tsx scripts/ton.ts ep01            → mit Aufnahme, falls vorhanden; sonst Vorschau
//   tsx scripts/ton.ts ep01 --vorschau → immer Vorschau-Stimme (preview.mp4)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Timing } from '../src/folge/typen';
import { epOrdner, findeAufnahme, ladeEpisode, ladeLehrplan, ladeVorlage, schreib } from './lib/projekt';
import { dauer, ffmpeg, sprichDE, starteVoicevox, vorschauJapanischMoeglich, vorschauStimmeDE, whisper } from './lib/werkzeuge';
import { abgleichen, erkenne, saeubern, schneideZeile } from './ton/aufnahme';
import { elKontingent, elKosten, elSatz, elSchluessel } from './ton/elevenlabs';
import { anzeigeText, teile } from './ton/erzaehlung';
import { japanisch, verdoppeln } from './ton/japanisch';
import { sfx } from './ton/sfx';

/** Erzählsatz aus deutschen Teilen (Stimme `sprich`) und japanischen Teilen (VOICEVOX „erklaerer“) zusammensetzen. */
let jpErklaerer: ((ja: string, ziel: string) => Promise<number>) | null = null;
async function mischeErzaehlung(text: string, ton: string, sprich: (de: string, davor?: string, danach?: string) => Promise<{ datei: string; woerter: { w: string; start: number; ende: number }[] }>, tempo: number, davor = '', danach = '') {
  const tl = teile(text), luecke = 0.12;
  const stuecke: { datei: string; woerter: { w: string; start: number; ende: number; jp?: boolean }[] }[] = [];
  for (let i = 0; i < tl.length; i++) {
    const t = tl[i];
    if (t.art === 'de') {
      const nachbarDavor = tl.slice(0, i).map((x) => (x.art === 'de' ? x.text : x.romaji)).join(' ') || davor;
      const nachbarDanach = tl.slice(i + 1).map((x) => (x.art === 'de' ? x.text : x.romaji)).join(' ') || danach;
      stuecke.push(await sprich(t.text, nachbarDavor, nachbarDanach));
    } else {
      const key = crypto.createHash('sha1').update(t.lesung + (jpVorschauAktiv ? 'v' : 'vv')).digest('hex').slice(0, 10);
      const datei = `jpwort-${key}.wav`, ziel = path.join(ton, datei);
      if (!fs.existsSync(ziel)) await jpErklaerer!(t.lesung, ziel);
      stuecke.push({ datei, woerter: [{ w: t.romaji, start: 0.03, ende: Math.max(0.1, dauer(ziel) - 0.05), jp: true }] });
    }
  }
  // zusammenfügen (mit kurzer Lücke), optional beschleunigen; Wortzeiten verschieben
  const key = crypto.createHash('sha1').update(JSON.stringify([stuecke.map((s) => s.datei), tempo])).digest('hex').slice(0, 12);
  const ausgabe = `erz-${key}.wav`, ziel = path.join(ton, ausgabe);
  const woerter: { w: string; start: number; ende: number; jp?: boolean }[] = []; let off = 0;
  for (const st of stuecke) { const d = dauer(path.join(ton, st.datei)); st.woerter.forEach((w) => woerter.push({ ...w, start: +((off + w.start) / tempo).toFixed(3), ende: +((off + w.ende) / tempo).toFixed(3) })); off += d + luecke; }
  if (!fs.existsSync(ziel)) {
    const ein = stuecke.flatMap((s) => ['-i', path.join(ton, s.datei)]);
    const n = stuecke.length;
    const kette = stuecke.map((_, i) => `[${i}]aresample=48000,aformat=channel_layouts=mono${i < n - 1 ? `,apad=pad_dur=${luecke}` : ''}[a${i}]`).join(';');
    const tempoF = Math.abs(tempo - 1) < 0.005 ? '' : `,atempo=${tempo}`;
    ffmpeg([...ein, '-filter_complex', `${kette};${stuecke.map((_, i) => `[a${i}]`).join('')}concat=n=${n}:v=0:a=1${tempoF}[o]`, '-map', '[o]', '-ar', '48000', '-ac', '1', ziel]);
  }
  return { datei: 'ton/' + ausgabe, dauer: dauer(ziel), woerter };
}
let jpVorschauAktiv = false;

export async function erzeugeTon(id: string, opt: { vorschau?: boolean; ohneEl?: boolean } = {}) {
  const ep = ladeEpisode(id), v = ladeVorlage(), lp = ladeLehrplan();
  const ord = epOrdner(id), ton = path.join(ord, 'ton');
  fs.mkdirSync(ton, { recursive: true });
  const aufnahme = opt.vorschau ? null : findeAufnahme(id);
  // ElevenLabs auch für Vorschauen (Sätze werden zwischengespeichert und im fertigen Video wiederverwendet → keine Doppelkosten)
  const el = !aufnahme && !opt.ohneEl && v.erzaehler?.quelle === 'elevenlabs' && elSchluessel() ? v.erzaehler.elevenlabs : null;
  const jpOpenJTalk = v.japanisch?.quelle === 'openjtalk';
  const vv = jpOpenJTalk ? false : await starteVoicevox();
  if (!jpOpenJTalk && !vv && !opt.vorschau && (aufnahme || el)) throw new Error('VOICEVOX läuft nicht. Bitte die VOICEVOX-App öffnen (oder Engine starten) – fürs fertige Video ist VOICEVOX Pflicht.');
  if (!vv && !vorschauJapanischMoeglich()) throw new Error('Weder VOICEVOX noch die Vorschau-Stimme (pyopenjtalk) verfügbar.');
  const jpVorschau = !vv;
  jpVorschauAktiv = jpVorschau;
  const erkl = v.stimmen.erklaerer ?? v.stimmen.personal;
  jpErklaerer = async (ja, ziel) => (await japanisch(ja, erkl, ziel, jpVorschau)).dauer;
  const timing: Timing = { quelle: aufnahme ? 'aufnahme' : el ? 'elevenlabs' : 'vorschau', jpQuelle: jpOpenJTalk ? 'openjtalk' : jpVorschau ? 'vorschau' : 'voicevox', segmente: {} };
  const meldungen: string[] = [];

  // --- Japanisch ---
  for (const s of ep.segmente.filter((x) => x.art === 'japanisch')) {
    const ja = (s.curriculum ? lp[s.curriculum]?.ja : s.text) ?? '';
    if (!ja) throw new Error(`${s.id}: kein japanischer Text`);
    if (s.curriculum && lp[s.curriculum]?.pruefen) throw new Error(`${s.id}: Lehrplan-Eintrag ${s.curriculum} ist noch [PRÜFEN] – erst bestätigen.`);
    const stimme = v.stimmen[s.sprecher ?? 'knoe'] ?? v.stimmen.knoe;
    const key = crypto.createHash('sha1').update(JSON.stringify([ja, stimme, jpVorschau, s.wiederholen])).digest('hex').slice(0, 10);
    const datei = `jp-${s.id}-${key}.wav`, ziel = path.join(ton, datei), meta = ziel + '.json';
    if (!fs.existsSync(meta)) {
      const r = await japanisch(ja, stimme, ziel, jpVorschau);
      const wAb = s.wiederholen ? verdoppeln(ziel) : undefined;
      fs.writeFileSync(meta, JSON.stringify({ ...r, dauer: dauer(ziel), wiederholungAb: wAb }));
    }
    const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
    timing.segmente[s.id] = { datei: 'ton/' + datei, dauer: m.dauer, phrasen: m.phrasen, wiederholungAb: m.wiederholungAb };
  }

  // --- Deutsch ---
  const erz = ep.segmente.filter((x) => x.art === 'erzaehler');
  if (aufnahme) {
    const w = whisper();
    if (!w) throw new Error('whisper.cpp oder Modell fehlt (werkzeuge/whisper). Einrichtungs-Skript erneut ausführen.');
    const { w16, sauber } = saeubern(aufnahme, path.join(ord, 'aufnahme'));
    const woerter = erkenne(w.exe, w.modell, w16);
    fs.writeFileSync(path.join(ord, 'aufnahme', 'woerter.json'), JSON.stringify(woerter, null, 1));
    const treffer = abgleichen(erz.map((s) => anzeigeText(s.text ?? '')), woerter);
    treffer.forEach((t, i) => {
      const s = erz[i];
      if (!t) throw new Error(`Zeile ${i + 1} („${s.text}“) wurde in der Aufnahme nicht gefunden.`);
      if (t.score < 0.75) meldungen.push(`Zeile ${i + 1}: unsichere Erkennung (${Math.round(t.score * 100)} %) – bitte anhören.`);
      if (t.versuche > 1) meldungen.push(`Zeile ${i + 1}: ${t.versuche}× gesprochen → letzte gute Version genommen.`);
      const datei = `de-${s.id}.wav`;
      const r = schneideZeile(sauber, woerter.slice(t.von, t.bis + 1), path.join(ton, datei), v.ton.stimmeLUFS);
      timing.segmente[s.id] = { datei: 'ton/' + datei, dauer: r.dauer, woerter: r.woerter };
    });
  } else if (el) {
    const texte = erz.map((s) => s.text ?? '');
    const deTexte = texte.flatMap((t) => teile(t).filter((x) => x.art === 'de').map((x) => (x as { text: string }).text));
    const kosten = elKosten(deTexte, el, ton);
    const k = await elKontingent();
    timing.elTier = k.tier; timing.elStimme = el.name;
    if (kosten > k.rest) throw new Error(`ElevenLabs-Guthaben reicht nicht: Folge braucht ${kosten} Zeichen, übrig sind ${k.rest} von ${k.limit} (Reset ${new Date(k.reset * 1000).toLocaleDateString('de-DE')}).`);
    const tempo = Number(el.tempo ?? 1); // lokale Beschleunigung (kostenlos, ohne neue ElevenLabs-Zeichen)
    for (let i = 0; i < erz.length; i++) {
      timing.segmente[erz[i].id] = await mischeErzaehlung(texte[i], ton, async (de, davor, danach) => {
        const r = await elSatz(de, el, ton, davor, danach, v.ton.stimmeLUFS);
        return { datei: r.datei, woerter: r.woerter };
      }, tempo, anzeigeText(texte[i - 1] ?? ''), anzeigeText(texte[i + 1] ?? ''));
    }
    meldungen.push(`Erzählung: ElevenLabs „${el.name}“ (${kosten} neue Zeichen, danach ${k.rest - kosten} von ${k.limit} übrig, Plan ${k.tier})`);
    if (k.tier === 'free') meldungen.push('ElevenLabs Free-Plan: nur nicht-kommerziell und mit Namensnennung (steht in caption.txt) – für Monetarisierung Starter-Plan nötig.');
  } else {
    const art = vorschauStimmeDE();
    for (const s of erz) {
      timing.segmente[s.id] = await mischeErzaehlung(s.text ?? '', ton, async (de) => {
        const key = crypto.createHash('sha1').update(JSON.stringify([de, art])).digest('hex').slice(0, 10);
        const datei = `vorschau-de-${key}.wav`, ziel = path.join(ton, datei);
        if (!fs.existsSync(ziel)) {
          sprichDE(de, ziel + '.roh.wav', art);
          ffmpeg(['-i', ziel + '.roh.wav', '-ac', '1', '-ar', '48000', '-af', `silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=${v.ton.stimmeLUFS}:TP=-1.5:LRA=11`, ziel]);
          fs.rmSync(ziel + '.roh.wav');
        }
        const d = dauer(ziel), ws = de.split(/\s+/).filter(Boolean), gesamt = ws.reduce((a, w) => a + w.length + 1, 0);
        let c = 0;
        return { datei, woerter: ws.map((w) => { const st = (c / gesamt) * d; c += w.length + 1; return { w, start: +st.toFixed(3), ende: +((c / gesamt) * d).toFixed(3) }; }) };
      }, 1);
    }
    meldungen.push(`Vorschau-Stimme (${art}) – keine eigene Aufnahme. Ergebnis nur als preview.mp4.`);
  }
  const fx = sfx(ton);
  timing.sfx = { tick: 'ton/' + path.basename(fx.tick), pling: 'ton/' + path.basename(fx.pling) };
  schreib(path.join(ord, 'timing.json'), timing);
  if (jpOpenJTalk) meldungen.push('Japanisch: Open JTalk „Mei“ (CC BY 3.0) mit Tonhöhe je Rolle');
  else if (jpVorschau) meldungen.push('Japanisch mit Ersatzstimme (pyopenjtalk), weil VOICEVOX nicht läuft – nur Vorschau.');
  return { timing, meldungen };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('ton.ts')) {
  const rest = process.argv.slice(2); const id = rest.find((a) => !a.startsWith('--'));
  if (!id) { console.error('Aufruf: tsx scripts/ton.ts ep01 [--vorschau]'); process.exit(1); }
  erzeugeTon(id, { vorschau: rest.includes('--vorschau'), ohneEl: rest.includes('--ohne-elevenlabs') }).then(({ meldungen }) => { meldungen.forEach((m) => console.log('• ' + m)); console.log(`✓ timing.json für ${id}`); }).catch((e) => { console.error('✗ ' + e.message); process.exit(1); });
}
