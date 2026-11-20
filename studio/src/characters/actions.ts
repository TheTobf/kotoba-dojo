/**
 * Feste Bewegungen der Figuren. Aus Abschnitt, Platz und Zeit entsteht pro Bild: Ort, Blickrichtung und Pose.
 * Alles ist reine Rechnung mit der Zeit – so sieht jedes Bild beim Rendern exakt gleich aus.
 */
import type { TActor, TBeat } from '../episode/timeline'
import type { SceneMeta, V3 } from '../scenes/registry'
import type { Pose } from './types'

export interface ActorPlacement { pos: V3; yaw: number; pose: Pose; walking: boolean }

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
export const ease = (x: number) => { const v = clamp01(x); return v * v * (3 - 2 * v) }
/** springt kurz über 1 hinaus und setzt sich (für „Aufploppen“) */
export const pop = (x: number) => { const v = clamp01(x); return v < 1 ? 1 - Math.pow(1 - v, 3) * Math.cos(v * 9) * 0.9 - 0.1 * (1 - v) : 1 }
const yawTo = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2])
const WALK_SPEED = 1.15

export function walkDuration(from: V3, to: V3): number {
  return Math.hypot(to[0] - from[0], to[2] - from[2]) / WALK_SPEED
}

/** Mund-Öffnung aus den Mora-Zeiten (VOICEVOX) – Vokale öffnen, ン/ッ schließen fast. */
export function mouthAt(actor: TActor, t: number): number {
  for (const w of actor.talk) {
    if (t < w.start || t > w.end) continue
    const m = w.moras.find((x) => t >= x.start && t < x.end)
    if (!m) return 0.12
    const f = (t - m.start) / Math.max(0.01, m.end - m.start)
    const closed = /^[ンッ]$/.test(m.kana)
    return closed ? 0.12 : 0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, f * 1.15))
  }
  return 0
}

export function placeActor(actor: TActor, beat: TBeat, scene: SceneMeta, t: number, others: { who: string; pos: V3 }[], cameraPos?: V3): ActorPlacement {
  const spot = scene.spots[actor.at]
  const startPos: V3 = spot ? spot.pos : [0, 0, 0]
  const lt = Math.max(0, t - actor.since)
  let pos = startPos
  let walking = false
  let yaw = spot?.yaw ?? 0

  if (actor.action === 'gehen' && actor.to && scene.spots[actor.to]) {
    const target = scene.spots[actor.to].pos
    const dur = walkDuration(startPos, target)
    const begin = 0.15
    const f = (lt - begin) / dur
    const k = ease(f)
    pos = [startPos[0] + (target[0] - startPos[0]) * k, 0, startPos[2] + (target[2] - startPos[2]) * k]
    walking = f > 0 && f < 1
    yaw = f < 1 ? yawTo(startPos, target) : scene.spots[actor.to].yaw ?? yawTo(startPos, target)
  }
  if (!walking && actor.face) {
    const other = others.find((o) => o.who === actor.face)?.pos ?? scene.spots[actor.face]?.pos
    if (actor.face === 'kamera' && cameraPos) yaw = yawTo(pos, cameraPos)
    else if (other) yaw = yawTo(pos, other)
  }

  const pose = poseFor(actor, lt, t, walking)
  pose.mouth = mouthAt(actor, t)
  if (pose.mouth > 0 && pose.mood === 'shocked') pose.mood = 'neutral'
  return { pos, yaw, pose, walking }
}

/** Die eigentlichen Bewegungen. lt = Sekunden seit Beginn der Bewegung, t = Gesamtzeit (Atmen, Blinzeln). */
export function poseFor(actor: TActor, lt: number, t: number, walking: boolean): Pose {
  const idle: Pose = { t, sway: Math.sin(t * 1.3) * 0.02, tilt: Math.sin(t * 0.9) * 0.03 }
  if (walking) {
    const ph = lt * 8.5
    return { t, sway: Math.sin(ph) * 0.13, bounce: Math.abs(Math.sin(ph)) * 0.05, armLeft: 0.15 + Math.max(0, Math.sin(ph)) * 0.2, armRight: 0.15 + Math.max(0, -Math.sin(ph)) * 0.2, lean: 0.06 }
  }
  switch (actor.action) {
    case 'idle':
    case 'gehen':
      return { ...idle, armRight: actor.prop ? 0.1 : 0, armRightFwd: actor.prop ? 0.55 : 0 }
    case 'zeigen': {
      const k = ease(lt / 0.35)
      return { ...idle, armRightFwd: 0.95 * k, armRight: 0.2 * k, lean: 0.04 * k, headPitch: -0.05 * k, mood: 'happy' }
    }
    case 'verwirrt': {
      const k = ease(lt / 0.4)
      return { ...idle, tilt: 0.3 * k + Math.sin(t * 1.6) * 0.03, mood: 'confused', question: pop((lt - 0.15) / 0.45), armRight: 0.45 * k, armRightFwd: 0.3 * k }
    }
    case 'freuen': {
      const jumps = lt < 1.6 ? Math.max(0, Math.sin(lt * 7.5)) : Math.max(0, Math.sin(lt * 7.5)) * 0.25
      const land = lt < 1.6 && Math.sin(lt * 7.5) < -0.6 ? 0.9 : 1
      return { t, bounce: jumps * 0.32, squash: land, armLeft: 1.45, armRight: 1.45, mood: 'happy', sparkle: ease(lt / 0.3), sway: Math.sin(lt * 7.5) * 0.06 }
    }
    case 'erschrocken': {
      const jolt = lt < 0.3 ? Math.sin((lt / 0.3) * Math.PI) : 0
      return { t, bounce: jolt * 0.18, squash: 1 + jolt * 0.12, armLeft: 0.9 * ease(lt / 0.15), armRight: 0.9 * ease(lt / 0.15), mood: 'shocked', lean: -0.08 * ease(lt / 0.2) }
    }
    case 'erstarrt':
      // eingefroren: kein Atmen, kein Blinzeln, nur ein leichtes Zittern und ein Schweißtropfen
      return { t: actor.since + 0.6, sway: Math.sin(t * 38) * 0.006, mood: 'shocked', sweat: ease((lt - 0.3) / 0.4), armLeft: 0.12, armRight: 0.12 }
    case 'traurig': {
      const k = ease(lt / 0.6)
      return { ...idle, lean: 0.1 * k, headPitch: 0.28 * k, mood: 'sad', sway: 0 }
    }
    case 'nicken':
      return { ...idle, headPitch: lt < 1.4 ? Math.sin(lt * 7) * 0.2 * (1 - lt / 1.4) : 0, mood: 'happy' }
    case 'winken':
      return { ...idle, armRight: 1.35 + Math.sin(lt * 9) * 0.22, mood: 'happy' }
    case 'geben': {
      const k = ease(lt / 0.5)
      return { ...idle, armRightFwd: 0.95 * k, armRight: 0.05, lean: 0.1 * k, mood: 'neutral' }
    }
    case 'suchen':
      return { ...idle, headYaw: Math.sin(lt * 2.1) * 0.65, tilt: Math.sin(lt * 1.3) * 0.08 }
    case 'verbeugen': {
      const k = lt < 0.5 ? ease(lt / 0.5) : 1 - ease((lt - 1.1) / 0.5)
      return { ...idle, lean: 0.42 * k, headPitch: 0.1 * k }
    }
    case 'schlafen': {
      const k = ease(lt / 1.2)
      return { t, headPitch: 0.3 * k + Math.sin(t * 1.1) * 0.03, tilt: 0.18 * k, mood: k > 0.5 ? 'sleep' : 'neutral', squash: 1 + Math.sin(t * 1.1) * 0.015, lean: 0.06 * k }
    }
    case 'warten':
      return { ...idle, bounce: Math.max(0, Math.sin(lt * 9)) * 0.025, headYaw: Math.sin(lt * 0.8) * 0.25 }
  }
}
