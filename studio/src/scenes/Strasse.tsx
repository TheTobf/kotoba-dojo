/** Szene: ruhige Wohnstraße am Abend – Laterne, Strommasten, beleuchtete Fenster, das Hotel Kawabe. Zustand: hotel (an|aus). */
import { useMemo } from 'react'
import * as THREE from 'three'
import type { TBeat } from '../episode/timeline'
import { Part } from '../three/materials'
import { box, cone, cylinder, sphere } from '../three/shapes'
import { signTexture } from '../three/signTexture'
import { useLook } from '../three/materials'
import { drinksFront } from './textures'

function House({ x, z, w, h, color, roof, lit }: { x: number; z: number; w: number; h: number; color: string; roof: string; lit: number[] }) {
  return (
    <group position={[x, 0, z]}>
      <Part geometry={box(16, 0.04)} color={color} position={[0, h / 2, 0]} scale={[w, h, 2.4]} receiveShadow />
      <Part geometry={box(16, 0.04)} color={roof} position={[0, h + 0.12, 0]} scale={[w + 0.4, 0.24, 2.8]} />
      {lit.map((wx, i) => (
        <Part key={i} geometry={box(8)} color="#ffd9a0" position={[wx, h * 0.62, 1.21]} scale={[0.6, 0.55, 0.02]} emissive="#ffb35a" outline={false} />
      ))}
    </group>
  )
}

export function Strasse({ beat }: { beat: TBeat }) {
  const look = useLook()
  const hotelOn = beat.state.hotel !== 'aus'
  const sign = useMemo(() => signTexture({ font: look.text.font, bg: '#2a2340', fg: '#ffffff', width: 1024, height: 300, lines: [{ text: 'ホテル川辺', size: 130, weight: 900, y: 120, color: '#ffcf3f' }, { text: 'HOTEL KAWABE', size: 64, weight: 700, y: 240 }] }), [look.text.font])
  const signMat = useMemo(() => new THREE.MeshBasicMaterial({ map: sign, toneMapped: false }), [sign])
  const drinks = useMemo(() => new THREE.MeshBasicMaterial({ map: drinksFront(), toneMapped: false }), [])
  return (
    <group>
      {/* Straße, Bürgersteig, Markierung */}
      <Part geometry={box(8)} color="#3d3f4d" position={[0, -0.05, 4]} scale={[40, 0.1, 6.4]} receiveShadow castShadow={false} outline={false} />
      <Part geometry={box(8)} color="#8d8a93" position={[0, 0.02, -0.6]} scale={[40, 0.14, 3.2]} receiveShadow castShadow={false} outline={false} />
      {Array.from({ length: 12 }, (_, i) => -18 + i * 3.2).map((x) => <Part key={x} geometry={box(8)} color="#e8e6df" position={[x, 0.005, 4]} scale={[1.6, 0.01, 0.12]} outline={false} castShadow={false} />)}
      <Part geometry={box(8)} color="#e8e6df" position={[0, 0.01, 1.2]} scale={[40, 0.01, 0.1]} outline={false} castShadow={false} />
      {/* Häuser */}
      <House x={-5.4} z={-3.4} w={3.4} h={3.4} color="#c9b9a6" roof="#5a4a44" lit={[-0.8, 0.8]} />
      <House x={-1.6} z={-3.6} w={3.6} h={4.2} color="#a9b4bf" roof="#3f4652" lit={[-0.9]} />
      <House x={6.6} z={-3.4} w={3.0} h={3.2} color="#bfae9c" roof="#4f3f3a" lit={[0.6]} />
      {/* Hotel Kawabe */}
      <group position={[2.8, 0, -3.6]}>
        <Part geometry={box(16, 0.04)} color="#e6ddcf" position={[0, 2.6, 0]} scale={[4.0, 5.2, 1.4]} receiveShadow />
        <Part geometry={box(8)} color={hotelOn ? '#ffe2b0' : '#2a2a3c'} position={[0, 1.3, 0.71]} scale={[1.8, 2.4, 0.02]} emissive={hotelOn ? '#ffb35a' : '#000000'} outline={false} />
        <Part geometry={box(8)} color="#5a5f6e" position={[0, 1.3, 0.73]} scale={[0.05, 2.4, 0.03]} outline={false} />
        <mesh position={[0, 3.2, 0.73]} material={signMat}><planeGeometry args={[2.4, 0.7]} /></mesh>
        {[-1.3, 1.3].map((x) => <Part key={x} geometry={box(8)} color={hotelOn ? '#ffd9a0' : '#3a3a52'} position={[x, 4.4, 0.71]} scale={[0.7, 0.6, 0.02]} emissive={hotelOn ? '#e09a4a' : '#000000'} outline={false} />)}
        {hotelOn && <pointLight position={[0, 1.4, 1.4]} intensity={3} color="#ffcf8a" distance={5} />}
      </group>
      {/* Getränkeautomat (leuchtet) */}
      <group position={[-4.2, 0, -1.9]}>
        <Part geometry={box(24, 0.06)} color="#e4e8ee" position={[0, 1.05, 0]} scale={[1.2, 2.1, 0.7]} />
        <mesh position={[0, 1.3, 0.36]} material={drinks}><planeGeometry args={[1.0, 1.4]} /></mesh>
        <pointLight position={[0, 1.3, 1.0]} intensity={2} color="#dfefff" distance={4} />
      </group>
      {/* Laterne */}
      <group position={[-1.0, 0, -0.9]}>
        <Part geometry={cylinder(24)} color="#5a5f6e" position={[0, 2.1, 0]} scale={[0.07, 4.2, 0.07]} />
        <Part geometry={cone(24)} color="#5a5f6e" position={[0.35, 4.15, 0]} rotation={[0, 0, Math.PI]} scale={[0.32, 0.22, 0.32]} />
        <Part geometry={sphere(24)} color="#fff2cc" position={[0.35, 3.98, 0]} scale={0.14} emissive="#ffd27a" outline={false} />
        <pointLight position={[0.35, 3.8, 0]} intensity={9} color="#ffd9a0" distance={9} castShadow />
      </group>
      {/* Strommasten mit Leitungen */}
      {[-7, 1.0, 9].map((x) => (
        <group key={x} position={[x, 0, -1.9]}>
          <Part geometry={cylinder(16)} color="#8a8478" position={[0, 3.5, 0]} scale={[0.12, 7, 0.12]} />
          <Part geometry={box(8)} color="#6b665c" position={[0, 6.4, 0]} scale={[1.4, 0.08, 0.08]} />
        </group>
      ))}
      {[-0.3, 0.3].map((dz) => <Part key={dz} geometry={cylinder(8)} color="#2b2826" position={[1, 6.35, -1.9 + dz]} rotation={[0, 0, Math.PI / 2]} scale={[0.012, 16, 0.012]} outline={false} castShadow={false} />)}
    </group>
  )
}
