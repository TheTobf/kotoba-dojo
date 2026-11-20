/** Nahaufnahmen ohne Figuren-Platz: Handy in Oles Flosse, Postkarte auf dem Tisch im Hamburger Fundbüro. */
import { useEffect, useMemo, useState } from 'react'
import { continueRender, delayRender, staticFile } from 'remotion'
import * as THREE from 'three'
import { OLE_COLORS } from '../characters/Seal'
import type { TBeat } from '../episode/timeline'
import { ease } from '../characters/actions'
import { Phone, Postcard } from '../props/Props'
import { Part } from '../three/materials'
import { box, cylinder, sphere, torus } from '../three/shapes'

let bokehTex: THREE.CanvasTexture | undefined
function bokeh(): THREE.CanvasTexture {
  if (bokehTex) return bokehTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.7, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
  bokehTex = new THREE.CanvasTexture(c)
  return bokehTex
}

function Bokeh({ colors }: { colors: string[] }) {
  const mats = useMemo(() => colors.map((c) => new THREE.SpriteMaterial({ map: bokeh(), color: c, transparent: true, depthWrite: false, opacity: 0.55 })), [colors])
  const spots = [[-1.6, 1.4, -3], [1.4, 1.0, -3.4], [0.6, -1.2, -3], [-1.1, -0.6, -2.6], [1.9, -0.2, -4], [-0.2, 1.9, -4.2]]
  return <>{spots.map(([x, y, z], i) => <sprite key={i} material={mats[i % mats.length]} position={[x, y, z]} scale={1.1 + (i % 3) * 0.4} />)}</>
}

export function HandyInsert({ beat, t }: { beat: TBeat; t: number }) {
  const off = beat.state.aus === 'ja'
  const level = typeof beat.state.akku === 'number' ? beat.state.akku : 1
  const blinkOn = Math.floor(t * 2.5) % 2 === 0
  const shake = level <= 1 && !off ? Math.sin(t * 31) * 0.006 : 0
  return (
    <group>
      <Bokeh colors={['#ffcf3f', '#9fd8cb', '#ff8f7a', '#ffffff']} />
      <group position={[shake, -0.05, 0]} rotation={[-0.12, 0.18, -0.06]}>
        <Phone percent={off ? -1 : level} bar={level > 1 || blinkOn} scale={1.15} />
        {/* Oles Flosse hält das Handy */}
        <Part geometry={sphere(40)} color={OLE_COLORS.dark} position={[0.24, -0.46, 0.1]} rotation={[0, 0, 0.7]} scale={[0.15, 0.36, 0.12]} />
        <Part geometry={sphere(40)} color={OLE_COLORS.body} position={[0.45, -0.98, 0.0]} scale={[0.4, 0.4, 0.32]} />
      </group>
    </group>
  )
}

export function PostkarteInsert({ beat, t }: { beat: TBeat; t: number }) {
  const side = beat.state.seite ?? 'vorne'
  const since = beat.stateSince.seite ?? beat.start
  const flip = side === 'hinten' ? 1 : side === 'dreht' ? ease((t - since - 0.4) / 0.9) : 0
  const hotel = beat.state.ort === 'hotel'
  return (
    <group>
      {/* Holztisch im Fundbüro bzw. Tresen im Hotel */}
      <Part geometry={box(48, 0.04)} color={hotel ? '#efe4d2' : '#c98f5e'} position={[0, -0.12, 0]} scale={[6, 0.2, 4]} receiveShadow />
      {hotel && <group position={[1.1, 0, 0.6]}><Part geometry={sphere(32)} color="#d9b45a" position={[0, 0.08, 0]} scale={[0.16, 0.12, 0.16]} glossy /></group>}
      {!hotel && [-2.2, -1.1, 0, 1.1, 2.2].map((x) => <Part key={x} geometry={box(8)} color="#b57d4f" position={[x, -0.015, 0]} scale={[0.02, 0.01, 4]} outline={false} castShadow={false} />)}
      <Postcard flip={flip} />
      {/* Fundbüro-Anhänger mit Schnur, Schlüsselbund, Stempel */}
      {!hotel && <group position={[1.25, 0.01, 0.55]} rotation={[0, -0.5, 0]}>
        <Part geometry={box(16)} color="#f4e7b5" scale={[0.42, 0.02, 0.24]} />
        <Part geometry={torus(24, 0.2)} color="#ffffff" position={[-0.17, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.035} outline={false} />
      </group>}
      {!hotel && <group position={[-1.35, 0.02, 0.7]}>
        <Part geometry={torus(32, 0.12)} color="#c7ccd6" rotation={[Math.PI / 2, 0, 0]} scale={0.13} glossy />
        <Part geometry={box(16)} color="#d9b45a" position={[0.18, 0, 0.05]} rotation={[0, 0.4, 0]} scale={[0.26, 0.02, 0.07]} glossy />
      </group>}
      {!hotel && <group position={[-1.2, 0, -0.9]}>
        <Part geometry={cylinder(32)} color="#3a6ea5" position={[0, 0.12, 0]} scale={[0.16, 0.24, 0.16]} />
        <Part geometry={sphere(32)} color="#8a5a3a" position={[0, 0.34, 0]} scale={[0.1, 0.1, 0.1]} />
      </group>}
      <pointLight position={[0.5, 2.2, 1.2]} intensity={6} color="#ffd9a0" distance={6} />
    </group>
  )
}

/** App-Video: Ole hält sein Handy mit einem echten Bildschirmfoto der App */
export function AppHandy({ beat, t }: { beat: TBeat; t: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!beat.screen) return
    const handle = delayRender(`Bildschirmfoto ${beat.screen}`)
    new THREE.TextureLoader().load(staticFile(beat.screen), (x) => { x.colorSpace = THREE.SRGBColorSpace; setTex(x); continueRender(handle) }, undefined, () => continueRender(handle))
  }, [beat.screen])
  const mat = useMemo(() => (tex ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : new THREE.MeshBasicMaterial({ color: '#1d2230' })), [tex])
  const sway = Math.sin(t * 1.4) * 0.03
  return (
    <group>
      <Bokeh colors={['#ffcf3f', '#9fd8cb', '#ff8f7a', '#ffffff']} />
      <group rotation={[-0.06, 0.12 + sway, -0.03]} position={[0, -0.05, 0]}>
        <Part geometry={box(24, 0.1)} color="#2c2f36" scale={[0.92, 1.9, 0.08]} glossy />
        <mesh position={[0, 0, 0.042]} material={mat}>
          <planeGeometry args={[0.84, 1.82]} />
        </mesh>
        <Part geometry={sphere(40)} color={OLE_COLORS.dark} position={[0.42, -0.72, 0.1]} rotation={[0, 0, 0.7]} scale={[0.15, 0.36, 0.12]} />
      </group>
    </group>
  )
}
