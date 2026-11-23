// Kamera-Presets relativ zu einer Figur. Die Kamera bewegt sich in jedem Shot (Regel: immer in Bewegung).
import { PerspectiveCamera } from '@react-three/drei';
import React from 'react';
import { Kamera } from './typen';

type V3 = [number, number, number];
const PRESET: Record<Kamera['preset'], { off: V3; ziel: number; fov: number }> = {
  // Hochformat ist schmal: Abstände so gewählt, dass die Figur ganz ins Bild passt und im unteren Teil steht (oben ist Platz für Text)
  totale: { off: [2.0, 3.2, 13], ziel: 1.9, fov: 40 },
  halbnah: { off: [1.2, 1.9, 7.6], ziel: 1.45, fov: 38 },
  nah: { off: [0.7, 1.4, 4.8], ziel: 1.2, fov: 36 },
  gross: { off: [0.3, 1.0, 3.4], ziel: 1.0, fov: 34 },
  ueberSchulter: { off: [0.9, 1.5, -2.2], ziel: 1.2, fov: 40 },
  frosch: { off: [1.0, 0.35, 5.6], ziel: 1.7, fov: 44 },
  vogel: { off: [0.6, 9, 5.5], ziel: 0, fov: 40 },
  seite: { off: [6.2, 1.7, 2.2], ziel: 1.35, fov: 38 },
};
// Bei automatisch geteilten Shots wechselt die Perspektive in dieser Reihenfolge
const WECHSEL: Kamera['preset'][] = ['halbnah', 'nah', 'seite', 'frosch', 'totale', 'nah'];
const BEWEGUNG: NonNullable<Kamera['bewegung']>[] = ['rein', 'links', 'raus', 'rechts', 'hoch'];

export function kameraPreset(k: Kamera, teil: number): Kamera['preset'] {
  if (teil === 0 || k.preset === 'ueberSchulter') return k.preset; // Dialog: Schuss/Gegenschuss statt Preset-Wechsel
  const i = WECHSEL.indexOf(k.preset);
  return WECHSEL[((i < 0 ? 0 : i) + teil) % WECHSEL.length];
}
/** Kameragrenzen je Szene (damit die Kamera nicht hinter Wänden landet). */
export const KAMERA_GRENZEN: Record<string, { zMin: number; yMin: number }> = {
  flughafen: { zMin: -3.4, yMin: 0.2 }, bahnsteig: { zMin: -1.1, yMin: 0.2 }, konbini: { zMin: -2.3, yMin: 0.2 }, hotel: { zMin: -2.5, yMin: 0.2 }, strasse: { zMin: -0.4, yMin: 0.2 }, studio: { zMin: -2.5, yMin: 0.2 },
};
export function kameraPose(k: Kamera, fokus: V3, gegen: V3 | null, teil: number, fortschritt: number, hoehen: { fokus: number; gegen: number } = { fokus: 1.1, gegen: 1.1 }) {
  const preset = kameraPreset(k, teil);
  let hF = hoehen.fokus, hG = hoehen.gegen;
  if (preset === 'ueberSchulter' && gegen && teil % 2 === 1) { [fokus, gegen] = [gegen, fokus]; [hF, hG] = [hG, hF]; } // Gegenschuss
  const p = PRESET[preset];
  const bew = teil === 0 ? k.bewegung ?? 'rein' : BEWEGUNG[teil % BEWEGUNG.length];
  const e = fortschritt * fortschritt * (3 - 2 * fortschritt); // weich
  let [ox, oy, oz] = p.off;
  let zielY = fokus[1] + p.ziel;
  let zielX = fokus[0], zielZ = fokus[2];
  if (preset === 'ueberSchulter' && gegen) {
    // hinter der Fokusfigur, Blick auf die andere Figur
    const dx = gegen[0] - fokus[0], dz = gegen[2] - fokus[2], l = Math.hypot(dx, dz) || 1;
    // Kamera hinter und über der Fokusfigur, leicht seitlich versetzt, Blick auf die andere Figur
    // Vordere Figur groß (Mensch) → Kamera tiefer und weiter seitlich, damit ihr Kopf die andere Figur nicht verdeckt
    const gross = hF > 1.4;
    const zur = gross ? 1.5 : 2.3, seit = gross ? 1.25 : 0.8;
    ox = -dx / l * zur + dz / l * seit; oz = -dz / l * zur - dx / l * seit; oy = gross ? Math.max(1.0, hG * 0.9) : 2.0;
    zielX = gegen[0]; zielZ = gegen[2]; zielY = hG * 0.62 + (gross ? 0.25 : 0.2);
  }
  const d = 0.12 * Math.hypot(ox, oz) * (e - 0.5);
  if (bew === 'rein') { ox *= 1 - 0.18 * e; oz *= 1 - 0.18 * e; oy *= 1 - 0.1 * e; }
  if (bew === 'raus') { ox *= 0.85 + 0.18 * e; oz *= 0.85 + 0.18 * e; }
  if (bew === 'links') ox -= d * 2;
  if (bew === 'rechts') ox += d * 2;
  if (bew === 'hoch') oy += 0.6 * e;
  if (bew === 'runter') oy -= 0.4 * e;
  return { pos: [fokus[0] + ox, fokus[1] + oy, fokus[2] + oz] as V3, ziel: [zielX, zielY, zielZ] as V3, fov: p.fov };
}

export const KameraFahrt: React.FC<{ pos: V3; ziel: V3; fov: number; wackeln?: number }> = ({ pos, ziel, fov, wackeln = 0 }) => (
  <PerspectiveCamera makeDefault position={[pos[0] + wackeln * Math.sin(pos[0] * 99), pos[1] + wackeln * Math.cos(pos[2] * 77), pos[2]]} fov={fov} near={0.05} far={200}
    onUpdate={(c) => { c.lookAt(...ziel); c.updateProjectionMatrix(); }} />
);

/** Varianten einer Kameraposition (für freie Sicht): Basis, höher, andere Seite, weiter zurück+höher, seitlich. */
export function kameraVarianten(pos: V3, ziel: V3): V3[] {
  const d: V3 = [pos[0] - ziel[0], pos[1] - ziel[1], pos[2] - ziel[2]];
  const quer: V3 = [-d[2], 0, d[0]]; const ql = Math.hypot(quer[0], quer[2]) || 1;
  const q = (f: number): V3 => [quer[0] / ql * f, 0, quer[2] / ql * f];
  const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  return [pos, add(pos, [0, 0.9, 0]), add(pos, q(1.6)), add(pos, q(-1.6)), add(add(pos, [0, 1.6, 0]), [d[0] * 0.25, 0, d[2] * 0.25]), add(add(pos, q(2.4)), [0, 1.0, 0]), add(add(pos, q(-2.4)), [0, 1.0, 0]), add(pos, [0, 2.4, 0]), add(add(pos, [0, 2.2, 0]), q(1.8)), add(add(pos, [0, 2.2, 0]), q(-1.8))];
}
