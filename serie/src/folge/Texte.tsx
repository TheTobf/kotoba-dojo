// Text-Ebenen der Folge. Alles liegt innerhalb der Sicherheitszone (oben/links/rechts/unten aus der Stilvorlage).
import React from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';
import { WortZeit } from './typen';

export type Zone = { oben: number; links: number; rechts: number; unten: number };
const TINTE = '#1b1b1b', ROT = '#e63946', GELB = '#f4d35e';
const breite = (z: Zone) => 1080 - z.links - z.rechts;
// Einblenden mit Feder, aber ohne Überschwingen über 1 (sonst ragt Text kurz aus der Sicherheitszone)
const ein = (f: number, fps: number) => Math.min(1, spring({ frame: f, fps, config: { damping: 14, stiffness: 180 } }));

export const Badge: React.FC<{ z: Zone; text: string; f: number }> = ({ z, text, f }) => {
  const { fps } = useVideoConfig();
  return <div data-zone="badge" style={{ position: 'absolute', top: z.oben, left: z.links + 8, background: TINTE, color: GELB, font: '900 34px "Noto Sans JP"', padding: '6px 20px', transform: `skewX(-8deg) translateY(${(1 - ein(f, fps)) * -40}px)` }}>{text}</div>;
};

export const Hook: React.FC<{ z: Zone; text: string; unter?: string; f: number }> = ({ z, text, unter, f }) => {
  const { fps } = useVideoConfig();
  const s = ein(f, fps);
  return (
    <div data-zone="hook" style={{ position: 'absolute', top: z.oben + 80, left: z.links, width: breite(z) - 40, transform: `scale(${0.6 + 0.4 * s}) rotate(-2deg)`, transformOrigin: 'left top', opacity: Math.min(1, s * 2) }}>
      <div style={{ display: 'inline', font: '900 104px/1.12 "Noto Sans JP"', color: TINTE, background: GELB, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', padding: '0 16px', boxShadow: `10px 10px 0 ${TINTE}` }}>{text}</div>
      {unter && <div style={{ marginTop: 34, font: '900 52px "Noto Sans JP"', color: '#fff', WebkitTextStroke: `12px ${TINTE}`, paintOrder: 'stroke fill' }}>{unter}</div>}
    </div>
  );
};

/** Japanischer Satz groß; Kana/Romaji und Deutsch klein. Phrasen erscheinen wortgenau zum Ton. */
export const Satzkarte: React.FC<{ z: Zone; ja: string; kana: string; romaji: string; de: string; phrasen?: WortZeit[]; t: number; f: number; gross: boolean; sprecher?: string }> = ({ z, ja, kana, romaji, de, phrasen, t, f, gross, sprecher }) => {
  const { fps } = useVideoConfig();
  const s = ein(f, fps);
  const teile = phrasen?.length ? phrasen : [{ w: ja, start: 0, ende: 1 }];
  const gr = Math.min(gross ? 112 : 84, Math.floor((breite(z) - 90) / Math.max(1, [...ja].length)));
  const aktiv = teile.findIndex((p) => t >= p.start && t < p.ende);
  return (
    <div data-zone="satzkarte" style={{ position: 'absolute', top: z.oben + 60, left: z.links, width: breite(z), transform: `translateY(${(1 - s) * -60}px)`, opacity: Math.min(1, s * 1.5) }}>
      <div style={{ position: 'relative', background: '#fff', border: `8px solid ${TINTE}`, borderRadius: 44, padding: '22px 32px 26px', boxShadow: `14px 14px 0 ${TINTE}` }}>
        {sprecher && <div style={{ position: 'absolute', top: -34, right: 30, background: ROT, color: '#fff', font: '900 30px "Noto Sans JP"', padding: '4px 16px', borderRadius: 10 }}>{sprecher}</div>}
        <div style={{ font: `900 ${gr}px/1.15 "Noto Sans JP"`, color: TINTE, whiteSpace: 'nowrap' }}>
          {teile.map((p, i) => <span key={i} style={{ opacity: t >= p.start - 0.05 ? 1 : 0.13, color: i === aktiv ? ROT : TINTE }}>{p.w}</span>)}
        </div>
        <div style={{ font: '400 38px/1.3 "Noto Sans JP"', color: '#555', marginTop: 6 }}>{kana}</div>
        <div style={{ font: '400 38px/1.3 "Noto Sans JP"', color: '#555' }}>{romaji}</div>
        <div style={{ font: '900 46px/1.3 "Noto Sans JP"', color: ROT, marginTop: 6 }}><span style={{ background: GELB, padding: '0 10px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{de}</span></div>
        <div style={{ position: 'absolute', bottom: -58, left: 110, width: 0, height: 0, borderLeft: '28px solid transparent', borderRight: '28px solid transparent', borderTop: `56px solid ${TINTE}` }} />
      </div>
    </div>
  );
};

/** Deutsche Untertitel zur Erzählung, Wort für Wort hervorgehoben. */
export const Untertitel: React.FC<{ z: Zone; woerter: WortZeit[]; text: string; t: number; y: number }> = ({ z, woerter, text, t }) => {
  const ws: WortZeit[] = woerter.length ? woerter : text.replace(/\[\[[^|\]]+\|([^|\]]+)(\|[^\]]+)?\]\]/g, '$1').replace(/\([^)]*\)/g, '').split(/\s+/).filter(Boolean).map((w) => ({ w, start: 0, ende: 0 }));
  const zeichen = ws.reduce((a, w) => a + w.w.length + 1, 0);
  const gr = zeichen > 70 ? 46 : zeichen > 52 ? 50 : 56; // lange Sätze kleiner, damit sie in 2 Zeilen passen
  return (
    <div data-zone="untertitel" style={{ position: 'absolute', bottom: z.unten + 20, left: z.links, width: breite(z), textAlign: 'left', font: `900 ${gr}px/1.25 "Noto Sans JP"` }}>
      {ws.map((w, i) => (
        <span key={i} style={{ color: w.jp ? (t >= w.start - 0.02 ? GELB : 'rgba(244,211,94,.6)') : t >= w.start - 0.02 ? '#fff' : 'rgba(255,255,255,.55)', fontStyle: w.jp ? 'italic' : 'normal', WebkitTextStroke: `9px ${TINTE}`, paintOrder: 'stroke fill', marginRight: 14, display: 'inline-block', transform: t >= w.start && t < w.ende ? 'translateY(-4px) scale(1.04)' : 'none' }}>{w.w}</span>
      ))}
    </div>
  );
};

export const Quiz: React.FC<{ z: Zone; frage: string; t: number; dauer: number; f: number }> = ({ z, frage, t, dauer, f }) => {
  const { fps } = useVideoConfig();
  const rest = Math.max(1, Math.ceil(dauer - t));
  const anteil = (t % 1);
  const s = ein(f, fps);
  return (
    <div data-zone="quiz" style={{ position: 'absolute', top: z.oben + 60, left: z.links, width: breite(z), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 30, transform: `scale(${0.7 + 0.3 * s})`, transformOrigin: 'left top' }}>
      <div style={{ background: ROT, color: '#fff', font: '900 84px/1.15 "Noto Sans JP"', padding: '10px 28px', border: `8px solid ${TINTE}`, boxShadow: `12px 12px 0 ${TINTE}`, transform: 'rotate(-2deg)' }}>{frage}</div>
      <div style={{ position: 'relative', width: 260, height: 260, marginLeft: 20 }}>
        <svg width="260" height="260" viewBox="0 0 260 260"><circle cx="130" cy="130" r="112" fill="#fff" stroke={TINTE} strokeWidth="14" /><circle cx="130" cy="130" r="112" fill="none" stroke={GELB} strokeWidth="20" strokeDasharray={`${704 * (1 - anteil)} 704`} transform="rotate(-90 130 130)" /></svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', font: '900 150px "Noto Sans JP"', color: TINTE, transform: `scale(${interpolate(anteil, [0, 0.15, 1], [1.3, 1, 1])})` }}>{rest}</div>
      </div>
    </div>
  );
};

export const Endkarte: React.FC<{ z: Zone; text: string; unter?: string; zaehler?: string; f: number }> = ({ z, text, unter, zaehler, f }) => {
  const { fps } = useVideoConfig();
  const s = ein(f, fps);
  return (
    <div data-zone="endkarte" style={{ position: 'absolute', top: z.oben + 80, left: z.links, width: breite(z) - 10, display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'flex-start', transform: `translateX(${(1 - s) * -200}px)` }}>
      <div style={{ font: '900 72px/1.1 "Noto Sans JP"', color: '#fff', WebkitTextStroke: `14px ${TINTE}`, paintOrder: 'stroke fill' }}>{text}</div>
      {unter && <div style={{ background: GELB, color: TINTE, font: '900 52px/1.25 "Noto Sans JP"', padding: '8px 22px', border: `6px solid ${TINTE}` }}>{unter}</div>}
      {zaehler && <div style={{ background: TINTE, color: '#fff', font: '900 40px "Noto Sans JP"', padding: '8px 20px' }}>{zaehler}</div>}
    </div>
  );
};
