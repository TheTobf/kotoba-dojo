/** Entwurf 2 – „Pieks“, ein Igel mit rotem Wanderrucksack. */
import { useMemo } from 'react'
import { useLook, Part } from '../three/materials'
import { box, cone, cylinder, sphere } from '../three/shapes'
import { Cheeks, Eyes, Mouth } from './Face'
import type { Pose } from './types'

/** Stacheln gleichmäßig auf dem Rücken verteilt (Fibonacci-Kugel, nur hintere und obere Hälfte). */
function useSpikes(count: number) {
  return useMemo(() => {
    const out: { pos: [number, number, number]; rot: [number, number, number] }[] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const a = i * golden
      const x = Math.cos(a) * r, z = Math.sin(a) * r
      if (z > 0.25 || y < -0.35) continue // Gesicht und Bauch frei lassen
      const dir = { x, y, z }
      const pitch = Math.acos(dir.y)
      const yaw = Math.atan2(dir.x, dir.z)
      out.push({ pos: [x, y, z], rot: [pitch, yaw, 0] })
    }
    return out
  }, [count])
}

export function Hedgehog({ pose }: { pose: Pose }) {
  const look = useLook()
  const s = look.segments
  const fur = '#8a5f3c', spike = '#4f3420', face = '#f0d3a8', pack = '#d9453a'
  const spikes = useSpikes(look.material === 'paper' ? 70 : 120)
  const breathe = 1 + Math.sin(pose.t * 2.4) * 0.015
  return (
    <group position={[0, 0.05 + (pose.bounce ?? 0), 0]}>
      {/* Füße */}
      {[-1, 1].map((side) => (
        <Part key={side} geometry={sphere(s)} color={face} position={[side * 0.25, 0.08, 0.18]} scale={[0.16, 0.09, 0.22]} />
      ))}
      <group position={[0, 0.78, 0]} rotation={[0, 0, pose.tilt ?? 0]} scale={[breathe, 1, breathe]}>
        {/* Körper */}
        <Part geometry={sphere(s)} color={fur} scale={[0.7, 0.72, 0.66]} />
        {/* Stacheln */}
        {spikes.map((sp, i) => (
          <group key={i} position={[sp.pos[0] * 0.66, sp.pos[1] * 0.68, sp.pos[2] * 0.62]} rotation={[0, sp.rot[1], 0]}>
            <group rotation={[sp.rot[0], 0, 0]}>
              <Part geometry={cone(s)} color={spike} position={[0, 0.12, 0]} scale={[0.07, 0.26, 0.07]} castShadow={false} />
            </group>
          </group>
        ))}
        {/* Gesicht: helle Maske und Spitznase */}
        <Part geometry={sphere(s)} color={face} position={[0, -0.05, 0.38]} scale={[0.5, 0.48, 0.36]} />
        <group position={[0, -0.12, 0.66]} rotation={[Math.PI / 2, 0, 0]}>
          <Part geometry={cone(s)} color={face} scale={[0.15, 0.26, 0.15]} />
        </group>
        <Part geometry={sphere(16)} color={look.palette.ink} position={[0, -0.12, 0.8]} scale={0.06} outline={false} glossy />
        <Eyes pose={pose} spread={0.18} size={0.085} y={0.1} z={0.68} />
        <Mouth pose={pose} y={-0.27} z={0.66} width={0.09} />
        <Cheeks spread={0.3} y={-0.1} z={0.62} />
        {/* Ärmchen */}
        <group position={[-0.55, -0.15, 0.25]} rotation={[0, 0, -0.3 - (pose.armLeft ?? 0) * 1.8]}>
          <Part geometry={sphere(s)} color={face} position={[0, -0.12, 0]} scale={[0.09, 0.18, 0.09]} />
        </group>
        <group position={[0.55, -0.15, 0.25]} rotation={[0, 0, 0.3 + (pose.armRight ?? 0) * 1.8]}>
          <Part geometry={sphere(s)} color={face} position={[0, -0.12, 0]} scale={[0.09, 0.18, 0.09]} />
        </group>
        {/* Rucksack mit Trägern */}
        <Part geometry={box(s, 0.18)} color={pack} position={[0, 0.02, -0.72]} scale={[0.6, 0.62, 0.3]} />
        <Part geometry={box(s, 0.2)} color="#b8352c" position={[0, -0.12, -0.9]} scale={[0.4, 0.26, 0.1]} />
        <Part geometry={cylinder(s)} color="#f2c230" position={[0, 0.36, -0.74]} rotation={[0, 0, Math.PI / 2]} scale={[0.07, 0.62, 0.07]} />
      </group>
    </group>
  )
}
