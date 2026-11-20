/** Grundformen, abhängig von der Rundungs-Feinheit des Looks (wiederverwendet, nicht jedes Bild neu erzeugt). */
import * as THREE from 'three'

const cache = new Map<string, THREE.BufferGeometry>()
const memo = (key: string, make: () => THREE.BufferGeometry) => {
  let g = cache.get(key)
  if (!g) { g = make(); cache.set(key, g) }
  return g
}

export const sphere = (seg: number) => memo(`s${seg}`, () => new THREE.SphereGeometry(1, Math.max(6, seg), Math.max(4, Math.round(seg * 0.7))))
export const box = (seg: number, round = 0.12) =>
  memo(`b${seg}-${round}`, () => (seg < 12 ? new THREE.BoxGeometry(1, 1, 1) : roundedBox(round, Math.min(6, Math.round(seg / 8)))))
export const cylinder = (seg: number, top = 1, bottom = 1) => memo(`c${seg}-${top}-${bottom}`, () => new THREE.CylinderGeometry(top, bottom, 1, Math.max(6, seg)))
export const cone = (seg: number) => memo(`k${seg}`, () => new THREE.ConeGeometry(1, 1, Math.max(5, Math.round(seg * 0.6))))
export const capsule = (seg: number) => memo(`p${seg}`, () => new THREE.CapsuleGeometry(0.5, 1, Math.max(3, Math.round(seg / 8)), Math.max(6, seg)))
export const plane = () => memo('plane', () => new THREE.PlaneGeometry(1, 1))
export const torus = (seg: number, tube = 0.25) => memo(`t${seg}-${tube}`, () => new THREE.TorusGeometry(1, tube, Math.max(4, Math.round(seg / 4)), Math.max(8, seg)))

/** Würfel mit abgerundeten Kanten (für Knete und Holzschnitt). */
function roundedBox(radius: number, smoothness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  const w = 1 - radius * 2, h = 1 - radius * 2, r = radius
  shape.moveTo(-w / 2, -h / 2 - r)
  shape.lineTo(w / 2, -h / 2 - r)
  shape.quadraticCurveTo(w / 2 + r, -h / 2 - r, w / 2 + r, -h / 2)
  shape.lineTo(w / 2 + r, h / 2)
  shape.quadraticCurveTo(w / 2 + r, h / 2 + r, w / 2, h / 2 + r)
  shape.lineTo(-w / 2, h / 2 + r)
  shape.quadraticCurveTo(-w / 2 - r, h / 2 + r, -w / 2 - r, h / 2)
  shape.lineTo(-w / 2 - r, -h / 2)
  shape.quadraticCurveTo(-w / 2 - r, -h / 2 - r, -w / 2, -h / 2 - r)
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1 - r * 2, bevelEnabled: true, bevelSegments: smoothness, steps: 1, bevelSize: r, bevelThickness: r, curveSegments: smoothness })
  g.center()
  return g
}
