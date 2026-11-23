// Selbst gehostete Schriften (SIL OFL 1.1, siehe LICENSES.md). Wird vor dem ersten Bild geladen.
import { continueRender, delayRender, staticFile } from 'remotion';

const FACES: [string, string, number][] = [
  ['Noto Sans JP', 'noto-sans-jp-japanese-400-normal.woff2', 400],
  ['Noto Sans JP', 'noto-sans-jp-latin-400-normal.woff2', 400],
  ['Noto Sans JP', 'noto-sans-jp-japanese-900-normal.woff2', 900],
  ['Noto Sans JP', 'noto-sans-jp-latin-900-normal.woff2', 900],
  ['M PLUS Rounded 1c', 'm-plus-rounded-1c-japanese-800-normal.woff2', 800],
  ['M PLUS Rounded 1c', 'm-plus-rounded-1c-latin-800-normal.woff2', 800],
];

let geladen: Promise<void> | null = null;
export function ladeSchriften(): Promise<void> {
  if (!geladen) {
    const h = delayRender('Schriften laden');
    geladen = Promise.all(
      FACES.map(async ([family, file, weight]) => {
        const f = new FontFace(family, `url(${staticFile('fonts/' + file)}) format('woff2')`, { weight: String(weight) });
        await f.load();
        document.fonts.add(f);
      }),
    ).then(() => continueRender(h));
  }
  return geladen;
}
