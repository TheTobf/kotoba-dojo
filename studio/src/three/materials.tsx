/** Materialien je Look. Figuren und Szenen nutzen nur <Part color="…">, der Look entscheidet über das Aussehen. */
import { createContext, useContext, type ReactNode } from 'react'
import * as THREE from 'three'
import { LOOKS, type Look, type LookId } from '../look/looks'

const LookContext = createContext<Look>(LOOKS.washi)
export const useLook = () => useContext(LookContext)

export function LookProvider({ look, children }: { look: LookId; children: ReactNode }) {
  return <LookContext.Provider value={LOOKS[look]}>{children}</LookContext.Provider>
}

/** Feine Papierfaser als Textur (zufällig, aber immer gleich – damit jedes Bild identisch rendert). */
let paperTexture: THREE.CanvasTexture | undefined
function paperGrain(): THREE.CanvasTexture {
  if (paperTexture) return paperTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  let seed = 7
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const image = ctx.createImageData(size, size)
  for (let i = 0; i < size * size; i++) {
    const v = 232 + random() * 23
    image.data.set([v, v, v, 255], i * 4)
  }
  ctx.putImageData(image, 0, 0)
  ctx.globalAlpha = 0.18
  for (let i = 0; i < 220; i++) {
    ctx.strokeStyle = random() > 0.5 ? '#ffffff' : '#cfc6b8'
    ctx.beginPath()
    const x = random() * size, y = random() * size
    ctx.moveTo(x, y)
    ctx.lineTo(x + (random() - 0.5) * 40, y + (random() - 0.5) * 40)
    ctx.stroke()
  }
  paperTexture = new THREE.CanvasTexture(canvas)
  paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping
  paperTexture.repeat.set(2, 2)
  return paperTexture
}

let toonRamp: THREE.DataTexture | undefined
function toonGradient(): THREE.DataTexture {
  if (toonRamp) return toonRamp
  const steps = new Uint8Array([90, 175, 255])
  toonRamp = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat)
  toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter
  toonRamp.needsUpdate = true
  return toonRamp
}

const materialCache = new Map<string, THREE.Material>()

/** Material im Look. Gleiche Farbe = gleiches Material (spart Speicher und Zeit beim Rendern). */
export function lookMaterial(look: Look, color: string, { glossy = false, emissive, opacity }: { glossy?: boolean; emissive?: string; opacity?: number } = {}): THREE.Material {
  const key = `${look.material}|${color}|${glossy}|${emissive ?? ''}|${opacity ?? 1}`
  let m = materialCache.get(key)
  if (!m) {
    const transparent = opacity !== undefined && opacity < 1
    const common = { color, emissive: emissive ?? '#000000', transparent, opacity: opacity ?? 1, depthWrite: !transparent }
    switch (look.material) {
      case 'paper': m = new THREE.MeshLambertMaterial({ ...common, flatShading: true, map: paperGrain() }); break
      case 'clay': m = new THREE.MeshStandardMaterial({ ...common, roughness: glossy ? 0.25 : 0.62, metalness: 0 }); break
      case 'toon': m = new THREE.MeshToonMaterial({ ...common, gradientMap: toonGradient() }); break
    }
    materialCache.set(key, m)
  }
  return m
}

export function useLookMaterial(color: string, options: { glossy?: boolean; emissive?: string; opacity?: number } = {}) {
  const look = useLook()
  return lookMaterial(look, color, options)
}

const outlineMaterial = new THREE.MeshBasicMaterial({ color: '#1c1a17', side: THREE.BackSide })

/**
 * Ein Bauteil: Form + Material des Looks. Im Holzschnitt-Look bekommt jedes Teil eine schwarze Umrisslinie
 * (dieselbe Form, etwas größer, nur die Rückseite sichtbar).
 */
export function Part({
  geometry, color, position, rotation, scale, glossy, emissive, opacity, outline = true, castShadow = true, receiveShadow = false,
}: {
  geometry: THREE.BufferGeometry
  color: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  glossy?: boolean
  emissive?: string
  /** < 1 = durchsichtig (Glas) */
  opacity?: number
  outline?: boolean
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const look = useLook()
  const material = useLookMaterial(color, { glossy, emissive, opacity })
  const s: [number, number, number] = typeof scale === 'number' ? [scale, scale, scale] : scale ?? [1, 1, 1]
  return (
    <group position={position} rotation={rotation} scale={s}>
      <mesh geometry={geometry} material={material} castShadow={castShadow} receiveShadow={receiveShadow} />
      {look.outline && outline && <mesh geometry={geometry} material={outlineMaterial} scale={1.06} />}
    </group>
  )
}
