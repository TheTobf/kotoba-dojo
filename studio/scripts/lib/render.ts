/** Rendern mit Remotion: Selbstkontrolle (Standbilder), Video, Titelbild. */
import { bundle } from '@remotion/bundler'
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { join } from 'node:path'
import type { Timeline } from '../../src/episode/timeline'
import { browserOptions } from '../browser'
import { STUDIO } from './paths'

const bundles = new Map<string, string>()
async function serveUrlFor(publicDir: string): Promise<string> {
  let url = bundles.get(publicDir)
  if (!url) {
    url = await bundle({ entryPoint: join(STUDIO, 'src/index.ts'), publicDir })
    bundles.set(publicDir, url)
  }
  return url
}

/** Wichtige Zeitpunkte für die Selbstkontrolle */
export function checkTimes(tl: Timeline): { t: number; why: string }[] {
  const list: { t: number; why: string }[] = [{ t: 0.4, why: 'Hook (erste Sekunde)' }, { t: Math.min(1.8, tl.hook.end - 0.1), why: 'Hook vor 2 s' }]
  for (const b of tl.beats) list.push({ t: (b.start + b.end) / 2, why: `Abschnitt ${b.index + 1} (${b.kind}, ${b.scene}) Mitte` })
  for (const j of tl.ja) {
    list.push({ t: (j.moras[0]?.start ?? j.start) + 0.5, why: `Lernkasten ${j.sentence.ja}` })
    if (j.slow) list.push({ t: j.slow.start + 0.4, why: `langsam ${j.sentence.ja}` })
  }
  for (const q of tl.quiz) {
    list.push({ t: q.start + 0.5, why: 'Quiz-Frage' }, { t: q.countdownStart + 1.5, why: 'Countdown' }, { t: q.revealStart + 0.6, why: 'Auflösung' })
  }
  for (const s of tl.counter.steps) list.push({ t: s.at + 0.2, why: `Zähler → ${s.value}` })
  list.push({ t: tl.endCard.start + 0.8, why: 'Endkarte/Cliffhanger' })
  return list.map((x) => ({ ...x, t: Math.max(0, Math.min(tl.duration - 0.05, x.t)) })).sort((a, b) => a.t - b.t)
}

export async function renderCheckStills(tl: Timeline, work: string, outFolder: string): Promise<{ file: string; t: number; why: string; problems: string[] }[]> {
  rmSync(outFolder, { recursive: true, force: true })
  mkdirSync(outFolder, { recursive: true })
  const serveUrl = await serveUrlFor(work)
  const inputProps = { timeline: tl, check: true }
  const composition = await selectComposition({ serveUrl, id: 'Folge', inputProps, ...browserOptions })
  const results: { file: string; t: number; why: string; problems: string[] }[] = []
  let i = 0
  for (const { t, why } of checkTimes(tl)) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(t * tl.fps))
    const file = join(outFolder, `${String(++i).padStart(2, '0')}-${t.toFixed(1).replace('.', '_')}s.png`)
    const problems: string[] = []
    await renderStill({
      composition, serveUrl, output: file, frame, inputProps, scale: 0.5, ...browserOptions,
      onBrowserLog: (log) => { if (log.text.includes('[KONTROLLE]')) problems.push(log.text.replace(/^.*\[KONTROLLE\]\s*/, '')) },
    })
    results.push({ file, t, why, problems: [...new Set(problems)] })
  }
  return results
}

export async function renderVideo(tl: Timeline, work: string, output: string, { scale = 1, onProgress }: { scale?: number; onProgress?: (p: number) => void } = {}): Promise<number> {
  const started = Date.now()
  const serveUrl = await serveUrlFor(work)
  const inputProps = { timeline: tl }
  const composition = await selectComposition({ serveUrl, id: 'Folge', inputProps, ...browserOptions })
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: output, inputProps, scale,
    crf: 18, audioCodec: 'aac', audioBitrate: '192k', pixelFormat: 'yuv420p',
    concurrency: Number(process.env.KOTOBA_CONCURRENCY) || Math.max(1, Math.min(8, Math.floor(cpus().length / 2))),
    ...browserOptions,
    onProgress: ({ progress }) => onProgress?.(progress),
  })
  return (Date.now() - started) / 1000
}

export async function renderCover(tl: Timeline, work: string, output: string, props: { at: number; title: string; ja?: string }) {
  const serveUrl = await serveUrlFor(work)
  const inputProps = { timeline: tl, ...props }
  const composition = await selectComposition({ serveUrl, id: 'Titelbild', inputProps, ...browserOptions })
  await renderStill({ composition, serveUrl, output, inputProps, imageFormat: 'jpeg', jpegQuality: 90, ...browserOptions })
}

export function writeJson(file: string, data: unknown) { writeFileSync(file, JSON.stringify(data, null, 2) + '\n') }
