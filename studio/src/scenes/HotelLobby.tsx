/** Szene: kleine Hotel-Lobby – Rezeption aus Holz, Schlüsselfächer, Pflanze, Sofa, warmes Licht. */
import { Part } from '../three/materials'
import { box, cylinder, sphere } from '../three/shapes'
import { Sign, TiledFloor, Wall } from './common'

export function HotelLobby() {
  const wood = '#b98154', light = '#efe4d2'
  return (
    <group>
      <TiledFloor color="#d9c7ad" line="#cbb79b" step={1.0} />
      <Wall z={-7} color="#efe2cf" band="#c9a985" height={7} />
      <Sign ja="フロント" en="Reception" position={[0, 3.6, -3.3]} width={2.6} height={0.8} bg="#3b3f52" accent="#ffcf3f" />
      {/* Schlüsselfächer */}
      <group position={[0, 0, -3.4]}>
        <Part geometry={box(16, 0.04)} color={wood} position={[0, 1.9, 0]} scale={[3.2, 1.6, 0.4]} />
        {Array.from({ length: 4 }, (_, r) => Array.from({ length: 6 }, (_, c) => (
          <Part key={`${r}${c}`} geometry={box(8)} color="#7a5236" position={[-1.25 + c * 0.5, 1.33 + r * 0.38, 0.21]} scale={[0.42, 0.3, 0.02]} outline={false} />
        )))}
      </group>
      {/* Rezeption */}
      <Part geometry={box(24, 0.05)} color={wood} position={[0, 0.55, -0.55]} scale={[3.6, 1.1, 0.8]} receiveShadow />
      <Part geometry={box(8)} color="#8d5c38" position={[0, 0.8, -0.14]} scale={[3.6, 0.1, 0.02]} outline={false} />
      <Part geometry={box(24, 0.05)} color={light} position={[0, 1.13, -0.55]} scale={[3.8, 0.07, 0.95]} receiveShadow />
      <group position={[0.9, 1.17, -0.4]}>
        <Part geometry={sphere(32)} color="#d9b45a" position={[0, 0.06, 0]} scale={[0.12, 0.09, 0.12]} glossy />
        <Part geometry={cylinder(16)} color="#3b3f52" position={[0, 0.0, 0]} scale={[0.16, 0.02, 0.16]} />
      </group>
      <group position={[-1.2, 1.17, -0.75]}>
        <Part geometry={cylinder(24)} color="#3b3f52" position={[0, 0.25, 0]} scale={[0.03, 0.5, 0.03]} />
        <Part geometry={cylinder(24, 0.6, 1)} color="#ffe9c4" position={[0, 0.55, 0]} scale={[0.22, 0.24, 0.22]} emissive="#e0a04a" />
        <pointLight position={[0, 0.6, 0.3]} intensity={2.5} color="#ffcf8a" distance={4} />
      </group>
      {/* Pflanze und Sofa */}
      <group position={[-2.8, 0, -1.2]}>
        <Part geometry={cylinder(24, 0.8, 1)} color="#c96f4a" position={[0, 0.3, 0]} scale={[0.35, 0.6, 0.35]} />
        {[0, 1.3, 2.6, 3.9, 5.2].map((a) => <Part key={a} geometry={sphere(16)} color="#5fae6e" position={[Math.cos(a) * 0.25, 1.0 + (a % 2) * 0.25, Math.sin(a) * 0.25]} rotation={[0, a, 0.4]} scale={[0.16, 0.42, 0.06]} />)}
      </group>
      <group position={[3.2, 0, 0.8]} rotation={[0, -1.2, 0]}>
        <Part geometry={box(24, 0.12)} color="#6c7fa8" position={[0, 0.45, 0]} scale={[2.0, 0.4, 0.8]} />
        <Part geometry={box(24, 0.12)} color="#6c7fa8" position={[0, 0.9, -0.32]} scale={[2.0, 0.7, 0.2]} />
      </group>
      {[-2.5, 2.5].map((x) => <pointLight key={x} position={[x, 4.2, -0.5]} intensity={5} color="#ffe2b8" distance={9} />)}
    </group>
  )
}
