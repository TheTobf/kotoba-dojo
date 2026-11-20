/** Texte rund um jede Folge: Sprechskript, Sammel-Skript, Videobeschreibung, App-Lektion, Postplan. */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CurriculumEntry, Episode } from '../../src/episode/schema'
import { APPVIDEOS_DIR, OUT_DIR, RECORDINGS_DIR, recordingDir } from './paths'
import { appIds, checkedVoices, episodeIds, loadApp, loadCurriculum, loadEpisode, rawEpisode, recordingOf, statusOf, voiceOf, type Style } from './project'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
export const germanDate = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}` }

const RECORD_HINTS = [
  '**So nimmst du auf:** Handy-Sprachmemo, ruhiger Raum (Vorhänge/Teppich helfen), Handy 20–30 cm vor dem Mund.',
  'Lies die nummerierten Sätze der Reihe nach, ganz normal und lebendig – wie für einen Freund.',
  'Versprochen? Einfach den **ganzen Satz** noch einmal sagen. Die Pipeline nimmt automatisch die letzte gute Fassung.',
  'Die Nummern liest du **nicht** mit vor. Wörter in Klammern sind Regieanweisungen, die sprichst du auch nicht.',
  'Japanisch sprichst du nicht – das kommt von VOICEVOX (unten mit ▶ markiert). Dort einfach weitermachen.',
]

/** Sprechskript einer Folge (recordings/epXX/script.md) */
export function scriptMarkdown(ep: Episode, cur: Map<string, CurriculumEntry>): string {
  const out: string[] = [
    `# Folge ${Number(ep.id.slice(2))} · ${ep.title}`,
    '',
    `Staffel ${ep.season} · Folge ${ep.number} · Post geplant: ${germanDate(ep.postDate)} · Ziel: 61–75 Sekunden`,
    '',
    ...RECORD_HINTS.map((h) => `- ${h}`),
    '',
    `**Speichern als:** \`recordings/${ep.id}/voice.m4a\` (mp3 oder wav gehen auch)`,
    '',
    '---',
    '',
  ]
  for (const b of ep.beats) {
    if (b.kind === 'erzaehler') {
      for (const l of b.lines) {
        out.push(`${l.n}. ${l.regie ? `*(${l.regie})* ` : ''}${l.text}${l.pause === 'kurz' ? ' *(kurze Pause)*' : l.pause === 'lang' ? ' *(lange Pause)*' : ''}`)
      }
    } else {
      const e = cur.get(b.sentence)
      const who = ep.cast[b.speaker]?.label ?? b.speaker
      const what = b.kind === 'quiz' ? `QUIZ – ${b.question} Countdown 3-2-1, dann ${who}:` : `JAPANISCH – ${who}:`
      out.push('', `   ▶ ${what} ${e?.ja ?? b.sentence} *(sprichst du nicht)*`, '')
    }
  }
  out.push('', '---', '', 'Fertig? Datei ablegen und in Claude Code `/fertig` tippen.', '')
  return out.join('\n')
}

export function writeScripts(): string[] {
  const cur = loadCurriculum()
  const written: string[] = []
  for (const id of appIds()) {
    const ep = loadEpisode(id)
    mkdirSync(recordingDir(id), { recursive: true })
    writeFileSync(join(recordingDir(id), 'script.md'), scriptMarkdown(ep, cur).replace(/^# Folge \d+ · /, '# App-Video · ').replace(/Staffel \d+ · Folge \d+ · /, 'Werbung für die eigene App · ').replace('Ziel: 61–75 Sekunden', 'Ziel: 20–60 Sekunden'))
    written.push(id)
  }
  for (const id of episodeIds()) {
    const ep = loadEpisode(id)
    mkdirSync(recordingDir(id), { recursive: true })
    writeFileSync(join(recordingDir(id), 'script.md'), scriptMarkdown(ep, cur))
    written.push(id)
  }
  return written
}

/** Alle Skripte ohne Aufnahme am Stück (recordings/AUFNAHME.md) */
export function writeRecordingSheet(): string[] {
  const cur = loadCurriculum()
  const waiting = episodeIds().filter((id) => !recordingOf(id) && statusOf(id) !== 'fertig')
  const parts = [
    '# Aufnahme-Sammelblatt',
    '',
    waiting.length ? `Diese ${waiting.length} Folgen warten auf deine Stimme – in Post-Reihenfolge. **Pro Folge eine eigene Datei** (Sprachmemo stoppen, neue starten).` : 'Alle Folgen sind eingesprochen. 🎉',
    '',
    ...RECORD_HINTS.map((h) => `- ${h}`),
    '',
  ]
  for (const id of waiting) {
    const ep = loadEpisode(id)
    parts.push('---', '', scriptMarkdown(ep, cur).split('\n---\n')[1].trim().replace(/^/, `## ${id} · ${ep.title} (${germanDate(ep.postDate)}) → \`recordings/${id}/voice.m4a\`\n\n`), '')
  }
  for (const dir of existsSync(APPVIDEOS_DIR) ? readdirSync(APPVIDEOS_DIR) : []) {
    if (!/^app-\d+$/.test(dir) || recordingOf(dir)) continue
    const sheet = join(RECORDINGS_DIR, dir, 'script.md')
    if (existsSync(sheet)) parts.push('---', '', `## ${dir} (App-Video) → \`recordings/${dir}/voice.m4a\``, '', `Skript: \`recordings/${dir}/script.md\``, '')
  }
  mkdirSync(RECORDINGS_DIR, { recursive: true })
  writeFileSync(join(RECORDINGS_DIR, 'AUFNAHME.md'), parts.join('\n'))
  return waiting
}

/** Stimmen, die in der Folge japanisch sprechen */
export function voicesUsed(ep: Episode, style: Style): string[] {
  const keys = new Set(ep.beats.flatMap((b) => (b.kind === 'erzaehler' ? [] : [ep.cast[b.speaker].voice!])))
  return [...keys].map((k) => voiceOf(style, k).voicevox)
}

export function captionText(ep: Episode, style: Style, preview: boolean): string {
  const cur = loadCurriculum()
  const line = (id: string) => { const e = cur.get(id)!; return `${e.ja} (${e.romaji}) – ${e.de}` }
  const credits = voicesUsed(ep, style).map((v) => checkedVoices()[v]?.credit ?? `VOICEVOX:${v}`)
  const next = episodeIds().find((id) => Number(id.slice(2)) === Number(ep.id.slice(2)) + 1)
  return [
    preview ? '!!! VORSCHAU – NICHT POSTEN (Ersatzstimmen) !!!\n' : '',
    '=== Beschreibung (kopieren) ===',
    '',
    `${style.serie} – Staffel ${ep.season}, Folge ${ep.number}: ${ep.title}`,
    '',
    ep.summary,
    '',
    'Heute gelernt:',
    ...ep.learn.new.map((id) => `• ${line(id)}`),
    ...(ep.learn.review.length ? ['Wiederholt:', ...ep.learn.review.map((id) => `• ${line(id)}`)] : []),
    '',
    style.hashtags.slice(0, 5).join(' '),
    '',
    `Japanische Stimmen: ${credits.join(', ')}`,
    'Mit KI und Code erstellt (3D-Szenen per Code, japanische Stimmen per Sprachsynthese, Erzählung: echte Stimme).',
    '',
    '=== Angepinnter Kommentar (Vorschlag) ===',
    '',
    'Ihr fragt, wo man die Sätze üben kann: Alle Sätze aus „Gestrandet in Japan“ gibt es zum Wiederholen in meiner App – Link in der Bio. ' +
      (next ? 'Morgen geht es weiter! 🦭' : 'Bald geht es weiter! 🦭'),
    '',
    '=== Beim Posten ===',
    '',
    '- Bei TikTok: „KI-generierte Inhalte“ kennzeichnen (Einstellung beim Posten).',
    '- Kein Sound aus der TikTok-Bibliothek darüberlegen (sonst Probleme bei YouTube/Instagram).',
    `- Titelbild: cover.jpg · geplant für ${germanDate(ep.postDate)}`,
    '',
  ].join('\n')
}

export function appCaptionText(id: string, preview: boolean): string {
  const a = loadApp(id)
  return [
    preview ? '!!! VORSCHAU – NICHT POSTEN (Ersatzstimme) !!!\n' : '',
    '=== Beschreibung (kopieren) ===',
    '',
    a.title,
    '',
    a.summary,
    '',
    'Link zur App in meiner Bio.',
    '',
    '#japanischlernen #japan #sprachenlernen #indiedev #gestrandetinjapan',
    'Mit KI und Code erstellt.',
    '',
    '=== Beim Posten – WICHTIG ===',
    '',
    '- Das ist WERBUNG für deine eigene App: bei TikTok „Offenlegung von Inhalten“ → „Deine Marke“ einschalten.',
    '- Bei Instagram/YouTube ebenfalls als Werbung/bezahlte Partnerschaft bzw. eigene Marke kennzeichnen.',
    '- Bei TikTok: „KI-generierte Inhalte“ kennzeichnen.',
    `- Geplant für ${germanDate(a.postDate)}.`,
    '',
  ].join('\n')
}

/** App-Lektion im Format der Kotoba-Dojo-App (src/content/story.ts → Episode) */
export function learnedJson(ep: Episode) {
  const cur = loadCurriculum()
  const ids = [...ep.learn.new, ...ep.learn.review]
  return {
    id: `gij-${ep.id}`,
    number: Number(ep.id.slice(2)),
    title: ep.title,
    titleJa: ep.titleJa,
    summary: ep.summary,
    sentences: ids.map((id) => {
      const e = cur.get(id)!
      return { ja: e.ja, kana: e.kana, romaji: e.romaji, de: e.de, note: e.hinweis ?? (e.muster ? `Muster: ${e.muster}` : `Typischer Satz in dieser Situation: ${e.situation}.`) }
    }),
  }
}

/** Postplan: welches Video an welchem Tag (out/POSTPLAN.md) */
export function writePostplan(today = new Date().toISOString().slice(0, 10)): { lead: number; missing: string[] } {
  const rows: string[] = []
  const days = new Map<string, string[]>()
  const missing: string[] = []
  for (const id of episodeIds()) {
    const raw = rawEpisode(id) as Episode
    const status = statusOf(id)
    if (status === 'geplant') missing.push(id)
    days.set(raw.postDate, [...(days.get(raw.postDate) ?? []), id])
    rows.push(`| ${germanDate(raw.postDate)} | ${id} · S${raw.season}F${raw.number} ${raw.title} | ${status === 'fertig' ? '✅ fertig' : status === 'aufnahme-da' ? '🎙 Aufnahme da → /fertig' : '⏳ Aufnahme fehlt'} | ${status === 'fertig' ? `out/${id}/video.mp4` : `recordings/${id}/script.md`} |`)
  }
  for (const dir of existsSync(APPVIDEOS_DIR) ? readdirSync(APPVIDEOS_DIR).filter((d) => /^app-\d+$/.test(d)) : []) {
    const f = join(APPVIDEOS_DIR, dir, 'appvideo.json')
    if (!existsSync(f)) continue
    const raw = JSON.parse(readFileSync(f, 'utf8')) as { postDate: string; title: string }
    const done = existsSync(join(OUT_DIR, dir, 'video.mp4'))
    rows.push(`| ${germanDate(raw.postDate)} | ${dir} · App-Video: ${raw.title} (Werbung kennzeichnen!) | ${done ? '✅ fertig' : recordingOf(dir) ? '🎙 Aufnahme da → /fertig' : '⏳ Aufnahme fehlt'} | ${done ? `out/${dir}/video.mp4` : `recordings/${dir}/script.md`} |`)
  }
  rows.sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  // Vorlauf: aufeinanderfolgende Tage ab heute, für die ein fertiges Video bereitliegt
  let lead = 0
  // Vor dem Serienstart ab dem ersten Post-Tag zählen, sonst ab heute
  const upcoming = [...days.keys()].filter((x) => x >= today).sort()
  const startDay = days.has(today) || !upcoming.length ? today : upcoming[0]
  const d = new Date(`${startDay}T12:00:00`)
  for (;;) {
    const iso = d.toISOString().slice(0, 10)
    const ids = days.get(iso)
    if (!ids || !ids.every((id) => statusOf(id) === 'fertig')) break
    lead++
    d.setDate(d.getDate() + 1)
  }
  const md = [
    '# Postplan',
    '',
    `Stand: ${germanDate(today)} · **Vorlauf: ${lead} Tag${lead === 1 ? '' : 'e'}**${lead < 7 ? ' ⚠ unter 7 Tagen' : ' ✓'}${startDay !== today ? ` (gezählt ab dem ersten Post-Tag ${germanDate(startDay)})` : ''}`,
    '',
    '| Tag | Video | Stand | Datei |',
    '|---|---|---|---|',
    ...rows,
    '',
    'Täglich eine Folge. App-Videos (Werbung) zusätzlich einmal pro Woche – beim Posten „Offenlegung von Inhalten → Deine Marke“ einschalten.',
    '',
  ].join('\n')
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, 'POSTPLAN.md'), md)
  return { lead, missing }
}

const sortKey = (row: string) => { const m = row.match(/(\d{2})\.(\d{2})\.(\d{4})/); return m ? `${m[3]}${m[2]}${m[1]}${row.includes('App-Video') ? 'b' : 'a'}` : row }
