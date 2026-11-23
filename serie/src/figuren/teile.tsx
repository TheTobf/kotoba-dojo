// Gemeinsame Gesichtsteile für alle Figuren.
import React from 'react';
import { Kugel } from '../lib/stil';

type Pos = [number, number, number];
export type Ausdruck = 'froh' | 'verwirrt' | 'staunen' | 'traurig' | 'neutral';

/** Zwei Augen + Glanzpunkt + Wangen + Mund, auf einer Kugeloberfläche Richtung +z. */
export const Gesicht: React.FC<{ pos: Pos; abstand?: number; gr?: number; ausdruck?: Ausdruck; wangen?: string; mund?: boolean; mundAuf?: number }> = ({ pos, abstand = 0.16, gr = 1, ausdruck = 'froh', wangen = '#f29e9e', mund = true, mundAuf = 0 }) => {
  const a = abstand, e = 0.055 * gr;
  const augeY = ausdruck === 'staunen' ? 1.25 : 1;
  return (
    <group position={pos}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * a, 0, 0]}>
          <Kugel r={e} skala={[0.85, 1.15 * augeY, 0.5]} farbe="#1d1a17" kontur={false} schatten={false} />
          <Kugel r={e * 0.35} pos={[e * 0.3, e * 0.45, e * 0.3]} farbe="#ffffff" leuchten={0.6} kontur={false} schatten={false} />
          {ausdruck === 'traurig' && <Kugel r={e * 0.9} pos={[0, e * 1.9, 0]} skala={[1.3, 0.25, 0.4]} rot={[0, 0, s * -0.4]} farbe="#1d1a17" kontur={false} schatten={false} />}
          {ausdruck === 'verwirrt' && <Kugel r={e * 0.9} pos={[0, e * (s < 0 ? 2.4 : 1.7), 0]} skala={[1.3, 0.25, 0.4]} rot={[0, 0, s < 0 ? -0.35 : 0.1]} farbe="#1d1a17" kontur={false} schatten={false} />}
        </group>
      ))}
      {[-1, 1].map((s) => <Kugel key={'w' + s} r={0.05 * gr} pos={[s * (a + 0.07 * gr), -0.08 * gr, -0.01]} skala={[1.3, 0.75, 0.3]} farbe={wangen} kontur={false} schatten={false} />)}
      {mund && (ausdruck === 'staunen' || mundAuf > 0.15
        ? <Kugel r={0.035 * gr} pos={[0, -0.1 * gr, 0]} skala={[1.1, ausdruck === 'staunen' ? 1.2 : 0.4 + mundAuf, 0.4]} farbe="#5a2a2a" kontur={false} schatten={false} />
        : <Kugel r={0.04 * gr} pos={[ausdruck === 'verwirrt' ? 0.03 : 0, -0.1 * gr, 0]} skala={[1.2, ausdruck === 'verwirrt' ? 0.25 : 0.55, 0.35]} farbe="#5a2a2a" kontur={false} schatten={false} />)}
    </group>
  );
};
