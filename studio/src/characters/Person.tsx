/**
 * Menschen in Japan: schlicht, freundlich, im Knete-Stil. Aussehen kommt aus figures.ts,
 * Bewegungen aus derselben Pose wie bei Ole.
 */
import type { ReactNode } from 'react'
import { Part, useLook } from '../three/materials'
import { box, capsule, cylinder, sphere, torus } from '../three/shapes'
import { HeadExtras } from './Extras'
import { Cheeks, Eyes, Mouth } from './Face'
import type { PersonLook } from './figures'
import type { Pose } from './types'

export function Person({ look: p, pose, seated = false, hold, seed = 0 }: { look: PersonLook; pose: Pose; seated?: boolean; hold?: ReactNode; seed?: number }) {
  const look = useLook()
  const s = Math.max(look.segments, 24)
  const sc = p.scale ?? 1
  const sq = pose.squash ?? 1
  const hip = seated ? 0.95 : 1.1
  const out = (v = 0) => 0.12 + v * (Math.PI / 2)
  const fwd = (v = 0) => -v * (Math.PI / 2)
  const breathe = 1 + Math.sin(pose.t * 2 + seed) * 0.01
  return (
    <group scale={[sc / Math.sqrt(sq), sc * sq, sc / Math.sqrt(sq)]} position={[0, pose.bounce ?? 0, 0]}>
      {/* Beine (im Sitzen verdeckt der Schalter sie) */}
      {!seated && [-1, 1].map((side) => (
        <group key={side} position={[side * 0.2, 0, 0]}>
          <Part geometry={capsule(s)} color={p.trousers} position={[0, 0.55, 0]} scale={[0.25, 0.62, 0.27]} />
          <Part geometry={sphere(s)} color="#2b2826" position={[0, 0.08, 0.07]} scale={[0.15, 0.09, 0.22]} />
        </group>
      ))}
      <group position={[0, hip, 0]} rotation={[pose.lean ?? 0, 0, pose.sway ?? 0]}>
        {/* Oberkörper */}
        <Part geometry={capsule(s)} color={p.top} position={[0, 0.5, 0]} scale={[0.68 * breathe, 0.62, 0.48]} />
        {/* Kragen / Weste / Schürze */}
        <Part geometry={sphere(s)} color={p.accent} position={[0, 0.88, 0.16]} scale={[0.2, 0.12, 0.1]} />
        {p.nameTag && <Part geometry={box(16)} color="#ffffff" position={[0.18, 0.62, 0.245]} scale={[0.16, 0.07, 0.02]} outline={false} />}
        {p.hat === 'dienstmuetze' && <Part geometry={box(16)} color="#d9b45a" position={[-0.18, 0.66, 0.245]} scale={[0.07, 0.07, 0.02]} outline={false} />}
        {/* Arme */}
        <group position={[-0.37, 0.82, 0]} rotation={[fwd(pose.armLeftFwd), 0, -out(pose.armLeft)]}>
          <Part geometry={capsule(s)} color={p.top} position={[0, -0.3, 0]} scale={[0.17, 0.5, 0.17]} />
          <Part geometry={sphere(s)} color={p.skin} position={[0, -0.62, 0]} scale={0.1} />
        </group>
        <group position={[0.37, 0.82, 0]} rotation={[fwd(pose.armRightFwd), 0, out(pose.armRight)]}>
          <Part geometry={capsule(s)} color={p.top} position={[0, -0.3, 0]} scale={[0.17, 0.5, 0.17]} />
          <Part geometry={sphere(s)} color={p.skin} position={[0, -0.62, 0]} scale={0.1} />
          {hold && <group position={[0, -0.7, 0.05]}>{hold}</group>}
        </group>
        {/* Kopf */}
        <group position={[0, 1.38, 0]} rotation={[pose.headPitch ?? 0, pose.headYaw ?? 0, pose.tilt ?? 0]}>
          <Part geometry={cylinder(s)} color={p.skin} position={[0, -0.3, 0]} scale={[0.12, 0.2, 0.12]} />
          <Part geometry={sphere(s)} color={p.skin} scale={[0.4, 0.43, 0.4]} />
          <Part geometry={sphere(s)} color={p.skin} position={[-0.39, -0.02, 0]} scale={[0.06, 0.09, 0.05]} />
          <Part geometry={sphere(s)} color={p.skin} position={[0.39, -0.02, 0]} scale={[0.06, 0.09, 0.05]} />
          <Hair look={p} />
          <Eyes pose={pose} spread={0.15} size={0.06} y={0.02} z={0.36} seed={seed} />
          <Mouth pose={pose} y={-0.17} z={0.37} width={0.1} />
          <Cheeks spread={0.24} y={-0.08} z={0.33} color="#f2a99a" />
          <Part geometry={sphere(16)} color={shade(p.skin)} position={[0, -0.05, 0.39]} scale={[0.04, 0.035, 0.03]} outline={false} />
          {p.glasses && <Glasses />}
          {p.hat === 'dienstmuetze' && (
            <group position={[0, 0.3, 0]} rotation={[-0.08, 0, 0]}>
              <Part geometry={cylinder(s, 1, 0.9)} color={p.hatColor ?? '#2b3550'} scale={[0.43, 0.2, 0.43]} position={[0, 0.06, 0]} />
              <Part geometry={cylinder(s)} color="#1e2436" position={[0, -0.04, 0]} scale={[0.415, 0.05, 0.415]} />
              <Part geometry={cylinder(s)} color="#1a1a1a" position={[0, -0.06, 0.28]} rotation={[0.35, 0, 0]} scale={[0.26, 0.02, 0.2]} />
              <Part geometry={sphere(16)} color="#d9b45a" position={[0, 0.06, 0.41]} scale={[0.06, 0.06, 0.02]} outline={false} glossy />
            </group>
          )}
          {p.hat === 'kappe' && (
            <group position={[0, 0.26, 0]}>
              <Part geometry={sphere(s)} color={p.hatColor ?? '#3b6d9a'} scale={[0.42, 0.22, 0.42]} />
              <Part geometry={cylinder(s)} color={p.hatColor ?? '#3b6d9a'} position={[0, -0.04, 0.34]} rotation={[0.15, 0, 0]} scale={[0.26, 0.02, 0.22]} />
            </group>
          )}
          <HeadExtras t={pose.t} questionAmount={pose.question} sweatAmount={pose.sweat} sparkleAmount={pose.sparkle} radius={0.45} />
        </group>
      </group>
    </group>
  )
}

function Hair({ look: p }: { look: PersonLook }) {
  const look = useLook()
  const s = Math.max(look.segments, 24)
  const c = p.hair
  switch (p.hairStyle) {
    case 'kurz':
      return <Part geometry={sphere(s)} color={c} position={[0, 0.12, -0.04]} scale={[0.42, 0.36, 0.41]} />
    case 'seitenscheitel':
      return (
        <>
          <Part geometry={sphere(s)} color={c} position={[0, 0.13, -0.05]} scale={[0.42, 0.35, 0.41]} />
          <Part geometry={sphere(s)} color={c} position={[-0.12, 0.27, 0.2]} rotation={[0, 0, 0.4]} scale={[0.26, 0.1, 0.18]} />
        </>
      )
    case 'bob':
      return (
        <>
          <Part geometry={sphere(s)} color={c} position={[0, 0.1, -0.06]} scale={[0.45, 0.4, 0.43]} />
          <Part geometry={sphere(s)} color={c} position={[-0.32, -0.12, -0.02]} scale={[0.14, 0.26, 0.3]} />
          <Part geometry={sphere(s)} color={c} position={[0.32, -0.12, -0.02]} scale={[0.14, 0.26, 0.3]} />
          <Part geometry={sphere(s)} color={c} position={[0, 0.26, 0.22]} scale={[0.34, 0.1, 0.16]} />
        </>
      )
    case 'zopf':
      return (
        <>
          <Part geometry={sphere(s)} color={c} position={[0, 0.12, -0.05]} scale={[0.43, 0.38, 0.42]} />
          <Part geometry={sphere(s)} color={c} position={[0, 0.06, -0.47]} scale={[0.14, 0.14, 0.14]} />
          <Part geometry={capsule(s)} color={c} position={[0, -0.18, -0.52]} scale={[0.12, 0.34, 0.12]} />
        </>
      )
    case 'glatze-grau':
      return (
        <>
          <Part geometry={sphere(s)} color={c} position={[-0.33, 0.02, -0.1]} scale={[0.12, 0.16, 0.24]} />
          <Part geometry={sphere(s)} color={c} position={[0.33, 0.02, -0.1]} scale={[0.12, 0.16, 0.24]} />
          <Part geometry={sphere(s)} color={c} position={[0, 0.0, -0.33]} scale={[0.3, 0.18, 0.12]} />
        </>
      )
  }
}

function Glasses() {
  return (
    <group position={[0, 0.03, 0.38]}>
      {[-1, 1].map((side) => (
        <Part key={side} geometry={torus(32, 0.12)} color="#2b2826" position={[side * 0.15, 0, 0]} scale={[0.1, 0.085, 0.06]} outline={false} />
      ))}
      <Part geometry={box(8)} color="#2b2826" position={[0, 0.01, 0]} scale={[0.09, 0.015, 0.015]} outline={false} />
    </group>
  )
}

/** etwas dunklere Hautfarbe für die Nase */
function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.round(v * 0.9)).toString(16).padStart(2, '0')
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`
}
