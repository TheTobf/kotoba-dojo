/**
 * Stilrichtungen („Looks“). Ein Look legt fest, wie Materialien, Licht, Hintergrund und Texte aussehen.
 * Szenen und Figuren fragen nur nach Farben und „Rollen“ – so lässt sich derselbe Baukasten in jedem Look rendern.
 * Nach der Auswahl durch Tobias wird genau ein Look in style/stilvorlage.json festgeschrieben.
 */
export type LookId = 'washi' | 'knete' | 'holzschnitt'

export interface Look {
  id: LookId
  name: string
  idea: string
  /** Wie die Oberflächen gerendert werden. */
  material: 'paper' | 'clay' | 'toon'
  /** Rundungs-Feinheit der Grundformen (niedrig = facettiert wie gefaltetes Papier). */
  segments: number
  /** Schwarze Umrisslinien um Figuren und Dinge. */
  outline: boolean
  palette: {
    skyTop: string
    skyBottom: string
    ground: string
    groundLine: string
    accent: string
    accent2: string
    wall: string
    wood: string
    metal: string
    ink: string
    paper: string
  }
  light: { ambient: number; sun: number; sunColor: string; hemiSky: string; hemiGround: string; shadows: boolean }
  text: {
    font: string
    weight: number
    /** Japanischer Satz: Füllung, Rand, Schatten */
    jaColor: string
    jaStroke: string
    jaShadow: string
    /** Kasten hinter den Untertiteln */
    boxBg: string
    boxBorder: string
    boxRadius: number
    small: string
  }
}

export const LOOKS: Record<LookId, Look> = {
  washi: {
    id: 'washi',
    name: 'A · Papier-Diorama',
    idea: 'Eine Welt aus gefaltetem Washi-Papier: facettierte Formen, warme Pastelltöne, weiches Abendlicht – wie eine Miniatur auf dem Schreibtisch.',
    material: 'paper',
    segments: 10,
    outline: false,
    palette: {
      skyTop: '#f7d9c4', skyBottom: '#fbf1e4', ground: '#e8dcc8', groundLine: '#f2c14e', accent: '#c8462b', accent2: '#7fa27a',
      wall: '#f3ece0', wood: '#c79a6b', metal: '#b9b4ad', ink: '#2b2621', paper: '#fffaf2',
    },
    light: { ambient: 0.55, sun: 1.6, sunColor: '#ffe2c4', hemiSky: '#fff3e6', hemiGround: '#d9c7ad', shadows: true },
    text: {
      font: 'Zen Maru Gothic', weight: 700, jaColor: '#2b2621', jaStroke: 'transparent', jaShadow: '0 6px 0 rgba(43,38,33,0.08)',
      boxBg: 'rgba(255,250,242,0.94)', boxBorder: '#2b2621', boxRadius: 28, small: '#5a524a',
    },
  },
  knete: {
    id: 'knete',
    name: 'B · Knete',
    idea: 'Alles sieht aus wie aus Knete geformt: rund, weich, satte Bonbonfarben, Studiolicht mit weichen Schatten – wie ein Stop-Motion-Film.',
    material: 'clay',
    segments: 48,
    outline: false,
    palette: {
      skyTop: '#9fd8cb', skyBottom: '#d9f2e6', ground: '#f4d9a8', groundLine: '#ffcf3f', accent: '#ff6f59', accent2: '#6c9bd2',
      wall: '#fff4e0', wood: '#e0a36b', metal: '#c7c9d6', ink: '#2a2340', paper: '#ffffff',
    },
    light: { ambient: 0.45, sun: 2.2, sunColor: '#ffffff', hemiSky: '#e7fbff', hemiGround: '#f6d6b0', shadows: true },
    text: {
      font: 'Zen Maru Gothic', weight: 900, jaColor: '#ffffff', jaStroke: '#2a2340', jaShadow: '0 10px 0 #ff6f59',
      boxBg: 'rgba(42,35,64,0.82)', boxBorder: 'transparent', boxRadius: 40, small: '#ffffff',
    },
  },
  holzschnitt: {
    id: 'holzschnitt',
    name: 'C · Holzschnitt-Toon',
    idea: 'Angelehnt an japanische Farbholzschnitte: flache Farbflächen in wenigen Stufen, kräftige schwarze Umrisse, Papiergrund und rote Stempel-Akzente.',
    material: 'toon',
    segments: 32,
    outline: true,
    palette: {
      skyTop: '#f4c7a1', skyBottom: '#f6ead3', ground: '#d9cbb0', groundLine: '#e8b53b', accent: '#c0392b', accent2: '#3f6e66',
      wall: '#efe4cf', wood: '#a8754a', metal: '#9aa3a0', ink: '#1c1a17', paper: '#f6ead3',
    },
    light: { ambient: 0.6, sun: 1.4, sunColor: '#fff6e8', hemiSky: '#fff1dc', hemiGround: '#cdb995', shadows: false },
    text: {
      font: 'Noto Serif JP', weight: 700, jaColor: '#1c1a17', jaStroke: 'transparent', jaShadow: 'none',
      boxBg: 'rgba(246,234,211,0.96)', boxBorder: '#1c1a17', boxRadius: 6, small: '#3d3a34',
    },
  },
}

/** TikTok-Sicherheitszone (1080×1920): Bereiche, in die nie Text darf. */
export const SAFE_ZONE = { top: 170, bottom: 440, left: 64, right: 170 }
