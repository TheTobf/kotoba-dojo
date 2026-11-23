// Rendert Standbilder: tsx scripts/standbilder.ts <Ausgabeordner> <KompositionId[:frame]> …
// Bündelt einmal und rendert dann alle Bilder nacheinander (schnell, kein Cache-Konflikt).
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import { browserOptionen } from './lib/browser';

const [ordner, ...ziele] = process.argv.slice(2);
if (!ordner || !ziele.length) { console.error('Aufruf: tsx scripts/standbilder.ts <ordner> <Komposition[:frame][=props-json]> …'); process.exit(1); }
const root = path.resolve(import.meta.dirname, '..');
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public') });
for (const z of ziele) {
  const [idTeil, propsJson] = z.split('=');
  const [id, frame] = idTeil.split(':');
  const inputProps = propsJson ? JSON.parse(propsJson) : {};
  const t0 = Date.now();
  const composition = await selectComposition({ serveUrl, id, inputProps, ...browserOptionen() });
  const out = path.resolve(ordner, `${id}${frame ? '-' + frame : ''}.png`);
  await renderStill({ serveUrl, composition, output: out, frame: Number(frame ?? 0), inputProps, ...browserOptionen() });
  console.log(`✓ ${out} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
