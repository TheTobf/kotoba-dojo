/** Szene: Bahnhofshalle mit Fahrkartenautomaten, Getränkeautomat und Sperren. */
import { useMemo } from 'react'
import * as THREE from 'three'
import { Part, useLook } from '../three/materials'
import { box, cylinder } from '../three/shapes'
import { Sign, TiledFloor, Wall } from './common'
import { drinksFront, fareMap, ticketScreen } from './textures'

function TicketMachine({ x }: { x: number }) {
  const look = useLook()
  const screen = useMemo(() => new THREE.MeshBasicMaterial({ map: ticketScreen(look.text.font), toneMapped: false }), [look.text.font])
  return (
    <group position={[x, 0, -0.55]}>
      <Part geometry={box(24, 0.06)} color="#dfe3ea" position={[0, 0.95, 0]} scale={[1.0, 1.9, 0.6]} />
      <Part geometry={box(16, 0.1)} color="#c7ccd6" position={[0, 1.25, 0.25]} rotation={[-0.35, 0, 0]} scale={[0.86, 0.66, 0.12]} />
      <mesh position={[0, 1.27, 0.32]} rotation={[-0.35, 0, 0]} material={screen}><planeGeometry args={[0.76, 0.56]} /></mesh>
      <Part geometry={box(8)} color="#2b2f3a" position={[0.3, 0.72, 0.31]} scale={[0.14, 0.04, 0.02]} outline={false} />
      <Part geometry={box(8)} color="#2b2f3a" position={[-0.15, 0.52, 0.31]} scale={[0.4, 0.06, 0.02]} outline={false} />
      <Part geometry={box(8)} color="#6c9bd2" position={[0, 1.83, 0.31]} scale={[1.0, 0.1, 0.02]} outline={false} />
    </group>
  )
}

export function Bahnhof() {
  const look = useLook()
  const fare = useMemo(() => new THREE.MeshBasicMaterial({ map: fareMap(look.text.font), toneMapped: false }), [look.text.font])
  const drinks = useMemo(() => new THREE.MeshBasicMaterial({ map: drinksFront(), toneMapped: false }), [])
  return (
    <group>
      <TiledFloor color="#e7e3db" line="#d6d0c4" />
      <Wall z={-1.0} color="#f3efe6" band="#d6e1ec" height={6} />
      <Sign ja="きっぷうりば" en="Tickets" position={[0.5, 4.2, -0.9]} width={3.4} height={0.9} accent="#ffcf3f" />
      {/* Fahrpreistafel */}
      <group position={[0.5, 2.85, -0.84]}>
        <Part geometry={box(16, 0.05)} color="#2a2340" scale={[3.5, 1.5, 0.06]} />
        <mesh position={[0, 0, 0.035]} material={fare}><planeGeometry args={[3.36, 1.4]} /></mesh>
      </group>
      {[-0.6, 0.5, 1.6].map((x) => <TicketMachine key={x} x={x} />)}
      {/* Getränkeautomat */}
      <group position={[-2.6, 0, -0.5]}>
        <Part geometry={box(24, 0.06)} color="#3f6fb0" position={[0, 1.05, 0]} scale={[1.2, 2.1, 0.7]} />
        <mesh position={[0, 1.3, 0.36]} material={drinks}><planeGeometry args={[1.0, 1.4]} /></mesh>
        <Part geometry={box(8)} color="#2b2f3a" position={[0, 0.35, 0.36]} scale={[0.8, 0.2, 0.02]} outline={false} />
        <pointLight position={[0, 1.3, 0.9]} intensity={1.2} color="#e8f2ff" distance={3} />
      </group>
      {/* Sperren (Kartenleser) */}
      {[3.6, 4.5, 5.4].map((x) => (
        <group key={x} position={[x, 0, 0.6]}>
          <Part geometry={box(24, 0.08)} color="#d9dde5" position={[0, 0.5, 0]} scale={[0.32, 1.0, 1.6]} />
          <Part geometry={box(16, 0.1)} color="#4f86c6" position={[0, 1.02, 0.4]} scale={[0.34, 0.05, 0.5]} />
          <Part geometry={cylinder(16)} color="#5fd18a" position={[0, 1.06, -0.5]} scale={[0.06, 0.02, 0.06]} emissive="#2a8a50" outline={false} />
        </group>
      ))}
      {[-4, 0, 4].map((x) => <Part key={x} geometry={box(8)} color="#ffffff" position={[x, 5.6, 1]} scale={[2.6, 0.08, 0.5]} emissive="#fff6e0" outline={false} castShadow={false} />)}
    </group>
  )
}
