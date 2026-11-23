// Studio für App-Videos: farbige Bühne, großes Handy mit Screenshot deiner App (eigene Bilder aus episodes/app-XX/bilder/).
import React, { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import * as THREE from 'three';
import { Flaeche, Kasten, Kugel } from '../lib/stil';

function useBild(pfad?: string) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!pfad) return;
    const h = delayRender('Screenshot laden ' + pfad);
    new THREE.TextureLoader().load(staticFile(pfad), (t) => { t.colorSpace = THREE.SRGBColorSpace; setTex(t); continueRender(h); }, undefined, () => continueRender(h));
  }, [pfad]);
  return tex;
}

export const Studio: React.FC<{ bild?: string; handyX?: number }> = ({ bild, handyX = 0.9 }) => {
  const tex = useBild(bild);
  return (
    <group>
      <Flaeche gr={[40, 40]} rot={[-Math.PI / 2, 0, 0]} farbe="#fff1cf" />
      <Kasten gr={[30, 12, 0.3]} pos={[0, 6, -3]} farbe="#ffe3b3" kontur={false} rund={0} />
      {[[-3, 3, -2.8], [3.5, 4.5, -2.8], [-2, 6, -2.8]].map((q, i) => <Kugel key={i} r={0.5 + i * 0.2} pos={q as [number, number, number]} farbe={['#e63946', '#2a9d8f', '#f4d35e'][i]} kontur={false} />)}
      <group position={[handyX, 1.75, -0.4]} rotation={[0, -0.25, 0.05]}>
        <Kasten gr={[1.25, 2.5, 0.12]} farbe="#1b1b1b" rund={0.12} />
        <mesh position={[0, 0, 0.065]}><planeGeometry args={[1.1, 2.3]} /><meshBasicMaterial map={tex} color={tex ? '#ffffff' : '#dddddd'} toneMapped={false} /></mesh>
      </group>
    </group>
  );
};
