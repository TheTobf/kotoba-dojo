/** Entwurf 3 – „Jonte“, eine Hamburger Hafenmöwe mit Matrosenmütze. */
import { useLook, Part } from '../three/materials'
import { cone, cylinder, sphere } from '../three/shapes'
import { Cheeks, Eyes } from './Face'
import type { Pose } from './types'

export function Gull({ pose }: { pose: Pose }) {
  const look = useLook()
  const s = look.segments
  const white = '#f7f5f0', grey = '#9aa3ab', beak = '#f2b632', leg = '#f08a3c', band = '#2f4a6b'
  const breathe = 1 + Math.sin(pose.t * 2.1) * 0.012
  return (
    <group position={[0, 0.02 + (pose.bounce ?? 0), 0]}>
      {/* Beine und Füße */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.16, 0, 0.05]}>
          <Part geometry={cylinder(s)} color={leg} position={[0, 0.18, 0]} scale={[0.035, 0.34, 0.035]} />
          <Part geometry={cone(s)} color={leg} position={[0, 0.02, 0.1]} rotation={[Math.PI / 2, 0, 0]} scale={[0.1, 0.22, 0.03]} />
        </group>
      ))}
      {/* Körper */}
      <Part geometry={sphere(s)} color={white} position={[0, 0.78, 0]} scale={[0.5 * breathe, 0.52, 0.48]} />
      <Part geometry={sphere(s)} color={grey} position={[0, 0.86, -0.22]} scale={[0.46, 0.38, 0.34]} />
      {/* Flügel */}
      <group position={[-0.46, 0.86, -0.02]} rotation={[0, 0, -0.15 - (pose.armLeft ?? 0) * 1.9]}>
        <Part geometry={sphere(s)} color={grey} position={[0, -0.16, 0]} scale={[0.1, 0.32, 0.26]} />
        <Part geometry={sphere(s)} color="#3b3f45" position={[0, -0.44, -0.04]} scale={[0.07, 0.1, 0.16]} />
      </group>
      <group position={[0.46, 0.86, -0.02]} rotation={[0, 0, 0.15 + (pose.armRight ?? 0) * 1.9]}>
        <Part geometry={sphere(s)} color={grey} position={[0, -0.16, 0]} scale={[0.1, 0.32, 0.26]} />
        <Part geometry={sphere(s)} color="#3b3f45" position={[0, -0.44, -0.04]} scale={[0.07, 0.1, 0.16]} />
      </group>
      {/* Kopf */}
      <group position={[0, 1.42, 0.02]} rotation={[0, 0, pose.tilt ?? 0]}>
        <Part geometry={sphere(s)} color={white} scale={[0.42, 0.42, 0.4]} />
        {/* Schnabel mit rotem Punkt */}
        <group position={[0, -0.1, 0.34]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
          <Part geometry={cone(s)} color={beak} scale={[0.17, 0.36, 0.1]} position={[0, 0.16, 0]} />
        </group>
        {/* roter Fleck am Unterschnabel – wie bei echten Silbermöwen */}
        <Part geometry={sphere(12)} color="#d23b2e" position={[0, -0.2, 0.47]} scale={0.032} outline={false} />
        <Eyes pose={pose} spread={0.17} size={0.08} y={0.08} z={0.35} />
        <Cheeks spread={0.25} y={-0.04} z={0.32} />
        {/* Matrosenmütze */}
        <group position={[0, 0.34, 0]} rotation={[-0.12, 0, 0.12]}>
          <Part geometry={cylinder(s, 1, 0.92)} color={white} scale={[0.34, 0.14, 0.34]} />
          <Part geometry={cylinder(s)} color={band} position={[0, -0.06, 0]} scale={[0.355, 0.05, 0.355]} />
          <Part geometry={cylinder(s)} color="#1c1a17" position={[0, -0.09, 0.14]} rotation={[0.25, 0, 0]} scale={[0.22, 0.015, 0.16]} />
        </group>
      </group>
    </group>
  )
}
