// Sichtprüfung per Raycast: Ist ein Punkt einer Figur von der Kamera aus frei sichtbar?
import * as THREE from 'three';

const ray = new THREE.Raycaster();
function figurVon(o: THREE.Object3D | null): string | null {
  for (let x = o; x; x = x.parent) if (x.userData?.figur) return x.userData.figur as string;
  return null;
}
/** Liefert null, wenn frei; sonst die ID der verdeckenden Figur bzw. "Szene". */
export function verdecktDurch(scene: THREE.Scene, von: THREE.Vector3, punkt: THREE.Vector3, figurId: string): string | null {
  const dir = punkt.clone().sub(von); const dist = dir.length(); dir.normalize();
  ray.set(von, dir); ray.far = dist - 0.05; ray.near = 0.05;
  const hits = ray.intersectObjects(scene.children, true).filter((h) => (h.object as THREE.Mesh).isMesh && h.object.visible && !((h.object as THREE.Mesh).material as THREE.Material & { isShaderMaterial?: boolean }).isShaderMaterial);
  for (const h of hits) {
    const f = figurVon(h.object);
    if (f === figurId) return null;          // eigene Figur zuerst getroffen → sichtbar
    if (h.object.userData?.durchsichtig) continue;
    return f ?? 'Szene';
  }
  return null;
}

/** Prüfpunkte einer Figur: Gesicht links/Mitte/rechts (quer zur Blickrichtung der Kamera) und Kopf oben. */
export const GESICHT: Record<string, { gesicht: number; kopf: number; breite: number }> = {
  knoe: { gesicht: 0.5, kopf: 0.95, breite: 0.3 }, mensch: { gesicht: 1.5, kopf: 1.68, breite: 0.14 }, kraehe: { gesicht: 0.42, kopf: 0.5, breite: 0.1 },
};
export function pruefPunkte(cam: THREE.Vector3, art: string, pos: [number, number, number], skala = 1): THREE.Vector3[] {
  const g = GESICHT[art] ?? GESICHT.knoe;
  const mitte = new THREE.Vector3(pos[0], pos[1] + g.gesicht * skala, pos[2]);
  const d = mitte.clone().sub(cam); const quer = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(g.breite * skala);
  const brust = new THREE.Vector3(pos[0], pos[1] + g.gesicht * skala * (art === 'mensch' ? 0.78 : 0.75), pos[2]);
  return [mitte, mitte.clone().add(quer), mitte.clone().sub(quer), new THREE.Vector3(pos[0], pos[1] + g.kopf * skala, pos[2]), brust];
}
export function freieSicht(scene: THREE.Scene, cam: THREE.Vector3, art: string, pos: [number, number, number], id: string): string | null {
  for (const pkt of pruefPunkte(cam, art, pos)) { const w = verdecktDurch(scene, cam, pkt, id); if (w) return w; }
  return null;
}
