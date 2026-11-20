/**
 * Aufbau einer Folge (episodes/epXX/episode.json). Claude schreibt diese Datei, alles andere entsteht daraus:
 * Sprechskript, Ton, Schnitt, Kamera, Untertitel, Begleittexte.
 */
import { z } from 'zod'

/** Was eine Figur in einem Abschnitt tut. Die Bewegungen sind fest programmiert (src/characters/actions.ts). */
export const ACTIONS = [
  'idle', // steht da, atmet, blinzelt
  'gehen', // läuft von `at` nach `to`
  'zeigen', // zeigt mit Flosse/Arm
  'verwirrt', // Kopf schief, Fragezeichen
  'freuen', // hüpft, Arme hoch
  'erschrocken', // zuckt zusammen
  'erstarrt', // friert ein, Schweißtropfen
  'traurig', // lässt Kopf hängen
  'nicken', // nickt
  'winken', // winkt
  'geben', // reicht etwas nach vorn
  'suchen', // schaut hin und her
  'verbeugen', // kleine Verbeugung
  'warten', // tippelt ungeduldig
] as const
export const ActionZ = z.enum(ACTIONS)
export type Action = z.infer<typeof ActionZ>

export const PROPS = ['handy', 'pass', 'postkarte', 'koffer'] as const
export const PropZ = z.enum(PROPS)

/** Kamerabewegung innerhalb einer Einstellung – die Kamera steht nie still. */
export const MOVES = ['push', 'pull', 'orbit-left', 'orbit-right', 'rise', 'pan-left', 'pan-right'] as const
export const MoveZ = z.enum(MOVES)
export type Move = z.infer<typeof MoveZ>

/**
 * Kamera-Einstellung: ein Name aus der Szene (z. B. "totale") oder eine allgemeine Einstellung,
 * die sich nach den Figuren richtet: "nah:ole", "halbnah:ole", "schulter:ole:beamter", "zwei:ole:beamter".
 */
export const CameraZ = z.union([z.string(), z.object({ preset: z.string(), move: MoveZ.optional() })])
export type CameraEntry = z.infer<typeof CameraZ>

export const ActorCueZ = z.object({
  /** Figur aus `cast` */
  who: z.string(),
  /** Platz in der Szene (Name aus der Szene) */
  at: z.string(),
  /** Ziel beim Gehen */
  to: z.string().optional(),
  action: ActionZ.default('idle'),
  /** Blickrichtung: "kamera" oder Name einer Figur bzw. eines Platzes. Ohne Angabe: zur anderen Hauptfigur. */
  face: z.string().optional(),
  /** Gegenstand in der Hand/Flosse */
  prop: PropZ.optional(),
})
export type ActorCue = z.infer<typeof ActorCueZ>

export const LineZ = z.object({
  /** Fortlaufende Nummer im Sprechskript (1, 2, 3 … über die ganze Folge) */
  n: z.number().int().positive(),
  /** Gesprochener deutscher Text – kurz und gut sprechbar, ohne Regieanweisung */
  text: z.string().min(1),
  /** Regieanweisung fürs Einsprechen, z. B. "spannend" (steht im Skript in Klammern) */
  regie: z.string().optional(),
  /** Pause nach dem Satz */
  pause: z.enum(['normal', 'kurz', 'lang']).optional(),
})
export type Line = z.infer<typeof LineZ>

const beatBase = {
  /** Szene aus src/scenes/registry.ts */
  scene: z.string(),
  /** Zustand der Szene, z. B. { "band": "stopp" } – welche Schalter es gibt, steht in der Szene */
  state: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  actors: z.array(ActorCueZ).default([]),
  /** Kamera-Einstellungen, die nacheinander benutzt werden. Ohne Angabe wählt der Schnitt selbst. */
  camera: z.array(CameraZ).optional(),
  /** Notiz für Claude (wird nicht angezeigt) */
  notiz: z.string().optional(),
  /** nur App-Videos: Bildschirmfoto auf dem Handy (Szene „app-handy“) */
  screen: z.string().optional(),
}

export const BeatZ = z.discriminatedUnion('kind', [
  /** Erzähler (Tobias) spricht deutsch */
  z.object({ kind: z.literal('erzaehler'), lines: z.array(LineZ).min(1), ...beatBase }),
  /** Eine Figur spricht einen Satz aus dem Lehrplan (VOICEVOX) – mit großer Einblendung */
  z.object({
    kind: z.literal('japanisch'),
    speaker: z.string(),
    /** Lehrplan-ID, z. B. "c018" */
    sentence: z.string(),
    /** lernen = großer Lernsatz (zählt als gelernt), kontext = kleiner, nur zum Verstehen der Szene */
    role: z.enum(['lernen', 'kontext']).default('lernen'),
    /** danach noch einmal langsam (Standard bei Lernsätzen: ja) */
    slow: z.boolean().optional(),
    ...beatBase,
  }),
  /** Quiz: „Was sagst du jetzt?“, 3-Sekunden-Countdown, dann sagt `speaker` die Lösung */
  z.object({
    kind: z.literal('quiz'),
    speaker: z.string(),
    sentence: z.string(),
    question: z.string().default('Was sagst du jetzt?'),
    ...beatBase,
  }),
])
export type Beat = z.infer<typeof BeatZ>

export const CastMemberZ = z.object({
  /** "ole" oder eine Personen-Vorlage aus src/characters/people.ts */
  figure: z.string(),
  /** Stimme aus style/stilvorlage.json → stimmen (nur wer Japanisch spricht) */
  voice: z.string().optional(),
  /** Anzeigename im Lernkasten, z. B. "Beamter" */
  label: z.string().optional(),
})

export const EpisodeZ = z.object({
  id: z.string().regex(/^(ep\d{2,3}|app-\d{2,3})$/),
  season: z.number().int().positive(),
  /** Folge innerhalb der Staffel (1–7) */
  number: z.number().int().min(1).max(7),
  title: z.string().min(2),
  titleJa: z.string().min(1),
  /** Worum es geht, ohne Auflösung – für Videobeschreibung und App */
  summary: z.string().min(10),
  /** Geplanter Post-Tag (JJJJ-MM-TT) */
  postDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  learn: z.object({
    new: z.array(z.string()).min(1).max(2),
    review: z.array(z.string()).max(1),
  }),
  hook: z.object({ title: z.string().min(2), sub: z.string().optional() }),
  /** Text der Endkarte, z. B. „Morgen: Wo ist der Koffer?“ */
  endCard: z.string().min(3),
  cast: z.record(z.string(), CastMemberZ),
  beats: z.array(BeatZ).min(4),
})
export type Episode = z.infer<typeof EpisodeZ>
export type EpisodeInput = z.input<typeof EpisodeZ>

/** Ein Eintrag aus curriculum/curriculum.json */
export interface CurriculumEntry {
  id: string
  art: 'sagen' | 'hoeren'
  ja: string
  kana: string
  romaji: string
  de: string
  situation: string
  niveau: number
  status: 'ok' | 'pruefen'
  hinweis?: string
  muster?: string
  pruefen?: string
}
