/**
 * Szenen-Verzeichnis ohne Grafik: Plätze für Figuren, feste Kameras und erlaubte Zustände.
 * Wird von der Prüfung (episode.json), dem Schnitt und den 3D-Szenen benutzt. Neue Szene = hier eintragen
 * und in src/scenes/index.tsx die Grafik zuordnen.
 */
export type V3 = [number, number, number]

export interface Spot {
  pos: V3
  /** Blickrichtung als Drehung um die Hochachse (0 = zur Kamera, also +z) */
  yaw?: number
  /** sitzt (z. B. hinter einem Schalter) – Kopf tiefer */
  seated?: boolean
}

export interface SceneCamera {
  pos: V3
  target: V3
  fov?: number
}

/**
 * Kamera über den Bildausschnitt festlegen statt über Koordinaten:
 * `at` = was gezeigt wird, `yaw` = aus welcher Richtung (0 = von vorn/+z, π/2 = von rechts/+x, π = von hinten),
 * `pitch` = von oben (+) oder unten (−), `height` = wie viel Welt das Bild hoch zeigt,
 * `screenY` = wo `at` im Bild steht (0 = oben, 0.5 = Mitte). Im Hochformat zeigt das Bild seitlich nur 56 % davon.
 */
export function framed(at: V3, yaw: number, pitch: number, height: number, screenY = 0.42, fov = 34): SceneCamera {
  const d = height / (2 * Math.tan(((fov / 2) * Math.PI) / 180))
  const dir: V3 = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]
  const drop = (0.5 - screenY) * height
  return { pos: [at[0] + dir[0] * d, at[1] + dir[1] * d, at[2] + dir[2] * d], target: [at[0], at[1] - drop, at[2]], fov }
}

const PI = Math.PI

export interface SceneMeta {
  id: string
  name: string
  /** Nahaufnahme ohne Figuren (Handy, Postkarte …) */
  insert?: boolean
  spots: Record<string, Spot>
  cameras: Record<string, SceneCamera>
  /** Reihenfolge für Erzähl-Abschnitte, wenn die Folge keine Kamera vorgibt */
  defaultCameras: string[]
  /** erlaubte Zustände: Schlüssel → Werte (bei Zahlen: "zahl") */
  states?: Record<string, string[]>
  /** fertig gebaut? Szenen ohne Grafik dürfen schon geplant, aber noch nicht gerendert werden. */
  built: boolean
  /** Bereich, in dem automatische Kameras (nah:, zwei: …) stehen dürfen – z. B. nicht hinter einer Wand */
  cameraBounds?: { minX?: number; maxX?: number; minZ?: number; maxZ?: number; maxY?: number }
}

export const SCENES: Record<string, SceneMeta> = {
  passkontrolle: {
    id: 'passkontrolle',
    name: 'Flughafen – Passkontrolle',
    built: true, cameraBounds: { minZ: -8.5 },
    spots: {
      schalter: { pos: [0.55, 0, 0.15], yaw: Math.PI },
      'schalter-seite': { pos: [1.75, 0, 0.55], yaw: -2.4 },
      beamter: { pos: [0.55, 0, -2.05], yaw: 0, seated: true },
      schlange: { pos: [-1.2, 0, 2.6], yaw: Math.PI * 0.85 },
      'schlange-hinten': { pos: [-2.4, 0, 3.6], yaw: Math.PI },
      reisende1: { pos: [-2.6, 0, 1.9], yaw: 2.6 },
      reisende2: { pos: [-3.6, 0, 2.8], yaw: 2.8 },
    },
    cameras: {
      totale: framed([0.2, 1.3, -0.9], -0.45, 0.2, 8.6, 0.5, 38),
      'ole-front': framed([0.55, 1.3, 0.15], PI - 0.8, 0.3, 3.9, 0.4, 40),
      'ole-nah': framed([0.55, 1.35, 0.15], PI - 0.75, 0.28, 2.9, 0.4, 40),
      'beamter-front': framed([0.55, 2.3, -2.05], 0.3, -0.02, 3.0, 0.36, 32),
      'ueber-ole': framed([0.55, 2.2, -2.05], -0.4, 0.08, 4.4, 0.36, 34),
      seite: framed([0.55, 1.6, -0.95], PI / 2 + 0.35, 0.08, 6.4, 0.42, 34),
      schlange: framed([0.1, 1.3, -0.6], -0.12, 0.12, 6.0, 0.45, 36),
    },
    defaultCameras: ['totale', 'ole-front', 'ueber-ole', 'seite'],
    states: {},
  },
  gepaeckband: {
    id: 'gepaeckband',
    name: 'Flughafen – Gepäckband',
    built: true, cameraBounds: { minZ: -8.5 },
    spots: {
      band: { pos: [0.4, 0, 0.35], yaw: Math.PI },
      'band-links': { pos: [-1.8, 0, 0.45], yaw: Math.PI },
      'band-rechts': { pos: [2.6, 0, 0.5], yaw: Math.PI * 1.1 },
      reisende1: { pos: [-3.4, 0, 0.7], yaw: Math.PI * 0.9 },
      reisende2: { pos: [3.9, 0, 1.2], yaw: Math.PI * 1.15 },
      ausgang: { pos: [5.5, 0, 3.5], yaw: -1.2 },
    },
    cameras: {
      totale: framed([0.2, 0.9, -1.2], -0.45, 0.3, 8.6, 0.5, 38),
      'ole-front': framed([0.4, 1.35, 0.35], PI + 0.35, 0.12, 3.9, 0.4, 40),
      'ole-nah': framed([0.4, 1.4, 0.35], PI + 0.3, 0.1, 2.9, 0.4, 40),
      band: framed([1.2, 0.8, -0.7], -PI / 2 + 0.3, 0.1, 3.2, 0.5, 36),
      'ueber-ole': framed([-0.6, 0.9, -1.2], 0.62, 0.3, 5.0, 0.5, 36),
      leer: framed([-1.0, 0.7, -1.5], 0.5, 0.32, 4.4, 0.5, 36),
    },
    defaultCameras: ['totale', 'ole-front', 'band', 'ueber-ole'],
    states: { band: ['laeuft', 'stopp'], koffer: ['viele', 'wenige', 'keine'] },
  },
  handy: {
    id: 'handy',
    name: 'Nahaufnahme – Handy',
    insert: true,
    built: true,
    spots: {},
    cameras: {
      nah: framed([0, 0.12, 0], 0, 0.04, 2.7, 0.44, 34),
      schraeg: framed([0, 0.1, 0], 0.4, 0.2, 2.4, 0.44, 34),
    },
    defaultCameras: ['nah', 'schraeg'],
    states: { akku: ['zahl'], aus: ['ja', 'nein'] },
  },
  postkarte: {
    id: 'postkarte',
    name: 'Nahaufnahme – Postkarte (Hamburg)',
    insert: true,
    built: true,
    spots: {},
    cameras: {
      oben: framed([0, 0, 0.05], 0.05, 1.2, 2.25, 0.5, 34),
      schraeg: framed([0, 0, 0], -0.5, 0.75, 2.4, 0.5, 34),
      nah: framed([0, 0, -0.3], 0.15, 1.0, 1.6, 0.5, 32),
    },
    defaultCameras: ['oben', 'schraeg', 'nah'],
    states: { seite: ['vorne', 'hinten', 'dreht'], ort: ['fundbuero', 'hotel'] },
  },
  'app-handy': {
    id: 'app-handy',
    name: 'App-Video – Handy mit Bildschirmfoto',
    insert: true,
    built: true,
    spots: {},
    cameras: {
      nah: framed([0, 0.05, 0], 0, 0.03, 2.3, 0.42, 34),
      schraeg: framed([0, 0.05, 0], -0.35, 0.12, 2.5, 0.42, 34),
      oben: framed([0, 0.05, 0], 0.2, 0.35, 2.6, 0.42, 34),
    },
    defaultCameras: ['nah', 'schraeg', 'oben'],
    states: {},
  },
  bahnsteig: {
    id: 'bahnsteig',
    name: 'Bahnsteig',
    built: true, cameraBounds: { minZ: -2.2 },
    spots: {
      mitte: { pos: [-0.35, 0, 0.9], yaw: 0.2 },
      schild: { pos: [1.0, 0, -0.4], yaw: 0.4 },
      bank: { pos: [-2.7, 0, -0.1], yaw: 0.25 },
      tuer: { pos: [0.6, 0, -1.7], yaw: PI },
    },
    cameras: {
      totale: { pos: [0.9, 2.4, 11.5], target: [0.45, 0.2, 0], fov: 34 },
      'ole-nah': framed([-0.35, 1.4, 0.9], 0.3, 0.06, 2.9, 0.4, 32),
      gleis: framed([-0.5, 1.4, -0.8], PI / 2 - 0.25, 0.08, 6.0, 0.45, 36),
    },
    defaultCameras: ['totale', 'ole-nah', 'gleis'],
    states: { zug: ['da', 'weg', 'faehrt-ein'] },
  },
  // Geplant für Staffel 1 – Plätze stehen fest, die Grafik wird vor dem ersten Rendern gebaut (built: false):
  'gepaeck-schalter': {
    id: 'gepaeck-schalter', name: 'Flughafen – Gepäckermittlung', built: true, cameraBounds: { minZ: -8.5 },
    spots: { schalter: { pos: [0, 0, 0.3], yaw: PI }, mitarbeiterin: { pos: [0, 0, -1.3], yaw: 0 }, eingang: { pos: [2.5, 0, 2.5], yaw: -2.4 } },
    cameras: {
      totale: framed([0, 1.3, -0.8], -0.45, 0.2, 8.0, 0.5, 38),
      'ole-front': framed([0, 1.3, 0.3], PI - 0.6, 0.28, 3.9, 0.4, 40),
      'ole-nah': framed([0, 1.35, 0.3], PI - 0.55, 0.26, 2.9, 0.4, 40),
      'mitarbeiterin-front': framed([0, 2.5, -1.3], 0.35, -0.02, 3.0, 0.36, 34),
      'ueber-ole': framed([0, 2.3, -1.3], -0.4, 0.08, 4.4, 0.36, 34),
      seite: framed([0, 1.6, -0.5], PI / 2 + 0.35, 0.08, 6.0, 0.42, 34),
    },
    defaultCameras: ['totale', 'ole-front', 'ueber-ole', 'seite'],
  },
  'bahnhof-automat': {
    id: 'bahnhof-automat', name: 'Bahnhof – Fahrkartenautomaten', built: true, cameraBounds: { minZ: -0.6 },
    spots: {
      automat: { pos: [0.5, 0, 0.3], yaw: PI }, getraenke: { pos: [-2.6, 0, 0.4], yaw: PI },
      helfer: { pos: [1.6, 0, 1.2], yaw: -1.1 }, mitte: { pos: [0.2, 0, 1.9], yaw: 2.03 },
    },
    cameras: {
      totale: framed([-0.5, 1.4, 0.4], -0.3, 0.18, 8.6, 0.5, 38),
      getraenke: framed([-2.6, 1.2, 0.4], 0.45, 0.12, 3.9, 0.42, 38),
      automat: framed([0.5, 1.4, 0.25], -0.45, 0.2, 3.4, 0.45, 38),
      'ole-front': framed([0.2, 1.35, 1.9], 1.25, 0.12, 3.9, 0.4, 40),
      'helfer-front': framed([1.6, 2.5, 1.2], -0.6, 0.0, 3.0, 0.36, 36),
      seite: framed([0.4, 1.3, 1.3], -PI / 2 + 0.35, 0.08, 5.0, 0.45, 38),
    },
    defaultCameras: ['totale', 'ole-front', 'seite'],
  },
  'zug-innen': {
    id: 'zug-innen', name: 'Im Zug', built: true, cameraBounds: { minZ: -1.25, maxY: 3.3 },
    spots: {
      tuer: { pos: [-3.1, 0, -0.6], yaw: 0 }, mitte: { pos: [0.6, 0, -0.35], yaw: 2.09 },
      sitz: { pos: [1.9, 0, -1.05], yaw: 0, seated: true }, 'ole-sitz': { pos: [0.55, 0.8, -1.15], yaw: 0 },
      fahrgast: { pos: [-1.0, 0, -0.3], yaw: 0.4 },
    },
    cameras: {
      totale: framed([0.6, 1.4, -0.6], -0.25, 0.12, 6.2, 0.48, 42),
      'ole-front': framed([0.6, 1.35, -0.35], 1.25, 0.15, 3.6, 0.42, 40),
      'opa-front': framed([1.9, 2.35, -1.05], -0.7, 0.02, 3.0, 0.38, 36),
      sitz: framed([1.2, 1.9, -1.1], 0.1, 0.1, 4.0, 0.45, 40),
      'ole-sitz': framed([0.55, 2.15, -1.15], 0.25, 0.08, 2.9, 0.4, 38),
    },
    defaultCameras: ['totale', 'ole-front', 'sitz'],
  },
  konbini: {
    id: 'konbini', name: 'Konbini – Kasse', built: true, cameraBounds: { minZ: -5.2, minX: -3.2 },
    spots: { kasse: { pos: [0, 0, 0.3], yaw: PI }, kassiererin: { pos: [0, 0, -1.3], yaw: 0 }, regal: { pos: [-2.4, 0, 0.6], yaw: -PI / 2 }, eingang: { pos: [2.6, 0, 2.4], yaw: -2.4 } },
    cameras: {
      totale: framed([-0.3, 1.3, -0.6], -0.45, 0.2, 8.2, 0.5, 38),
      'ole-front': framed([0, 1.3, 0.3], PI - 0.6, 0.28, 3.9, 0.4, 40),
      'ole-nah': framed([0, 1.35, 0.3], PI - 0.55, 0.26, 2.9, 0.4, 40),
      'kassiererin-front': framed([0, 2.5, -1.3], 0.35, -0.02, 3.0, 0.36, 34),
      'ueber-ole': framed([0, 2.3, -1.3], -0.4, 0.08, 4.4, 0.36, 34),
      regal: framed([-2.6, 1.3, 0.6], -0.25, 0.15, 4.0, 0.45, 38),
      eingang: framed([2.4, 1.3, 2.0], -0.5, 0.15, 4.4, 0.45, 38),
    },
    defaultCameras: ['totale', 'ole-front', 'ueber-ole'],
  },
  strasse: {
    id: 'strasse', name: 'Straße am Abend', built: true, cameraBounds: { minZ: -2.0 },
    spots: { mitte: { pos: [0, 0, 0], yaw: 0 }, passant: { pos: [2.2, 0, 0.5], yaw: -1.8 }, ecke: { pos: [-2.5, 0, -0.8], yaw: 0.6 }, hoteltuer: { pos: [2.8, 0, -2.45], yaw: PI } },
    cameras: {
      totale: framed([0.8, 1.3, -1.2], -0.2, 0.22, 9.2, 0.5, 40),
      'ole-front': framed([0, 1.35, 0], 0.35, 0.12, 3.9, 0.4, 40),
      'passantin-front': framed([2.2, 2.5, 0.5], -0.8, 0.02, 3.0, 0.36, 36),
      hotel: framed([2.8, 1.8, -2.6], 0.35, 0.12, 4.8, 0.45, 38),
      laterne: framed([-0.5, 1.6, -0.6], -0.35, -0.1, 5.6, 0.5, 38),
    },
    defaultCameras: ['totale', 'ole-front', 'laterne'],
    states: { hotel: ['an', 'aus'] },
  },
  'hotel-lobby': {
    id: 'hotel-lobby', name: 'Hotel – Rezeption', built: true, cameraBounds: { minZ: -6.5 },
    spots: { rezeption: { pos: [0, 0, 0.3], yaw: PI }, rezeptionistin: { pos: [0, 0, -1.3], yaw: 0 }, tuer: { pos: [2.6, 0, 2.6], yaw: -2.4 }, mitte: { pos: [0.8, 0, 1.6], yaw: PI } },
    cameras: {
      totale: framed([0, 1.3, -0.8], -0.45, 0.2, 8.0, 0.5, 38),
      'ole-front': framed([0, 1.3, 0.3], PI - 0.6, 0.28, 3.9, 0.4, 40),
      'ole-nah': framed([0, 1.35, 0.3], PI - 0.55, 0.26, 2.9, 0.4, 40),
      'rezeptionistin-front': framed([0, 2.5, -1.3], 0.35, -0.02, 3.0, 0.36, 34),
      'ueber-ole': framed([0, 2.3, -1.3], -0.4, 0.08, 4.4, 0.36, 34),
      seite: framed([0, 1.6, -0.5], PI / 2 + 0.35, 0.08, 6.0, 0.42, 34),
    },
    defaultCameras: ['totale', 'ole-front', 'ueber-ole', 'seite'],
  },
}

/** Allgemeine Kamera-Einstellungen, die sich nach Figuren richten (in jeder Szene mit Figuren). */
export const GENERIC_CAMERA = /^(nah|halbnah):[a-z0-9-]+$|^(schulter|zwei):[a-z0-9-]+:[a-z0-9-]+$/

export function cameraExists(scene: SceneMeta, preset: string): boolean {
  return preset in scene.cameras || (!scene.insert && GENERIC_CAMERA.test(preset))
}
