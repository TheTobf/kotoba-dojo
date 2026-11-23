// Entwurf 2: „Pip“ – ein runder Spatz mit Schal und Reiserucksack.
import React from 'react';
import { Kasten, Kugel, Zylinder } from '../lib/stil';
import { Ausdruck, Gesicht } from './teile';

export const Spatz: React.FC<{ winken?: boolean; ausdruck?: Ausdruck; t?: number }> = ({ winken = false, ausdruck = 'froh', t = 0 }) => {
  const fl = winken ? 1.9 + Math.sin(t * 8) * 0.25 : 0.25;
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.13, 0, 0.05]}>
          <Zylinder r={0.025} h={0.16} pos={[0, 0.08, 0]} farbe="#e8963c" />
          <Kugel r={0.06} pos={[0, 0.02, 0.05]} skala={[1, 0.4, 1.6]} farbe="#e8963c" />
        </group>
      ))}
      <Kugel r={0.44} pos={[0, 0.52, 0]} skala={[1, 1, 0.95]} farbe="#a8743f" />
      <Kugel r={0.33} pos={[0, 0.44, 0.17]} skala={[1, 1.05, 0.75]} farbe="#f1dfc0" kontur={false} />
      <Kugel r={0.3} pos={[0, 0.86, -0.02]} skala={[1.2, 0.5, 1.1]} farbe="#7a5230" kontur={false} />
      <Gesicht pos={[0, 0.62, 0.4]} abstand={0.15} gr={1.05} ausdruck={ausdruck} mund={false} wangen="#e8a07a" />
      {/* Schnabel */}
      <mesh position={[0, 0.54, 0.46]} rotation={[Math.PI / 2, 0, 0]} castShadow><coneGeometry args={[0.06, 0.13, 24]} /><meshStandardMaterial color="#f0a43a" roughness={0.6} /></mesh>
      {/* Flügel */}
      <group position={[-0.4, 0.5, 0]} rotation={[0, 0, -0.25]}><Kugel r={0.17} pos={[0, -0.08, 0]} skala={[0.45, 1.1, 0.9]} farbe="#7a5230" /></group>
      <group position={[0.4, 0.5, 0]} rotation={[0, 0, fl]}><Kugel r={0.17} pos={[0, -0.08, 0]} skala={[0.45, 1.1, 0.9]} farbe="#7a5230" /></group>
      {/* Schwanz */}
      <Kugel r={0.15} pos={[0, 0.3, -0.45]} rot={[-0.9, 0, 0]} skala={[0.9, 0.3, 1.4]} farbe="#7a5230" />
      {/* Schal */}
      <mesh position={[0, 0.3, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.36, 0.07, 16, 48]} /><meshStandardMaterial color="#d9534f" roughness={0.9} /></mesh>
      <Kasten gr={[0.12, 0.26, 0.05]} pos={[0.17, 0.17, 0.33]} rot={[0.2, 0, 0.15]} farbe="#d9534f" rund={0.02} />
      {/* Rucksack */}
      <Kasten gr={[0.4, 0.42, 0.18]} pos={[0, 0.55, -0.44]} farbe="akzent2" rund={0.07} />
    </group>
  );
};
