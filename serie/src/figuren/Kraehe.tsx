// Die Krähe – Running Gag. Schwarz, schlau, klaut immer das Falsche.
import React from 'react';
import { Kugel } from '../lib/stil';

export const Kraehe: React.FC<{ t?: number; fliegt?: boolean; beute?: string }> = ({ t = 0, fliegt = false, beute }) => {
  const fl = fliegt ? Math.sin(t * 18) * 0.9 : 0.1;
  return (
    <group position={[0, fliegt ? 0 : 0, 0]}>
      <Kugel r={0.2} pos={[0, 0.25, 0]} skala={[0.9, 0.85, 1.3]} farbe="#22222a" />
      <Kugel r={0.13} pos={[0, 0.42, 0.18]} farbe="#22222a" />
      <mesh position={[0, 0.41, 0.36]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.045, 0.16, 16]} /><meshToonMaterial color="#3a3a42" /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Kugel r={0.03} pos={[s * 0.065, 0.46, 0.28]} farbe="#ffffff" leuchten={0.5} kontur={false} />
          <Kugel r={0.016} pos={[s * 0.065, 0.46, 0.305]} farbe="#000000" kontur={false} />
          <group position={[s * 0.17, 0.3, 0]} rotation={[0, 0, s * fl]}><Kugel r={0.14} pos={[s * 0.1, 0, -0.03]} skala={[1.3, 0.25, 1]} farbe="#2e2e38" /></group>
          {!fliegt && <mesh position={[s * 0.06, 0.05, 0.02]}><cylinderGeometry args={[0.012, 0.012, 0.12]} /><meshBasicMaterial color="#555" /></mesh>}
        </group>
      ))}
      <Kugel r={0.12} pos={[0, 0.22, -0.28]} rot={[-0.5, 0, 0]} skala={[0.8, 0.25, 1.4]} farbe="#22222a" />
      {beute === 'postkarte' && <mesh position={[0, 0.38, 0.45]} rotation={[0.2, 0.3, 0]}><boxGeometry args={[0.22, 0.15, 0.01]} /><meshToonMaterial color="#fff3d6" /></mesh>}
    </group>
  );
};
