// Stil-System: Jede Form im Baukasten holt Material, Rundung und Kontur aus dem aktiven Stil.
import { RoundedBox } from '@react-three/drei';
import React, { createContext, useContext, useMemo } from 'react';
import * as THREE from 'three';
import { rauschTextur } from './texturen';

export type StilName = 'papier' | 'knete' | 'tusche' | 'neutral';
export type Stil = {
  name: StilName;
  rundung: number;           // Kantenradius für Kästen (0 = scharf)
  kontur: number;            // Konturdicke (0 = keine)
  farben: Record<string, string>;
  himmel: string;            // CSS-Hintergrund hinter der 3D-Szene
  segmente?: number;         // feste Polygonzahl (Origami: wenige, kantig)
};

export const STILE: Record<StilName, Stil> = {
  papier: {
    name: 'papier', rundung: 0, kontur: 0, segmente: 9, himmel: 'linear-gradient(180deg,#f7d9bf 0%,#f3e6d3 55%,#cfe1d8 100%)',
    farben: { wand: '#efe6d6', wand2: '#d9c9ae', dach: '#c8553d', akzent: '#e07a5f', akzent2: '#3d7068', glas: '#bcd9d6', boden: '#d8cdb8', strasse: '#9e978c', weiss: '#fbf6ec', dunkel: '#4a3f35', gruen: '#7a9e6b', gelb: '#f2c14e', haut: '#f6ead2' },
  },
  knete: {
    name: 'knete', rundung: 0.06, kontur: 0, himmel: 'linear-gradient(180deg,#9ad1d4 0%,#c9ecdf 60%,#fdf1c7 100%)',
    farben: { wand: '#fff4e0', wand2: '#ffd9a8', dach: '#ff8fa3', akzent: '#ff6f61', akzent2: '#43b0a8', glas: '#a8e0f0', boden: '#f2e2c4', strasse: '#a7a2b8', weiss: '#ffffff', dunkel: '#3d3550', gruen: '#7ccf8a', gelb: '#ffd166', haut: '#fff1d6' },
  },
  tusche: {
    name: 'tusche', rundung: 0.02, kontur: 0.022, himmel: 'radial-gradient(circle at 30% 20%,#fff8e6 0%,#fff1cf 50%,#ffe0a8 100%)',
    farben: { wand: '#fffaf0', wand2: '#ffe3b3', dach: '#e63946', akzent: '#e63946', akzent2: '#2a9d8f', glas: '#bde7f5', boden: '#f0dcc0', strasse: '#c9c2b6', weiss: '#ffffff', dunkel: '#1b1b1b', gruen: '#57b05a', gelb: '#f4d35e', haut: '#fff3dc' },
  },
  neutral: {
    name: 'neutral', rundung: 0.04, kontur: 0, himmel: 'radial-gradient(circle at 50% 35%,#ffffff 0%,#eef1ee 60%,#dfe5e1 100%)',
    farben: { wand: '#f2efe8', wand2: '#ddd6c8', dach: '#c95f4b', akzent: '#e07a5f', akzent2: '#3d8a78', glas: '#cfe6ea', boden: '#e6e1d6', strasse: '#a9a59c', weiss: '#ffffff', dunkel: '#2f2a26', gruen: '#7fae78', gelb: '#f2c14e', haut: '#fbf1dc' },
  },
};

const Ctx = createContext<Stil>(STILE.neutral);
export const StilProvider: React.FC<{ stil: Stil; children: React.ReactNode }> = ({ stil, children }) => <Ctx.Provider value={stil}>{children}</Ctx.Provider>;
export const useStil = () => useContext(Ctx);

let toonVerlauf: THREE.DataTexture | null = null;
function verlauf() {
  if (!toonVerlauf) {
    toonVerlauf = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    toonVerlauf.minFilter = toonVerlauf.magFilter = THREE.NearestFilter; toonVerlauf.needsUpdate = true;
  }
  return toonVerlauf;
}
const texCache: Record<string, THREE.Texture> = {};
const tex = (a: 'papier' | 'knete' | 'korn') => (texCache[a] ??= rauschTextur(a, a === 'knete' ? 3 : 7));

/** Material passend zum Stil. `farbe` ist ein Schlüssel aus stil.farben oder eine CSS-Farbe. `map` überschreibt die Oberfläche. */
export const Mat: React.FC<{ farbe: string; map?: THREE.Texture; leuchten?: number; matt?: boolean }> = ({ farbe, map, leuchten = 0 }) => {
  const s = useStil();
  const c = s.farben[farbe] ?? farbe;
  if (s.name === 'tusche') return <meshToonMaterial color={c} gradientMap={verlauf()} map={map ?? null} emissive={c} emissiveIntensity={leuchten} />;
  if (s.name === 'papier') return <meshStandardMaterial color={c} map={map ?? tex('korn')} roughness={1} metalness={0} flatShading emissive={c} emissiveIntensity={leuchten} />;
  if (s.name === 'knete') return <meshStandardMaterial color={c} map={map ?? null} roughness={0.85} metalness={0} bumpMap={tex('knete')} bumpScale={1.2} emissive={c} emissiveIntensity={leuchten} />;
  return <meshStandardMaterial color={c} map={map ?? null} roughness={0.7} emissive={c} emissiveIntensity={leuchten} />;
};

// Kontur per „Inverted Hull“: dieselbe Form noch einmal, entlang der Normalen aufgeblasen, nur Rückseiten, einfarbig.
const huellen: Record<string, THREE.ShaderMaterial> = {};
function huelle(farbe: string, dicke: number) {
  return (huellen[farbe + dicke] ??= new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, dicke: { value: dicke } },
    vertexShader: 'uniform float dicke; void main(){ vec3 p = position + normalize(normal) * dicke; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform vec3 farbe; void main(){ gl_FragColor = vec4(farbe, 1.0); }',
    side: THREE.BackSide,
  }));
}
function useKontur(an: boolean | undefined): THREE.ShaderMaterial | null {
  const s = useStil();
  return an !== false && s.kontur ? huelle(s.farben.dunkel, s.kontur) : null;
}

type Pos = [number, number, number];
type TeilProps = { pos?: Pos; rot?: Pos; farbe: string; map?: THREE.Texture; leuchten?: number; schatten?: boolean; kontur?: boolean };

export const Kasten: React.FC<TeilProps & { gr: Pos; rund?: number }> = ({ gr, pos, rot, farbe, map, leuchten, schatten = true, kontur = true, rund }) => {
  const s = useStil();
  const r = Math.min(rund ?? s.rundung, Math.min(...gr) / 2 - 0.001);
  const mat = <Mat farbe={farbe} map={map} leuchten={leuchten} />;
  const h = useKontur(kontur);
  const rr = Math.max(r, h ? Math.min(0.02, Math.min(...gr) / 2 - 0.001) : 0); // Kontur braucht glatte Normalen
  if (rr > 0.002)
    return (
      <group position={pos} rotation={rot}>
        <RoundedBox args={gr} radius={rr} smoothness={4} castShadow={schatten} receiveShadow>{mat}</RoundedBox>
        {h && <RoundedBox args={gr} radius={rr} smoothness={4} material={h} />}
      </group>
    );
  return (
    <mesh position={pos} rotation={rot} castShadow={schatten} receiveShadow>
      <boxGeometry args={gr} />
      {mat}
    </mesh>
  );
};

export const Kugel: React.FC<TeilProps & { r: number; skala?: Pos; seg?: number }> = ({ r, skala, pos, rot, farbe, map, leuchten, schatten = true, kontur = true, seg = 48 }) => {
  const s = useStil(), h = useKontur(kontur);
  const n = s.segmente ?? seg, args: [number, number, number] = [r, n, Math.max(6, Math.round(n * 0.75))];
  return (
    <group position={pos} rotation={rot} scale={skala}>
      <mesh castShadow={schatten} receiveShadow><sphereGeometry args={args} /><Mat farbe={farbe} map={map} leuchten={leuchten} /></mesh>
      {h && <mesh material={h}><sphereGeometry args={args} /></mesh>}
    </group>
  );
};

export const Zylinder: React.FC<TeilProps & { r: number; r2?: number; h: number; seg?: number }> = ({ r, r2, h, pos, rot, farbe, map, leuchten, schatten = true, kontur = true, seg = 32 }) => {
  const s = useStil(), hu = useKontur(kontur && r > 0.03);
  const args: [number, number, number, number] = [r2 ?? r, r, h, s.segmente ?? seg];
  return (
    <group position={pos} rotation={rot}>
      <mesh castShadow={schatten} receiveShadow><cylinderGeometry args={args} /><Mat farbe={farbe} map={map} leuchten={leuchten} /></mesh>
      {hu && <mesh material={hu}><cylinderGeometry args={args} /></mesh>}
    </group>
  );
};

export const Flaeche: React.FC<TeilProps & { gr: [number, number] }> = ({ gr, pos, rot, farbe, map, leuchten }) => (
  <mesh position={pos} rotation={rot} receiveShadow>
    <planeGeometry args={gr} />
    <Mat farbe={farbe} map={map} leuchten={leuchten} />
  </mesh>
);

export function useTextur<T>(fn: () => T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(fn, deps);
}
