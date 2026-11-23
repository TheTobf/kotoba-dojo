// Entwurf 1: „Knö“ – ein runder Knödel mit Strickmütze und Rucksack.
import React from 'react';
import { Kasten, Kugel, Zylinder } from '../lib/stil';
import { Ausdruck, Gesicht } from './teile';

export const Knoedel: React.FC<{ winken?: boolean; ausdruck?: Ausdruck; t?: number }> = ({ winken = false, ausdruck = 'froh', t = 0 }) => {
  const arm = winken ? 2.3 + Math.sin(t * 8) * 0.25 : 0.5;
  return (
    <group>
      {/* Füße */}
      {[-1, 1].map((s) => <Kugel key={s} r={0.11} pos={[s * 0.17, 0.05, 0.05]} skala={[1, 0.55, 1.35]} farbe="#e9d3a8" />)}
      {/* Körper */}
      <Kugel r={0.46} pos={[0, 0.47, 0]} skala={[1.05, 0.92, 1]} farbe="#f4e4c1" />
      {/* Brotkrumen-Sprenkel */}
      {[[0.25, 0.62, 0.36], [-0.3, 0.38, 0.33], [0.33, 0.3, 0.3], [-0.12, 0.75, 0.36]].map((p, i) => <Kugel key={i} r={0.018} pos={p as [number, number, number]} farbe="#c99e62" kontur={false} schatten={false} />)}
      <Gesicht pos={[0, 0.5, 0.43]} abstand={0.15} gr={1.1} ausdruck={ausdruck} />
      {/* Arme */}
      <group position={[-0.44, 0.45, 0]} rotation={[0, 0, -0.5]}><Kugel r={0.08} pos={[0, -0.1, 0]} skala={[0.8, 1.5, 0.8]} farbe="#f4e4c1" /></group>
      <group position={[0.44, 0.45, 0]} rotation={[0, 0, arm]}><Kugel r={0.08} pos={[0, -0.1, 0]} skala={[0.8, 1.5, 0.8]} farbe="#f4e4c1" /></group>
      {/* Mütze */}
      <group position={[0, 0.78, -0.02]} rotation={[-0.12, 0, 0.08]}>
        <Kugel r={0.3} pos={[0, 0.02, 0]} skala={[1.05, 0.75, 1.05]} farbe="akzent2" />
        <Zylinder r={0.31} h={0.09} pos={[0, -0.06, 0]} farbe="weiss" />
        <Kugel r={0.085} pos={[0, 0.25, 0]} farbe="gelb" />
      </group>
      {/* Rucksack */}
      <Kasten gr={[0.42, 0.44, 0.2]} pos={[0, 0.5, -0.47]} farbe="akzent" rund={0.08} />
      <Kasten gr={[0.3, 0.14, 0.06]} pos={[0, 0.42, -0.59]} farbe="dach" rund={0.03} />
    </group>
  );
};
