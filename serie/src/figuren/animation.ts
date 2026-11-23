// Feste Animationen für alle Figuren. t = Sekunden seit Beginn der Einstellung.
export type Aktion = 'stehen' | 'gehen' | 'zeigen' | 'verwirrt' | 'freuen' | 'winken' | 'sprechen' | 'erschrecken' | 'traurig' | 'verbeugen' | 'rennen';

export type Pose = {
  y: number;          // Hüpfen
  quetsch: number;    // 1 = normal, <1 platt, >1 gestreckt
  neigung: number;    // Kopf/Körper zur Seite (rad)
  vor: number;        // nach vorn beugen (rad)
  armL: number;       // Arm links (rad, 0 = hängend, ~2.4 = hoch)
  armR: number;
  armVorR: number;    // Arm rechts nach vorn (zeigen)
  fussL: number;      // Fuß vor/zurück
  fussR: number;
  mund: number;       // 0..1 geöffnet (sprechen)
};

const sin = Math.sin;
export function pose(a: Aktion, t: number): Pose {
  const p: Pose = { y: 0, quetsch: 1 + sin(t * 2.2) * 0.015, neigung: 0, vor: 0, armL: 0.45, armR: 0.45, armVorR: 0, fussL: 0, fussR: 0, mund: 0 };
  switch (a) {
    case 'gehen': case 'rennen': {
      const f = a === 'rennen' ? 14 : 9;
      p.y = Math.abs(sin(t * f)) * (a === 'rennen' ? 0.09 : 0.05);
      p.fussL = sin(t * f) * 0.12; p.fussR = -p.fussL;
      p.armL = 0.45 + sin(t * f) * 0.35; p.armR = 0.45 - sin(t * f) * 0.35;
      p.neigung = sin(t * f) * 0.05; p.vor = a === 'rennen' ? 0.2 : 0.06; break;
    }
    case 'zeigen': p.armVorR = Math.min(1, t * 4) * 1.4; p.vor = 0.05; break;
    case 'verwirrt': p.neigung = 0.22 + sin(t * 1.5) * 0.04; p.armL = 1.0; p.armR = 0.3; break;
    case 'freuen': { const h = Math.abs(sin(t * 7)); p.y = h * 0.22; p.quetsch = 1 + (h - 0.5) * 0.12; p.armL = 2.4; p.armR = 2.4; break; }
    case 'winken': p.armR = 2.3 + sin(t * 8) * 0.28; break;
    case 'sprechen': p.mund = Math.abs(sin(t * 11)) * 0.9; p.y = Math.abs(sin(t * 5.5)) * 0.01; p.armR = 0.55 + sin(t * 3) * 0.15; break;
    case 'erschrecken': { const k = Math.min(1, t * 6); p.y = sin(Math.min(Math.PI, t * 9)) * 0.25; p.quetsch = 1 + 0.1 * k; p.armL = 2.6 * k; p.armR = 2.6 * k; break; }
    case 'traurig': p.vor = 0.25; p.quetsch = 0.96; p.armL = 0.15; p.armR = 0.15; break;
    case 'verbeugen': { const k = Math.min(1, t * 2.5) * (t > 1.4 ? Math.max(0, 1 - (t - 1.4) * 2.5) : 1); p.vor = 0.45 * k; break; }
  }
  return p;
}
