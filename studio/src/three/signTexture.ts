/** Schilder mit Text (z. B. Bahnhofsschild) als Textur – mit den Projektschriften gezeichnet. */
import * as THREE from 'three'

export function signTexture({ lines, bg, fg, width = 1024, height = 384, font }: {
  lines: { text: string; size: number; weight?: number; color?: string; y: number }[]
  bg: string
  fg: string
  width?: number
  height?: number
  font: string
}): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = width; c.height = height
  const g = c.getContext('2d')!
  g.fillStyle = bg
  g.fillRect(0, 0, width, height)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (const l of lines) {
    g.fillStyle = l.color ?? fg
    g.font = `${l.weight ?? 700} ${l.size}px "${font}"`
    g.fillText(l.text, width / 2, l.y)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}
