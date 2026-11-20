/** Szene: Passkontrolle am Flughafen Tokio – Schalter mit Glasscheibe, Warteschlange, große Schilder. */
import { Part } from '../three/materials'
import { box, cylinder, sphere } from '../three/shapes'
import { Sign, TiledFloor, Wall } from './common'

function Booth({ x, open = true }: { x: number; open?: boolean }) {
  const panel = '#f7f3ea', stripe = '#6c9bd2', dark = '#3d4356'
  return (
    <group position={[x, 0, 0]}>
      {/* Front mit Ablage */}
      <Part geometry={box(24, 0.05)} color={panel} position={[0, 0.65, -1.15]} scale={[2.2, 1.3, 0.25]} receiveShadow />
      <Part geometry={box(8)} color={stripe} position={[0, 1.05, -1.02]} scale={[2.2, 0.12, 0.02]} outline={false} />
      <Part geometry={box(24, 0.05)} color="#e9e1d1" position={[0, 1.33, -1.35]} scale={[2.4, 0.07, 0.85]} receiveShadow />
      {/* Glasscheibe mit Rahmen */}
      <Part geometry={box(8)} color="#cfe9f6" position={[0, 1.9, -1.08]} scale={[2.2, 1.05, 0.03]} opacity={0.22} glossy castShadow={false} outline={false} />
      <Part geometry={box(16)} color={dark} position={[0, 2.45, -1.08]} scale={[2.3, 0.08, 0.08]} />
      {/* Seitenwände: unten fest, oben Glas (damit die Kamera hineinschauen kann), Dach auf Stützen */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Part geometry={box(24, 0.04)} color={panel} position={[side * 1.17, 0.68, -1.95]} scale={[0.12, 1.36, 1.8]} receiveShadow />
          <Part geometry={box(8)} color="#cfe9f6" position={[side * 1.17, 1.9, -1.95]} scale={[0.03, 1.05, 1.8]} opacity={0.16} glossy castShadow={false} outline={false} />
          <Part geometry={cylinder(16)} color={dark} position={[side * 1.17, 1.98, -2.82]} scale={[0.05, 1.3, 0.05]} />
        </group>
      ))}
      <Part geometry={box(24, 0.04)} color={stripe} position={[0, 2.66, -1.95]} scale={[2.5, 0.14, 1.9]} />
      {/* innen: Bildschirm und Stempel links auf dem Tisch, Stuhl */}
      <Part geometry={box(16)} color="#2b2f3a" position={[-0.78, 1.6, -1.62]} rotation={[0, 0.7, 0]} scale={[0.42, 0.3, 0.05]} glossy />
      <Part geometry={cylinder(24)} color="#8a6a4a" position={[-0.35, 1.42, -1.5]} scale={[0.06, 0.12, 0.06]} />
      <Part geometry={cylinder(24)} color="#2f3340" position={[0, 0.5, -2.45]} scale={[0.4, 0.1, 0.4]} />
      <Part geometry={box(16)} color="#2f3340" position={[0, 1.05, -2.75]} scale={[0.75, 0.9, 0.12]} />
      {!open && <Part geometry={box(16)} color="#c94a3a" position={[0, 1.9, -1.05]} scale={[0.9, 0.18, 0.02]} outline={false} />}
      {open && <Part geometry={sphere(16)} color="#5fd18a" position={[0.95, 2.66, -1.0]} scale={0.07} emissive="#2a8a50" outline={false} />}
    </group>
  )
}

function Stanchion({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Part geometry={cylinder(24)} color="#9ea6b4" position={[0, 0.04, 0]} scale={[0.2, 0.08, 0.2]} />
      <Part geometry={cylinder(24)} color="#c7ccd6" position={[0, 0.55, 0]} scale={[0.045, 1.0, 0.045]} glossy />
      <Part geometry={sphere(16)} color="#c7ccd6" position={[0, 1.06, 0]} scale={0.07} glossy />
    </group>
  )
}

function Belt({ a, b }: { a: [number, number]; b: [number, number] }) {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const len = Math.hypot(dx, dz)
  return <Part geometry={box(8)} color="#33467a" position={[(a[0] + b[0]) / 2, 0.95, (a[1] + b[1]) / 2]} rotation={[0, Math.atan2(dx, dz), 0]} scale={[0.02, 0.07, len]} outline={false} />
}

export function Passkontrolle() {
  const posts: [number, number][] = [[-0.55, 1.2], [-0.55, 3.0], [-0.55, 4.8], [-2.1, 1.9], [-2.1, 3.7], [-2.1, 5.5]]
  return (
    <group>
      <TiledFloor color="#ece6da" line="#ddd5c6" />
      <Wall z={-9} color="#f4efe6" band="#d6e1ec" height={8} />
      <Sign ja="入国審査" en="Immigration" position={[0.2, 4.9, -8.8]} width={5.6} height={1.5} accent="#ffcf3f" />
      {/* hinter den Schaltern: Gang mit Säulen (gibt Tiefe, wenn die Kamera von hinten schaut) */}
      {[-6, -2, 2, 6].map((x) => <Part key={`s${x}`} geometry={cylinder(32)} color="#e6dfd2" position={[x, 3.5, -6.5]} scale={[0.35, 7, 0.35]} castShadow={false} />)}
      <Sign ja="外国人" en="Foreign Passports" position={[0.55, 3.25, -1.9]} width={2.1} height={0.62} bg="#ffffff" fg="#253552" />
      <Sign ja="日本人" en="Japanese" position={[-3.4, 3.25, -1.9]} width={2.1} height={0.62} bg="#ffffff" fg="#253552" />
      <Booth x={0.55} />
      <Booth x={-3.4} open={false} />
      {posts.map(([x, z]) => <Stanchion key={`${x}${z}`} x={x} z={z} />)}
      <Belt a={[-0.55, 1.2]} b={[-0.55, 3.0]} />
      <Belt a={[-0.55, 3.0]} b={[-0.55, 4.8]} />
      <Belt a={[-2.1, 1.9]} b={[-2.1, 3.7]} />
      <Belt a={[-2.1, 3.7]} b={[-2.1, 5.5]} />
      {/* Wartelinie */}
      <Part geometry={box(8)} color="#ffcf3f" position={[-0.6, 0.006, 0.95]} scale={[2.2, 0.01, 0.12]} receiveShadow castShadow={false} outline={false} />
      {/* Deckenleuchten als helle Streifen hinten */}
      {[-6, -2, 2, 6].map((x) => <Part key={x} geometry={box(8)} color="#ffffff" position={[x, 6.4, -3]} scale={[2.6, 0.08, 0.5]} emissive="#fff6e0" outline={false} castShadow={false} />)}
    </group>
  )
}
