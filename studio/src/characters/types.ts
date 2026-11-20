/** Gemeinsame Bewegungs-Parameter für alle Figuren (werden von den Animationen pro Bild berechnet). */
export interface Pose {
  /** Zeit in Sekunden (für Atmen, Blinzeln). */
  t: number
  /** Kopf seitlich neigen (Bogenmaß, + = nach rechts). */
  tilt?: number
  /** Kopf drehen (links/rechts) und nicken (hoch/runter). */
  headYaw?: number
  headPitch?: number
  /** senkrechter Versatz (Hüpfen, Gehen) */
  bounce?: number
  /** Körper seitlich wiegen (Watscheln) und nach vorn beugen */
  sway?: number
  lean?: number
  /** Stauchen (< 1) oder Strecken (> 1) – für Sprünge und Schreck */
  squash?: number
  /** Arm/Flosse seitlich heben: 0 = unten, 1 = waagerecht nach außen, 1.6 = hoch */
  armLeft?: number
  armRight?: number
  /** Arm/Flosse nach vorn: 0 = unten, 1 = waagerecht nach vorn */
  armLeftFwd?: number
  armRightFwd?: number
  /** Mund offen beim Sprechen (0–1) */
  mouth?: number
  /** Gesichtsausdruck */
  mood?: 'neutral' | 'happy' | 'confused' | 'shocked' | 'sad' | 'sleep'
  /** Zusätze über dem Kopf */
  question?: number
  sweat?: number
  sparkle?: number
}

/** Augen schließen kurz alle paar Sekunden (versetzt je Figur über `seed`). */
export function blink(t: number, seed = 0): number {
  const phase = (t + 0.37 + seed * 1.13) % 3.4
  return phase < 0.12 ? 0.1 : 1
}
