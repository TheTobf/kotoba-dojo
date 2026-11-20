/** Szene: Konbini – Kasse mit Mikrowelle, Regale, Kühlschränke. Keine Marken, eigene Farben. */
import { Part } from '../three/materials'
import { box, cylinder } from '../three/shapes'
import { Sign, TiledFloor, Wall } from './common'

const PACK = ['#e2574c', '#f2c230', '#4f86c6', '#5fae6e', '#f08a3c', '#8c6ad1', '#ffffff', '#3fa7a0']

function Shelf({ position, rotation = 0, rows = 4 }: { position: [number, number, number]; rotation?: number; rows?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Part geometry={box(16, 0.04)} color="#eceff3" position={[0, 0.95, -0.25]} scale={[2.6, 1.9, 0.08]} />
      {Array.from({ length: rows }, (_, r) => (
        <group key={r} position={[0, 0.2 + r * 0.45, 0]}>
          <Part geometry={box(8)} color="#d6dbe2" scale={[2.6, 0.04, 0.5]} outline={false} />
          {Array.from({ length: 8 }, (_, i) => (
            <Part key={i} geometry={box(16, 0.1)} color={PACK[(i + r * 3) % PACK.length]} position={[-1.1 + i * 0.31, 0.15, 0]} scale={[0.24, 0.26 + ((i * 7 + r) % 3) * 0.04, 0.3]} />
          ))}
        </group>
      ))}
    </group>
  )
}

export function Konbini() {
  return (
    <group>
      <TiledFloor color="#f4f4f1" line="#e2e2dc" step={1.2} />
      <Wall z={-6} color="#fbfbf8" band="#cfe7e4" height={7} />
      {/* Kühlschränke hinten */}
      {[-3.2, -2.0, -0.8].map((x) => (
        <group key={x} position={[x, 0, -5.6]}>
          <Part geometry={box(16, 0.04)} color="#dfe6ea" position={[0, 1.1, 0]} scale={[1.15, 2.2, 0.6]} />
          <Part geometry={box(8)} color="#cfe9f6" position={[0, 1.1, 0.31]} scale={[1.0, 2.0, 0.02]} emissive="#9fc8e0" opacity={0.6} outline={false} />
        </group>
      ))}
      <Shelf position={[-3.6, 0, 0.6]} rotation={Math.PI / 2} />
      <Shelf position={[-3.6, 0, 3.4]} rotation={Math.PI / 2} />
      {/* Kasse */}
      <Part geometry={box(24, 0.05)} color="#ffffff" position={[0, 0.55, -0.55]} scale={[3.6, 1.1, 0.8]} receiveShadow />
      <Part geometry={box(8)} color="#4f9a8f" position={[0, 0.82, -0.14]} scale={[3.6, 0.14, 0.02]} outline={false} />
      <Part geometry={box(24, 0.05)} color="#e8e1d4" position={[0, 1.13, -0.55]} scale={[3.8, 0.07, 0.95]} receiveShadow />
      <group position={[-0.7, 1.17, -0.75]}>
        <Part geometry={box(16, 0.08)} color="#2b2f3a" scale={[0.5, 0.2, 0.4]} position={[0, 0.1, 0]} />
        <Part geometry={box(16, 0.06)} color="#2b2f3a" position={[0, 0.42, 0.05]} rotation={[0, Math.PI, 0]} scale={[0.4, 0.3, 0.05]} glossy />
      </group>
      {/* Warmhalte-Vitrine */}
      <group position={[-1.5, 1.17, -0.6]}>
        <Part geometry={box(16, 0.06)} color="#c7ccd6" position={[0, 0.25, 0]} scale={[0.8, 0.5, 0.5]} />
        <Part geometry={box(8)} color="#ffd9a0" position={[0, 0.27, 0.26]} scale={[0.7, 0.36, 0.02]} emissive="#ffb35a" outline={false} />
      </group>
      {/* Mikrowelle auf der Rückbank */}
      <Part geometry={box(24, 0.05)} color="#e8e1d4" position={[0, 0.5, -2.2]} scale={[3.6, 1.0, 0.7]} />
      <group position={[0.8, 1.0, -2.2]}>
        <Part geometry={box(16, 0.08)} color="#f4f4f2" position={[0, 0.25, 0]} scale={[0.8, 0.5, 0.5]} />
        <Part geometry={box(8)} color="#2b2f3a" position={[-0.08, 0.25, 0.26]} scale={[0.5, 0.36, 0.02]} glossy outline={false} />
      </group>
      <Sign ja="レジ" en="Kasse · Register" position={[0, 3.3, -2.3]} width={2.2} height={0.7} bg="#4f9a8f" />
      {/* Tür mit Glas */}
      <group position={[3.6, 0, 2.4]} rotation={[0, -Math.PI / 2, 0]}>
        <Part geometry={box(8)} color="#cfe9f6" position={[0, 1.4, 0]} scale={[2.0, 2.8, 0.04]} opacity={0.25} glossy outline={false} />
        <Part geometry={box(8)} color="#9aa3b0" position={[0, 2.85, 0]} scale={[2.1, 0.1, 0.1]} />
      </group>
      {[-3, 0, 3].map((x) => <Part key={x} geometry={box(8)} color="#ffffff" position={[x, 5.0, 0]} scale={[2.2, 0.06, 0.5]} emissive="#ffffff" outline={false} castShadow={false} />)}
      <Part geometry={cylinder(16)} color="#ffffff" position={[0, 5.2, 0]} scale={[0.01, 0.01, 0.01]} outline={false} />
    </group>
  )
}
