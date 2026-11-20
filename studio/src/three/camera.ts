/**
 * Kamera pro Bild: feste Einstellungen der Szene oder Einstellungen, die sich nach den Figuren richten
 * ("nah:ole", "schulter:ole:beamter" …), dazu immer eine leichte Bewegung (push, orbit, rise …).
 * Reine Rechnung – wird im Video und in der Selbstkontrolle (Projektion der Figuren) gleich benutzt.
 */
import * as THREE from 'three'
import { FIGURES } from '../characters/figures'
import type { Move } from '../episode/schema'
import { framed, type SceneMeta, type V3 } from '../scenes/registry'

export interface CamPose { pos: V3; target: V3; fov: number }
export interface PlacedFigure { who: string; figure: string; pos: V3; yaw: number; seated?: boolean }

export function headOf(f: PlacedFigure): V3 {
  const meta = FIGURES[f.figure] ?? FIGURES.ole
  const eye = meta.eyeHeight - (f.seated ? 0.15 : 0)
  return [f.pos[0], eye, f.pos[2]]
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }

export function baseCamera(preset: string, scene: SceneMeta, figures: PlacedFigure[]): CamPose {
  const fixed = scene.cameras[preset]
  if (fixed) return { pos: fixed.pos, target: fixed.target, fov: fixed.fov ?? 36 }
  const [kind, a, b] = preset.split(':')
  const fa = figures.find((f) => f.who === a)
  const fb = figures.find((f) => f.who === b)
  const fallback = scene.cameras[scene.defaultCameras[0]]
  if (!fa) return { pos: fallback.pos, target: fallback.target, fov: fallback.fov ?? 36 }
  const ha = headOf(fa)
  const isOle = fa.figure === 'ole'
  if (kind === 'nah' || kind === 'halbnah') {
    // Hochformat: Breite entscheidet (Ole ist fast so breit wie hoch)
    const h = kind === 'halbnah' ? (isOle ? 4.4 : 5.2) : isOle ? 2.9 : 2.8
    const c = framed(ha, fa.yaw + 0.3, 0.06, h, kind === 'halbnah' ? 0.36 : 0.4, 32)
    return { pos: c.pos, target: c.target, fov: c.fov ?? 32 }
  }
  if ((kind === 'schulter' || kind === 'zwei') && fb) {
    const hb = headOf(fb)
    if (kind === 'schulter') {
      const dir = norm(sub(ha, hb))
      const side = norm([dir[2], 0, -dir[0]])
      return { pos: add(add(ha, scale(dir, 1.35)), add(scale(side, 0.6), [0, 0.35, 0])), target: hb, fov: 34 }
    }
    const mid = scale(add(ha, hb), 0.5)
    const sep = Math.hypot(ha[0] - hb[0], ha[2] - hb[2])
    const perp = norm([-(hb[2] - ha[2]), 0, hb[0] - ha[0]])
    const toward = perp[2] < 0 ? scale(perp, -1) : perp
    // Hochformat: beide Figuren müssen in 56 % der Bildhöhe nebeneinander passen
    const c = framed(mid, Math.atan2(toward[0], toward[2]), 0.12, Math.max(3.2, (sep + 1.6) / 0.56), 0.42, 34)
    return { pos: c.pos, target: c.target, fov: c.fov ?? 34 }
  }
  return { pos: fallback.pos, target: fallback.target, fov: fallback.fov ?? 36 }
}

/** Bewegung über die Einstellung (p = 0…1). Kleine Ausschläge: ruhig, aber nie stehend. */
export function applyMove(cam: CamPose, move: Move, p: number): CamPose {
  const k = p * 0.85 + 0.15 * (p * p * (3 - 2 * p))
  const d = sub(cam.pos, cam.target)
  const right = norm([d[2], 0, -d[0]])
  switch (move) {
    case 'push': return { ...cam, pos: add(cam.target, scale(d, 1 - 0.16 * k)) }
    case 'pull': return { ...cam, pos: add(cam.target, scale(d, 0.86 + 0.14 * k)) }
    case 'orbit-left':
    case 'orbit-right': {
      const a = (move === 'orbit-left' ? -1 : 1) * (k - 0.5) * 0.16
      const c = Math.cos(a), s = Math.sin(a)
      return { ...cam, pos: add(cam.target, [d[0] * c + d[2] * s, d[1], -d[0] * s + d[2] * c]) }
    }
    case 'rise': return { ...cam, pos: add(cam.pos, [0, -0.15 + 0.3 * k, 0]), target: add(cam.target, [0, -0.05 + 0.1 * k, 0]) }
    case 'pan-left':
    case 'pan-right': {
      const off = scale(right, (move === 'pan-left' ? -1 : 1) * (k - 0.5) * 0.4)
      return { ...cam, pos: add(cam.pos, off), target: add(cam.target, off) }
    }
  }
}

/** Projektion eines Punktes auf den Bildschirm (Pixel) – für die Selbstkontrolle. */
export function project(cam: CamPose, width: number, height: number, point: V3): { x: number; y: number; behind: boolean } {
  const c = new THREE.PerspectiveCamera(cam.fov, width / height, 0.1, 200)
  c.position.set(...cam.pos)
  c.lookAt(...cam.target)
  c.updateMatrixWorld()
  c.updateProjectionMatrix()
  const v = new THREE.Vector3(...point).project(c)
  return { x: (v.x * 0.5 + 0.5) * width, y: (1 - (v.y * 0.5 + 0.5)) * height, behind: v.z > 1 }
}
