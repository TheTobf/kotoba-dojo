/** Gemeinsame Teile für Szenen: Boden mit Fliesen, Wand, Schilder. */
import { useMemo } from 'react'
import * as THREE from 'three'
import { Part, useLook } from '../three/materials'
import { box } from '../three/shapes'
import { signTexture } from '../three/signTexture'

export function TiledFloor({ color = '#ebe5d9', line = '#d9d1c2', size = 30, step = 1.5 }: { color?: string; line?: string; size?: number; step?: number }) {
  const n = Math.floor(size / step / 2)
  return (
    <group>
      <Part geometry={box(8)} color={color} position={[0, -0.1, 0]} scale={[size, 0.2, size]} receiveShadow castShadow={false} outline={false} />
      {Array.from({ length: n * 2 + 1 }, (_, i) => (i - n) * step).map((v) => (
        <group key={v}>
          <Part geometry={box(8)} color={line} position={[v, 0.002, 0]} scale={[0.03, 0.004, size]} receiveShadow castShadow={false} outline={false} />
          <Part geometry={box(8)} color={line} position={[0, 0.002, v]} scale={[size, 0.004, 0.03]} receiveShadow castShadow={false} outline={false} />
        </group>
      ))}
    </group>
  )
}

/** Schild mit eigenem Text (Japanisch + Englisch), wie in japanischen Flughäfen/Bahnhöfen üblich. */
export function Sign({ ja, en, position, width = 3, height = 0.9, bg = '#253552', fg = '#ffffff', accent }: {
  ja: string; en?: string; position: [number, number, number]; width?: number; height?: number; bg?: string; fg?: string; accent?: string
}) {
  const look = useLook()
  const tex = useMemo(() => signTexture({
    font: look.text.font, bg, fg, width: Math.min(2048, Math.round(340 * (width / height))), height: 340,
    lines: en
      ? [{ text: ja, size: 128, weight: 900, y: 128, color: accent ?? fg }, { text: en, size: 64, weight: 700, y: 262 }]
      : [{ text: ja, size: 160, weight: 900, y: 175, color: accent ?? fg }],
  }), [look.text.font, ja, en, bg, fg, width, height, accent])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), [tex])
  return (
    <group position={position}>
      <Part geometry={box(24, 0.08)} color={bg} scale={[width + 0.12, height + 0.12, 0.1]} />
      <mesh position={[0, 0, 0.056]} material={mat}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  )
}

export function Wall({ z, color, band, height = 7, width = 30 }: { z: number; color: string; band?: string; height?: number; width?: number }) {
  return (
    <group>
      <Part geometry={box(8)} color={color} position={[0, height / 2, z]} scale={[width, height, 0.3]} receiveShadow castShadow={false} outline={false} />
      {band && <Part geometry={box(8)} color={band} position={[0, 0.6, z + 0.16]} scale={[width, 1.2, 0.04]} receiveShadow castShadow={false} outline={false} />}
    </group>
  )
}
