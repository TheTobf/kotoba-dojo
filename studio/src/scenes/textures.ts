/** Eigene Texturen für Szenen (Fahrpreistafel, Automaten-Bildschirm, Fenster bei Nacht …) – alles selbst gezeichnet. */
import * as THREE from 'three'

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const cache = new Map<string, THREE.CanvasTexture>()
const memo = (key: string, make: () => THREE.CanvasTexture) => { let t = cache.get(key); if (!t) { t = make(); cache.set(key, t) } return t }

/** Fahrpreistafel mit erfundenen Linien und Stationen (Higashimachi ist dabei) */
export const fareMap = (font: string) => memo(`fare-${font}`, () => canvas(1536, 640, (g) => {
  g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, 1536, 640)
  const lines: [string, number][] = [['#e2574c', 170], ['#4f86c6', 330], ['#5fae6e', 490]]
  const stations = [['くうこう', 140], ['みなと', 260], ['とうきょう', 480], ['しんかわ', 700], ['ひがしまち', 940], ['もりした', 1180], ['おおはし', 1380]] as const
  for (const [c, y] of lines) { g.strokeStyle = c; g.lineWidth = 22; g.lineCap = 'round'; g.beginPath(); g.moveTo(100, y); g.lineTo(1440, y); g.stroke() }
  g.strokeStyle = '#2a2340'; g.lineWidth = 10
  g.beginPath(); g.moveTo(480, 170); g.lineTo(480, 490); g.stroke()
  stations.forEach(([name, x], i) => {
    lines.forEach(([, y], k) => {
      if ((k + i) % 2 && x !== 480) return
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 20, 0, Math.PI * 2); g.fill(); g.lineWidth = 8; g.strokeStyle = '#2a2340'; g.stroke()
    })
    g.fillStyle = name === 'ひがしまち' ? '#c0392b' : '#2a2340'
    g.font = `700 40px "${font}"`; g.textAlign = 'center'; g.fillText(name, x, 100)
    g.font = `900 46px "${font}"`; g.fillStyle = '#2a2340'; g.fillText(String([270, 220, 170, 220, 480, 560, 640][i]), x, 600)
  })
  g.font = `900 40px "${font}"`; g.textAlign = 'left'; g.fillStyle = '#2a2340'; g.fillText('運賃 · Fares (円)', 40, 560)
}))

/** Bildschirm des Fahrkartenautomaten: Preis-Tasten */
export const ticketScreen = (font: string) => memo(`ticket-${font}`, () => canvas(512, 384, (g) => {
  g.fillStyle = '#1f3b63'; g.fillRect(0, 0, 512, 384)
  g.fillStyle = '#ffffff'; g.font = `700 34px "${font}"`; g.textAlign = 'center'; g.fillText('きっぷ · Ticket', 256, 52)
  const prices = [140, 170, 220, 270, 480, 560]
  prices.forEach((p, i) => {
    const x = 40 + (i % 3) * 152, y = 90 + Math.floor(i / 3) * 138
    g.fillStyle = p === 480 ? '#ffcf3f' : '#e9eef6'
    g.beginPath(); g.roundRect(x, y, 128, 112, 18); g.fill()
    g.fillStyle = '#1f3b63'; g.font = `900 44px "${font}"`; g.fillText(String(p), x + 64, y + 72)
  })
}))

/** Getränkeautomat: Reihen mit Flaschen (eigene Formen, keine Marken) */
export const drinksFront = () => memo('drinks', () => canvas(512, 768, (g) => {
  g.fillStyle = '#eef4fb'; g.fillRect(0, 0, 512, 768)
  const colors = ['#7cc47a', '#e2574c', '#f2c230', '#4f86c6', '#8c6ad1', '#f08a3c']
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const x = 30 + c * 78, y = 40 + r * 150
    g.fillStyle = colors[(r * 2 + c) % colors.length]
    g.beginPath(); g.roundRect(x, y + 20, 48, 96, 12); g.fill()
    g.fillStyle = '#ffffff'; g.fillRect(x + 6, y + 50, 36, 26)
    g.fillStyle = r % 2 ? '#e2574c' : '#4f86c6'; g.fillRect(x - 6, y + 124, 60, 14)
  }
}))

/** Zugfenster bei Nacht: dunkel mit Lichtern, die vorbeiziehen (offset 0–1 verschiebt) */
export const nightWindow = () => memo('nightwin', () => {
  const t = canvas(1024, 256, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 256)
    sky.addColorStop(0, '#1b2140'); sky.addColorStop(1, '#3a3157')
    g.fillStyle = sky; g.fillRect(0, 0, 1024, 256)
    let seed = 3
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    g.fillStyle = '#2a2a45'
    for (let x = 0; x < 1024; x += 60 + rnd() * 50) g.fillRect(x, 120 + rnd() * 60, 50 + rnd() * 60, 256)
    for (let i = 0; i < 90; i++) { g.fillStyle = rnd() > 0.5 ? 'rgba(255,214,150,0.9)' : 'rgba(180,220,255,0.8)'; g.fillRect(rnd() * 1024, 130 + rnd() * 110, 6 + rnd() * 10, 6 + rnd() * 8) }
  })
  t.wrapS = THREE.RepeatWrapping
  return t
})
