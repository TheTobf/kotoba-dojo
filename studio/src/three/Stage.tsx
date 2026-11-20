/** Bühne: Licht, Himmel und Kamera im jeweiligen Look. */
import { useThree } from '@react-three/fiber'
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { useLook } from './materials'

/** Himmel als senkrechter Farbverlauf hinter allem. */
export function Sky() {
  const look = useLook()
  const { scene } = useThree()
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const g = c.getContext('2d')!
    const grad = g.createLinearGradient(0, 0, 0, 256)
    grad.addColorStop(0, look.palette.skyTop)
    grad.addColorStop(1, look.palette.skyBottom)
    g.fillStyle = grad
    g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [look])
  // Direkt beim Rendern setzen: Remotion zeichnet jedes Bild sofort, Effekte kämen zu spät.
  scene.background = texture
  return null
}

export function Lights() {
  const look = useLook()
  const { ambient, sun, sunColor, hemiSky, hemiGround, shadows } = look.light
  return (
    <>
      <ambientLight intensity={ambient} />
      <hemisphereLight args={[hemiSky, hemiGround, 0.6]} />
      <directionalLight
        position={[4, 7, 5]} intensity={sun} color={sunColor} castShadow={shadows}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8}
        shadow-bias={-0.0005} shadow-radius={6}
      />
      <directionalLight position={[-5, 3, 2]} intensity={sun * 0.25} color={hemiSky} />
    </>
  )
}

export function CameraRig({ position, target, fov = 40 }: { position: [number, number, number]; target: [number, number, number]; fov?: number }) {
  const { camera } = useThree()
  // Direkt beim Rendern setzen (nicht in einem Effekt), damit das Bild schon mit dieser Kamera entsteht.
  camera.position.set(...position)
  ;(camera as THREE.PerspectiveCamera).fov = fov
  camera.lookAt(...target)
  camera.updateProjectionMatrix()
  return null
}

export function StageContent({ children }: { children: ReactNode }) {
  return (
    <>
      <Sky />
      <Lights />
      {children}
    </>
  )
}
