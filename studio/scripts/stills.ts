/** Rendert Standbilder (Stilproben). Aufruf: npx tsx scripts/stills.ts <Ausgabeordner> */
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { browserOptions } from './browser'

const out = process.argv[2] ?? 'out-stills'
mkdirSync(out, { recursive: true })
const serveUrl = await bundle({ entryPoint: join(import.meta.dirname, '../src/index.ts') })
const jobs = [
  ...(['washi', 'knete', 'holzschnitt'] as const).map((look) => ({ id: 'Stilprobe', props: { look, mascot: 'robbe' }, file: `stil-${look}.png` })),
  ...(['washi', 'knete', 'holzschnitt'] as const).map((look) => ({ id: 'Maskottchen', props: { look }, file: `maskottchen-${look}.png` })),
]
const only = process.argv[3]
for (const job of jobs.filter((j) => !only || j.file.includes(only))) {
  const started = Date.now()
  const composition = await selectComposition({ serveUrl, id: job.id, inputProps: job.props, ...browserOptions })
  await renderStill({ composition, serveUrl, output: join(out, job.file), inputProps: job.props, frame: 45, ...browserOptions })
  console.log(`✔ ${job.file} (${((Date.now() - started) / 1000).toFixed(1)} s)`)
}
