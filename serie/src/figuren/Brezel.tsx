// Entwurf 3: „Brezli“ – eine kleine lebende Brezel mit Salzkörnern.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Kugel, Mat, Zylinder, useStil } from '../lib/stil';
import { zufall } from '../lib/texturen';
import { Ausdruck, Gesicht } from './teile';

const PUNKTE: [number, number, number][] = [
  [-0.3, 0.12, 0.06], [-0.05, 0.5, 0.1], [0.32, 0.92, 0.02], [0.72, 0.82, 0], [0.78, 0.45, 0], [0.5, 0.18, 0],
  [0, 0.1, 0.02], [-0.5, 0.18, 0], [-0.78, 0.45, 0], [-0.72, 0.82, 0], [-0.32, 0.92, 0.02], [0.05, 0.5, -0.08], [0.3, 0.12, 0.06],
];

export const Brezel: React.FC<{ winken?: boolean; ausdruck?: Ausdruck; t?: number }> = ({ winken = false, ausdruck = 'froh', t = 0 }) => {
  const stil = useStil();
  const { geo, salz } = useMemo(() => {
    const kurve = new THREE.CatmullRomCurve3(PUNKTE.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
    const geo = new THREE.TubeGeometry(kurve, 200, 0.12, 24, false);
    const r = zufall(11), salz: [number, number, number][] = [];
    for (let i = 0; i < 26; i++) { const p = kurve.getPoint(0.04 + r() * 0.92); salz.push([p.x + (r() - 0.5) * 0.08, p.y + 0.08 + r() * 0.04, p.z + 0.09]); }
    return { geo, salz };
  }, []);
  const arm = winken ? 2.2 + Math.sin(t * 8) * 0.25 : 0.5;
  return (
    <group position={[0, 0.2, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.2, -0.05, 0]}>
          <Zylinder r={0.035} h={0.2} pos={[0, -0.05, 0]} farbe="#8a4a1f" />
          <Kugel r={0.07} pos={[0, -0.16, 0.04]} skala={[1, 0.5, 1.4]} farbe="#5b3418" />
        </group>
      ))}
      <mesh geometry={geo} castShadow receiveShadow><Mat farbe="#b8662a" /></mesh>
      {[-1, 1].map((s) => <Kugel key={'e' + s} r={0.125} pos={[s * 0.3, 0.12, 0.06]} farbe="#b8662a" kontur={false} />)}
      {/* Bauch mit Gesicht */}
      <Kugel r={0.24} pos={[0, 0.16, 0.04]} skala={[1.25, 0.85, 0.75]} farbe="#c47432" />
      <Gesicht pos={[0, 0.2, 0.22]} abstand={0.11} gr={0.9} ausdruck={ausdruck} />
      {salz.map((p, i) => <mesh key={i} position={p} rotation={[i, i * 2, i * 3]}><boxGeometry args={[0.03, 0.03, 0.03]} /><meshStandardMaterial color="#ffffff" roughness={0.3} emissive="#ffffff" emissiveIntensity={stil.name === 'tusche' ? 0.3 : 0.1} /></mesh>)}
      <group position={[-0.8, 0.5, 0]} rotation={[0, 0, -0.6]}><Kugel r={0.06} pos={[0, -0.12, 0]} skala={[0.8, 1.8, 0.8]} farbe="#b8662a" /></group>
      <group position={[0.8, 0.5, 0]} rotation={[0, 0, arm]}><Kugel r={0.06} pos={[0, -0.12, 0]} skala={[0.8, 1.8, 0.8]} farbe="#b8662a" /></group>
    </group>
  );
};
