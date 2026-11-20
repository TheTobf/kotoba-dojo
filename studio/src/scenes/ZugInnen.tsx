/** Szene: im Nahverkehrszug – lange Sitzbank, Haltegriffe, Fenster mit vorbeiziehenden Lichtern. */
import { useMemo } from 'react'
import * as THREE from 'three'
import { Part } from '../three/materials'
import { box, cylinder, torus } from '../three/shapes'
import { nightWindow } from './textures'

export function ZugInnen({ t }: { t: number }) {
  const win = useMemo(() => {
    const tex = nightWindow().clone()
    tex.needsUpdate = true
    tex.wrapS = THREE.RepeatWrapping
    tex.repeat.set(1.5, 1)
    return tex
  }, [])
  win.offset.x = (t * 0.35) % 1
  const winMat = useMemo(() => new THREE.MeshBasicMaterial({ map: win, toneMapped: false }), [win])
  const seat = '#4f7f9c', wall = '#eef0f2', metal = '#c7ccd6'
  return (
    <group>
      <Part geometry={box(8)} color="#8f97a6" position={[0, -0.05, 0]} scale={[14, 0.1, 3.4]} receiveShadow castShadow={false} outline={false} />
      {/* Rückwand mit Fensterband */}
      <Part geometry={box(8)} color={wall} position={[0, 0.5, -1.55]} scale={[14, 1.0, 0.1]} receiveShadow outline={false} />
      <Part geometry={box(8)} color={wall} position={[0, 2.95, -1.55]} scale={[14, 1.3, 0.1]} receiveShadow outline={false} />
      <mesh position={[0, 1.6, -1.62]} material={winMat}><planeGeometry args={[14, 1.4]} /></mesh>
      {[-4.6, -1.6, 1.4, 4.4].map((x) => <Part key={x} geometry={box(8)} color={wall} position={[x, 1.6, -1.55]} scale={[0.18, 1.4, 0.12]} outline={false} />)}
      {/* Tür links */}
      <group position={[-3.1, 0, -1.5]}>
        <Part geometry={box(16, 0.04)} color="#d8dce3" position={[0, 1.4, 0]} scale={[1.4, 2.8, 0.08]} />
        {[-0.34, 0.34].map((x) => <mesh key={x} position={[x, 1.85, 0.05]} material={winMat}><planeGeometry args={[0.5, 0.9]} /></mesh>)}
        <Part geometry={box(8)} color="#ffcf3f" position={[0, 0.02, 0.4]} scale={[1.4, 0.02, 0.12]} outline={false} />
      </group>
      {/* Sitzbank */}
      <Part geometry={box(24, 0.08)} color={seat} position={[1.4, 0.68, -1.2]} scale={[5.4, 0.24, 0.62]} receiveShadow />
      <Part geometry={box(24, 0.08)} color={seat} position={[1.4, 1.05, -1.43]} scale={[5.4, 0.6, 0.14]} />
      <Part geometry={box(8)} color="#3b4552" position={[1.4, 0.3, -1.25]} scale={[5.2, 0.56, 0.5]} outline={false} />
      {[-1.3, 4.1].map((x) => <Part key={x} geometry={cylinder(24)} color={metal} position={[x, 1.8, -1.0]} scale={[0.04, 3.6, 0.04]} glossy />)}
      {/* Stange mit Haltegriffen */}
      <Part geometry={cylinder(24)} color={metal} position={[0.8, 3.45, -0.5]} rotation={[0, 0, Math.PI / 2]} scale={[0.035, 12, 0.035]} glossy />
      {Array.from({ length: 16 }, (_, i) => -4.2 + i * 0.6).map((x) => (
        <group key={x} position={[x, 3.45, -0.5]} rotation={[Math.sin(t * 1.7 + x) * 0.06, 0, 0]}>
          <Part geometry={box(8)} color="#ffffff" position={[0, -0.18, 0]} scale={[0.04, 0.34, 0.02]} outline={false} />
          <Part geometry={torus(24, 0.18)} color="#ffcf3f" position={[0, -0.44, 0]} scale={0.1} />
        </group>
      ))}
      <Part geometry={box(8)} color="#ffffff" position={[0, 3.75, -0.4]} scale={[12, 0.06, 0.4]} emissive="#fffbe8" outline={false} castShadow={false} />
      <pointLight position={[0.5, 3.0, 0.8]} intensity={4} color="#fff6e0" distance={9} />
    </group>
  )
}
