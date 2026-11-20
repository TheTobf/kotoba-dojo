/** Szene: Bahnsteig mit einfahrendem Zug, Bahnhofsschild, Bank und gelbem Blindenleitstreifen. */
import { useMemo } from 'react'
import { ease } from '../characters/actions'
import type { TBeat } from '../episode/timeline'
import * as THREE from 'three'
import { Part, useLook } from '../three/materials'
import { box, cylinder } from '../three/shapes'
import { signTexture } from '../three/signTexture'

export function Platform({ trainX: fixedX, beat, t = 0 }: { trainX?: number; beat?: TBeat; t?: number }) {
  const zug = beat?.state.zug ?? 'da'
  const since = beat?.stateSince.zug ?? 0
  const trainX = fixedX ?? (zug === 'faehrt-ein' ? 16 * (1 - ease((t - since) / 4)) : -1.5)
  const look = useLook()
  const p = look.palette
  const s = look.segments
  const sign = useMemo(() => signTexture({
    font: look.text.font, bg: '#ffffff', fg: p.ink,
    lines: [
      { text: 'ひがしまち', size: 150, weight: 700, y: 150 },
      { text: 'Higashimachi', size: 64, weight: 500, y: 290, color: '#5a524a' },
    ],
  }), [look, p.ink])
  const signMaterial = useMemo(() => new THREE.MeshBasicMaterial({ map: sign }), [sign])
  return (
    <group>
      {/* Bahnsteig */}
      <Part geometry={box(8)} color={p.ground} position={[0, -0.25, 3.3]} scale={[16, 0.5, 11.4]} receiveShadow castShadow={false} outline={false} />
      {/* Kante und Gleisbett */}
      <Part geometry={box(8)} color={p.wall} position={[0, -0.02, -2.38]} scale={[16, 0.06, 0.25]} receiveShadow outline={false} />
      <Part geometry={box(8)} color="#8f8577" position={[0, -1.1, -3.6]} scale={[16, 0.4, 2.6]} receiveShadow outline={false} />
      {/* Blindenleitstreifen */}
      <Part geometry={box(8)} color={p.groundLine} position={[0, 0.005, -1.7]} scale={[16, 0.02, 0.32]} receiveShadow castShadow={false} outline={false} />
      {/* Zug */}
      {zug !== 'weg' && <group position={[trainX, 0, -3.65]}>
        <Part geometry={box(s, 0.08)} color={p.paper} position={[0, 1.1, 0]} scale={[11, 2.7, 2.4]} receiveShadow />
        <Part geometry={box(8)} color={p.accent2} position={[0, 0.25, 1.21]} scale={[11, 0.28, 0.02]} outline={false} />
        <Part geometry={box(8)} color={p.accent} position={[0, 2.25, 1.21]} scale={[11, 0.08, 0.02]} outline={false} />
        {[-4.2, -2.4, -0.6, 1.2, 3, 4.6].map((x) => (
          <Part key={x} geometry={box(8)} color="#4a5560" position={[x, 1.5, 1.21]} scale={[1.2, 0.75, 0.02]} outline={false} glossy />
        ))}
        {[-3.3, 2.1].map((x) => (
          <Part key={x} geometry={box(8)} color="#d8d2c6" position={[x, 0.95, 1.215]} scale={[1.1, 1.9, 0.02]} outline={false} />
        ))}
      </group>}
      {/* Säule mit Schild */}
      <Part geometry={cylinder(s)} color={p.metal} position={[1.6, 1.8, -1.0]} scale={[0.12, 3.6, 0.12]} />
      <group position={[1.6, 2.45, -0.8]} scale={0.75}>
        <Part geometry={box(s, 0.06)} color={p.ink} scale={[2.2, 0.86, 0.08]} />
        <mesh position={[0, 0, 0.045]} material={signMaterial}>
          <planeGeometry args={[2.1, 0.78]} />
        </mesh>
      </group>
      {/* Bank */}
      <group position={[-2.7, 0, -0.6]} rotation={[0, 0.25, 0]}>
        <Part geometry={box(s, 0.1)} color={p.wood} position={[0, 0.48, 0]} scale={[1.8, 0.1, 0.5]} />
        <Part geometry={box(s, 0.1)} color={p.wood} position={[0, 0.85, -0.22]} scale={[1.8, 0.4, 0.08]} />
        {[-0.75, 0.75].map((x) => (
          <Part key={x} geometry={box(8)} color={p.metal} position={[x, 0.22, 0]} scale={[0.08, 0.44, 0.4]} />
        ))}
      </group>
      {/* Dach-Kante oben (gibt Tiefe) */}
      <Part geometry={box(8)} color={p.wall} position={[0, 4.1, -0.5]} scale={[16, 0.25, 4]} outline={false} castShadow={false} />
    </group>
  )
}
