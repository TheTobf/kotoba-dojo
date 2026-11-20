/**
 * Wöchentliches App-Video (Werbung, klar gekennzeichnet): app-videos/app-XX/appvideo.json.
 * Gleicher Ablauf wie bei den Folgen (Tobias spricht ein), aber ohne Lernsätze/Quiz, dafür mit Bildschirmfotos der App.
 */
import { z } from 'zod'
import { ActorCueZ, CameraZ, LineZ, type Episode } from './schema'

export const AppVideoZ = z.object({
  id: z.string().regex(/^app-\d{2,3}$/),
  title: z.string().min(3),
  /** Thema, z. B. Behind the Scenes, neue Funktion, Fortschritt */
  thema: z.string().min(3),
  postDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().min(10),
  hook: z.object({ title: z.string().min(2), sub: z.string().optional() }),
  endCard: z.string().min(3),
  /** Bildschirmfotos, die `npm run app:bilder` aus der laufenden App holt */
  screens: z.array(z.object({ datei: z.string().regex(/^[\w-]+\.png$/), pfad: z.string().startsWith('/'), warten: z.string().optional() })).default([]),
  beats: z.array(z.object({
    kind: z.literal('erzaehler').default('erzaehler'),
    scene: z.string(),
    /** Bildschirmfoto auf Oles Handy (Szene „app-handy“) */
    screen: z.string().optional(),
    state: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    actors: z.array(ActorCueZ).default([]),
    camera: z.array(CameraZ).optional(),
    lines: z.array(LineZ).min(1),
  })).min(2),
})
export type AppVideo = z.infer<typeof AppVideoZ>

/** In die Form einer Folge bringen, damit Ton-Pipeline und Schnitt dieselben bleiben */
export function appAsEpisode(a: AppVideo): Episode {
  return {
    id: a.id as Episode['id'], season: 1, number: 1, title: a.title, titleJa: '', summary: a.summary, postDate: a.postDate,
    learn: { new: [], review: [] }, hook: a.hook, endCard: a.endCard,
    cast: { ole: { figure: 'ole', label: 'Ole' } },
    beats: a.beats.map((b) => ({ ...b, kind: 'erzaehler' as const })),
  }
}
