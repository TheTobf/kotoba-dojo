/** Kleine Zeichen über dem Kopf: Fragezeichen (verwirrt), Schweißtropfen (erstarrt), Funkeln (freut sich). */
import { useMemo } from 'react'
import * as THREE from 'three'
import { Part } from '../three/materials'
import { sphere } from '../three/shapes'

let questionTexture: THREE.CanvasTexture | undefined
function question(): THREE.CanvasTexture {
  if (questionTexture) return questionTexture
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.font = '900 220px "Zen Maru Gothic"'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  g.lineWidth = 26
  g.strokeStyle = '#2a2340'
  g.strokeText('?', 128, 140)
  g.fillStyle = '#ffcf3f'
  g.fillText('?', 128, 140)
  questionTexture = new THREE.CanvasTexture(c)
  questionTexture.colorSpace = THREE.SRGBColorSpace
  return questionTexture
}

let sparkleTexture: THREE.CanvasTexture | undefined
function sparkleTex(): THREE.CanvasTexture {
  if (sparkleTexture) return sparkleTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.translate(64, 64)
  g.fillStyle = '#ffd84d'
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? 60 : 14
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  g.closePath()
  g.fill()
  sparkleTexture = new THREE.CanvasTexture(c)
  sparkleTexture.colorSpace = THREE.SRGBColorSpace
  return sparkleTexture
}

export function HeadExtras({ t, questionAmount = 0, sweatAmount = 0, sparkleAmount = 0, radius = 0.55 }: {
  t: number; questionAmount?: number; sweatAmount?: number; sparkleAmount?: number; radius?: number
}) {
  const qMat = useMemo(() => new THREE.SpriteMaterial({ map: question(), transparent: true, depthWrite: false }), [])
  const sMat = useMemo(() => new THREE.SpriteMaterial({ map: sparkleTex(), transparent: true, depthWrite: false }), [])
  const wobble = Math.sin(t * 5) * 0.08
  const drop = (t * 0.55) % 1
  return (
    <group>
      {questionAmount > 0.01 && (
        <sprite material={qMat} position={[radius * 0.95, radius * 1.25 + wobble * 0.3, 0.1]} scale={0.55 * questionAmount} rotation={[0, 0, wobble]} />
      )}
      {sweatAmount > 0.01 && (
        <group position={[radius * 0.82, radius * 0.5 - drop * 0.35, radius * 0.45]} scale={sweatAmount}>
          <Part geometry={sphere(20)} color="#8fd3ff" scale={[0.07, 0.11, 0.07]} glossy outline={false} />
          <Part geometry={sphere(12)} color="#8fd3ff" position={[0, 0.09, 0]} scale={[0.035, 0.06, 0.035]} glossy outline={false} />
        </group>
      )}
      {sparkleAmount > 0.01 && [0, 1, 2].map((k) => {
        const a = k * 2.1 + t * 1.5
        const pulse = 0.6 + 0.4 * Math.sin(t * 7 + k * 2)
        return <sprite key={k} material={sMat} position={[Math.cos(a) * radius * 1.4, radius * (0.9 + 0.3 * Math.sin(a * 1.3)), Math.sin(a) * 0.3 + 0.3]} scale={0.24 * sparkleAmount * pulse} />
      })}
    </group>
  )
}
