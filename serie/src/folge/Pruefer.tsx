// Selbstkontrolle im Bild: meldet über die Browser-Konsole, wenn Text außerhalb der Sicherheitszone liegt
// oder die Hauptfigur angeschnitten/verdeckt ist. Die Meldungen sammelt scripts/render.ts ein.
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import { freieSicht } from './sicht';
import { Zone } from './Texte';

export function useTextZonenPruefung(aktiv: boolean, z: Zone) {
  const frame = useCurrentFrame();
  useEffect(() => {
    if (!aktiv) return;
    const id = requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('[data-zone]').forEach((el) => {
        const r = el.getBoundingClientRect(), sx = window.innerWidth / 1080;
        const b = { l: r.left / sx, t: r.top / sx, r: r.right / sx, u: r.bottom / sx };
        const fehler = [] as string[];
        if (b.t < z.oben - 2) fehler.push(`oben ${Math.round(b.t)} < ${z.oben}`);
        if (b.l < z.links - 2) fehler.push(`links ${Math.round(b.l)} < ${z.links}`);
        if (b.r > 1080 - z.rechts + 2) fehler.push(`rechts ${Math.round(b.r)} > ${1080 - z.rechts}`);
        if (b.u > 1920 - z.unten + 2) fehler.push(`unten ${Math.round(b.u)} > ${1920 - z.unten}`);
        if (fehler.length) console.log(`PRUEF|zone|${frame}|${el.dataset.zone}|${fehler.join(', ')}`);
        console.log(`PRUEF|box|${frame}|${el.dataset.zone}|${Math.round(b.l)},${Math.round(b.t)},${Math.round(b.r)},${Math.round(b.u)}`);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [aktiv, frame, z]);
}

/** In der 3D-Szene: projiziert Kopf und Füße der Fokusfigur ins Bild. */
type Fig = { pos: [number, number, number]; hoehe: number; name: string };
export const FigurPruefung: React.FC<{ aktiv: boolean; pos: [number, number, number]; hoehe: number; name: string; art?: string; streng: boolean; andere?: Fig[]; spricht?: boolean; blick?: number }> = ({ aktiv, pos, hoehe, name, art = 'knoe', streng, andere = [], spricht = false, blick = 0 }) => {
  const { camera, scene } = useThree();
  const frame = useCurrentFrame();
  useEffect(() => {
    if (!aktiv) return;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const punkte = [[0, hoehe, 0], [0, 0, 0], [-0.5, hoehe / 2, 0], [0.5, hoehe / 2, 0]].map(([x, y, zz]) => new THREE.Vector3(pos[0] + x, pos[1] + y, pos[2] + zz).project(camera));
    const px = punkte.map((v) => ({ x: (v.x + 1) * 540, y: (1 - v.y) * 960, hinter: v.z > 1 }));
    // streng (Totale/Halbnah …): ganze Figur im Bild · Nah/Groß: nur Kopf und Gesichtsmitte müssen drin sein
    const pruefPunkte = streng ? px : [px[0], { ...px[0], y: (px[0].y + px[1].y) / 2 }];
    const raus = pruefPunkte.some((q) => q.hinter || q.x < 0 || q.x > 1080 || q.y < 0 || q.y > 1920);
    // Verdeckt etwas (Figur oder Szene) das Gesicht?
    const wer = freieSicht(scene, camera.position.clone(), art, pos, name);
    const verdeckt = wer ? [wer] : [];
    // Wer spricht, soll zur Kamera schauen (nicht mit dem Rücken)
    const zurKamera = new THREE.Vector3(camera.position.x - pos[0], 0, camera.position.z - pos[2]).normalize();
    const vorn = new THREE.Vector3(Math.sin(blick), 0, Math.cos(blick));
    if (spricht && vorn.dot(zurKamera) < 0.15) verdeckt.push('RUECKEN');
    // Mehrfach pro Bild möglich (erste Messung evtl. mit alter Kamera) – ausgewertet wird die letzte
    console.log(`PRUEF|figurbox|${frame}|${name}|${Math.round(Math.min(...px.map((q) => q.x)))},${Math.round(px[0].y)},${Math.round(Math.max(...px.map((q) => q.x)))},${Math.round(px[1].y)}|${raus ? 1 : 0}|${verdeckt.join(',')}`);
  }, [aktiv, frame, camera, scene, pos, hoehe, name, art, streng, andere, spricht, blick]);
  return null;
};
