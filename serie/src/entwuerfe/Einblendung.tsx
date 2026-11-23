// Text-Einblendung des Satzes je Stil (liegt in der TikTok-Sicherheitszone: oben, nicht rechts, nicht unten).
import React from 'react';
import { StilName } from '../lib/stil';

export const SICHER = { oben: 150, links: 60, rechts: 180, unten: 480 }; // px bei 1080×1920

export const Einblendung: React.FC<{ stil: StilName; ja: string; kana: string; romaji: string; de: string; marke: string }> = ({ stil, ja, kana, romaji, de, marke }) => {
  const box: React.CSSProperties = { position: 'absolute', top: SICHER.oben + 40, left: SICHER.links, width: 1080 - SICHER.links - SICHER.rechts, display: 'flex', flexDirection: 'column', gap: 14 };
  if (stil === 'papier')
    return (
      <div style={box}>
        <div style={{ alignSelf: 'flex-start', background: '#3d7068', color: '#fbf6ec', font: '900 34px "Noto Sans JP"', padding: '8px 22px', transform: 'rotate(-2deg)' }}>{marke}</div>
        <div style={{ background: '#fbf6ec', padding: '28px 36px 30px', boxShadow: '0 10px 0 rgba(74,63,53,.18)', clipPath: 'polygon(0 4%,4% 0,30% 3%,60% 0,96% 2%,100% 8%,99% 60%,100% 96%,70% 100%,35% 97%,3% 100%,0 70%)', transform: 'rotate(-1deg)' }}>
          <div style={{ font: '900 128px/1.1 "Noto Sans JP"', color: '#4a3f35' }}>{ja}</div>
          <div style={{ font: '400 40px "Noto Sans JP"', color: '#7a6a58', marginTop: 8 }}>{kana} · {romaji}</div>
          <div style={{ font: '900 46px "Noto Sans JP"', color: '#c8553d', marginTop: 6 }}>{de}</div>
        </div>
      </div>
    );
  if (stil === 'knete')
    return (
      <div style={{ ...box, alignItems: 'flex-start' }}>
        <div style={{ background: '#ff6f61', color: '#fff', font: '800 36px "M PLUS Rounded 1c"', padding: '8px 26px', borderRadius: 40 }}>{marke}</div>
        <div style={{ font: '800 140px/1.1 "M PLUS Rounded 1c"', color: '#fff', WebkitTextStroke: '18px #3d3550', paintOrder: 'stroke fill', textShadow: '0 10px 0 #3d3550' }}>{ja}</div>
        <div style={{ background: 'rgba(255,255,255,.88)', borderRadius: 30, padding: '14px 28px' }}>
          <div style={{ font: '800 40px "M PLUS Rounded 1c"', color: '#43b0a8' }}>{kana} · {romaji}</div>
          <div style={{ font: '800 46px "M PLUS Rounded 1c"', color: '#3d3550' }}>{de}</div>
        </div>
      </div>
    );
  return (
    <div style={box}>
      <div style={{ alignSelf: 'flex-start', background: '#1b1b1b', color: '#f4d35e', font: '900 34px "Noto Sans JP"', padding: '6px 20px', transform: 'skewX(-8deg)' }}>{marke}</div>
      <div style={{ position: 'relative', background: '#fff', border: '8px solid #1b1b1b', borderRadius: 48, padding: '26px 36px 30px', boxShadow: '14px 14px 0 #1b1b1b' }}>
        <div style={{ font: '900 112px/1.1 "Noto Sans JP"', color: '#1b1b1b', whiteSpace: 'nowrap' }}>{ja}</div>
        <div style={{ font: '400 40px "Noto Sans JP"', color: '#555', marginTop: 6 }}>{kana} · {romaji}</div>
        <div style={{ font: '900 46px "Noto Sans JP"', color: '#e63946', marginTop: 4 }}><span style={{ background: '#f4d35e', padding: '0 10px' }}>{de}</span></div>
        <div style={{ position: 'absolute', bottom: -60, left: 120, width: 0, height: 0, borderLeft: '30px solid transparent', borderRight: '30px solid transparent', borderTop: '60px solid #1b1b1b' }} />
      </div>
    </div>
  );
};
