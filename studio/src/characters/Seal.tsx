/** Ole – ein Seehund aus Hamburg mit gelbem Südwester. Alle Bewegungen kommen als `pose` (siehe actions.ts). */
import type { ReactNode } from 'react'
import { useLook, Part } from '../three/materials'
import { cone, cylinder, sphere } from '../three/shapes'
import { HeadExtras } from './Extras'
import { Cheeks, Eyes, Mouth } from './Face'
import type { Pose } from './types'

export const OLE_COLORS = { body: '#b7ada0', belly: '#ece5da', hat: '#f2c230', dark: '#7d756b' }

export function Seal({ pose, hold }: { pose: Pose; hold?: ReactNode }) {
  const look = useLook()
  const s = look.segments
  const { body, belly, hat, dark } = OLE_COLORS
  const breathe = 1 + Math.sin(pose.t * 2.2) * 0.012
  const sq = pose.squash ?? 1
  const out = (v = 0) => 0.2 + v * (Math.PI / 2)
  const fwd = (v = 0) => -v * (Math.PI / 2)
  return (
    <group position={[0, 0.02 + (pose.bounce ?? 0), 0]} rotation={[pose.lean ?? 0, 0, pose.sway ?? 0]} scale={[1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)]}>
      {/* Körper wie ein Tropfen: unten breit, oben der Kopf */}
      <Part geometry={sphere(s)} color={body} position={[0, 0.62, 0]} scale={[0.72 * breathe, 0.68, 0.62]} />
      <Part geometry={sphere(Math.max(s, 16))} color={belly} position={[0, 0.58, 0.22]} scale={[0.52, 0.52, 0.44]} />
      {/* Schwanzflossen */}
      {[-1, 1].map((side) => (
        <Part key={side} geometry={sphere(s)} color={dark} position={[side * 0.22, 0.06, -0.42]} rotation={[0.4, side * 0.5, 0]} scale={[0.2, 0.06, 0.26]} />
      ))}
      {/* Seitenflossen (Arme) – drehen an der Schulter */}
      <group position={[-0.6, 0.78, 0.08]} rotation={[fwd(pose.armLeftFwd), 0, -out(pose.armLeft)]}>
        <Part geometry={sphere(s)} color={dark} position={[0, -0.2, 0]} scale={[0.11, 0.26, 0.08]} />
      </group>
      <group position={[0.6, 0.78, 0.08]} rotation={[fwd(pose.armRightFwd), 0, out(pose.armRight)]}>
        <Part geometry={sphere(s)} color={dark} position={[0, -0.2, 0]} scale={[0.11, 0.26, 0.08]} />
        {hold && <group position={[0.02, -0.44, 0.06]}>{hold}</group>}
      </group>
      {/* Kopf */}
      <group position={[0, 1.33, 0.02]} rotation={[pose.headPitch ?? 0, pose.headYaw ?? 0, pose.tilt ?? 0]}>
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
        <Mouth pose={pose} y={-0.26} z={0.43} width={0.12} />
        <Cheeks spread={0.3} y={-0.08} z={0.4} />
        {/* Südwester: Krempe hinten länger */}
        <group position={[0, 0.3, -0.02]} rotation={[-0.18, 0, 0]}>
          <Part geometry={sphere(s)} color={hat} position={[0, 0.05, 0]} scale={[0.48, 0.3, 0.46]} />
          <Part geometry={cylinder(s, 1, 1)} color={hat} position={[0, -0.06, -0.05]} scale={[0.66, 0.035, 0.7]} />
          <Part geometry={cone(s)} color={hat} position={[0, 0.34, 0]} scale={[0.05, 0.08, 0.05]} />
        </group>
        <HeadExtras t={pose.t} questionAmount={pose.question} sweatAmount={pose.sweat} sparkleAmount={pose.sparkle} radius={0.55} />
      </group>
    </group>
  )
}
