// Entwurfsszene: Straßenecke mit kleinem Konbini (fiktiver Name „まちかど“), Automat, Laterne, Strommast.
import React from 'react';
import { Flaeche, Kasten, Kugel, Zylinder, useStil, useTextur } from '../lib/stil';
import { automatTextur, schildTextur } from '../lib/texturen';

export const Strasse: React.FC = () => {
  const s = useStil();
  const f = s.farben;
  const font = s.name === 'knete' ? 'M PLUS Rounded 1c' : 'Noto Sans JP';
  const schild = useTextur(() => schildTextur('まちかど', { bg: f.akzent2, fg: f.weiss, font, size: 150 }), [s.name]);
  const offen = useTextur(() => schildTextur('営業中', { bg: f.weiss, fg: f.akzent, font, w: 256, h: 128, size: 70 }), [s.name]);
  const automat = useTextur(() => automatTextur([f.akzent, f.gelb, f.akzent2, f.gruen, '#7aa6d8', f.dach], f.akzent), [s.name]);
  return (
    <group>
      {/* Boden: Gehweg + Straße mit Zebrastreifen */}
      <Flaeche gr={[30, 8]} pos={[0, 0, -2]} rot={[-Math.PI / 2, 0, 0]} farbe="boden" />
      <Flaeche gr={[30, 10]} pos={[0, -0.01, 7]} rot={[-Math.PI / 2, 0, 0]} farbe="strasse" />
      {Array.from({ length: 6 }, (_, i) => <Kasten key={i} gr={[0.45, 0.02, 2.2]} pos={[-2.5 + i * 0.9, 0.005, 4.3]} farbe="weiss" schatten={false} kontur={false} rund={0} />)}
      <Kasten gr={[30, 0.12, 0.25]} pos={[0, 0.06, 2.1]} farbe="wand2" kontur={false} rund={0.03} />
      {/* Konbini */}
      <group position={[0, 0, -1.6]}>
        <Kasten gr={[4.6, 3.2, 1.6]} pos={[0, 1.6, -0.8]} farbe="wand" />
        <Kasten gr={[4.8, 0.55, 0.3]} pos={[0, 2.75, 0.12]} farbe="akzent2" />
        <Flaeche gr={[4.6, 0.46]} pos={[0, 2.75, 0.275]} farbe="weiss" map={schild} />
        <Kasten gr={[4.8, 0.12, 0.34]} pos={[0, 2.42, 0.12]} farbe="akzent" />
        <Kasten gr={[4.0, 1.85, 0.06]} pos={[0, 1.3, 0.02]} farbe="glas" leuchten={0.25} />
        {/* Regale hinter Glas */}
        {[-1.3, 0, 1.3].map((x) => <Kasten key={x} gr={[0.9, 1.1, 0.2]} pos={[x, 0.85, -0.25]} farbe="wand2" kontur={false} />)}
        <Kasten gr={[0.06, 1.85, 0.1]} pos={[0, 1.3, 0.06]} farbe="dunkel" kontur={false} rund={0} />
        <Flaeche gr={[0.5, 0.25]} pos={[1.4, 1.9, 0.06]} farbe="weiss" map={offen} />
        <Kasten gr={[4.7, 0.25, 1.75]} pos={[0, 3.3, -0.8]} farbe="wand2" />
        {/* Klimagerät + Rohr auf dem Dach */}
        <Kasten gr={[0.7, 0.45, 0.4]} pos={[-1.5, 3.65, -1.2]} farbe="weiss" />
      </group>
      {/* Getränkeautomat */}
      <group position={[2.0, 0, 0.1]} rotation={[0, -0.35, 0]}>
        <Kasten gr={[0.8, 1.8, 0.65]} pos={[0, 0.9, 0]} farbe="akzent" />
        <Flaeche gr={[0.7, 1.6]} pos={[0, 0.95, 0.33]} farbe="weiss" map={automat} />
      </group>
      {/* Blumentöpfe */}
      {[-1.8, -1.35].map((x, i) => (
        <group key={x} position={[x, 0, 0.1]}>
          <Zylinder r={0.17} r2={0.2} h={0.3} pos={[0, 0.15, 0]} farbe="dach" />
          <Kugel r={0.26 - i * 0.05} pos={[0, 0.45, 0]} farbe="gruen" />
        </group>
      ))}
      {/* Laterne */}
      <group position={[-2.6, 0, 1.2]}>
        <Zylinder r={0.05} h={3.1} pos={[0, 1.55, 0]} farbe="dunkel" />
        <Kasten gr={[0.55, 0.08, 0.3]} pos={[0.2, 3.1, 0]} farbe="dunkel" />
        <Kasten gr={[0.35, 0.05, 0.2]} pos={[0.3, 3.04, 0]} farbe="gelb" leuchten={0.8} kontur={false} />
      </group>
      {/* Strommast mit Leitungen */}
      <group position={[3.1, 0, -0.6]}>
        <Zylinder r={0.11} r2={0.09} h={6} pos={[0, 3, 0]} farbe="wand2" />
        <Kasten gr={[1.1, 0.08, 0.08]} pos={[0, 5.4, 0]} farbe="dunkel" />
        <Zylinder r={0.13} h={0.35} pos={[-0.3, 4.9, 0.12]} farbe="weiss" />
      </group>
      {[5.42, 5.3].map((y, i) => <Zylinder key={y} r={0.012} h={14} pos={[-3, y - i * 0.2, -0.8 + i * 0.2]} rot={[0, 0.1, Math.PI / 2 - 0.04]} farbe="dunkel" kontur={false} schatten={false} />)}
    </group>
  );
};
