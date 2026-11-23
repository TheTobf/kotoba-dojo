// Menschen im Serien-Stil: schlichte, freundliche Figuren (keine Karikaturen). Varianten über Kleidung/Haare/Extras.
import React from 'react';
import { Kasten, Kugel, Zylinder } from '../lib/stil';
import { Aktion, pose } from './animation';
import { Ausdruck, Gesicht } from './teile';

export type MenschVariante = {
  kleidung: string; hose?: string; haut?: string; haare?: string;
  frisur?: 'kurz' | 'zopf' | 'dutt' | 'glatze' | 'bob';
  extra?: ('dienstmuetze' | 'schuerze' | 'brille' | 'hut' | 'krawatte' | 'namensschild')[];
  groesse?: number;
};

export const VARIANTEN: Record<string, MenschVariante> = {
  haru: { kleidung: '#f4d35e', hose: '#3b4a6b', haare: '#2b1d16', frisur: 'zopf', extra: ['schuerze', 'namensschild'], groesse: 0.95 },
  kassierer: { kleidung: '#7cc4e8', hose: '#3b3b46', haare: '#1f1a17', frisur: 'kurz', extra: ['schuerze', 'namensschild'] },
  beamtin: { kleidung: '#2f4f7a', hose: '#2f3a4f', haare: '#1f1a17', frisur: 'dutt', extra: ['dienstmuetze', 'namensschild'], groesse: 0.95 },
  bahnpersonal: { kleidung: '#2a5d4f', hose: '#24302c', haare: '#1f1a17', frisur: 'kurz', extra: ['dienstmuetze'] },
  rezeption: { kleidung: '#ffffff', hose: '#2e2e36', haare: '#2b1d16', frisur: 'bob', extra: ['krawatte', 'namensschild'], groesse: 0.95 },
  hutmann: { kleidung: '#8a6f5a', hose: '#4a4038', haare: '#d8d4cc', frisur: 'kurz', extra: ['hut', 'brille'], groesse: 0.97 },
  passant1: { kleidung: '#e07a5f', hose: '#34414f', haare: '#2b1d16', frisur: 'kurz' },
  passant2: { kleidung: '#9b8ec4', hose: '#2f2f3a', haare: '#3b2a20', frisur: 'bob', groesse: 0.94 },
  mori: { kleidung: '#c96b6b', hose: '#5a4a44', haare: '#cfcac2', frisur: 'dutt', extra: ['brille'], groesse: 0.9 },
  ken: { kleidung: '#f5f1e8', hose: '#2b2b2b', haare: '#1b1b1b', frisur: 'glatze', extra: ['schuerze'] },
};

export const Mensch: React.FC<{ variante: string | MenschVariante; aktion?: Aktion; t?: number; ausdruck?: Ausdruck }> = ({ variante, aktion = 'stehen', t = 0, ausdruck = 'neutral' }) => {
  const v = typeof variante === 'string' ? VARIANTEN[variante] ?? VARIANTEN.passant1 : variante;
  const p = pose(aktion, t);
  const haut = v.haut ?? '#f3d9bd', haare = v.haare ?? '#1f1a17', ex = v.extra ?? [];
  const g = v.groesse ?? 1;
  return (
    <group scale={g} position={[0, p.y, 0]}>
      {/* Beine */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.12, 0, (s < 0 ? p.fussL : p.fussR) * 1.5]}>
          <Zylinder r={0.075} h={0.72} pos={[0, 0.38, 0]} farbe={v.hose ?? '#333'} />
          <Kasten gr={[0.15, 0.08, 0.26]} pos={[0, 0.04, 0.04]} farbe="#2a2420" rund={0.03} />
        </group>
      ))}
      <group position={[0, 0.72, 0]} rotation={[p.vor, 0, p.neigung * 0.5]}>
        {/* Rumpf */}
        <Kasten gr={[0.48, 0.62, 0.3]} pos={[0, 0.32, 0]} farbe={v.kleidung} rund={0.12} />
        {ex.includes('schuerze') && <Kasten gr={[0.4, 0.5, 0.02]} pos={[0, 0.26, 0.16]} farbe="#f6efe2" rund={0.01} kontur={false} />}
        {ex.includes('krawatte') && <Kasten gr={[0.06, 0.26, 0.02]} pos={[0, 0.45, 0.16]} farbe="#e63946" rund={0.01} kontur={false} />}
        {ex.includes('namensschild') && <Kasten gr={[0.12, 0.06, 0.02]} pos={[0.12, 0.48, 0.17]} farbe="#ffffff" rund={0.005} kontur={false} />}
        {/* Arme */}
        <group position={[-0.29, 0.58, 0]} rotation={[0, 0, -p.armL * 0.8]}><Zylinder r={0.06} h={0.55} pos={[0, -0.26, 0]} farbe={v.kleidung} /><Kugel r={0.065} pos={[0, -0.56, 0]} farbe={haut} /></group>
        <group position={[0.29, 0.58, 0]} rotation={[-p.armVorR, 0, p.armR * 0.8]}><Zylinder r={0.06} h={0.55} pos={[0, -0.26, 0]} farbe={v.kleidung} /><Kugel r={0.065} pos={[0, -0.56, 0]} farbe={haut} /></group>
        {/* Kopf */}
        <group position={[0, 0.86, 0]} rotation={[0, 0, p.neigung]}>
          <Zylinder r={0.07} h={0.12} pos={[0, -0.18, 0]} farbe={haut} kontur={false} />
          <Kugel r={0.21} skala={[1, 1.08, 1]} farbe={haut} />
          <Gesicht pos={[0, 0.0, 0.19]} abstand={0.075} gr={0.62} ausdruck={ausdruck} mundAuf={p.mund} wangen="#f0b5a4" />
          {v.frisur !== 'glatze' && <Kugel r={0.22} pos={[0, 0.06, -0.025]} skala={[1.02, v.frisur === 'bob' ? 1.05 : 0.95, 1]} farbe={haare} />}
          {v.frisur === 'glatze' && <Kasten gr={[0.44, 0.08, 0.44]} pos={[0, 0.15, 0]} farbe="#ffffff" rund={0.03} />}
          {v.frisur === 'zopf' && <Kugel r={0.09} pos={[0, 0.05, -0.24]} skala={[1, 1.6, 1]} farbe={haare} />}
          {v.frisur === 'dutt' && <Kugel r={0.1} pos={[0, 0.2, -0.14]} farbe={haare} />}
          {ex.includes('brille') && [-1, 1].map((s) => <mesh key={s} position={[s * 0.075, 0.0, 0.205]}><torusGeometry args={[0.045, 0.008, 8, 24]} /><meshBasicMaterial color="#1b1b1b" /></mesh>)}
          {ex.includes('dienstmuetze') && <><Zylinder r={0.2} h={0.1} pos={[0, 0.2, 0]} farbe={v.kleidung} /><Kasten gr={[0.3, 0.02, 0.14]} pos={[0, 0.15, 0.18]} farbe="#1b1b1b" rund={0.005} kontur={false} /></>}
          {ex.includes('hut') && <><Zylinder r={0.32} h={0.025} pos={[0, 0.15, 0]} farbe="#4a3b30" /><Zylinder r={0.18} r2={0.16} h={0.18} pos={[0, 0.25, 0]} farbe="#4a3b30" /><Zylinder r={0.185} h={0.04} pos={[0, 0.18, 0]} farbe="#e63946" kontur={false} /></>}
        </group>
      </group>
    </group>
  );
};
