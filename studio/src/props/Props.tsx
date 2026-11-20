/** Gegenstände: Handy (mit Akku-Anzeige), Reisepass, Koffer, Postkarte. Alles eigene Formen, keine echten Marken. */
import { useMemo } from 'react'
import * as THREE from 'three'
import { Part, useLook } from '../three/materials'
import { box, cylinder, torus } from '../three/shapes'

/** Bildschirm des Handys: große Akku-Anzeige. percent < 0 = Bildschirm aus. */
function phoneScreen(percent: number, font: string, bar = true): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 1024
  const g = c.getContext('2d')!
  if (percent < 0) {
    g.fillStyle = '#101216'
    g.fillRect(0, 0, 512, 1024)
    const grad = g.createLinearGradient(0, 0, 512, 1024)
    grad.addColorStop(0, 'rgba(255,255,255,0.10)'); grad.addColorStop(0.5, 'rgba(255,255,255,0)')
    g.fillStyle = grad; g.fillRect(0, 0, 512, 1024)
  } else {
    g.fillStyle = '#1d2230'
    g.fillRect(0, 0, 512, 1024)
    g.fillStyle = '#ffffff'
    g.font = `700 40px "${font}"`
    g.textAlign = 'left'
    g.fillText('09:41', 40, 70)
    // großes Batteriesymbol
    const low = percent <= 10
    g.strokeStyle = '#ffffff'; g.lineWidth = 16
    roundRect(g, 136, 290, 240, 420, 34); g.stroke()
    g.fillStyle = '#ffffff'; roundRect(g, 206, 248, 100, 46, 14); g.fill()
    g.fillStyle = low ? '#ff4d4d' : '#4cd964'
    const h = Math.max(14, (380 * percent) / 100)
    if (bar) { roundRect(g, 158, 690 - h, 196, h, 16); g.fill() }
    g.fillStyle = low ? '#ff4d4d' : '#ffffff'
    g.font = `900 120px "${font}"`
    g.textAlign = 'center'
    g.fillText(`${percent} %`, 256, 870)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}

export function Phone({ percent = 1, scale = 1, bar = true }: { percent?: number; scale?: number; bar?: boolean }) {
  const look = useLook()
  const tex = useMemo(() => phoneScreen(percent, look.text.font, bar), [percent, look.text.font, bar])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), [tex])
  return (
    <group scale={scale}>
      <Part geometry={box(24, 0.18)} color="#2c2f36" scale={[0.5, 1.0, 0.07]} glossy />
      <mesh position={[0, 0, 0.037]} material={mat}>
        <planeGeometry args={[0.44, 0.9]} />
      </mesh>
    </group>
  )
}

export function Passport({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <Part geometry={box(16, 0.1)} color="#6e2433" scale={[0.3, 0.42, 0.04]} />
      <Part geometry={box(8)} color="#d7b35c" position={[0, 0.06, 0.021]} scale={[0.12, 0.12, 0.004]} outline={false} />
      <Part geometry={box(8)} color="#d7b35c" position={[0, -0.12, 0.021]} scale={[0.18, 0.02, 0.004]} outline={false} />
    </group>
  )
}

export function Suitcase({ color = '#4f86c6', scale = 1, handleUp = false }: { color?: string; scale?: number; handleUp?: boolean }) {
  const look = useLook()
  const s = Math.max(16, look.segments)
  return (
    <group scale={scale}>
      <Part geometry={box(s, 0.16)} color={color} position={[0, 0.42, 0]} scale={[0.62, 0.8, 0.34]} />
      {[-0.17, 0, 0.17].map((x) => (
        <Part key={x} geometry={box(8)} color={darker(color)} position={[x, 0.42, 0.172]} scale={[0.035, 0.66, 0.01]} outline={false} />
      ))}
      <Part geometry={torus(24, 0.25)} color="#2b2826" position={[0, handleUp ? 1.05 : 0.86, 0]} rotation={[0, 0, 0]} scale={[0.12, 0.08, 0.08]} />
      {[-0.22, 0.22].map((x) => (
        <Part key={x} geometry={cylinder(s)} color="#2b2826" position={[x, 0.03, -0.1]} rotation={[0, 0, Math.PI / 2]} scale={[0.05, 0.04, 0.05]} />
      ))}
    </group>
  )
}

/** Postkarte: vorne ein Ramen-Stand unter roter Laterne, hinten die Nachricht von „K.“ */
export function Postcard({ flip = 0, scale = 1 }: { flip?: number; scale?: number }) {
  const look = useLook()
  const front = useMemo(() => postcardFront(), [])
  const back = useMemo(() => postcardBack(look.text.font), [look.text.font])
  const mf = useMemo(() => new THREE.MeshStandardMaterial({ map: front, roughness: 0.85 }), [front])
  const mb = useMemo(() => new THREE.MeshStandardMaterial({ map: back, roughness: 0.85 }), [back])
  const lift = Math.sin(flip * Math.PI) * 0.35
  return (
    <group scale={scale} position={[0, lift, 0]} rotation={[0, 0, flip * Math.PI]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={mf} castShadow receiveShadow>
        <planeGeometry args={[1.1, 1.6]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, Math.PI]} position={[0, -0.006, 0]} material={mb} castShadow>
        <planeGeometry args={[1.1, 1.6]} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.1, 0.01, 1.6]} />
        <meshStandardMaterial color="#efe6d2" />
      </mesh>
    </group>
  )
}

function postcardFront(): THREE.CanvasTexture {
  // Hochformat 704 × 1024: Ramen-Stand unter roter Laterne am Abend
  const W = 704, H = 1024
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  const sky = g.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#2d3a63'); sky.addColorStop(0.55, '#8a5a78'); sky.addColorStop(1, '#e59a6a')
  g.fillStyle = sky; g.fillRect(0, 0, W, H)
  g.fillStyle = '#3b3550'
  for (const [x, w, h] of [[0, 150, 430], [140, 120, 520], [250, 170, 380], [440, 130, 500], [560, 144, 420]]) g.fillRect(x, H - 250 - h, w, h)
  g.fillStyle = 'rgba(255,214,150,0.8)'
  for (const [x, y] of [[40, 420], [90, 470], [180, 360], [300, 460], [470, 380], [600, 450], [520, 520]]) g.fillRect(x, y, 22, 30)
  // Stand
  g.fillStyle = '#7b5236'; g.beginPath(); g.moveTo(80, 560); g.lineTo(624, 560); g.lineTo(580, 500); g.lineTo(124, 500); g.closePath(); g.fill()
  g.fillStyle = '#5a3d2b'; g.fillRect(100, 560, 504, 28)
  g.fillStyle = '#2f4a6b'
  for (let i = 0; i < 4; i++) g.fillRect(118 + i * 120, 588, 108, 140)
  g.fillStyle = '#f3ead6'; g.font = '700 72px serif'; g.textAlign = 'center'
  ;['ら', 'ー', 'め', 'ん'].forEach((ch, i) => g.fillText(ch, 172 + i * 120, 680))
  g.fillStyle = '#8c5a3a'; g.fillRect(100, 728, 504, 120)
  g.fillStyle = '#6b4329'; g.fillRect(100, 840, 504, 22)
  // Laterne mit Schein
  const glow = g.createRadialGradient(560, 380, 10, 560, 380, 190)
  glow.addColorStop(0, 'rgba(255,170,110,0.75)'); glow.addColorStop(1, 'rgba(255,170,110,0)')
  g.fillStyle = glow; g.fillRect(340, 160, 364, 440)
  g.fillStyle = '#2b2321'; g.fillRect(556, 250, 8, 60)
  g.fillStyle = '#d2392b'; g.beginPath(); g.ellipse(560, 380, 64, 88, 0, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#2b2321'; g.fillRect(532, 286, 56, 14); g.fillRect(532, 462, 56, 14)
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 12; g.lineCap = 'round'
  for (const x of [250, 420]) { g.beginPath(); g.moveTo(x, 728); g.bezierCurveTo(x - 34, 690, x + 34, 660, x, 610); g.stroke() }
  g.fillStyle = '#4a3c3a'; g.fillRect(0, 862, W, H - 862)
  g.strokeStyle = '#f4ecdc'; g.lineWidth = 40; g.strokeRect(0, 0, W, H)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function postcardBack(font: string): THREE.CanvasTexture {
  // Hochformat: oben die Nachricht, unten Anschrift, Marke und Stempel
  const W = 704, H = 1024
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#f2e9d6'; g.fillRect(0, 0, W, H)
  const age = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 700)
  age.addColorStop(0, 'rgba(0,0,0,0)'); age.addColorStop(1, 'rgba(150,110,60,0.25)')
  g.fillStyle = age; g.fillRect(0, 0, W, H)
  g.fillStyle = '#2c3550'
  g.textAlign = 'left'
  g.font = '700 84px "Noto Serif JP"'
  g.fillText('いつでも', 70, 200)
  g.fillText('帰っておいで。', 70, 310)
  g.font = '700 70px "Noto Serif JP"'
  g.fillText('― K.', 400, 430)
  g.strokeStyle = '#b9a98c'; g.lineWidth = 3
  g.beginPath(); g.moveTo(60, 520); g.lineTo(W - 60, 520); g.stroke()
  for (const y of [700, 790, 880]) { g.beginPath(); g.moveTo(90, y); g.lineTo(W - 90, y); g.stroke() }
  g.font = `500 52px "${font}"`
  g.fillText('Anna', 110, 685)
  g.fillText('Hamburg', 110, 775)
  g.fillText('Germany', 110, 865)
  g.fillStyle = '#c98a4a'; g.fillRect(W - 190, 550, 120, 140)
  g.fillStyle = '#f2e9d6'; g.fillRect(W - 178, 562, 96, 116)
  g.fillStyle = '#d2392b'; g.beginPath(); g.arc(W - 130, 620, 32, 0, Math.PI * 2); g.fill()
  g.strokeStyle = 'rgba(60,60,90,0.7)'; g.lineWidth = 5
  g.beginPath(); g.arc(W - 260, 620, 66, 0, Math.PI * 2); g.stroke()
  g.fillStyle = 'rgba(60,60,90,0.7)'; g.font = `700 28px "${font}"`; g.textAlign = 'center'
  g.fillText('TOKYO', W - 260, 612); g.fillText('1994', W - 260, 648)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function darker(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.round(v * 0.8).toString(16).padStart(2, '0')
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`
}

export function TeaBottle({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <Part geometry={cylinder(32)} color="#7cc47a" position={[0, 0.18, 0]} scale={[0.07, 0.36, 0.07]} glossy opacity={0.85} />
      <Part geometry={cylinder(32)} color="#f3efe2" position={[0, 0.2, 0]} scale={[0.072, 0.14, 0.072]} />
      <Part geometry={cylinder(32)} color="#3f7d3c" position={[0, 0.4, 0]} scale={[0.04, 0.05, 0.04]} />
    </group>
  )
}

export function Adapter({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <Part geometry={box(16, 0.2)} color="#f4f4f2" scale={[0.16, 0.12, 0.2]} />
      {[-0.035, 0.035].map((x) => <Part key={x} geometry={box(8)} color="#c7ccd6" position={[x, 0, 0.13]} scale={[0.012, 0.035, 0.07]} outline={false} glossy />)}
    </group>
  )
}

export function PropFor({ prop }: { prop?: string }) {
  switch (prop) {
    case 'handy': return <group rotation={[-0.3, 0, 0]}><Phone scale={0.45} /></group>
    case 'pass': return <group rotation={[-0.4, 0, 0]}><Passport scale={0.8} /></group>
    case 'postkarte': return <group rotation={[Math.PI / 2 - 0.3, 0, 0]}><Postcard scale={0.32} /></group>
    case 'koffer': return <group position={[0, -0.95, 0]}><Suitcase handleUp scale={0.9} /></group>
    case 'tee': return <group position={[0, -0.12, 0.04]}><TeaBottle scale={0.9} /></group>
    case 'adapter': return <group rotation={[-0.3, 0, 0]}><Adapter scale={0.9} /></group>
    default: return null
  }
}
