/** Entwurf 1 – „Ole“, ein Seehund aus der Nordsee mit gelbem Südwester (Regenhut). */
import { useLook, Part } from '../three/materials'
import { cone, cylinder, sphere } from '../three/shapes'
import { Cheeks, Eyes, Mouth } from './Face'
import type { Pose } from './types'

export function Seal({ pose }: { pose: Pose }) {
  const look = useLook()
  const s = look.segments
  const body = '#b7ada0', belly = '#ece5da', hat = '#f2c230', dark = '#7d756b'
  const breathe = 1 + Math.sin(pose.t * 2.2) * 0.012
  const flip = (v = 0) => -0.2 - v * 1.6
  return (
    <group position={[0, 0.02 + (pose.bounce ?? 0), 0]}>
      {/* Körper wie ein Tropfen: unten breit, oben der Kopf */}
      <Part geometry={sphere(s)} color={body} position={[0, 0.62, 0]} scale={[0.72 * breathe, 0.68, 0.62]} />
      <Part geometry={sphere(Math.max(s, 16))} color={belly} position={[0, 0.58, 0.22]} scale={[0.52, 0.52, 0.44]} />
      {/* Schwanzflossen */}
      {[-1, 1].map((side) => (
        <Part key={side} geometry={sphere(s)} color={dark} position={[side * 0.22, 0.06, -0.42]} rotation={[0.4, side * 0.5, 0]} scale={[0.2, 0.06, 0.26]} />
      ))}
      {/* Seitenflossen (Arme) */}
      <group position={[-0.62, 0.62, 0.05]} rotation={[0, 0, -flip(pose.armLeft)]}>
        <Part geometry={sphere(s)} color={dark} position={[-0.05, -0.18, 0]} scale={[0.12, 0.26, 0.08]} />
      </group>
      <group position={[0.62, 0.62, 0.05]} rotation={[0, 0, flip(pose.armRight)]}>
        <Part geometry={sphere(s)} color={dark} position={[0.05, -0.18, 0]} scale={[0.12, 0.26, 0.08]} />
      </group>
      {/* Kopf */}
      <group position={[0, 1.33, 0.02]} rotation={[0, 0, pose.tilt ?? 0]}>
        <Part geometry={sphere(s)} color={body} scale={[0.56, 0.5, 0.52]} />
        {/* Schnauze */}
        <Part geometry={sphere(s)} color={belly} position={[-0.1, -0.12, 0.42]} scale={[0.15, 0.12, 0.12]} />
        <Part geometry={sphere(s)} color={belly} position={[0.1, -0.12, 0.42]} scale={[0.15, 0.12, 0.12]} />
        <Part geometry={sphere(16)} color={look.palette.ink} position={[0, -0.03, 0.52]} scale={[0.07, 0.05, 0.05]} outline={false} glossy />
        {[-1, 1].map((side) =>
          [0, 1, 2].map((k) => (
            <Part key={`${side}${k}`} geometry={sphere(8)} color={dark} position={[side * (0.1 + k * 0.035), -0.11 - (k % 2) * 0.03, 0.535]} scale={0.012} outline={false} />
          )),
        )}
        <Eyes pose={pose} spread={0.2} size={0.1} y={0.1} z={0.43} />
        <Mouth pose={pose} y={-0.25} z={0.44} width={0.1} />
        <Cheeks spread={0.3} y={-0.08} z={0.4} />
        {/* Südwester: Krempe hinten länger */}
        <group position={[0, 0.3, -0.02]} rotation={[-0.18, 0, 0]}>
          <Part geometry={sphere(s)} color={hat} position={[0, 0.05, 0]} scale={[0.48, 0.3, 0.46]} />
          <Part geometry={cylinder(s, 1, 1)} color={hat} position={[0, -0.06, -0.05]} scale={[0.66, 0.035, 0.7]} />
          <Part geometry={cone(s)} color={hat} position={[0, 0.34, 0]} scale={[0.05, 0.08, 0.05]} />
        </group>
      </group>
    </group>
  )
}
