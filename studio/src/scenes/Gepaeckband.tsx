/** Szene: Gepäckband – Koffer kommen aus der Klappe und fahren im Kreis. Zustände: band (laeuft|stopp), koffer (viele|wenige|keine). */
import { useMemo } from 'react'
import * as THREE from 'three'
import type { TBeat } from '../episode/timeline'
import { Suitcase } from '../props/Props'
import { Part, useLookMaterial } from '../three/materials'
import { box, cylinder } from '../three/shapes'
import { Sign, TiledFloor, Wall } from './common'

const CX = 0.2, CZ = -1.5, HALF = 3.0, R = 0.9
const STRAIGHT = HALF * 2
const LENGTH = STRAIGHT * 2 + Math.PI * R * 2
const SPEED = 0.5
const COLORS = ['#e2574c', '#4f86c6', '#f2c230', '#5fae6e', '#8c6ad1', '#f08a3c', '#3fa7a0', '#d1608f']

/** Punkt auf der Mittellinie des Bandes: u = Weg in Einheiten */
function pathPoint(u: number): { x: number; z: number; yaw: number } {
  let s = ((u % LENGTH) + LENGTH) % LENGTH
  if (s < STRAIGHT) return { x: CX - HALF + s, z: CZ + R, yaw: Math.PI / 2 }
  s -= STRAIGHT
  if (s < Math.PI * R) { const a = s / R; return { x: CX + HALF + Math.sin(a) * R, z: CZ + Math.cos(a) * R, yaw: Math.PI / 2 + a } }
  s -= Math.PI * R
  if (s < STRAIGHT) return { x: CX + HALF - s, z: CZ - R, yaw: -Math.PI / 2 }
  s -= STRAIGHT
  const a = s / R
  return { x: CX - HALF - Math.sin(a) * R, z: CZ - Math.cos(a) * R, yaw: -Math.PI / 2 + a }
}

function stadium(half: number, r: number): THREE.Shape {
  const sh = new THREE.Shape()
  sh.moveTo(-half, -r)
  sh.lineTo(half, -r)
  sh.absarc(half, 0, r, -Math.PI / 2, Math.PI / 2, false)
  sh.lineTo(-half, r)
  sh.absarc(-half, 0, r, Math.PI / 2, Math.PI * 1.5, false)
  return sh
}

function Slab({ half, r, depth, color, y, glossy }: { half: number; r: number; depth: number; color: string; y: number; glossy?: boolean }) {
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(stadium(half, r), { depth, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3, curveSegments: 32 })
    g.rotateX(-Math.PI / 2)
    return g
  }, [half, r, depth])
  const mat = useLookMaterial(color, { glossy })
  return <mesh geometry={geo} material={mat} position={[CX, y, CZ]} castShadow receiveShadow />
}

export function Gepaeckband({ beat, t }: { beat: TBeat; t: number }) {
  const running = beat.state.band !== 'stopp'
  const count = beat.state.koffer === 'keine' ? 0 : beat.state.koffer === 'wenige' ? 3 : 8
  // Beim Anhalten bremst das Band in 0,8 s ab
  const since = beat.stateSince.band ?? 0
  const tEff = running ? t : since + Math.min(t - since, 0.8) / 2
  const offset = tEff * SPEED
  return (
    <group>
      <TiledFloor color="#e9e4da" line="#d8d0c1" />
      <Wall z={-9} color="#f1ece3" band="#d8e3d9" height={8} />
      <Sign ja="手荷物受取所" en="Baggage Claim" position={[0.2, 4.8, -8.8]} width={5.2} height={1.4} accent="#ffcf3f" />
      {/* Trennwand mit der Klappe, aus der die Koffer kommen */}
      <Part geometry={box(16)} color="#e3ddd2" position={[CX - HALF - 0.2, 1.6, -4.95]} scale={[2.6, 3.2, 0.3]} receiveShadow />
      <group position={[4.6, 0, -3.4]}>
        <Part geometry={cylinder(24)} color="#c7ccd6" position={[0, 1.6, 0]} scale={[0.08, 3.2, 0.08]} />
        <Sign ja="3" en="NH 210 · Frankfurt" position={[0, 3.4, 0]} width={1.5} height={0.95} />
      </group>
      {/* Klappe in der Wand, aus der die Koffer kommen */}
      <Part geometry={box(16)} color="#3a3d44" position={[CX - HALF - 0.2, 0.9, -4.75]} scale={[1.8, 1.2, 0.2]} />
      {[-0.6, -0.3, 0, 0.3, 0.6].map((x) => (
        <Part key={x} geometry={box(8)} color="#22252b" position={[CX - HALF - 0.2 + x, 0.95, -4.62]} rotation={[running ? Math.sin(t * 6 + x * 5) * 0.08 : 0, 0, 0]} scale={[0.26, 1.05, 0.03]} outline={false} />
      ))}
      <Part geometry={box(16)} color="#9aa3b0" position={[CX - HALF - 0.2, 0.3, -3.6]} scale={[1.2, 0.6, 2.4]} />
      {/* Band: Sockel, Gummifläche, Mittelinsel */}
      <Slab half={HALF} r={R + 0.62} depth={0.5} color="#a9b1bd" y={0} />
      <Slab half={HALF} r={R + 0.48} depth={0.04} color="#3a3d44" y={0.54} />
      <Slab half={HALF} r={R - 0.42} depth={0.22} color="#c7ccd6" y={0.6} glossy />
      {/* Lamellen, die sich mitbewegen (zeigen, ob das Band läuft) */}
      {Array.from({ length: 48 }, (_, i) => {
        const p = pathPoint(offset + (i * LENGTH) / 48)
        return <Part key={i} geometry={box(8)} color="#2c2f35" position={[p.x, 0.6, p.z]} rotation={[0, p.yaw, 0]} scale={[0.86, 0.012, 0.035]} outline={false} castShadow={false} />
      })}
      {Array.from({ length: count }, (_, i) => {
        const p = pathPoint(offset + 2.1 + (i * LENGTH) / Math.max(count, 1))
        return (
          <group key={i} position={[p.x, 0.62, p.z]} rotation={[-Math.PI / 2 + 0.25, 0, p.yaw + Math.PI / 2]}>
            <group position={[0, -0.42, 0]}><Suitcase color={COLORS[i % COLORS.length]} scale={0.72} /></group>
          </group>
        )
      })}
    </group>
  )
}
