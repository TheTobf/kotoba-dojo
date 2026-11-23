// Komposition einer Folge: liest episode.json + timing.json (als inputProps) und baut daraus Bild und Ton.
import { ThreeCanvas } from '@remotion/three';
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Aktion } from '../figuren/animation';
import { Knoedel } from '../figuren/Knoedel';
import { Kraehe } from '../figuren/Kraehe';
import { Mensch } from '../figuren/Mensch';
import { Ausdruck } from '../figuren/teile';
import { ladeSchriften } from '../lib/fonts';
import { STILE, StilProvider } from '../lib/stil';
import { Bahnsteig } from '../szenen/Bahnsteig';
import { Flughafen } from '../szenen/Flughafen';
import { Hotel } from '../szenen/Hotel';
import { Konbini } from '../szenen/Konbini';
import { Strasse } from '../szenen/Strasse';
import { Studio } from '../szenen/Studio';
import { useThree } from '@react-three/fiber';
import { KAMERA_GRENZEN, kameraPose, kameraPreset, kameraVarianten } from './KameraFahrt';
import { freieSicht } from './sicht';
import { FigurPruefung, useTextZonenPruefung } from './Pruefer';
import { Badge, Endkarte, Hook, Quiz, Satzkarte, Untertitel, Zone } from './Texte';
import { CurriculumEintrag, Episode, FigurImShot, Timing } from './typen';
import { Vorlage, zeitleiste } from './zeitleiste';

export type FolgeProps = {
  episode: Episode; timing: Timing; vorlage: Vorlage & { sicherheitszone: Zone; text: { untertitel: { yOben: number } }; schnitt: { quizFrage: string } };
  lehrplan: Record<string, CurriculumEintrag>; rollen?: Record<string, string>; zaehler?: string; modus: 'vorschau' | 'final'; pruefen?: boolean;
};

/** Wählt die erste Kamera-Variante, von der aus das Gesicht der Zielfigur frei ist (geprüft am Anfang und Ende der Einstellung). */
const AutoKamera: React.FC<{ start: { pos: [number, number, number]; ziel: [number, number, number] }; ende: { pos: [number, number, number]; ziel: [number, number, number] }; jetzt: { pos: [number, number, number]; ziel: [number, number, number]; fov: number }; zielFigur?: { id: string; art: string; pos: [number, number, number] }; wackeln: number }> = ({ start, ende, jetzt, zielFigur, wackeln }) => {
  const { scene, camera, invalidate } = useThree();
  React.useLayoutEffect(() => {
    let off: [number, number, number] = [0, 0, 0];
    if (zielFigur) {
      scene.updateMatrixWorld(true);
      const va = kameraVarianten(start.pos, start.ziel), ve = kameraVarianten(ende.pos, ende.ziel);
      for (let i = 0; i < va.length; i++) {
        const frei = [va[i], ve[i]].every((v) => !freieSicht(scene, new THREE.Vector3(...v), zielFigur.art, zielFigur.pos, zielFigur.id));
        if (frei) { off = [va[i][0] - start.pos[0], va[i][1] - start.pos[1], va[i][2] - start.pos[2]]; break; }
      }
    }
    const c = camera as THREE.PerspectiveCamera;
    c.position.set(jetzt.pos[0] + off[0] + wackeln * Math.sin(jetzt.pos[0] * 99), jetzt.pos[1] + off[1] + wackeln * Math.cos(jetzt.pos[2] * 77), jetzt.pos[2] + off[2]);
    c.fov = jetzt.fov; c.near = 0.05; c.far = 200;
    c.lookAt(...jetzt.ziel); c.updateProjectionMatrix(); c.updateMatrixWorld(true);
    invalidate();
  });
  return null;
};

const SZENEN = { flughafen: Flughafen, bahnsteig: Bahnsteig, konbini: Konbini, strasse: Strasse, hotel: Hotel, studio: Studio } as const;
const ROLLENNAME: Record<string, string> = { knoe: 'Knö', haru: 'Haru', personal: '', personal2: '', ansage: 'Durchsage', mori: 'Frau Mori', ken: 'Ken' };

function figurPos(fi: FigurImShot, p: number): [number, number, number] {
  const y0 = Number(fi.extra?.y ?? 0), y1 = Number(fi.extra?.nachY ?? y0);
  if (!fi.nach) return [fi.pos[0], y0, fi.pos[1]];
  const e = Math.min(1, p);
  return [fi.pos[0] + (fi.nach[0] - fi.pos[0]) * e, y0 + (y1 - y0) * e, fi.pos[1] + (fi.nach[1] - fi.pos[1]) * e];
}

export const Folge: React.FC<FolgeProps> = ({ episode, timing, vorlage, lehrplan, zaehler, modus, pruefen = false }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const [bereit, setBereit] = useState(false);
  useEffect(() => { ladeSchriften().then(() => setBereit(true)); }, []);
  const z = vorlage.sicherheitszone;
  const tl = useMemo(() => zeitleiste(episode, timing, vorlage), [episode, timing, vorlage]);
  useTextZonenPruefung(pruefen && bereit, z);

  const teil = tl.shots.find((s) => frame >= s.von && frame < s.bis) ?? tl.shots[tl.shots.length - 1];
  const shotStart = tl.shots.find((s) => s.shot === teil.shot)!.von;
  const shotEnde = [...tl.shots].reverse().find((s) => s.shot === teil.shot)!.bis;
  const tShot = (frame - shotStart) / fps;
  const pShot = (frame - shotStart) / Math.max(1, shotEnde - shotStart);
  const seg = tl.segs.find((s) => frame >= s.von && frame < s.bis);
  const letzteSeg = [...tl.segs].reverse().find((s) => frame >= s.von);
  const Szene = SZENEN[teil.shot.szene];

  // Fokus der Kamera. Im Dialog (ueberSchulter) schaut die Kamera immer auf die Figur, die gerade Japanisch spricht.
  const sprichtJetzt = seg?.seg.art === 'japanisch' ? seg.seg.sprecher : undefined;
  const finde = (id?: string) => teil.shot.figuren.find((f) => f.id === id);
  let fokusId = teil.shot.kamera.fokus, gegenId = teil.shot.kamera.gegen, teilNr = teil.teil;
  if (teil.shot.kamera.preset === 'ueberSchulter' && sprichtJetzt && finde(sprichtJetzt) && (sprichtJetzt === fokusId || sprichtJetzt === gegenId)) {
    const andere = sprichtJetzt === fokusId ? gegenId : fokusId;
    fokusId = andere; gegenId = sprichtJetzt; teilNr = 0;
  }
  const fokusFig = finde(fokusId) ?? teil.shot.figuren[0];
  const fokus: [number, number, number] = fokusFig ? figurPos(fokusFig, pShot) : (teil.shot.kamera.fokus?.split(',').length === 2 ? [Number(teil.shot.kamera.fokus!.split(',')[0]), 0, Number(teil.shot.kamera.fokus!.split(',')[1])] : [0, 0, 0]);
  const gegenFig = finde(gegenId);
  const hoehe = (f?: FigurImShot) => (f?.figur === 'mensch' ? 1.75 : f?.figur === 'kraehe' ? 0.5 : 1.15);
  const fortschritt = (frame - teil.von) / Math.max(1, teil.bis - teil.von);
  const pose = (pr: number, pS: number) => {
    const fk = fokusFig ? figurPos(fokusFig, pS) : fokus;
    const k = kameraPose(teil.shot.kamera, fk, gegenFig ? figurPos(gegenFig, pS) : null, teilNr, pr, { fokus: hoehe(fokusFig), gegen: hoehe(gegenFig) });
    const g = KAMERA_GRENZEN[teil.shot.szene];
    if (g) { k.pos[2] = Math.max(g.zMin, k.pos[2]); k.pos[1] = Math.max(g.yMin, k.pos[1]); }
    return k;
  };
  const kam = pose(fortschritt, pShot);
  const pTeil = (f: number) => (f - shotStart) / Math.max(1, shotEnde - shotStart);
  const kamStart = pose(0, pTeil(teil.von)), kamEnde = pose(1, pTeil(teil.bis));
  const blickVon = (fi: FigurImShot) => {
    if (teil.shot.kamera.preset === 'ueberSchulter' && (fi.id === teil.shot.kamera.fokus || fi.id === teil.shot.kamera.gegen)) {
      const a = finde(fi.id === teil.shot.kamera.fokus ? teil.shot.kamera.gegen : teil.shot.kamera.fokus);
      if (a) { const p1 = figurPos(fi, pShot), p2 = figurPos(a, pShot); return Math.atan2(p2[0] - p1[0], p2[2] - p1[2]); }
    }
    return ((fi.blick ?? 0) * Math.PI) / 180;
  };
  const otsSwap = teil.shot.kamera.preset === 'ueberSchulter' && teilNr % 2 === 1;
  const pruefFig = teil.shot.kamera.preset === 'ueberSchulter' ? (otsSwap ? fokusFig : gegenFig ?? fokusFig) : fokusFig;
  const wackeln = teil.shot.effekt === 'wackeln' && frame - shotStart < 12 ? 0.05 * (1 - (frame - shotStart) / 12) * Math.sin(frame * 3) : 0;

  return (
    <AbsoluteFill style={{ background: STILE.tusche.himmel }}>
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(#f2b950 2.5px, transparent 3px)', backgroundSize: '22px 22px', opacity: 0.45 }} />
      {bereit && (
        <ThreeCanvas width={width} height={height} shadows="basic" gl={{ antialias: true }} onCreated={({ gl }) => { gl.toneMapping = THREE.NoToneMapping; }}>
          <StilProvider stil={STILE.tusche}>
            <hemisphereLight args={['#fff8ee', '#d8ccb8', 0.6]} />
            <directionalLight position={[fokus[0] - 4, 8, fokus[2] + 6]} intensity={2.1} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.002} shadow-normalBias={0.03}>
              <object3D attach="target" position={fokus} />
            </directionalLight>
            <directionalLight position={[5, 3, 4]} intensity={0.35} color="#dfe9ff" />
            <Szene {...(teil.shot.szeneProps ?? {})} />
            {pruefFig && <FigurPruefung aktiv={pruefen} pos={figurPos(pruefFig, pShot)} hoehe={hoehe(pruefFig)} name={pruefFig.id} art={pruefFig.figur} spricht={sprichtJetzt === pruefFig.id} blick={blickVon(pruefFig)} andere={teil.shot.figuren.filter((f) => f !== pruefFig).map((f) => ({ pos: figurPos(f, pShot), hoehe: hoehe(f), name: f.id }))} streng={!['nah', 'gross', 'ueberSchulter'].includes(kameraPreset(teil.shot.kamera, teilNr))} />}
            {teil.shot.figuren.map((fi) => {
              const pos = figurPos(fi, pShot);
              let aktion = (fi.aktion ?? 'stehen') as Aktion;
              if (sprichtJetzt && sprichtJetzt === fi.id && (aktion === 'stehen' || aktion === 'verwirrt')) aktion = 'sprechen';
              if (fi.nach && pShot >= 1) aktion = 'stehen';
              let rot = ((fi.blick ?? 0) * Math.PI) / 180;
              // Dialog: die beiden Gesprächspartner schauen sich automatisch an
              if (teil.shot.kamera.preset === 'ueberSchulter' && (fi.id === teil.shot.kamera.fokus || fi.id === teil.shot.kamera.gegen)) {
                const anderer = finde(fi.id === teil.shot.kamera.fokus ? teil.shot.kamera.gegen : teil.shot.kamera.fokus);
                if (anderer) { const ap = figurPos(anderer, pShot); rot = Math.atan2(ap[0] - pos[0], ap[2] - pos[2]); }
              }
              const a = fi.ausdruck as Ausdruck | undefined;
              return (
                <group key={fi.id} position={pos} rotation={[0, rot, 0]} userData={{ figur: fi.id }}>
                  {fi.figur === 'knoe' && <Knoedel aktion={aktion} t={tShot} ausdruck={a ?? 'froh'} mitHandy={Boolean(fi.extra?.handy)} />}
                  {fi.figur === 'mensch' && <Mensch variante={fi.variante ?? 'passant1'} aktion={aktion} t={tShot} ausdruck={a ?? 'neutral'} />}
                  {fi.figur === 'kraehe' && <Kraehe t={tShot} fliegt={aktion === 'rennen'} beute={fi.extra?.beute as string | undefined} />}
                </group>
              );
            })}
            <AutoKamera start={kamStart} ende={kamEnde} jetzt={kam} wackeln={wackeln} zielFigur={pruefFig ? { id: pruefFig.id, art: pruefFig.figur, pos: figurPos(pruefFig, pShot) } : undefined} />
          </StilProvider>
        </ThreeCanvas>
      )}
      {/* Effekt: Blitz/Platsch als kurze Aufhellung */}
      {(teil.shot.effekt === 'blitz' || teil.shot.effekt === 'platsch') && frame - shotStart < 8 && <AbsoluteFill style={{ background: teil.shot.effekt === 'platsch' ? '#bfe9ff' : '#fff', opacity: 0.7 * (1 - (frame - shotStart) / 8) }} />}

      {bereit && <>
        {episode.art === 'app'
          ? <Badge z={z} text="Werbung · meine eigene App" f={frame} />
          : frame < 3.5 * fps && <Badge z={z} text={`Staffel ${episode.staffel} · Folge ${episode.folge}`} f={frame} />}
        {episode.texte.filter((tx) => tx.art !== 'cliffhanger').map((tx, i) => {
          const von = tl.segs.find((s) => s.seg.id === tx.ab)?.von ?? 0;
          const bis = tx.bis ? tl.segs.find((s) => s.seg.id === tx.bis)?.bis ?? von : von + 2 * fps;
          if (frame < von || frame >= bis || seg?.seg.art === 'japanisch' || seg?.seg.art === 'quiz') return null;
          return <Hook key={i} z={z} text={tx.text} unter={tx.unter} f={frame - von} />;
        })}
        {seg?.seg.art === 'japanisch' && (() => {
          const l = seg.seg.curriculum ? lehrplan[seg.seg.curriculum] : undefined;
          return <Satzkarte z={z} ja={l?.ja ?? seg.seg.text ?? ''} kana={l?.kana ?? seg.seg.kana ?? ''} romaji={l?.romaji ?? seg.seg.romaji ?? ''} de={l?.de ?? seg.seg.de ?? ''}
            phrasen={seg.t?.phrasen} t={(frame - seg.von) / fps - (seg.t?.wiederholungAb && (frame - seg.von) / fps >= seg.t.wiederholungAb ? seg.t.wiederholungAb : 0)} f={frame - seg.von} gross={seg.seg.karte !== 'klein'} sprecher={ROLLENNAME[seg.seg.sprecher ?? ''] || undefined} />;
        })()}
        {seg?.seg.art === 'quiz' && <Quiz z={z} frage={seg.seg.frage ?? vorlage.schnitt.quizFrage} t={(frame - seg.von) / fps} dauer={(seg.bis - seg.von) / fps} f={frame - seg.von} />}
        {letzteSeg?.seg.art === 'erzaehler' && frame < letzteSeg.bis + 6 && frame < tl.teaserVon && (
          <Untertitel z={z} woerter={letzteSeg.t?.woerter ?? []} text={letzteSeg.seg.text ?? ''} t={(frame - letzteSeg.von) / fps} y={vorlage.text.untertitel.yOben} />
        )}
        {frame >= tl.teaserVon && (episode.art === 'app'
          ? <Endkarte z={z} text="Link in meiner Bio" unter={episode.naechste} f={frame - tl.teaserVon} />
          : <Endkarte z={z} text="Fortsetzung folgt …" unter={episode.naechste} zaehler={zaehler} f={frame - tl.teaserVon} />)}
        {modus === 'vorschau' && <div style={{ position: 'absolute', top: 40, right: 40, background: 'rgba(230,57,70,.9)', color: '#fff', font: '900 28px "Noto Sans JP"', padding: '4px 14px', borderRadius: 8 }}>VORSCHAU</div>}
      </>}

      {/* Ton */}
      {tl.segs.filter((s) => s.t?.datei).map((s) => (
        <Sequence key={s.seg.id} from={s.audioVon} durationInFrames={s.bis - s.von + 15} layout="none"><Audio src={staticFile(s.t!.datei!)} /></Sequence>
      ))}
      {timing.sfx?.tick && tl.segs.filter((s) => s.seg.art === 'quiz').flatMap((s) => [0, 1, 2].map((k) => (
        <Sequence key={s.seg.id + k} from={s.von + k * fps} durationInFrames={fps} layout="none"><Audio src={staticFile(timing.sfx!.tick)} volume={0.5} /></Sequence>
      )))}
      {timing.sfx?.pling && tl.segs.filter((s) => s.seg.art === 'japanisch' && s.seg.karte !== 'klein' && s.seg.wiederholen).map((s) => (
        <Sequence key={'p' + s.seg.id} from={Math.max(0, s.von - 8)} durationInFrames={fps} layout="none"><Audio src={staticFile(timing.sfx!.pling)} volume={0.35} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

export function folgenDauer(p: FolgeProps) { return zeitleiste(p.episode, p.timing, p.vorlage).gesamt; }
