// Innenraum eines kleinen Konbini (fiktiv „まちかど“): Kasse, Regale, Kühlschränke, Onigiri.
import React from 'react';
import { Kasten, Kugel } from '../lib/stil';
import { Boden, Lampe, Schild, Wand } from './bauteile';

const Regal: React.FC<{ pos: [number, number, number]; farben: string[] }> = ({ pos, farben }) => (
  <group position={pos}>
    <Kasten gr={[1.8, 1.5, 0.5]} pos={[0, 0.75, 0]} farbe="#e8e2d6" />
    {[0.45, 0.85, 1.25].map((y, r) => Array.from({ length: 6 }, (_, i) => <Kasten key={r + '-' + i} gr={[0.22, 0.26, 0.2]} pos={[-0.7 + i * 0.28, y + 0.13, 0.18]} farbe={farben[(i + r) % farben.length]} rund={0.03} kontur={false} />))}
  </group>
);

export const Konbini: React.FC = () => (
  <group>
    <Boden farbe="#eeeae2" />
    <Wand farbe="#fbf8f1" z={-3.2} h={5} />
    {/* Kühlregale hinten */}
    {[-3, -1.2, 0.6, 2.4].map((x) => (
      <group key={x} position={[x, 0, -2.8]}>
        <Kasten gr={[1.7, 2.3, 0.6]} pos={[0, 1.15, 0]} farbe="#dfe9ef" />
        <Kasten gr={[1.5, 2.0, 0.04]} pos={[0, 1.2, 0.31]} farbe="glas" leuchten={0.35} kontur={false} />
      </group>
    ))}
    <Regal pos={[-2.6, 0, -0.6]} farben={['akzent', 'gelb', 'akzent2', '#f2a65a']} />
    <Regal pos={[-2.6, 0, 0.9]} farben={['#8fc6e8', 'gelb', '#f28c8c', 'gruen']} />
    {/* Kasse rechts */}
    <group position={[2.0, 0, 0.2]} rotation={[0, -0.35, 0]}>
      <Kasten gr={[2.2, 1.0, 0.7]} pos={[0, 0.5, 0]} farbe="#f1ede4" />
      <Kasten gr={[2.25, 0.06, 0.75]} pos={[0, 1.02, 0]} farbe="akzent2" />
      <Kasten gr={[0.45, 0.3, 0.35]} pos={[-0.8, 1.2, -0.1]} farbe="dunkel" />
      <Kasten gr={[0.4, 0.3, 0.03]} pos={[-0.8, 1.45, 0.06]} rot={[-0.3, 0, 0]} farbe="glas" leuchten={0.4} kontur={false} />
      {/* Warmhaltevitrine mit Snacks */}
      <Kasten gr={[0.55, 0.45, 0.4]} pos={[0.85, 1.28, -0.05]} farbe="glas" leuchten={0.4} />
      {[0.72, 0.86, 1.0].map((x) => <Kugel key={x} r={0.07} pos={[x, 1.2, 0]} skala={[1.2, 0.8, 1]} farbe="#e9a64b" kontur={false} />)}
      {/* Onigiri + Bentō auf dem Tresen */}
      <Kasten gr={[0.3, 0.08, 0.22]} pos={[0.1, 1.09, 0.12]} farbe="#ffffff" rund={0.02} />
      <mesh position={[-0.1, 1.12, 0.15]} rotation={[0, 0.3, 0]}><cylinderGeometry args={[0.08, 0.08, 0.05, 3]} /><meshToonMaterial color="#f8f8f8" /></mesh>
    </group>
    <Schild text="いらっしゃいませ" gr={[2.6, 0.45]} pos={[1.6, 3.0, -3.0]} bg="akzent2" fg="weiss" />
    <Schild text="おにぎり" gr={[1.2, 0.4]} pos={[-2.6, 1.85, -0.3]} bg="gelb" fg="dunkel" />
    {[-2, 0.5, 3].map((x) => <Lampe key={x} pos={[x, 4.2, -0.5]} b={1.6} />)}
  </group>
);
