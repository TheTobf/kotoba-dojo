// Ankunftshalle eines fiktiven Flughafens: Einreiseschalter, Wasserbecken mit Brunnen, Schilder.
import React from 'react';
import { Kasten, Kugel, Zylinder } from '../lib/stil';
import { Bank, Boden, Lampe, Pflanze, Schild, Wand } from './bauteile';

export const Flughafen: React.FC = () => (
  <group>
    <Boden farbe="#e9e4da" />
    {Array.from({ length: 9 }, (_, i) => <Kasten key={i} gr={[30, 0.005, 0.03]} pos={[0, 0.003, -3 + i * 1.2]} farbe="#d6cfc2" kontur={false} schatten={false} rund={0} />)}
    <Wand farbe="#f6f3ec" z={-4} h={7} />
    {/* große Fensterfront mit Flugzeugheck draußen */}
    <Kasten gr={[9, 3.2, 0.05]} pos={[0, 3.3, -3.82]} farbe="glas" leuchten={0.3} kontur={false} rund={0} />
    {[-4.5, -2.25, 0, 2.25, 4.5].map((x) => <Kasten key={x} gr={[0.12, 3.3, 0.12]} pos={[x, 3.3, -3.78]} farbe="dunkel" kontur={false} rund={0} />)}
    <Kasten gr={[1.6, 1.4, 0.1]} pos={[2.8, 3.6, -3.9]} rot={[0, 0, 0.25]} farbe="#ffffff" />
    <Kasten gr={[0.7, 0.9, 0.1]} pos={[2.6, 4.4, -3.9]} rot={[0, 0, 0.25]} farbe="akzent" />
    {/* Decke mit Lampen */}
    {[-3, 0, 3].map((x) => <Lampe key={x} pos={[x, 5.2, -1]} b={1.8} />)}
    <Schild text="到着  Arrivals" gr={[3.4, 0.6]} pos={[-1.2, 4.95, -3.7]} bg="gelb" fg="dunkel" />
    <Schild text="入国審査  Immigration" gr={[3.6, 0.5]} pos={[-3.3, 2.9, -1.2]} rot={[0, 0.5, 0]} bg="#2f4f7a" fg="weiss" />
    {/* Einreiseschalter links */}
    {[-4.6, -3.2].map((x) => (
      <group key={x} position={[x, 0, -1.6]} rotation={[0, 0.5, 0]}>
        <Kasten gr={[1.1, 1.1, 0.6]} pos={[0, 0.55, 0]} farbe="#dfe7ee" />
        <Kasten gr={[1.1, 0.06, 0.7]} pos={[0, 1.13, 0]} farbe="weiss" />
      </group>
    ))}
    {/* Absperrband */}
    {[-1.9, -0.9, 0.1].map((x, i) => <group key={x} position={[x, 0, -0.2]}><Zylinder r={0.04} h={0.95} pos={[0, 0.48, 0]} farbe="dunkel" kontur={false} />{i < 2 && <Kasten gr={[1, 0.06, 0.02]} pos={[0.5, 0.88, 0]} farbe="akzent" kontur={false} />}</group>)}
    {/* Wasserbecken mit kleinem Brunnen rechts (hier fällt das Handy hinein) */}
    <group position={[2.4, 0, 0.6]}>
      <Zylinder r={1.15} h={0.45} pos={[0, 0.22, 0]} farbe="#d9d2c6" />
      <Zylinder r={1.0} h={0.05} pos={[0, 0.4, 0]} farbe="#7fc8e0" leuchten={0.15} kontur={false} />
      <Zylinder r={0.12} h={0.7} pos={[0, 0.7, 0]} farbe="#d9d2c6" />
      <Kugel r={0.16} pos={[0, 1.08, 0]} skala={[1, 0.6, 1]} farbe="#a8dcef" kontur={false} />
    </group>
    <Bank pos={[4.6, 0, -1.2]} rot={-0.6} />
    <Pflanze pos={[4.2, 0, -2.6]} gr={1.4} />
    <Pflanze pos={[-0.2, 0, -3.2]} gr={1.1} />
    {/* Gepäckband hinten rechts */}
    <Kasten gr={[3, 0.5, 0.8]} pos={[1.2, 0.25, -2.8]} farbe="#b9c2c9" />
    {[0, 1, 2].map((i) => <Kasten key={i} gr={[0.5, 0.35, 0.3]} pos={[0.2 + i * 0.9, 0.67, -2.8]} farbe={['akzent2', 'gelb', '#8f7bd6'][i]} rund={0.05} />)}
  </group>
);
