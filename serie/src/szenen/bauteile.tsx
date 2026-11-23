// Wiederverwendbare Bauteile für Szenen.
import React from 'react';
import { Flaeche, Kasten, Kugel, Zylinder, useStil, useTextur } from '../lib/stil';
import { schildTextur } from '../lib/texturen';

type P3 = [number, number, number];

/** Schild mit Text (eigene, fiktive Beschriftung). gr = Breite/Höhe in Metern. */
export const Schild: React.FC<{ text: string; gr: [number, number]; pos: P3; rot?: P3; bg?: string; fg?: string; rahmen?: boolean; leuchten?: number }> = ({ text, gr, pos, rot, bg = 'weiss', fg = 'dunkel', rahmen = true, leuchten = 0 }) => {
  const s = useStil();
  const b = s.farben[bg] ?? bg, f = s.farben[fg] ?? fg;
  const px = 256, w = Math.round(px * gr[0] / gr[1]);
  const tex = useTextur(() => schildTextur(text, { bg: b, fg: f, font: 'Noto Sans JP', w: Math.min(2048, w), h: px, size: px * 0.56 }), [text, b, f, w]);
  return (
    <group position={pos} rotation={rot}>
      {rahmen && <Kasten gr={[gr[0] + 0.06, gr[1] + 0.06, 0.05]} pos={[0, 0, -0.03]} farbe="dunkel" kontur={false} rund={0.01} />}
      <Flaeche gr={gr} pos={[0, 0, 0.001]} farbe="weiss" map={tex} leuchten={leuchten} />
    </group>
  );
};

export const Pflanze: React.FC<{ pos: P3; gr?: number }> = ({ pos, gr = 1 }) => (
  <group position={pos} scale={gr}>
    <Zylinder r={0.2} r2={0.24} h={0.38} pos={[0, 0.19, 0]} farbe="dach" />
    <Kugel r={0.3} pos={[0, 0.6, 0]} farbe="gruen" />
    <Kugel r={0.2} pos={[0.15, 0.82, 0.05]} farbe="gruen" />
  </group>
);

export const Boden: React.FC<{ farbe?: string; gr?: number; z?: number }> = ({ farbe = 'boden', gr = 40, z = 0 }) => (
  <Flaeche gr={[gr, gr]} pos={[0, 0, z]} rot={[-Math.PI / 2, 0, 0]} farbe={farbe} />
);

export const Wand: React.FC<{ farbe?: string; z?: number; h?: number; b?: number }> = ({ farbe = 'wand', z = -3, h = 6, b = 30 }) => (
  <Kasten gr={[b, h, 0.3]} pos={[0, h / 2, z]} farbe={farbe} kontur={false} rund={0} />
);

export const Bank: React.FC<{ pos: P3; rot?: number }> = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <Kasten gr={[1.6, 0.08, 0.45]} pos={[0, 0.45, 0]} farbe="akzent2" />
    <Kasten gr={[1.6, 0.4, 0.06]} pos={[0, 0.7, -0.2]} farbe="akzent2" />
    {[-0.7, 0.7].map((x) => <Kasten key={x} gr={[0.06, 0.45, 0.4]} pos={[x, 0.22, 0]} farbe="dunkel" kontur={false} />)}
  </group>
);

export const Lampe: React.FC<{ pos: P3; b?: number }> = ({ pos, b = 1.2 }) => (
  <Kasten gr={[b, 0.06, 0.25]} pos={pos} farbe="#fffbe8" leuchten={0.9} kontur={false} schatten={false} />
);
