// Standbild-Entwürfe: 3 Stile (gleiche Szene) und 3 Maskottchen (neutrale Bühne).
import { PerspectiveCamera } from '@react-three/drei';
import { ThreeCanvas } from '@remotion/three';
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Brezel } from '../figuren/Brezel';
import { Knoedel } from '../figuren/Knoedel';
import { Spatz } from '../figuren/Spatz';
import { ladeSchriften } from '../lib/fonts';
import { STILE, StilName, StilProvider } from '../lib/stil';
import { Einblendung } from './Einblendung';
import { Strasse } from './Strasse';

const Licht: React.FC<{ stil: StilName }> = ({ stil }) => {
  const st = { papier: [1.5, '#fff1dc', 0.85], knete: [1.3, '#ffffff', 1.0], tusche: [2.2, '#ffffff', 0.55], neutral: [1.4, '#ffffff', 0.95] }[stil] as [number, string, number];
  return (
    <>
      <hemisphereLight args={['#fff8ee', '#d8ccb8', st[2]]} />
      <directionalLight position={[-4, 7, 6]} intensity={st[0]} color={st[1]} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-radius={stil === 'tusche' ? 1 : 6} shadow-bias={-0.0005} />
      <directionalLight position={[5, 3, 4]} intensity={0.35} color="#dfe9ff" />
    </>
  );
};

const Kamera: React.FC<{ pos: [number, number, number]; ziel: [number, number, number]; fov: number }> = ({ pos, ziel, fov }) => (
  <PerspectiveCamera makeDefault position={pos} fov={fov} onUpdate={(c) => { c.lookAt(...ziel); c.updateProjectionMatrix(); }} />
);

function useSchriften() { const [ok, setOk] = useState(false); useEffect(() => { ladeSchriften().then(() => setOk(true)); }, []); return ok; }

export const StilEntwurf: React.FC<{ stil: StilName }> = ({ stil }) => {
  const bereit = useSchriften();
  const { width, height } = useVideoConfig();
  const t = useCurrentFrame() / 30;
  const s = STILE[stil];
  return (
    <AbsoluteFill style={{ background: s.himmel }}>
      {stil === 'tusche' && <AbsoluteFill style={{ backgroundImage: 'radial-gradient(#f2b950 2.5px, transparent 3px)', backgroundSize: '22px 22px', opacity: 0.45 }} />}
      {bereit && <ThreeCanvas width={width} height={height} shadows={stil === 'tusche' ? 'basic' : 'soft'} gl={{ antialias: true }} style={{ position: 'absolute' }} onCreated={({ gl }) => { gl.toneMapping = THREE.NoToneMapping; }}>
        <StilProvider stil={s}>
          <Kamera pos={[1.3, 1.5, 10.5]} ziel={[0.2, 1.75, 0]} fov={40} />
          <Licht stil={stil} />
          <Strasse />
          <group position={[0.3, 0, 3.4]} rotation={[0, 0.15, 0]} scale={1.25}><Knoedel winken t={t} ausdruck="staunen" /></group>
        </StilProvider>
      </ThreeCanvas>}
      <Einblendung stil={stil} marke="Staffel 1 · Folge 4" ja="温めますか？" kana="あたためますか" romaji="atatamemasu ka" de="Soll ich es aufwärmen?" />
    </AbsoluteFill>
  );
};

const FIG = { knoedel: Knoedel, spatz: Spatz, brezel: Brezel } as const;
const INFO = {
  knoedel: { nr: 1, name: 'Knö', text: 'Ein runder Knödel aus Bayern. Mütze, Rucksack, immer hungrig.', skala: 1 },
  spatz: { nr: 2, name: 'Pip', text: 'Ein kleiner Spatz aus Berlin. Schal, Rucksack, sehr neugierig.', skala: 1 },
  brezel: { nr: 3, name: 'Brezli', text: 'Eine lebende Brezel. Salzkörner, dünne Beine, viel Mut.', skala: 0.62 },
};
export const MaskottchenEntwurf: React.FC<{ figur: keyof typeof FIG }> = ({ figur }) => {
  const bereit = useSchriften();
  const { width, height } = useVideoConfig();
  const t = useCurrentFrame() / 30;
  const F = FIG[figur], i = INFO[figur], k = i.skala;
  const s = STILE.neutral;
  return (
    <AbsoluteFill style={{ background: s.himmel }}>
      <ThreeCanvas width={width} height={height} shadows="soft" gl={{ antialias: true }} onCreated={({ gl }) => { gl.toneMapping = THREE.NoToneMapping; }}>
        <StilProvider stil={s}>
          <Kamera pos={[0, 1.5, 6.6]} ziel={[0, 1.15, 0]} fov={30} />
          <Licht stil="neutral" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[4, 64]} /><shadowMaterial opacity={0.18} /></mesh>
          <group position={[0, 0, 0.8]} rotation={[0, 0.15, 0]} scale={1.1 * k}><F winken t={t} ausdruck="froh" /></group>
          <group position={[-0.78, 0, -1.5]} rotation={[0, 0.4, 0]} scale={0.62 * k}><F ausdruck="verwirrt" /></group>
          <group position={[0.78, 0, -1.5]} rotation={[0, -0.4, 0]} scale={0.62 * k}><F ausdruck="staunen" /></group>
        </StilProvider>
      </ThreeCanvas>
      {bereit && (
        <div style={{ position: 'absolute', top: 190, left: 60, width: 840, color: '#2f2a26' }}>
          <div style={{ font: '900 34px "Noto Sans JP"', color: '#3d8a78' }}>Maskottchen-Entwurf {i.nr}</div>
          <div style={{ font: '900 150px/1.05 "Noto Sans JP"' }}>{i.name}</div>
          <div style={{ font: '400 44px/1.35 "Noto Sans JP"', marginTop: 12 }}>{i.text}</div>
          <div style={{ font: '400 34px "Noto Sans JP"', marginTop: 24, color: '#6b625a' }}>vorne: froh · links: verwirrt · rechts: staunend</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
