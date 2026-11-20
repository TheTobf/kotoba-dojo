/** Gemeinsame Bewegungs-Parameter für alle Figuren (werden von Animationen pro Bild berechnet). */
export interface Pose {
  /** Zeit in Sekunden (für Atmen, Blinzeln). */
  t: number
  /** Kopf neigen (Bogenmaß, + = nach rechts). */
  tilt?: number
  /** Hüpfen/Gehen: senkrechter Versatz. */
  bounce?: number
  /** Arm/Flosse/Flügel heben: 0 = unten, 1 = ganz oben (z. B. zum Zeigen oder Winken). */
  armLeft?: number
  armRight?: number
  /** Gesichtsausdruck. */
  mood?: 'neutral' | 'happy' | 'confused' | 'shocked'
}

/** Augen schließen kurz alle paar Sekunden. */
export function blink(t: number): number {
  const phase = (t + 0.37) % 3.4
  return phase < 0.12 ? 0.1 : 1
}
