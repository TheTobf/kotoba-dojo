// Rendert eine Folge mit Selbstkontrolle.
//   tsx scripts/render.ts ep01 --vorschau   → episodes/ep01/preview.mp4 (Vorschau-Stimme erlaubt, nie als fertiges Video)
//   tsx scripts/render.ts ep01              → out/ep01/ (nur mit deiner Aufnahme + VOICEVOX)
//   Option --nur-kontrolle: nur Standbilder + Prüfbericht, kein Video
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import { zeitleiste } from '../src/folge/zeitleiste';
import type { FolgeProps } from '../src/folge/Folge';
import { appCaption, caption, learned, schreibePostplan } from './ausgabe';
import { browserOptionen } from './lib/browser';
import { alleEpisoden, ausgabeOrdner, epOrdner, findeAufnahme, ladeEpisode, ladeLehrplan, ladeTiming, ladeVorlage, lies, p, schreib } from './lib/projekt';
import { ffmpeg, ffmpegAusgabe } from './lib/werkzeuge';
import { erzeugeTon } from './ton';

type Bericht = { fehler: string[]; warnungen: string[]; ok: string[]; standbilder: string[] };

async function vorbereiten(id: string, vorschau: boolean) {
  const ep = ladeEpisode(id), v = ladeVorlage(), lp = ladeLehrplan();
  const tonInfo = await erzeugeTon(id, { vorschau });
  const timing = ladeTiming(id);
  // eigener public-Ordner pro Folge: Schriften + Ton
  const pub = p('.cache', 'public', id);
  fs.rmSync(pub, { recursive: true, force: true });
  fs.mkdirSync(pub, { recursive: true });
  fs.cpSync(p('public', 'fonts'), path.join(pub, 'fonts'), { recursive: true });
  fs.cpSync(path.join(epOrdner(id), 'ton'), path.join(pub, 'ton'), { recursive: true, filter: (f) => !f.endsWith('.json') });
  if (fs.existsSync(path.join(epOrdner(id), 'bilder'))) fs.cpSync(path.join(epOrdner(id), 'bilder'), path.join(pub, 'bilder'), { recursive: true });
  const benutzt = new Set([...ep.neu, ...ep.wiederholung, ...ep.segmente.map((s) => s.curriculum).filter(Boolean) as string[]]);
  const progress = lies<{ gelernt: string[] }>(p('curriculum', 'progress.json'));
  const gelernt = new Set([...progress.gelernt, ...ep.neu]);
  if (ep.art !== 'app') alleEpisoden().filter((e) => e.startsWith('ep') && e <= id).forEach((e) => ladeEpisode(e).neu.forEach((c) => gelernt.add(c)));
  const props: FolgeProps = {
    episode: ep, timing, vorlage: v, lehrplan: Object.fromEntries([...benutzt].map((k) => [k, lp[k]])),
    zaehler: `Knö kann jetzt ${gelernt.size} ${gelernt.size === 1 ? 'Satz' : 'Sätze'}`, modus: vorschau ? 'vorschau' : 'final',
  };
  const serveUrl = await bundle({ entryPoint: p('src', 'index.ts'), publicDir: pub });
  return { ep, v, timing, props, serveUrl, tonInfo };
}

/** Standbilder an wichtigen Zeitpunkten + automatische Prüfungen. */
async function kontrolle(id: string, serveUrl: string, props: FolgeProps, vorschau: boolean): Promise<Bericht> {
  const b: Bericht = { fehler: [], warnungen: [], ok: [], standbilder: [] };
  const v = props.vorlage as any, ep = props.episode;
  const tl = zeitleiste(ep, props.timing, v);
  const sek = tl.gesamt / tl.fps;
  // Länge
  if (sek < v.laenge.minSek || sek > v.laenge.maxSek) (vorschau ? b.warnungen : b.fehler).push(`Länge ${sek.toFixed(1)} s (Ziel ${v.laenge.minSek}–${v.laenge.maxSek} s)`);
  else b.ok.push(`Länge ${sek.toFixed(1)} s`);
  // Hook
  const hook = ep.texte.find((t) => t.art === 'hook');
  if (!hook || hook.ab !== ep.segmente[0].id) b.fehler.push('Kein Hook-Text am Anfang'); else b.ok.push(`Hook ab 0 s: „${hook.text}“`);
  // Schnitte
  const laengster = Math.max(...tl.shots.map((s) => (s.bis - s.von) / tl.fps));
  if (laengster > v.schnitt.schnittMaxSek + 0.05) b.fehler.push(`Einstellung zu lang: ${laengster.toFixed(1)} s`);
  else b.ok.push(`${tl.shots.length} Einstellungen, längste ${laengster.toFixed(1)} s (Regel ≤ ${v.schnitt.schnittMaxSek} s)`);
  // Quiz + Auflösung
  const qi = ep.segmente.findIndex((s) => s.art === 'quiz');
  if (qi < 0 && ep.art !== 'app') b.fehler.push('Kein Quiz-Moment'); else if (qi < 0) b.ok.push('App-Video: ohne Quiz'); else if (ep.segmente[qi + 1]?.art !== 'japanisch') b.warnungen.push('Nach dem Quiz kommt nicht direkt die japanische Auflösung');
  else b.ok.push('Quiz mit Countdown und direkter Auflösung');
  // Japanisch
  const lp = props.lehrplan;
  for (const s of ep.segmente.filter((x) => x.art === 'japanisch')) {
    if (s.curriculum && !lp[s.curriculum]) b.fehler.push(`${s.id}: Lehrplan-ID ${s.curriculum} unbekannt`);
    if (s.curriculum && lp[s.curriculum]?.pruefen) b.fehler.push(`${s.id}: ${s.curriculum} ist [PRÜFEN]`);
    if (!s.curriculum) b.warnungen.push(`${s.id}: freier japanischer Satz „${s.text}“ (${s.romaji}) – nicht aus dem geprüften Lehrplan, bitte gegenlesen`);
  }
  // Ton-Quelle
  if (props.timing.quelle === 'vorschau') (vorschau ? b.warnungen : b.fehler).push('Deutsch: Vorschau-Stimme statt Aufnahme/ElevenLabs');
  else b.ok.push(props.timing.quelle === 'elevenlabs' ? `Deutsch: ElevenLabs (${props.timing.elStimme}), wortgenaue Zeitmarken` : 'Deutsch: deine Aufnahme');
  if (props.timing.jpQuelle === 'vorschau') (vorschau ? b.warnungen : b.fehler).push('Japanisch: Ersatzstimme statt VOICEVOX');
  else b.ok.push(props.timing.jpQuelle === 'openjtalk' ? 'Japanisch: Open JTalk „Mei“' : 'Japanisch: VOICEVOX');
  // Standbilder
  const frames = new Map<number, string>();
  frames.set(Math.round(tl.fps * 1), 'hook');
  tl.segs.forEach((s) => {
    if (s.seg.art === 'japanisch') frames.set(Math.round(s.von + (s.bis - s.von) * 0.6), `jp-${s.seg.id}`);
    if (s.seg.art === 'quiz') frames.set(Math.round(s.von + tl.fps * 0.5), 'quiz');
  });
  const erz = tl.segs.filter((s) => s.seg.art === 'erzaehler');
  if (erz.length) frames.set(Math.round((erz[erz.length - 1].von + erz[erz.length - 1].bis) / 2), 'cliffhanger');
  frames.set(tl.gesamt - 10, 'ende');
  // zusätzlich jede 4. Einstellung
  tl.shots.filter((_, i) => i % 4 === 2).forEach((s) => { const f = Math.round((s.von + s.bis) / 2); if (![...frames.keys()].some((k) => Math.abs(k - f) < 20)) frames.set(f, `shot-${f}`); });
  const ordner = path.join(epOrdner(id), 'kontrolle');
  fs.rmSync(ordner, { recursive: true, force: true }); fs.mkdirSync(ordner, { recursive: true });
  const composition = await selectComposition({ serveUrl, id: 'Folge', inputProps: { ...props, pruefen: true }, ...browserOptionen() });
  const logs: string[] = [];
  for (const [f, name] of [...frames.entries()].sort((a, c) => a[0] - c[0])) {
    const out = path.join(ordner, `${String(f).padStart(5, '0')}-${name}.png`);
    await renderStill({ serveUrl, composition, frame: f, output: out, inputProps: { ...props, pruefen: true }, ...browserOptionen(), onBrowserLog: (l) => { if (l.text.startsWith('PRUEF|')) logs.push(l.text); } });
    b.standbilder.push(out);
  }
  // Prüfmeldungen aus dem Bild
  const zonen = logs.filter((l) => l.startsWith('PRUEF|zone')).map((l) => l.split('|'));
  zonen.forEach(([, , f, el, msg]) => b.fehler.push(`Bild ${f}: ${el} außerhalb der Sicherheitszone (${msg})`));
  if (!zonen.length) b.ok.push('Alle Texte in der Sicherheitszone');
  const letzte = new Map<string, string[]>();
  logs.filter((l) => l.startsWith('PRUEF|figurbox|')).forEach((l) => { const t = l.split('|'); letzte.set(t[2], t); });
  const fig = [...letzte.values()].filter((t) => t[5] === '1');
  fig.forEach(([, , f, name]) => b.warnungen.push(`Bild ${f}: Figur „${name}“ angeschnitten`));
  [...letzte.values()].filter((t) => t[6]).forEach(([, , f, name, , , wer]) => wer.split(',').forEach((w) => b.fehler.push(w === 'RUECKEN' ? `Bild ${f}: „${name}“ spricht mit dem Rücken zur Kamera` : `Bild ${f}: „${w}“ verdeckt das Gesicht von „${name}“`)));
  // Text verdeckt Figur?
  const boxen = (art: string) => logs.filter((l) => l.startsWith(`PRUEF|${art}|`)).map((l) => { const [, , f, n, xy] = l.split('|'); const [l1, t1, r1, u1] = xy.split(',').map(Number); return { f: Number(f), n, l: l1, t: t1, r: r1, u: u1 }; });
  const tb = boxen('box'), fb = boxen('figurbox').filter((x) => letzte.get(String(x.f))?.[4] === `${x.l},${x.t},${x.r},${x.u}`);
  for (const f of fb) for (const t of tb.filter((x) => x.f === f.f)) {
    const kopfY = f.t, mitteX = (f.l + f.r) / 2;
    if (kopfY > t.t + 30 && kopfY < t.u - 30 && mitteX > t.l && mitteX < t.r) b.warnungen.push(`Bild ${f.f}: ${t.n} verdeckt den Kopf von „${f.n}“`);
  }
  if (!fig.length) b.ok.push('Hauptfigur in allen Prüfbildern vollständig im Bild');
  // Kontaktbogen für den schnellen Blick (xstack, damit kein Bild verloren geht)
  const n = b.standbilder.length, spalten = Math.min(5, n), zeilen = Math.ceil(n / spalten), W = 324, H = 576;
  const eingaenge = b.standbilder.flatMap((s) => ['-i', s]);
  const skal = b.standbilder.map((_, i) => `[${i}]scale=${W}:${H}[v${i}]`).join(';');
  const layout = b.standbilder.map((_, i) => `${(i % spalten) * (W + 6)}_${Math.floor(i / spalten) * (H + 6)}`).join('|');
  ffmpeg([...eingaenge, '-filter_complex', `${skal};${b.standbilder.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${n}:layout=${layout}:fill=white${n === 1 ? '' : ''}[o]`, '-map', '[o]', '-frames:v', '1', path.join(ordner, 'kontaktbogen.jpg')]);
  return b;
}

function lautheit(datei: string) {
  const out = ffmpegAusgabe(['-i', datei, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(out.slice(out.lastIndexOf('Summary')))?.[1]);
  const peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(out.slice(out.lastIndexOf('Summary')))?.[1]);
  return { I, peak };
}

export async function rendere(id: string, opt: { vorschau: boolean; nurKontrolle?: boolean }) {
  const t0 = Date.now();
  const v = ladeVorlage();
  if (!opt.vorschau) {
    if (!findeAufnahme(id) && !(v.erzaehler?.quelle === 'elevenlabs' && process.env.ELEVENLABS_API_KEY)) throw new Error(`Keine Aufnahme in recordings/${id}/ und keine ElevenLabs-Stimme eingerichtet (ELEVENLABS_API_KEY fehlt).`);
    if (v.japanisch?.quelle !== 'openjtalk' && !v.stimmenBedingungenGeprueft) throw new Error('Die Nutzungsbedingungen der VOICEVOX-Stimmen sind noch nicht bestätigt (LICENSES.md, stilvorlage.stimmenBedingungenGeprueft).');
  }
  const { ep, props, serveUrl, tonInfo } = await vorbereiten(id, opt.vorschau);
  const b = await kontrolle(id, serveUrl, props, opt.vorschau);
  tonInfo.meldungen.forEach((m) => (m.includes('unsicher') ? b.warnungen.push(m) : b.ok.push(m)));
  const berichtDatei = path.join(epOrdner(id), 'kontrolle', 'bericht.md');
  const schreibBericht = (extra: string[] = []) => fs.writeFileSync(berichtDatei, [`# Selbstkontrolle ${id} (${opt.vorschau ? 'Vorschau' : 'final'})`, '', '## Fehler', ...(b.fehler.length ? b.fehler.map((x) => `- ❌ ${x}`) : ['- keine']), '', '## Warnungen', ...(b.warnungen.length ? b.warnungen.map((x) => `- ⚠️ ${x}`) : ['- keine']), '', '## OK', ...b.ok.map((x) => `- ✅ ${x}`), '', '## Standbilder (bitte ansehen)', ...b.standbilder.map((s) => `- ${path.relative(p(), s)}`), '- episodes/' + id + '/kontrolle/kontaktbogen.jpg', ...extra, ''].join('\n'));
  schreibBericht();
  if (opt.nurKontrolle) return { bericht: b, berichtDatei, sek: (Date.now() - t0) / 1000 };
  if (b.fehler.length) throw new Error(`Selbstkontrolle hat ${b.fehler.length} Fehler gefunden – siehe ${path.relative(p(), berichtDatei)}`);

  const ziel = opt.vorschau ? path.join(epOrdner(id), 'preview.mp4') : path.join(ausgabeOrdner(id), 'video.mp4');
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  const roh = ziel.replace(/\.mp4$/, '.roh.mp4');
  const composition = await selectComposition({ serveUrl, id: 'Folge', inputProps: props, ...browserOptionen() });
  const tR = Date.now();
  await renderMedia({ serveUrl, composition, codec: 'h264', crf: v.format.crf, outputLocation: roh, inputProps: props, audioBitrate: v.format.audioBitrate, concurrency: Math.max(1, Math.floor(((await import('node:os')).cpus().length) / 2)), ...browserOptionen(),
    onProgress: ({ progress }) => { if (Math.round(progress * 100) % 10 === 0) process.stdout.write(`\r  rendern … ${Math.round(progress * 100)} %`); } });
  process.stdout.write('\n');
  const renderSek = (Date.now() - tR) / 1000;
  // Lautheit auf Plattform-Ziel (-14 LUFS) bringen
  ffmpeg(['-i', roh, '-c:v', 'copy', '-af', `loudnorm=I=${v.ton.zielLautheitLUFS}:TP=-1.5:LRA=11`, '-c:a', 'aac', '-b:a', v.format.audioBitrate, '-ar', '48000', '-movflags', '+faststart', ziel]);
  fs.rmSync(roh);
  const l = lautheit(ziel);
  const lautOk = Math.abs(l.I - v.ton.zielLautheitLUFS) <= 1.5 && l.peak <= -0.5;
  (lautOk ? b.ok : b.warnungen).push(`Lautheit ${l.I} LUFS, Spitze ${l.peak} dBFS (Ziel ${v.ton.zielLautheitLUFS} LUFS)`);
  b.ok.push('Erzählung und japanische Stimme einzeln auf gleiche Lautheit normalisiert (−16 LUFS), keine Musik');
  schreibBericht([`\nRenderzeit: ${renderSek.toFixed(0)} s für ${(zeitleiste(ep, props.timing, v).gesamt / 30).toFixed(1)} s Video`]);

  if (!opt.vorschau) {
    const out = ausgabeOrdner(id);
    fs.writeFileSync(path.join(out, 'caption.txt'), ep.art === 'app' ? appCaption(ep) : caption(ep));
    if (ep.art !== 'app') schreib(path.join(out, 'learned.json'), await learned(ep));
    const sz = ep.shots[0].szene;
    const neu = props.lehrplan[ep.neu[0]];
    const cov = await selectComposition({ serveUrl, id: 'Cover', inputProps: { szene: sz, titel: ep.titel, zeile: `Gestrandet in Japan · S${ep.staffel} F${ep.folge}`, satz: neu?.ja ?? '' }, ...browserOptionen() });
    await renderStill({ serveUrl, composition: cov, output: path.join(out, 'cover.jpg'), imageFormat: 'jpeg', jpegQuality: 90, inputProps: { szene: sz, titel: ep.titel, zeile: `Gestrandet in Japan · S${ep.staffel} F${ep.folge}`, satz: neu?.ja ?? '' }, ...browserOptionen() });
    fs.copyFileSync(berichtDatei, path.join(out, 'kontrolle.md'));
    // Fortschritt merken (nur Serien-Folgen)
    if (ep.art !== 'app') {
    const prog = lies<{ version: number; gelernt: string[]; folgen: Record<string, unknown> }>(p('curriculum', 'progress.json'));
    prog.gelernt = [...new Set([...prog.gelernt, ...ep.neu])];
    prog.folgen[id] = { neu: ep.neu, wiederholung: ep.wiederholung, fertig: new Date().toISOString().slice(0, 10) };
    schreib(p('curriculum', 'progress.json'), prog);
    }
    schreibePostplan();
  }
  return { bericht: b, berichtDatei, ziel, sek: (Date.now() - t0) / 1000, renderSek };
}

if (process.argv[1]?.endsWith('render.ts')) {
  const rest = process.argv.slice(2); const id = rest.find((a) => !a.startsWith('--'));
  if (!id) { console.error('Aufruf: tsx scripts/render.ts ep01 [--vorschau] [--nur-kontrolle]'); process.exit(1); }
  rendere(id, { vorschau: rest.includes('--vorschau'), nurKontrolle: rest.includes('--nur-kontrolle') })
    .then((r) => { console.log(`✓ ${id}: ${'ziel' in r && r.ziel ? path.relative(p(), r.ziel) : 'Kontrolle'} (${r.sek.toFixed(0)} s)`); console.log(`  Bericht: ${path.relative(p(), r.berichtDatei)}`); r.bericht.fehler.forEach((f) => console.log('  ❌ ' + f)); r.bericht.warnungen.forEach((w) => console.log('  ⚠️ ' + w)); })
    .catch((e) => { console.error('✗ ' + e.message); process.exit(1); });
}
