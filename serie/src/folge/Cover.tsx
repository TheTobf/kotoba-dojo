// Titelbild (cover.jpg): Knö groß in der Szene der Folge, Titel in der Sicherheitszone.
import { ThreeCanvas } from '@remotion/three';
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Knoedel } from '../figuren/Knoedel';
import { ladeSchriften } from '../lib/fonts';
import { STILE, StilProvider } from '../lib/stil';
import { Bahnsteig } from '../szenen/Bahnsteig';
import { Flughafen } from '../szenen/Flughafen';
import { Hotel } from '../szenen/Hotel';
import { Konbini } from '../szenen/Konbini';
import { Strasse } from '../szenen/Strasse';
import { KameraFahrt } from './KameraFahrt';

export type CoverProps = { szene: 'flughafen' | 'bahnsteig' | 'konbini' | 'strasse' | 'hotel'; titel: string; zeile: string; satz: string; aktion?: string };
const SZ = { flughafen: Flughafen, bahnsteig: Bahnsteig, konbini: Konbini, strasse: Strasse, hotel: Hotel };

export const Cover: React.FC<CoverProps> = ({ szene, titel, zeile, satz, aktion }) => {
  const { width, height } = useVideoConfig();
  const [ok, setOk] = useState(false);
  useEffect(() => { ladeSchriften().then(() => setOk(true)); }, []);
  const S = SZ[szene] ?? Strasse;
  return (
    <AbsoluteFill style={{ background: STILE.tusche.himmel }}>
      {ok && <ThreeCanvas width={width} height={height} shadows="basic" onCreated={({ gl }) => { gl.toneMapping = THREE.NoToneMapping; }}>
        <StilProvider stil={STILE.tusche}>
          <KameraFahrt pos={[0.6, 1.5, 5.4]} ziel={[0, 1.25, 0]} fov={40} />
          <hemisphereLight args={['#fff8ee', '#d8ccb8', 0.6]} />
          <directionalLight position={[-4, 8, 6]} intensity={2.1} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.002} shadow-normalBias={0.03} />
          <S />
          <group position={[0, 0, 0.6]} rotation={[0, 0.15, 0]} scale={1.2}><Knoedel aktion={(aktion as never) ?? 'verwirrt'} t={0.4} /></group>
        </StilProvider>
      </ThreeCanvas>}
      {ok && <div style={{ position: 'absolute', top: 190, left: 60, width: 840, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'flex-start' }}>
        <div style={{ background: '#1b1b1b', color: '#f4d35e', font: '900 40px "Noto Sans JP"', padding: '6px 22px', transform: 'skewX(-8deg)' }}>{zeile}</div>
        <div style={{ font: '900 120px/1.05 "Noto Sans JP"', color: '#fff', WebkitTextStroke: '20px #1b1b1b', paintOrder: 'stroke fill' }}>{titel}</div>
        <div style={{ background: '#fff', border: '8px solid #1b1b1b', borderRadius: 30, padding: '10px 26px', font: '900 76px "Noto Sans JP"', boxShadow: '12px 12px 0 #1b1b1b' }}>{satz}</div>
      </div>}
    </AbsoluteFill>
  );
};
