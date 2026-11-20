/**
 * Prüft eine Folge, bevor Ton oder Video entstehen: Lehrplan-Regeln, Szenen, Figuren, Stimmen, Länge,
 * keine Werbung. Reine Funktion – Ergebnis sind Fehler (blockieren) und Hinweise (prüfen).
 */
import { FIGURES } from '../characters/figures'
import { SCENES, cameraExists } from '../scenes/registry'
import { EpisodeZ, type CurriculumEntry, type Episode } from './schema'

export interface ValidateContext {
  curriculum: Map<string, CurriculumEntry>
  /** Sätze, die in früheren Folgen eingeführt wurden (Folgen-ID je Satz) */
  introducedBefore: Map<string, string>
  /** gibt es frühere Folgen? (dann ist eine Wiederholung Pflicht) */
  hasEarlierEpisodes: boolean
  voices: string[]
  forbiddenWords: string[]
  /** beim Rendern: alle Szenen müssen fertig gebaut sein */
  strict: boolean
}

export interface ValidateResult { episode?: Episode; errors: string[]; warnings: string[]; estimate?: number }

export function validateEpisode(raw: unknown, ctx: ValidateContext): ValidateResult {
  const errors: string[] = []
  const warnings: string[] = []
  const parsed = EpisodeZ.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'Folge'}: ${i.message}`), warnings }
  }
  const ep = parsed.data

  // Sprechskript: fortlaufende Nummern
  const lines = ep.beats.flatMap((b) => (b.kind === 'erzaehler' ? b.lines : []))
  lines.forEach((l, i) => { if (l.n !== i + 1) errors.push(`Skript-Satz ${l.n}: Nummer müsste ${i + 1} sein (fortlaufend zählen).`) })
  lines.forEach((l) => {
    const words = l.text.split(/\s+/).length
    if (words > 18) warnings.push(`Satz ${l.n} ist lang (${words} Wörter) – lieber teilen, dann spricht es sich leichter.`)
    if (/[()[\]]/.test(l.text)) errors.push(`Satz ${l.n}: Regieanweisungen gehören in "regie", nicht in den Text.`)
    for (const bad of ctx.forbiddenWords) {
      const re = new RegExp(`(^|[^\\p{L}])${escape(bad)}($|[^\\p{L}])`, 'iu')
      if (re.test(l.text)) errors.push(`Satz ${l.n}: „${bad}“ – in den Folgen keine Werbung und kein App-Hinweis.`)
    }
  })

  // Lehrplan
  const used = new Map<string, 'lernen' | 'kontext'>()
  for (const b of ep.beats) {
    if (b.kind === 'erzaehler') continue
    const role = b.kind === 'japanisch' ? b.role : 'lernen'
    const e = ctx.curriculum.get(b.sentence)
    if (!e) { errors.push(`Satz ${b.sentence} steht nicht im Lehrplan.`); continue }
    if (e.status !== 'ok') errors.push(`Satz ${b.sentence} (${e.ja}) ist noch [PRÜFEN] und darf erst nach Bestätigung benutzt werden.`)
    if (used.get(b.sentence) !== 'lernen') used.set(b.sentence, role)
  }
  for (const id of ep.learn.new) {
    const e = ctx.curriculum.get(id)
    if (!e) { errors.push(`Neuer Satz ${id} steht nicht im Lehrplan.`); continue }
    if (ctx.introducedBefore.has(id)) errors.push(`Satz ${id} (${e.ja}) kam schon in ${ctx.introducedBefore.get(id)} – als Wiederholung eintragen.`)
    if (used.get(id) !== 'lernen') errors.push(`Neuer Satz ${id} (${e.ja}) kommt in keinem Lern-Abschnitt vor.`)
  }
  for (const id of ep.learn.review) {
    if (!ctx.introducedBefore.has(id)) errors.push(`Wiederholung ${id} wurde noch in keiner früheren Folge eingeführt.`)
    if (!used.has(id)) errors.push(`Wiederholung ${id} kommt in der Folge nicht vor.`)
  }
  for (const [id, role] of used) {
    if (role === 'lernen' && !ep.learn.new.includes(id) && !ep.learn.review.includes(id)) errors.push(`Lernsatz ${id} fehlt in learn.new bzw. learn.review (oder als role "kontext" markieren).`)
  }
  if (ctx.hasEarlierEpisodes && ep.learn.review.length === 0) warnings.push('Keine Wiederholung aus früheren Folgen eingeplant (Regel: 1 pro Folge).')
  if (!ep.beats.some((b) => b.kind === 'quiz')) errors.push('Es fehlt der Quiz-Moment („Was sagst du jetzt?“).')

  // Figuren und Stimmen
  for (const [id, member] of Object.entries(ep.cast)) {
    if (!FIGURES[member.figure]) errors.push(`Figur „${member.figure}“ (für ${id}) gibt es nicht – in src/characters/figures.ts anlegen.`)
    if (member.voice && !ctx.voices.includes(member.voice)) errors.push(`Stimme „${member.voice}“ (für ${id}) fehlt in style/stilvorlage.json → stimmen.`)
  }
  for (const b of ep.beats) {
    if (b.kind !== 'erzaehler') {
      const member = ep.cast[b.speaker]
      if (!member) errors.push(`Sprecher „${b.speaker}“ fehlt in cast.`)
      else if (!member.voice) errors.push(`Sprecher „${b.speaker}“ hat keine Stimme (cast.${b.speaker}.voice).`)
    }
  }

  // Szenen
  ep.beats.forEach((b, i) => {
    const where = `Abschnitt ${i + 1}`
    const scene = SCENES[b.scene]
    if (!scene) { errors.push(`${where}: Szene „${b.scene}“ gibt es nicht.`); return }
    if (!scene.built) (ctx.strict ? errors : warnings).push(`${where}: Szene „${b.scene}“ ist noch nicht gebaut${ctx.strict ? '' : ' (vor dem Rendern bauen)'}.`)
    for (const a of b.actors) {
      if (!ep.cast[a.who]) errors.push(`${where}: Figur „${a.who}“ fehlt in cast.`)
      if (!scene.spots[a.at]) errors.push(`${where}: Platz „${a.at}“ gibt es in „${b.scene}“ nicht.`)
      if (a.to && !scene.spots[a.to]) errors.push(`${where}: Ziel „${a.to}“ gibt es in „${b.scene}“ nicht.`)
      if (a.action === 'gehen' && !a.to) errors.push(`${where}: „gehen“ braucht ein Ziel (to).`)
    }
    for (const c of b.camera ?? []) {
      const preset = typeof c === 'string' ? c : c.preset
      if (scene.built && !cameraExists(scene, preset)) errors.push(`${where}: Kamera „${preset}“ gibt es in „${b.scene}“ nicht.`)
      const ids = preset.split(':').slice(1)
      for (const id of ids) if (!b.actors.some((a) => a.who === id)) warnings.push(`${where}: Kamera „${preset}“ – „${id}“ ist in diesem Abschnitt nicht angegeben.`)
    }
    for (const [key, value] of Object.entries(b.state ?? {})) {
      const allowed = scene.states?.[key]
      if (!allowed) errors.push(`${where}: Zustand „${key}“ gibt es in „${b.scene}“ nicht.`)
      else if (!(allowed.includes('zahl') ? typeof value === 'number' : allowed.includes(String(value)))) errors.push(`${where}: „${key}: ${value}“ ist nicht erlaubt (${allowed.join(', ')}).`)
    }
    if (b.kind !== 'erzaehler' && !scene.insert && ep.cast[b.speaker]?.figure !== 'stimme' && !b.actors.some((a) => a.who === b.speaker) && b.actors.length) warnings.push(`${where}: Sprecher „${b.speaker}“ ist nicht im Bild.`)
  })

  // Hook und Ende
  const first = ep.beats[0]
  if (first.kind !== 'erzaehler') warnings.push('Die Folge sollte mit dem Erzähler mitten im Problem starten.')
  else if (first.lines[0].text.split(/\s+/).length > 9) warnings.push('Erster Satz (Hook) ist lang – höchstens 9 Wörter, damit er in 2 Sekunden sitzt.')
  if (ep.hook.title.length > 26) warnings.push('Hook-Titel ist lang (> 26 Zeichen) – kürzer wirkt stärker.')
  if (ep.beats[ep.beats.length - 1].kind !== 'erzaehler') warnings.push('Die Folge sollte mit dem Erzähler und einem Cliffhanger enden.')

  // grobe Längen-Schätzung (deutsch ~2,6 Wörter/s, Japanisch ~0,13 s pro Kana, langsam ×1,25)
  let estimate = 1.6
  for (const b of ep.beats) {
    if (b.kind === 'erzaehler') estimate += b.lines.reduce((sum, l) => sum + l.text.split(/\s+/).length / 2.6 + 0.3, 0.15)
    else {
      const e = ctx.curriculum.get(b.sentence)
      const kana = e ? e.kana.replace(/[。、？！\s]/g, '').length : 8
      const slow = b.kind === 'quiz' || (b.kind === 'japanisch' && (b.slow ?? b.role === 'lernen'))
      estimate += 0.8 + kana * 0.13 * (slow ? 2.25 : 1) + (slow ? 0.45 : 0) + (b.kind === 'quiz' ? 3.85 : 0)
    }
  }
  if (estimate < 58) warnings.push(`Geschätzte Länge ${estimate.toFixed(0)} s – vermutlich zu kurz (Ziel 61–75 s).`)
  if (estimate > 76) warnings.push(`Geschätzte Länge ${estimate.toFixed(0)} s – vermutlich zu lang (Ziel 61–75 s).`)

  return { episode: ep, errors, warnings, estimate }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
