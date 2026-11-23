// Bahnsteig mit gelber Blindenleitlinie, Bahnsteigtüren, einfahrendem Zug (Position über `zugX`).
import React from 'react';
import { Kasten, Zylinder } from '../lib/stil';
import { Bank, Boden, Lampe, Schild } from './bauteile';

export const Bahnsteig: React.FC<{ zugX?: number }> = ({ zugX = 0 }) => (
  <group>
    <Boden farbe="#d9d4ca" />
    <Kasten gr={[40, 1.2, 4]} pos={[0, -0.6, -4.2]} farbe="#8f8a82" kontur={false} rund={0} />
    {/* gelbe Linie */}
    <Kasten gr={[40, 0.01, 0.3]} pos={[0, 0.006, -1.4]} farbe="gelb" kontur={false} schatten={false} rund={0} />
    {/* Bahnsteigtüren */}
    {[-4, -1.5, 1, 3.5, 6].map((x) => <Kasten key={x} gr={[1.6, 1.25, 0.08]} pos={[x, 0.62, -1.9]} farbe="#e6eef2" />)}
    {/* Zug */}
    <group position={[zugX, 0, -2.9]}>
      <Kasten gr={[18, 2.6, 1.6]} pos={[0, 1.3, 0]} farbe="#f4f4f0" />
      <Kasten gr={[18, 0.22, 1.62]} pos={[0, 1.05, 0]} farbe="akzent2" kontur={false} />
      {Array.from({ length: 8 }, (_, i) => <Kasten key={i} gr={[1.4, 0.9, 1.64]} pos={[-7.6 + i * 2.2, 1.85, 0]} farbe="glas" leuchten={0.2} kontur={false} />)}
    </group>
    {/* Dach + Säulen */}
    <Kasten gr={[30, 0.25, 5]} pos={[0, 4.2, 0]} farbe="#ece7dd" kontur={false} />
    {[-5, 0, 5].map((x) => <Zylinder key={x} r={0.12} h={4.2} pos={[x, 2.1, 1.2]} farbe="#d0c9bd" />)}
    {[-5, 0, 5].map((x) => <Lampe key={x} pos={[x + 2.5, 4.05, 0]} />)}
    <Schild text="3番線  新宿方面" gr={[2.6, 0.5]} pos={[0.2, 3.4, 1.15]} bg="#2a5d4f" fg="weiss" />
    <Schild text="ほしの  Hoshino" gr={[1.9, 0.6]} pos={[-3.4, 2.6, 1.35]} bg="weiss" fg="dunkel" />
    <Bank pos={[3.2, 0, 1.9]} rot={Math.PI} />
    {/* Fahrkartenautomaten links */}
    {[0, 1].map((i) => (
      <group key={i} position={[-4.4 + i * 0.95, 0, 0.3]} rotation={[0, 0.5, 0]}>
        <Kasten gr={[0.85, 1.75, 0.6]} pos={[0, 0.88, 0]} farbe="#e8edf0" />
        <Kasten gr={[0.6, 0.45, 0.03]} pos={[0, 1.2, 0.31]} rot={[-0.25, 0, 0]} farbe="glas" leuchten={0.5} kontur={false} />
        <Kasten gr={[0.6, 0.2, 0.05]} pos={[0, 0.75, 0.3]} farbe="akzent2" kontur={false} />
      </group>
    ))}
    <Schild text="きっぷ  Tickets" gr={[1.7, 0.4]} pos={[-3.95, 2.2, 0.0]} rot={[0, 0.5, 0]} bg="akzent2" fg="weiss" />
  </group>
);
