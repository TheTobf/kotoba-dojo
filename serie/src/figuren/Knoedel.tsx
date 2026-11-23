// Knö – das Maskottchen (gewählt am 23.11.2026). Runder Knödel mit Mütze und Rucksack.
import React from 'react';
import { Kasten, Kugel, Zylinder } from '../lib/stil';
import { Aktion, pose } from './animation';
import { Ausdruck, Gesicht } from './teile';

export type FigurProps = { aktion?: Aktion; t?: number; ausdruck?: Ausdruck; winken?: boolean; mitRucksack?: boolean; mitHandy?: boolean };

export const Knoedel: React.FC<FigurProps> = ({ aktion, t = 0, ausdruck = 'froh', winken = false, mitRucksack = true, mitHandy = false }) => {
  const p = pose(aktion ?? (winken ? 'winken' : 'stehen'), t);
  const ausdr: Ausdruck = aktion === 'verwirrt' ? 'verwirrt' : aktion === 'erschrecken' ? 'staunen' : aktion === 'traurig' ? 'traurig' : aktion === 'freuen' ? 'froh' : ausdruck;
  return (
    <group position={[0, p.y, 0]}>
      {[-1, 1].map((s) => <Kugel key={s} r={0.11} pos={[s * 0.17, 0.05 - p.y, 0.05 + (s < 0 ? p.fussL : p.fussR)]} skala={[1, 0.55, 1.35]} farbe="#e9d3a8" />)}
      <group position={[0, 0.08, 0]} rotation={[p.vor, 0, p.neigung]} scale={[1 / Math.sqrt(p.quetsch), p.quetsch, 1 / Math.sqrt(p.quetsch)]}>
        <group position={[0, -0.08, 0]}>
          <Kugel r={0.46} pos={[0, 0.47, 0]} skala={[1.05, 0.92, 1]} farbe="#f4e4c1" />
          {[[0.25, 0.62, 0.36], [-0.3, 0.38, 0.33], [0.33, 0.3, 0.3], [-0.12, 0.75, 0.36]].map((q, i) => <Kugel key={i} r={0.018} pos={q as [number, number, number]} farbe="#c99e62" kontur={false} schatten={false} />)}
          <Gesicht pos={[0, 0.5, 0.43]} abstand={0.15} gr={1.1} ausdruck={ausdr} mundAuf={p.mund} />
          <group position={[-0.44, 0.45, 0]} rotation={[0, 0, -p.armL]}><Kugel r={0.08} pos={[0, -0.1, 0]} skala={[0.8, 1.5, 0.8]} farbe="#f4e4c1" /></group>
          <group position={[0.44, 0.45, 0]} rotation={[-p.armVorR, 0, p.armR]}>
            <Kugel r={0.08} pos={[0, -0.1, 0]} skala={[0.8, 1.5, 0.8]} farbe="#f4e4c1" />
            {mitHandy && <Kasten gr={[0.1, 0.17, 0.02]} pos={[0, -0.24, 0.06]} farbe="#1b1b1b" rund={0.01} />}
          </group>
          <group position={[0, 0.78, -0.02]} rotation={[-0.12, 0, 0.08]}>
            <Kugel r={0.3} pos={[0, 0.02, 0]} skala={[1.05, 0.75, 1.05]} farbe="#2a9d8f" />
            <Zylinder r={0.31} h={0.09} pos={[0, -0.06, 0]} farbe="#ffffff" />
            <Kugel r={0.085} pos={[0, 0.25, 0]} farbe="#f4d35e" />
          </group>
          {mitRucksack && <>
            <Kasten gr={[0.42, 0.44, 0.2]} pos={[0, 0.5, -0.47]} farbe="#e63946" rund={0.08} />
            <Kasten gr={[0.3, 0.14, 0.06]} pos={[0, 0.42, -0.59]} farbe="#b8323d" rund={0.03} />
          </>}
        </group>
      </group>
    </group>
  );
};
