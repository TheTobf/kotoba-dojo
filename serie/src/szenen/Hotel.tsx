// Lobby des fiktiven „Hotel Kamome“: Rezeption, Sofa, Pflanzen, Aufzug.
import React from 'react';
import { Kasten, Zylinder } from '../lib/stil';
import { Boden, Lampe, Pflanze, Schild, Wand } from './bauteile';

export const Hotel: React.FC = () => (
  <group>
    <Boden farbe="#d9c7a8" />
    <Kasten gr={[5, 0.01, 3]} pos={[0.5, 0.005, 0.8]} farbe="#b94a48" kontur={false} schatten={false} rund={0} />
    <Wand farbe="#f3ead9" z={-3} h={5} />
    <Kasten gr={[30, 1.1, 0.32]} pos={[0, 0.55, -2.98]} farbe="#a8825a" kontur={false} rund={0} />
    {/* Rezeption */}
    <group position={[0.4, 0, -1.3]}>
      <Kasten gr={[3.2, 1.1, 0.8]} pos={[0, 0.55, 0]} farbe="#8a5f3c" />
      <Kasten gr={[3.3, 0.07, 0.9]} pos={[0, 1.13, 0]} farbe="#f6f1e6" />
      <Kasten gr={[0.12, 0.2, 0.12]} pos={[0.9, 1.25, 0.1]} farbe="gelb" />
    </group>
    <Schild text="ホテル かもめ  Hotel Kamome" gr={[4.2, 0.55]} pos={[0.4, 3.2, -2.8]} bg="#8a5f3c" fg="#fff3d6" />
    <Schild text="フロント  Reception" gr={[1.8, 0.35]} pos={[0.4, 2.4, -2.8]} bg="weiss" fg="dunkel" rahmen={false} />
    {/* Aufzug links */}
    <group position={[-3.4, 0, -2.8]}>
      <Kasten gr={[1.4, 2.4, 0.12]} pos={[0, 1.2, 0]} farbe="#c9ced3" />
      <Kasten gr={[0.04, 2.3, 0.14]} pos={[0, 1.2, 0.01]} farbe="dunkel" kontur={false} rund={0} />
    </group>
    {/* Sofa rechts */}
    <group position={[3.3, 0, 0.6]} rotation={[0, -0.9, 0]}>
      <Kasten gr={[1.8, 0.45, 0.8]} pos={[0, 0.25, 0]} farbe="akzent2" rund={0.1} />
      <Kasten gr={[1.8, 0.6, 0.25]} pos={[0, 0.65, -0.3]} farbe="akzent2" rund={0.1} />
    </group>
    <Zylinder r={0.35} h={0.45} pos={[2.5, 0.22, 1.7]} farbe="#8a5f3c" />
    <Pflanze pos={[-1.8, 0, -2.3]} gr={1.3} />
    <Pflanze pos={[2.6, 0, -2.3]} gr={1.3} />
    {[-2, 1, 4].map((x) => <Lampe key={x} pos={[x, 4.2, 0]} />)}
  </group>
);
