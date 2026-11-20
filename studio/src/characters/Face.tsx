/** Gesicht: große Augen mit Glanzpunkt, Wangen, Mund je Stimmung. Von allen Figuren genutzt. */
import { useLook } from '../three/materials'
import { Part } from '../three/materials'
import { box, sphere, torus } from '../three/shapes'
import { blink, type Pose } from './types'

export function Eyes({ pose, spread = 0.28, size = 0.17, y = 0, z = 0.8, seed = 0 }: { pose: Pose; spread?: number; size?: number; y?: number; z?: number; seed?: number }) {
  const look = useLook()
  const seg = Math.max(look.segments, 16)
  const open = pose.mood === 'shocked' ? 1.25 : pose.mood === 'sad' ? 0.75 * blink(pose.t, seed) : blink(pose.t, seed)
  const ink = look.palette.ink
  return (
    <group position={[0, y, z]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * spread, 0, 0]} scale={[1, open, 1]}>
          <Part geometry={sphere(seg)} color={ink} scale={[size, size * 1.15, size * 0.6]} outline={false} glossy />
          <Part geometry={sphere(12)} color="#ffffff" position={[size * 0.35, size * 0.45, size * 0.5]} scale={size * 0.32} outline={false} emissive="#ffffff" />
          {pose.mood === 'confused' && (
            // Verwirrt: eine Braue hoch und schräg, die andere tief und gerade
            <Part geometry={box(8)} color={ink} position={[side * size * 0.15, size * (side === 1 ? 2.0 : 1.55), 0]} rotation={[0, 0, side === 1 ? -0.3 : 0.05]} scale={[size * 1.3, size * 0.22, size * 0.3]} outline={false} />
          )}
        </group>
      ))}
    </group>
  )
}

export function Mouth({ pose, y = -0.2, z = 0.82, width = 0.16 }: { pose: Pose; y?: number; z?: number; width?: number }) {
  const look = useLook()
  const ink = look.palette.ink
  const talk = pose.mouth ?? 0
  if (talk > 0.04) {
    // offener Mund beim Sprechen: dunkles Oval mit kleiner Zunge
    return (
      <group position={[0, y, z]}>
        <Part geometry={sphere(20)} color="#5a2630" scale={[width * 0.5, width * (0.12 + talk * 0.42), width * 0.25]} outline={false} />
        <Part geometry={sphere(16)} color="#e27c7c" position={[0, -width * (0.05 + talk * 0.2), width * 0.05]} scale={[width * 0.3, width * 0.1 * (0.5 + talk), width * 0.2]} outline={false} />
      </group>
    )
  }
  if (pose.mood === 'sad') {
    return <Part geometry={torus(28, 0.18)} color={ink} position={[0, y - 0.03, z]} rotation={[0, 0, 0]} scale={[width * 0.5, width * 0.28, width * 0.3]} outline={false} />
  }
  if (pose.mood === 'shocked') {
    return <Part geometry={sphere(20)} color={ink} position={[0, y, z]} scale={[width * 0.55, width * 0.75, width * 0.3]} outline={false} />
  }
  if (pose.mood === 'happy') {
    // offenes Lächeln: halber Ring
    return <Part geometry={torus(28, 0.28)} color={ink} position={[0, y + 0.03, z]} rotation={[0, 0, Math.PI]} scale={[width * 0.7, width * 0.6, width * 0.4]} outline={false} />
  }
  return <Part geometry={torus(28, 0.18)} color={ink} position={[0, y + 0.02, z]} rotation={[0, 0, Math.PI]} scale={[width * 0.55, width * 0.3, width * 0.3]} outline={false} />
}

export function Cheeks({ spread = 0.42, y = -0.12, z = 0.7, color = '#f4a3a0' }: { spread?: number; y?: number; z?: number; color?: string }) {
  return (
    <>
      {[-1, 1].map((side) => (
        <Part key={side} geometry={sphere(16)} color={color} position={[side * spread, y, z]} scale={[0.1, 0.06, 0.04]} outline={false} />
      ))}
    </>
  )
}
