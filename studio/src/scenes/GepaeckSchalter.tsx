/** Szene: Gepäckermittlung am Flughafen – niedriger Schalter, dahinter ein Regal voller verlorener Koffer. */
import { Suitcase } from '../props/Props'
import { Part } from '../three/materials'
import { box, cylinder } from '../three/shapes'
import { Sign, TiledFloor, Wall } from './common'

const SHELF = [
  ['#e2574c', '#4f86c6', '#f2c230'],
  ['#5fae6e', '#8c6ad1', '#f08a3c', '#3fa7a0'],
]

export function GepaeckSchalter() {
  const wood = '#e0b48a', panel = '#f7f3ea', stripe = '#6c9bd2', metal = '#b9bfcc'
  return (
    <group>
      <TiledFloor color="#ece6da" line="#ddd5c6" />
      <Wall z={-9} color="#f4efe6" band="#d6e1ec" height={8} />
      <Sign ja="手荷物サービス" en="Baggage Service" position={[0, 4.1, -5.6]} width={4.4} height={1.15} accent="#ffcf3f" />
      {/* Schalter: niedrig, damit Ole drüberschauen kann */}
      <Part geometry={box(24, 0.05)} color={panel} position={[0, 0.55, -0.55]} scale={[3.6, 1.1, 0.8]} receiveShadow />
      <Part geometry={box(8)} color={stripe} position={[0, 0.82, -0.14]} scale={[3.6, 0.12, 0.02]} outline={false} />
      <Part geometry={box(24, 0.05)} color={wood} position={[0, 1.13, -0.55]} scale={[3.8, 0.07, 0.95]} receiveShadow />
      {/* auf dem Tresen: Bildschirm (zur Mitarbeiterin), Ablage mit Anhängern */}
      <Part geometry={box(16)} color="#2b2f3a" position={[-1.1, 1.42, -0.75]} rotation={[0, 0.6 + Math.PI, 0]} scale={[0.5, 0.36, 0.05]} glossy />
      <Part geometry={cylinder(16)} color="#2b2f3a" position={[-1.1, 1.2, -0.75]} scale={[0.04, 0.12, 0.04]} />
      <Part geometry={box(16)} color="#f4e7b5" position={[1.15, 1.19, -0.4]} rotation={[0, 0.3, 0]} scale={[0.32, 0.04, 0.22]} />
      <Part geometry={box(16)} color="#ffcf3f" position={[1.15, 1.23, -0.4]} rotation={[0, 0.3, 0]} scale={[0.26, 0.03, 0.16]} />
      {/* Regal mit verlorenen Koffern */}
      <group position={[0, 0, -5.4]}>
        {[-1.9, 1.9].map((x) => <Part key={x} geometry={box(16)} color={metal} position={[x, 1.4, 0]} scale={[0.1, 2.8, 0.7]} />)}
        {[0.05, 1.25, 2.45].map((y) => <Part key={y} geometry={box(16)} color={metal} position={[0, y, 0]} scale={[3.9, 0.07, 0.75]} receiveShadow />)}
        {SHELF.map((row, r) => row.map((c, i) => (
          <group key={`${r}${i}`} position={[-1.4 + i * (2.8 / Math.max(1, row.length - 1)), 0.09 + r * 1.2, 0]} rotation={[0, (i % 2 ? 0.2 : -0.15), 0]}>
            <Suitcase color={c} scale={r === 0 ? 1.1 : 0.95} />
          </group>
        )))}
      </group>
      {/* Wartebank */}
      <group position={[2.9, 0, 1.4]} rotation={[0, -0.5, 0]}>
        <Part geometry={box(24, 0.1)} color="#6c9bd2" position={[0, 0.5, 0]} scale={[1.8, 0.12, 0.55]} />
        <Part geometry={box(24, 0.1)} color="#6c9bd2" position={[0, 0.9, -0.24]} scale={[1.8, 0.6, 0.1]} />
        {[-0.75, 0.75].map((x) => <Part key={x} geometry={box(8)} color={metal} position={[x, 0.24, 0]} scale={[0.08, 0.48, 0.45]} />)}
      </group>
      {[-6, -2, 2, 6].map((x) => <Part key={x} geometry={box(8)} color="#ffffff" position={[x, 6.4, -2.5]} scale={[2.6, 0.08, 0.5]} emissive="#fff6e0" outline={false} castShadow={false} />)}
    </group>
  )
}
