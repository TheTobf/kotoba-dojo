/**
 * Kommandozeile des Folgen-Generators. Aufruf über npm (im Ordner studio/):
 *   npm run pruefen [-- ep01 ep02]   Folgen prüfen (Lehrplan, Szenen, Länge, keine Werbung)
 *   npm run skripte                   Sprechskripte + Sammelblatt + progress.json erzeugen
 *   npm run vorschau -- ep01          Vorschau mit Ersatzstimmen → out/ep01/preview.mp4 (nie posten)
 *   npm run kontrolle -- ep01         Ton aus deiner Aufnahme + Standbilder + Prüfbericht
 *   npm run final -- ep01             fertiges Video, Titelbild, Beschreibung, App-Lektion
 *   npm run fertig                    alle Folgen mit neuer Aufnahme: Ton + Kontrolle (danach final)
 *   npm run status                    Übersicht, Vorlauf, fehlende Aufnahmen, out/POSTPLAN.md
 *   npm run stimmen                   VOICEVOX-Nutzungsbedingungen aus der Engine speichern
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Timeline } from '../src/episode/timeline'
import { produceAudio } from './lib/audio'
import { appCaptionText, captionText, germanDate, learnedJson, voicesUsed, writePostplan, writeRecordingSheet, writeScripts } from './lib/outputs'
import { LICENSES_DIR, REPO, outDir, workDir } from './lib/paths'
import { appIds, checkedVoices, episodeIds, isApp, loadApp, loadCurriculum, loadEpisode, loadStyle, recordingOf, statusOf, validate, writeProgress } from './lib/project'
import { renderCheckStills, renderCover, renderVideo, writeJson } from './lib/render'
import * as voicevox from './lib/voicevox'

const [cmd, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter((a) => a.startsWith('--')))
const args = rest.filter((a) => !a.startsWith('--'))
const rel = (f: string) => relative(REPO, f).replace(/\\/g, '/')
const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12)

async function main() {
  switch (cmd) {
    case 'pruefen': return pruefen(args.length ? args : [...episodeIds(), ...appIds()])
    case 'skripte': return skripte()
    case 'vorschau': return vorschau(need(args[0]))
    case 'kontrolle': return kontrolle(need(args[0]), flags.has('--vorschau'))
    case 'final': return final(need(args[0]))
    case 'fertig': return fertig()
    case 'status': return status()
    case 'stimmen': return stimmen()
    default:
      console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
  }
}

const need = (id?: string) => { if (!id) throw new Error('Bitte Folge angeben, z. B. ep01'); return id }

function pruefen(ids: string[]) {
  let bad = 0
  for (const id of ids.filter(isApp)) {
    try { const a = loadApp(id); console.log(`\n✓ ${id} – ${a.title} (App-Video, Werbung)`) } catch (e) { bad++; console.log(`\n✗ ${(e as Error).message}`) }
  }
  for (const id of ids.filter((x) => !isApp(x))) {
    const r = validate(id)
    const est = r.estimate ? ` · geschätzt ${r.estimate.toFixed(0)} s` : ''
    console.log(`\n${r.errors.length ? '✗' : '✓'} ${id}${r.episode ? ` – ${r.episode.title}` : ''}${est}`)
    for (const e of r.errors) console.log(`  ✗ ${e}`)
    for (const w of r.warnings) console.log(`  ⚠ ${w}`)
    if (r.errors.length) bad++
  }
  if (bad) { console.log(`\n${bad} Folge(n) mit Fehlern.`); process.exitCode = 1 }
}

function skripte() {
  pruefen([...episodeIds(), ...appIds()])
  if (process.exitCode) return
  const written = writeScripts()
  const waiting = writeRecordingSheet()
  writeProgress()
  console.log(`\nSprechskripte: ${written.map((id) => `recordings/${id}/script.md`).join(', ')}`)
  console.log(`Sammelblatt: recordings/AUFNAHME.md (${waiting.length} Folgen warten auf Aufnahme)`)
}

async function vorschau(id: string) {
  const ep = loadEpisode(id, true)
  console.log(`Vorschau ${id}: Ton mit Ersatzstimmen …`)
  const { timeline, report } = await produceAudio(ep, undefined, { allowPreviewJapanese: true })
  report.forEach((r) => console.log(`  ${r}`))
  await checkAndReport(id, timeline, report)
  const out = join(outDir(id), 'preview.mp4')
  console.log('Rendere preview.mp4 …')
  let last = -1
  const secs = await renderVideo(timeline, workDir(id), out, {
    scale: flags.has('--halb') ? 0.5 : 1,
    onProgress: (p) => { const pc = Math.floor(p * 10) * 10; if (pc !== last) { last = pc; console.log(`  ${pc} %`) } },
  })
  console.log(`✓ ${rel(out)} (${timeline.duration.toFixed(1)} s Video, Renderzeit ${(secs / 60).toFixed(1)} min) – NUR VORSCHAU, nicht posten.`)
}

/** Ton aus Aufnahme (oder Vorschau) + Standbilder + Bericht */
async function kontrolle(id: string, allowPreview = false) {
  const ep = loadEpisode(id, true)
  const rec = recordingOf(id)
  if (!rec && !allowPreview) throw new Error(`Für ${id} gibt es noch keine Aufnahme (recordings/${id}/voice.m4a). Für eine Vorschau: npm run vorschau -- ${id}`)
  console.log(`Kontrolle ${id}: Ton ${rec ? `aus ${rel(rec)}` : '(Vorschau)'} …`)
  const { timeline, report } = await produceAudio(ep, rec, { allowPreviewJapanese: allowPreview })
  report.forEach((r) => console.log(`  ${r}`))
  await checkAndReport(id, timeline, report)
}

async function checkAndReport(id: string, timeline: Timeline, report: string[]) {
  const folder = join(outDir(id), 'kontrolle')
  console.log('Standbilder für die Selbstkontrolle …')
  const stills = await renderCheckStills(timeline, workDir(id), folder)
  const problems = stills.flatMap((s) => s.problems.map((p) => `${s.t.toFixed(1)} s: ${p}`))
  const md = [
    `# Selbstkontrolle ${id}`,
    '',
    `Länge ${timeline.duration.toFixed(1)} s · ${timeline.shots.length} Einstellungen (Ø ${(timeline.duration / timeline.shots.length).toFixed(1)} s) · ${timeline.preview ? 'VORSCHAU (Ersatzstimmen)' : 'echte Stimmen'}`,
    '',
    '## Automatisch geprüft',
    '',
    ...report.map((r) => `- ${r}`),
    ...(problems.length ? problems.map((p) => `- ⚠ Bild: ${p}`) : ['- ✓ Keine Figur angeschnitten, kein Gesicht von Text verdeckt (automatische Prüfung)']),
    `- ${timeline.shots.every((s) => s.end - s.start <= 3.05 || timeline.quiz.some((q) => s.start >= q.start && s.end <= q.end + 0.1)) ? '✓' : '⚠'} Schnitt alle 2–3 s`,
    `- ${timeline.hook.end <= 3.3 && (timeline.clips.find((c) => c.kind === 'voice')?.start ?? 9) < 0.3 ? '✓' : '⚠'} Hook: Stimme ab Sekunde 0, großer Text in den ersten 2 s`,
    '',
    '## Von Claude anzusehen (jedes Bild öffnen!)',
    '',
    '- [ ] Figur vollständig im Bild, nichts schneidet durcheinander',
    '- [ ] Text lesbar und in der Sicherheitszone (gestrichelter Rahmen)',
    '- [ ] Japanisch korrekt (Lernkasten = Lehrplan), Kana/Romaji/Deutsch passen',
    '- [ ] Stimme und Untertitel synchron (Wortzeiten im Bericht oben)',
    '- [ ] Lautstärke ausgewogen (Mischung oben, Unterschied ≤ 3 LU)',
    '- [ ] Hook stark genug, Ende macht Lust auf die nächste Folge',
    '',
    '## Standbilder',
    '',
    ...stills.map((s) => `- \`${rel(s.file)}\` – ${s.t.toFixed(1)} s – ${s.why}${s.problems.length ? ` – ⚠ ${s.problems.join('; ')}` : ''}`),
    '',
  ].join('\n')
  writeFileSync(join(folder, 'BERICHT.md'), md)
  writeJson(join(folder, 'stand.json'), { timeline: sha(JSON.stringify(timeline)), problems: problems.length, preview: timeline.preview, datum: new Date().toISOString() })
  console.log(`✓ Bericht: ${rel(join(folder, 'BERICHT.md'))} (${stills.length} Standbilder, ${problems.length} automatische Hinweise)`)
}

async function final(id: string) {
  const ep = loadEpisode(id, true)
  const style = loadStyle()
  const work = workDir(id)
  const tlFile = join(work, 'timeline.json')
  const standFile = join(outDir(id), 'kontrolle', 'stand.json')
  if (!existsSync(tlFile) || !existsSync(standFile)) throw new Error(`Erst die Kontrolle: npm run kontrolle -- ${id}`)
  const timeline = JSON.parse(readFileSync(tlFile, 'utf8')) as Timeline
  const stand = JSON.parse(readFileSync(standFile, 'utf8')) as { timeline: string; problems: number; preview: boolean }
  if (stand.timeline !== sha(JSON.stringify(timeline))) throw new Error('Seit der Kontrolle hat sich etwas geändert – bitte Kontrolle neu laufen lassen.')
  if (timeline.preview || stand.preview) throw new Error('Das ist eine Vorschau mit Ersatzstimmen – als fertiges Video nicht erlaubt. Aufnahme ablegen und VOICEVOX starten.')
  if (stand.problems && !flags.has('--trotzdem')) throw new Error(`Die Kontrolle hat ${stand.problems} Hinweise. Beheben (episode.json) und Kontrolle wiederholen – oder nach Prüfung mit --trotzdem.`)
  const checked = checkedVoices()
  const unchecked = isApp(id) ? [] : voicesUsed(ep, style).filter((v) => !checked[v]?.kommerziell)
  if (unchecked.length) throw new Error(`Nutzungsbedingungen noch nicht geprüft für: ${unchecked.join(', ')}. Erst \`npm run stimmen\`, dann licenses/voicevox/geprueft.json eintragen.`)
  const out = outDir(id)
  mkdirSync(out, { recursive: true })
  console.log(`Rendere ${id} …`)
  let last = -1
  const secs = await renderVideo(timeline, work, join(out, 'video.mp4'), { onProgress: (p) => { const pc = Math.floor(p * 10) * 10; if (pc !== last) { last = pc; console.log(`  ${pc} %`) } } })
  const cur = loadCurriculum()
  const firstNew = ep.learn.new.length ? cur.get(ep.learn.new[0]) : undefined
  const coverAt = timeline.quiz[0] ? timeline.quiz[0].start + 0.2 : timeline.ja[0]?.start ?? 2
  await renderCover(timeline, work, join(out, 'cover.jpg'), { at: coverAt, title: ep.title, ja: firstNew?.ja })
  if (isApp(id)) writeFileSync(join(out, 'caption.txt'), appCaptionText(id, false))
  else {
    writeFileSync(join(out, 'caption.txt'), captionText(ep, style, false))
    writeJson(join(out, 'learned.json'), learnedJson(ep))
  }
  writeProgress()
  const { lead } = writePostplan()
  console.log(`✓ ${rel(join(out, 'video.mp4'))} · Renderzeit ${(secs / 60).toFixed(1)} min · Post: ${germanDate(ep.postDate)} · Vorlauf jetzt ${lead} Tage`)
}

async function fertig() {
  const ready = [...episodeIds(), ...appIds()].filter((id) => recordingOf(id) && statusOf(id) !== 'fertig')
  if (!ready.length) { console.log('Keine neue Aufnahme gefunden (recordings/epXX/voice.m4a).'); return status() }
  if (!(await voicevox.isRunning())) throw new Error('VOICEVOX läuft nicht – bitte starten, dann noch einmal.')
  for (const id of ready) await kontrolle(id)
  console.log(`\nKontrolle fertig für: ${ready.join(', ')}. Jetzt die Standbilder ansehen, dann je Folge: npm run final -- <id>`)
}

function status() {
  const today = new Date().toISOString().slice(0, 10)
  writeProgress()
  writeRecordingSheet()
  const { lead, missing } = writePostplan(today)
  const ids = episodeIds()
  console.log(`\nStatus am ${germanDate(today)}`)
  for (const id of ids) {
    const ep = JSON.parse(readFileSync(join(REPO, 'episodes', id, 'episode.json'), 'utf8')) as { title: string; postDate: string; season: number; number: number }
    const st = statusOf(id)
    console.log(`  ${st === 'fertig' ? '✅' : st === 'aufnahme-da' ? '🎙' : '⏳'} ${id}  S${ep.season}F${ep.number}  ${germanDate(ep.postDate)}  ${ep.title}${st === 'geplant' ? '  (Aufnahme fehlt)' : st === 'aufnahme-da' ? '  (→ /fertig)' : ''}`)
  }
  for (const id of appIds()) {
    const a = loadApp(id)
    const st = statusOf(id)
    console.log(`  ${st === 'fertig' ? '✅' : st === 'aufnahme-da' ? '🎙' : '⏳'} ${id}  App-Video  ${germanDate(a.postDate)}  ${a.title}${st === 'geplant' ? '  (Aufnahme fehlt)' : ''}`)
  }
  const done = ids.filter((id) => statusOf(id) === 'fertig').length
  console.log(`\nFertig: ${done} von ${ids.length} · Vorlauf: ${lead} Tag(e) · Aufnahmen fehlen: ${missing.length ? missing.join(', ') : 'keine'}`)
  if (lead < 7) console.log(`⚠ WARNUNG: Vorlauf unter 7 Tagen! ${missing.length ? `Als Nächstes einsprechen: ${missing.slice(0, 7 - lead).join(', ')} (recordings/AUFNAHME.md)` : 'Neue Staffel planen: /staffel'}`)
  console.log('Postplan: out/POSTPLAN.md · Sammelblatt: recordings/AUFNAHME.md')
}

async function stimmen() {
  const style = loadStyle()
  if (!(await voicevox.isRunning())) throw new Error('VOICEVOX läuft nicht – bitte starten.')
  mkdirSync(LICENSES_DIR, { recursive: true })
  const checked = checkedVoices()
  for (const [key, v] of Object.entries(style.stimmen)) {
    if (typeof v === 'string') continue
    const { uuid } = await voicevox.resolveStyle(v.voicevox, v.stil)
    const policy = await voicevox.speakerPolicy(uuid)
    const file = join(LICENSES_DIR, `${v.voicevox}.md`)
    writeFileSync(file, `# ${v.voicevox} (für „${key}“)\n\nAus der VOICEVOX-Engine geladen am ${new Date().toISOString().slice(0, 10)}.\n\n${policy}\n`)
    console.log(`${checked[v.voicevox] ? '✓ geprüft' : '⚠ noch prüfen'}  ${v.voicevox} → ${rel(file)}`)
  }
  console.log('\nClaude liest jede Datei und trägt das Ergebnis in licenses/voicevox/geprueft.json ein (Pflicht-Namensnennung, kommerziell erlaubt?).')
}

main().catch((e) => { console.error(`\n✗ ${e instanceof Error ? e.message : e}`); process.exit(1) })
