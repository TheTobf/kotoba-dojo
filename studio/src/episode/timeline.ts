/**
 * Der Schnitt: Aus der Folge (episode.json), den Längen der Tonaufnahmen und der Stilvorlage entsteht ein genauer
 * Zeitplan – wann welcher Satz klingt, welche Kamera läuft, wann Untertitel, Lernkasten und Quiz erscheinen.
 * Reine Funktion ohne Datei-Zugriff, damit sie Ton-Pipeline, Video und Tests gleich benutzen.
 */
import { SCENES, cameraExists, type SceneMeta } from '../scenes/registry'
import { MOVES, type Action, type ActorCue, type Beat, type CameraEntry, type CurriculumEntry, type Episode, type Move } from './schema'

export interface Word { text: string; start: number; end: number }
export interface Mora { kana: string; start: number; end: number }

/** Länge und Wort-Zeiten einer eingesprochenen (oder Vorschau-)Zeile, Zeiten relativ zum Clip-Anfang */
export interface LineAudio { file: string; duration: number; words: Word[] }
/** VOICEVOX-Clip mit Mora-Zeiten (relativ zum Clip-Anfang) */
export interface JaAudio { file: string; duration: number; moras: Mora[] }

export interface AudioInfo {
  lines: Record<number, LineAudio>
  /** Schlüssel: Abschnitts-Index, langsame Wiederholung mit "-slow" */
  ja: Record<string, JaAudio>
  /** true = Vorschau mit Ersatzstimme */
  preview: boolean
}

export interface StyleRules {
  look: string
  format: { breite: number; hoehe: number; fps: number; laengeMin: number; laengeMax: number }
  sicherheitszone: { oben: number; unten: number; links: number; rechts: number }
  schnitt: {
    hookBis: number; einstellungMin: number; einstellungMax: number; quizCountdown: number
    pauseVorBeat: number; pauseZwischenSaetzen: number; pauseKurz: number; pauseLang: number
    japanischVorlauf: number; japanischNachlauf: number; lernsatzLangsamWiederholen: boolean; langsamFaktor: number; endkarte: number
  }
  text: { japanisch: number; kana: number; deutsch: number; untertitel: number; untertitelMaxWoerter: number; hook: number }
}

export interface TActor {
  who: string
  figure: string
  at: string
  to?: string
  action: Action
  face?: string
  prop?: ActorCue['prop']
  /** Hauptfigur (spricht in der Folge) – nur sie wird bei der Kontrolle auf Anschnitt geprüft */
  main: boolean
  /** seit wann die Figur diese Bewegung ununterbrochen macht (damit nichts neu anfängt, nur weil ein Abschnitt wechselt) */
  since: number
  /** Sprech-Fenster (absolute Zeiten) für Mundbewegung */
  talk: { start: number; end: number; moras: Mora[] }[]
}
export interface TBeat {
  index: number
  kind: Beat['kind']
  start: number
  end: number
  scene: string
  state: Record<string, string | number | boolean>
  /** seit wann ein Zustand ununterbrochen gilt (für Bewegungen, die über Abschnitte laufen) */
  stateSince: Record<string, number>
  actors: TActor[]
  /** App-Video: Bildschirmfoto (Datei im Arbeitsordner) */
  screen?: string
}
export interface TShot { start: number; end: number; beat: number; scene: string; preset: string; move: Move }
export interface TCaption { start: number; end: number; words: Word[] }
export interface TJa {
  beat: number
  start: number
  end: number
  role: 'lernen' | 'kontext'
  /** HÖREN oder SAGEN – wie im Lehrplan */
  art: CurriculumEntry['art']
  speakerLabel: string
  sentence: Pick<CurriculumEntry, 'id' | 'ja' | 'kana' | 'romaji' | 'de'>
  moras: Mora[]
  slow?: { start: number; end: number; moras: Mora[] }
  /** gehört zu einem Quiz (Lösung) */
  quiz?: boolean
}
export interface TQuiz { beat: number; start: number; countdownStart: number; revealStart: number; end: number; question: string; seconds: number }
export interface TClip { kind: 'voice' | 'ja' | 'sfx'; src: string; start: number; duration: number }

export interface Timeline {
  episodeId: string
  /** Serienfolge oder App-Video (Werbung) */
  kind: 'folge' | 'app'
  fps: number
  width: number
  height: number
  duration: number
  preview: boolean
  look: string
  safe: { top: number; bottom: number; left: number; right: number }
  text: StyleRules['text']
  titleLine: string
  beats: TBeat[]
  shots: TShot[]
  captions: TCaption[]
  ja: TJa[]
  quiz: TQuiz[]
  clips: TClip[]
  hook: { title: string; sub?: string; start: number; end: number }
  endCard: { text: string; start: number; end: number }
  counter: { showFrom: number; base: number; steps: { at: number; value: number }[] }
  warnings: string[]
}

export interface BuildInput {
  episode: Episode
  style: StyleRules
  audio: AudioInfo
  curriculum: Map<string, CurriculumEntry>
  /** Zahl der SAGEN-Sätze, die Ole aus früheren Folgen schon kann */
  counterBase: number
  /** Sätze, die vor dieser Folge schon eingeführt waren */
  knownBefore: Set<string>
}

const round = (x: number) => Math.round(x * 1000) / 1000

/** Erzeugt den Zeitplan. Passt die Pausen so an, dass die Folge zwischen laengeMin und laengeMax liegt. */
export function buildTimeline(input: BuildInput): Timeline {
  const first = layout(input, 0, 0)
  const { laengeMin, laengeMax } = input.style.format
  const gaps = Math.max(1, first.adjustableGaps)
  let gapAdd = 0
  let endAdd = 0
  if (first.duration < laengeMin) {
    const missing = laengeMin - first.duration + 0.4
    endAdd = Math.min(1.2, missing)
    gapAdd = Math.min(0.35, Math.max(0, missing - endAdd) / gaps)
  } else if (first.duration > laengeMax) {
    const extra = first.duration - laengeMax + 0.3
    gapAdd = -Math.min(input.style.schnitt.pauseZwischenSaetzen - 0.1, extra / gaps)
  }
  const result = gapAdd || endAdd ? layout(input, gapAdd, endAdd) : first
  if (result.duration < laengeMin) result.timeline.warnings.push(`Folge ist zu kurz (${result.duration.toFixed(1)} s, mindestens ${laengeMin} s): Text ergänzen.`)
  if (result.duration > laengeMax) result.timeline.warnings.push(`Folge ist zu lang (${result.duration.toFixed(1)} s, höchstens ${laengeMax} s): Text kürzen.`)
  return result.timeline
}

function layout(input: BuildInput, gapAdd: number, endAdd: number): { duration: number; adjustableGaps: number; timeline: Timeline } {
  const { episode, style, audio, curriculum } = input
  const s = style.schnitt
  const warnings: string[] = []
  const beats: TBeat[] = []
  const captions: TCaption[] = []
  const jaList: TJa[] = []
  const quizList: TQuiz[] = []
  const clips: TClip[] = []
  const counterSteps: { at: number; value: number }[] = []
  let counter = input.counterBase
  const counted = new Set<string>()
  let adjustableGaps = 0
  let t = 0
  let prevActors: TActor[] = []
  let prevScene = ''
  const stateRuns = new Map<string, { value: unknown; since: number }>()

  const gapFor = (pause: 'normal' | 'kurz' | 'lang' | undefined) => {
    if (pause === 'kurz') return s.pauseKurz
    if (pause === 'lang') return s.pauseLang
    adjustableGaps++
    return Math.max(0.1, s.pauseZwischenSaetzen + gapAdd)
  }

  episode.beats.forEach((beat, index) => {
    const start = t
    if (prevScene && beat.scene !== prevScene) clips.push({ kind: 'sfx', src: 'sfx/whoosh.wav', start: round(Math.max(0, t - 0.12)), duration: 0.45 })
    const actors = resolveActors(beat, episode, prevActors, beat.scene === prevScene)
    for (const a of actors) {
      const before = beat.scene === prevScene ? prevActors.find((p) => p.who === a.who) : undefined
      const continues = before && before.action === a.action && (before.to ?? before.at) === a.at && a.action !== 'gehen'
      a.since = continues ? before.since : round(start)
    }
    const label = (who: string) => episode.cast[who]?.label ?? (who === 'ole' ? 'Ole' : who)

    if (beat.kind === 'erzaehler') {
      t += index === 0 ? 0.05 : s.pauseVorBeat
      for (const line of beat.lines) {
        const a = audio.lines[line.n]
        if (!a) { warnings.push(`Ton für Satz ${line.n} fehlt.`); continue }
        clips.push({ kind: 'voice', src: a.file, start: round(t), duration: a.duration })
        const words = a.words.map((w) => ({ text: w.text, start: round(t + w.start), end: round(t + w.end) }))
        captions.push(...chunkCaptions(words, style.text.untertitelMaxWoerter, t + a.duration))
        t += a.duration + gapFor(line.pause)
      }
    } else {
      const entry = curriculum.get(beat.sentence)
      if (!entry) throw new Error(`Satz ${beat.sentence} steht nicht im Lehrplan.`)
      const speaker = actors.find((x) => x.who === beat.speaker)
      if (!speaker && !SCENES[beat.scene]?.insert && episode.cast[beat.speaker]?.figure !== 'stimme') warnings.push(`Abschnitt ${index + 1}: Sprecher „${beat.speaker}“ ist nicht im Bild.`)
      let quiz: TQuiz | undefined
      if (beat.kind === 'quiz') {
        const countdownStart = t + 0.7
        const revealStart = countdownStart + s.quizCountdown
        for (let k = 0; k < s.quizCountdown; k++) clips.push({ kind: 'sfx', src: 'sfx/tick.wav', start: round(countdownStart + k), duration: 0.12 })
        clips.push({ kind: 'sfx', src: 'sfx/pling.wav', start: round(revealStart), duration: 0.9 })
        quiz = { beat: index, start: round(t), countdownStart: round(countdownStart), revealStart: round(revealStart), end: 0, question: beat.question, seconds: s.quizCountdown }
        t = revealStart + 0.15
      } else {
        t += s.japanischVorlauf
      }
      const jaStart = t
      const normal = audio.ja[String(index)]
      if (!normal) throw new Error(`Japanischer Ton für Abschnitt ${index + 1} fehlt.`)
      clips.push({ kind: 'ja', src: normal.file, start: round(t), duration: normal.duration })
      const moras = shift(normal.moras, t)
      speaker?.talk.push({ start: round(t), end: round(t + normal.duration), moras })
      t += normal.duration
      const role = beat.kind === 'japanisch' ? beat.role : 'lernen'
      const wantSlow = beat.kind === 'japanisch' ? (beat.slow ?? (role === 'lernen' && s.lernsatzLangsamWiederholen)) : s.lernsatzLangsamWiederholen
      let slow: TJa['slow']
      const slowAudio = audio.ja[`${index}-slow`]
      if (wantSlow) {
        if (!slowAudio) throw new Error(`Langsamer Ton für Abschnitt ${index + 1} fehlt.`)
        t += 0.45
        clips.push({ kind: 'ja', src: slowAudio.file, start: round(t), duration: slowAudio.duration })
        const sm = shift(slowAudio.moras, t)
        slow = { start: round(t), end: round(t + slowAudio.duration), moras: sm }
        speaker?.talk.push({ start: round(t), end: round(t + slowAudio.duration), moras: sm })
        t += slowAudio.duration
      }
      t += s.japanischNachlauf
      jaList.push({
        beat: index, start: round(beat.kind === 'quiz' ? jaStart - 0.15 : start + 0.05), end: round(t), role, art: entry.art,
        speakerLabel: label(beat.speaker),
        sentence: { id: entry.id, ja: entry.ja, kana: entry.kana, romaji: entry.romaji, de: entry.de },
        moras, slow, quiz: beat.kind === 'quiz',
      })
      if (quiz) { quiz.end = round(t); quizList.push(quiz) }
      const isNewSaying = beat.speaker === 'ole' && entry.art === 'sagen' && role === 'lernen' && !input.knownBefore.has(entry.id)
      if (isNewSaying && !counted.has(entry.id)) {
        counted.add(entry.id)
        counter++
        counterSteps.push({ at: round(jaStart + normal.duration), value: counter })
        clips.push({ kind: 'sfx', src: 'sfx/plus.wav', start: round(jaStart + normal.duration + 0.05), duration: 0.7 })
      }
    }

    const state = beat.state ?? {}
    const stateSince: Record<string, number> = {}
    for (const [key, value] of Object.entries(state)) {
      const run = stateRuns.get(key)
      if (!run || run.value !== value || prevScene !== beat.scene) stateRuns.set(key, { value, since: start })
      stateSince[key] = round(stateRuns.get(key)!.since)
    }
    beats.push({ index, kind: beat.kind, start: round(start), end: round(t), scene: beat.scene, state, stateSince, actors, screen: beat.screen })
    prevActors = actors
    prevScene = beat.scene
  })

  const endStart = t
  t += s.endkarte + endAdd
  const duration = round(t)
  // Endkarte gehört zum letzten Abschnitt (gleiche Szene, Kamera läuft weiter)
  if (beats.length) beats[beats.length - 1].end = duration

  const shots = planShots(episode, beats, style, warnings)
  const firstLineEnd = clips.find((c) => c.kind === 'voice')
  const hookEnd = Math.min(3.2, Math.max(s.hookBis + 0.2, firstLineEnd ? firstLineEnd.start + firstLineEnd.duration + 0.2 : s.hookBis))
  return {
    duration,
    adjustableGaps,
    timeline: {
      episodeId: episode.id,
      kind: episode.id.startsWith('app-') ? 'app' : 'folge',
      fps: style.format.fps,
      width: style.format.breite,
      height: style.format.hoehe,
      duration,
      preview: audio.preview,
      look: style.look,
      safe: { top: style.sicherheitszone.oben, bottom: style.sicherheitszone.unten, left: style.sicherheitszone.links, right: style.sicherheitszone.rechts },
      text: style.text,
      titleLine: episode.id.startsWith('app-') ? 'Hinter den Kulissen' : `Staffel ${episode.season} · Folge ${episode.number}`,
      beats,
      shots,
      captions,
      ja: jaList,
      quiz: quizList,
      clips,
      hook: { title: episode.hook.title, sub: episode.hook.sub, start: 0, end: round(hookEnd) },
      endCard: { text: episode.endCard, start: round(endStart - 0.3), end: duration },
      counter: { showFrom: round(hookEnd), base: input.counterBase, steps: counterSteps },
      warnings,
    },
  }
}

const shift = (moras: Mora[], by: number): Mora[] => moras.map((m) => ({ kana: m.kana, start: round(m.start + by), end: round(m.end + by) }))

/** Figuren eines Abschnitts. Ohne Angabe in derselben Szene: die Figuren bleiben stehen, wo sie waren. */
function resolveActors(beat: Beat, episode: Episode, prev: TActor[], sameScene: boolean): TActor[] {
  const cues = beat.actors
  if ((!cues || cues.length === 0) && sameScene) {
    return prev.map((a) => ({ ...a, at: a.to ?? a.at, to: undefined, action: a.action === 'gehen' ? 'idle' : a.action, talk: [], since: 0 }))
  }
  return (cues ?? []).map((c) => ({
    who: c.who, figure: episode.cast[c.who]?.figure ?? c.who, at: c.at, to: c.to, action: c.action, face: c.face, prop: c.prop, talk: [], since: 0,
    main: c.who === 'ole' || !!episode.cast[c.who]?.voice,
  }))
}

/** Untertitel in kleine Häppchen (höchstens n Wörter, Satzzeichen beenden ein Häppchen). */
export function chunkCaptions(words: Word[], maxWords: number, lineEnd: number): TCaption[] {
  const chunks: Word[][] = []
  let cur: Word[] = []
  for (const w of words) {
    cur.push(w)
    if (cur.length >= maxWords || /[.!?:;,…–]$/.test(w.text)) { chunks.push(cur); cur = [] }
  }
  if (cur.length) chunks.push(cur)
  return chunks.map((c, i) => ({
    start: c[0].start,
    end: round(i + 1 < chunks.length ? chunks[i + 1][0].start : lineEnd + 0.1),
    words: c,
  }))
}

/** Einstellungen planen: alle 2–3 s ein Schnitt, nie zweimal dieselbe Kamera hintereinander, immer Bewegung. */
function planShots(episode: Episode, beats: TBeat[], style: StyleRules, warnings: string[]): TShot[] {
  const { einstellungMin, einstellungMax } = style.schnitt
  const shots: TShot[] = []
  let moveIndex = 0
  beats.forEach((tb) => {
    const beat = episode.beats[tb.index]
    const scene = SCENES[tb.scene]
    if (!scene) { warnings.push(`Szene „${tb.scene}“ gibt es nicht.`); return }
    const list = cameraList(beat, scene, tb.index)
    const quiz = beat.kind === 'quiz'
    const d = tb.end - tb.start
    let n = Math.max(1, Math.ceil(d / einstellungMax - 1e-6))
    // lieber etwas schneller schneiden (ab 1,5 s) als eine Einstellung über 3 s stehen lassen
    if (n > 1 && d / n < einstellungMin * 0.75) n--
    const cuts: number[] = []
    for (let k = 0; k <= n; k++) cuts.push(tb.start + (d * k) / n)
    for (let k = 0; k < n; k++) {
      let entry = list[k % list.length]
      let preset = typeof entry === 'string' ? entry : entry.preset
      const prev = shots[shots.length - 1]
      if (prev && prev.preset === preset && prev.scene === tb.scene) {
        if (list.length > 1) {
          entry = list[(k + 1) % list.length]
          preset = typeof entry === 'string' ? entry : entry.preset
        } else {
          // nur eine Kamera vorgegeben: für den Schnitt eine andere Einstellung der Szene dazwischen
          preset = scene.defaultCameras.find((c) => c !== preset) ?? preset
          entry = preset
        }
      }
      if (!cameraExists(scene, preset)) {
        warnings.push(`Kamera „${preset}“ gibt es in „${scene.id}“ nicht – nehme „${scene.defaultCameras[0]}“.`)
        preset = scene.defaultCameras[0]
      }
      let move: Move = typeof entry === 'object' && entry.move ? entry.move : MOVE_CYCLE[moveIndex++ % MOVE_CYCLE.length]
      if (quiz && k === 0) move = 'push'
      if (prev && prev.move === move) move = MOVE_CYCLE[moveIndex++ % MOVE_CYCLE.length]
      shots.push({ start: round(cuts[k]), end: round(cuts[k + 1]), beat: tb.index, scene: tb.scene, preset, move })
    }
  })
  return shots
}

const MOVE_CYCLE: Move[] = ['push', 'orbit-left', 'pull', 'orbit-right', 'rise', 'pan-left', 'push', 'orbit-right', 'pan-right']
void MOVES

function cameraList(beat: Beat, scene: SceneMeta, index: number): CameraEntry[] {
  if (beat.camera?.length) return beat.camera
  const pick = (...names: string[]) => names.filter((n) => cameraExists(scene, n))
  if (scene.insert) return rotate(scene.defaultCameras, index)
  if (beat.kind === 'japanisch') {
    const sp = beat.speaker
    const own = pick(`${sp}-front`, `${sp}-nah`)
    const list = sp === 'ole' ? pick('ole-nah', 'ole-front', 'seite') : [...own, ...pick('ueber-ole')]
    return list.length ? list : [`nah:${sp}`, 'totale']
  }
  if (beat.kind === 'quiz') {
    const list = pick('ole-nah', 'ole-front')
    return list.length ? list : ['nah:ole', 'halbnah:ole']
  }
  return rotate(scene.defaultCameras, index)
}

const rotate = <T,>(list: T[], by: number) => list.map((_, i) => list[(i + by) % list.length])
