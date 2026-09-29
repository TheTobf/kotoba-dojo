/**
 * Reise-Pass 旅のパス: vier Saisons à 3 Monate bis zur Japan-Reise.
 * Jede Saison hat 25 Stufen; die letzte schaltet einen Bildschirmrand-Effekt frei.
 */

export const XP_PRO_STUFE = 800
export const STUFEN_PRO_SAISON = 25

export type BelohnungsArt = 'tier' | 'farbe' | 'muster' | 'klang' | 'titel' | 'effekt' | 'stempel' | 'omamori'

export interface Belohnung {
  id: string
  art: BelohnungsArt
  name: string
  jp?: string
  icon: string
  text?: string
  wert?: string        // Farbe (Hex), Muster-/Klang-/Effekt-ID
}

export interface Saison {
  id: string
  name: string
  jp: string
  icon: string
  von: string          // YYYY-MM-DD (inkl.)
  bis: string          // YYYY-MM-DD (inkl.)
  stufen: Belohnung[]  // Index 0 = Stufe 1
}

// ---------- Belohnungen ----------

const tier = (id: string, icon: string, name: string, jp: string, text: string): Belohnung => ({ id: `tier-${id}`, art: 'tier', icon, name, jp, text })
const farbe = (id: string, name: string, jp: string, hex: string): Belohnung => ({ id: `farbe-${id}`, art: 'farbe', icon: '🎨', name, jp, wert: hex })
const muster = (id: string, name: string, jp: string): Belohnung => ({ id: `muster-${id}`, art: 'muster', icon: '🀄', name, jp, wert: id })
const klang = (id: string, name: string, jp: string, text: string): Belohnung => ({ id: `klang-${id}`, art: 'klang', icon: '🎐', name, jp, text, wert: id })
const titel = (id: string, name: string): Belohnung => ({ id: `titel-${id}`, art: 'titel', icon: '🏷️', name })
const effekt = (id: string, icon: string, name: string, jp: string, text: string): Belohnung => ({ id: `effekt-${id}`, art: 'effekt', icon, name, jp, text, wert: id })
const stempel = (id: string, name: string, jp: string, ort: string): Belohnung => ({ id: `stempel-${id}`, art: 'stempel', icon: '⛩️', name, jp, text: ort })
const omamori = (saison: string, n: number): Belohnung => ({
  id: `omamori-${saison}-${n}`, art: 'omamori', icon: '🧧', name: 'Omamori', jp: 'お守り',
  text: 'Glücksbringer: rettet deinen Streak, wenn du einen Tag verpasst',
})

/** Standard-Begleiter, immer verfügbar. */
export const NEKO: Belohnung = tier('neko', '😺', 'Neko-Sensei', '招き猫', 'Die Winkekatze begleitet dich von Anfang an.')

/** Reihenfolge der Belohnungsarten je Saison (25 Stufen). */
const PLAN: BelohnungsArt[] = [
  'stempel', 'tier', 'titel', 'stempel', 'omamori', 'farbe', 'stempel', 'muster', 'titel', 'tier',
  'stempel', 'klang', 'omamori', 'stempel', 'farbe', 'titel', 'stempel', 'muster', 'omamori', 'tier',
  'stempel', 'titel', 'stempel', 'omamori', 'effekt',
]

function saison(id: string, name: string, jp: string, icon: string, von: string, bis: string, inhalt: Partial<Record<BelohnungsArt, Belohnung[]>>): Saison {
  const zaehler: Partial<Record<BelohnungsArt, number>> = {}
  let om = 0
  const stufen = PLAN.map((art) => {
    if (art === 'omamori') return omamori(id, ++om)
    const i = zaehler[art] ?? 0
    zaehler[art] = i + 1
    const b = inhalt[art]?.[i]
    if (!b) throw new Error(`Saison ${id}: zu wenige ${art}`)
    return b
  })
  return { id, name, jp, icon, von, bis, stufen }
}

export const SAISONS: Saison[] = [
  saison('herbst', 'Herbst', '秋', '🍁', '2026-09-01', '2026-12-31', {
    tier: [
      tier('tanuki', '🦝', 'Tanuki', '狸', 'Der verschmitzte Marderhund – Meister der Verwandlung.'),
      tier('shika', '🦌', 'Nara-Hirsch', '鹿', 'Verbeugt sich, wenn du dich verbeugst.'),
      tier('kitsune', '🦊', 'Kitsune', '狐', 'Der Fuchsbote von Inari – je älter, desto mehr Schwänze.'),
    ],
    farbe: [farbe('kaki', 'Kaki', '柿', '#f07a2a'), farbe('kuri', 'Kastanie', '栗', '#a0522d')],
    muster: [muster('ichimatsu', 'Ichimatsu', '市松'), muster('uroko', 'Uroko', '鱗')],
    klang: [klang('koto', 'Koto', '琴', 'Gezupfte Saiten statt „Ding“')],
    titel: [titel('onigiri', 'Onigiri-Fan'), titel('fuchs', 'Freund der Füchse'), titel('herbst', 'Herbstwanderer'), titel('ramen', 'Ramen-Kenner')],
    effekt: [effekt('momiji', '🍁', 'Momiji-Regen', '紅葉', 'Rote Ahornblätter treiben am Bildschirmrand herab.')],
    stempel: [
      stempel('fushimi', 'Fushimi Inari', '伏見稲荷', 'Kyōto'), stempel('kinkaku', 'Kinkaku-ji', '金閣寺', 'Kyōto'),
      stempel('todai', 'Tōdai-ji', '東大寺', 'Nara'), stempel('kiyomizu', 'Kiyomizu-dera', '清水寺', 'Kyōto'),
      stempel('arashiyama', 'Arashiyama', '嵐山', 'Kyōto'), stempel('nikko', 'Nikkō Tōshō-gū', '日光東照宮', 'Tochigi'),
      stempel('kamakura', 'Großer Buddha', '鎌倉大仏', 'Kamakura'), stempel('koya', 'Kōya-san', '高野山', 'Wakayama'),
    ],
  }),
  saison('winter', 'Winter', '冬', '❄️', '2027-01-01', '2027-03-31', {
    tier: [
      tier('saru', '🐒', 'Schneeaffe', '猿', 'Badet im Onsen von Jigokudani.'),
      tier('usagi', '🐇', 'Yuki-Usagi', '雪兎', 'Ein Schneehase mit Beeren-Augen.'),
      tier('fukurou', '🦉', 'Fukurō', '梟', 'Die Eule bringt Glück – „fu-kurō“ heißt auch „keine Mühsal“.'),
    ],
    farbe: [farbe('ai', 'Indigo', '藍', '#3d6fd8'), farbe('yuki', 'Schneeblau', '雪', '#5b9bc4')],
    muster: [muster('seigaiha', 'Seigaiha', '青海波'), muster('kikko', 'Kikkō', '亀甲')],
    klang: [klang('kane', 'Tempelglocke', '鐘', 'Tiefe, lang nachklingende Glocke')],
    titel: [titel('kotatsu', 'Kotatsu-Philosoph'), titel('onsen', 'Onsen-Genießer'), titel('mochi', 'Mochi-Stampfer'), titel('shinkansen', 'Shinkansen-Pilot')],
    effekt: [effekt('yuki', '❄️', 'Schneefall', '雪', 'Leise Schneeflocken am Bildschirmrand.')],
    stempel: [
      stempel('sensoji', 'Sensō-ji', '浅草寺', 'Tōkyō'), stempel('meiji', 'Meiji-jingū', '明治神宮', 'Tōkyō'),
      stempel('shirakawa', 'Shirakawa-gō', '白川郷', 'Gifu'), stempel('sapporo', 'Hokkaidō-jingū', '北海道神宮', 'Sapporo'),
      stempel('himeji', 'Burg Himeji', '姫路城', 'Hyōgo'), stempel('izumo', 'Izumo-taisha', '出雲大社', 'Shimane'),
      stempel('zenko', 'Zenkō-ji', '善光寺', 'Nagano'), stempel('kanazawa', 'Kenroku-en', '兼六園', 'Kanazawa'),
    ],
  }),
  saison('fruehling', 'Frühling', '春', '🌸', '2027-04-01', '2027-06-30', {
    tier: [
      tier('shiba', '🐕', 'Shiba', '柴犬', 'Treu, stur und immer gut gelaunt.'),
      tier('uguisu', '🐦', 'Uguisu', '鶯', 'Der Buschsänger kündigt den Frühling an.'),
      tier('koi', '🎏', 'Koinobori', '鯉のぼり', 'Karpfenfahnen – Zeichen für Ausdauer.'),
    ],
    farbe: [farbe('wakaba', 'Junggrün', '若葉', '#6db33f'), farbe('sumire', 'Veilchen', '菫', '#b05cff')],
    muster: [muster('asanoha', 'Asanoha', '麻の葉'), muster('sakuramon', 'Sakura-Mon', '桜紋')],
    klang: [klang('uguisu', 'Vogelgesang', '鶯', 'Zwitschernde Töne wie der Buschsänger')],
    titel: [titel('hanami', 'Hanami-Profi'), titel('bento', 'Bentō-Baumeister'), titel('matcha', 'Matcha-Meister'), titel('kaiten', 'Kaiten-Sushi-Champion')],
    effekt: [effekt('sakura', '🌸', 'Sakura-Blüten', '桜吹雪', 'Kirschblüten schweben am Bildschirmrand herab.')],
    stempel: [
      stempel('ueno', 'Ueno-Park', '上野公園', 'Tōkyō'), stempel('yoshino', 'Yoshino-yama', '吉野山', 'Nara'),
      stempel('hirosaki', 'Burg Hirosaki', '弘前城', 'Aomori'), stempel('itsukushima', 'Itsukushima', '厳島神社', 'Miyajima'),
      stempel('ise', 'Ise-jingū', '伊勢神宮', 'Mie'), stempel('fuji', 'Fuji Sengen', '富士山本宮浅間大社', 'Shizuoka'),
      stempel('kumano', 'Kumano Hongū', '熊野本宮大社', 'Wakayama'), stempel('osaka', 'Burg Ōsaka', '大阪城', 'Ōsaka'),
    ],
  }),
  saison('sommer', 'Sommer', '夏', '🎆', '2027-07-01', '2027-09-30', {
    tier: [
      tier('kingyo', '🐠', 'Kingyo', '金魚', 'Goldfisch vom Sommerfest.'),
      tier('kaeru', '🐸', 'Kaeru', '蛙', '„Kaeru“ heißt auch „heimkehren“ – bringt dich sicher zurück.'),
      tier('panda', '🐼', 'Panda', 'パンダ', 'Der Star aus dem Ueno-Zoo.'),
    ],
    farbe: [farbe('umi', 'Meeresblau', '海', '#0096c7'), farbe('kin', 'Gold', '金', '#c9a227')],
    muster: [muster('yagasuri', 'Yagasuri', '矢絣'), muster('kanoko', 'Kanoko', '鹿の子')],
    klang: [klang('furin', 'Fūrin', '風鈴', 'Gläsernes Windspiel')],
    titel: [titel('matsuri', 'Matsuri-Tänzer'), titel('kakigori', 'Kakigōri-Löffler'), titel('yukata', 'Yukata-Träger'), titel('reisebereit', 'Bereit für Japan')],
    effekt: [effekt('hotaru', '✨', 'Glühwürmchen', '蛍', 'Glühwürmchen tanzen am Bildschirmrand.')],
    stempel: [
      stempel('dotonbori', 'Dōtonbori', '道頓堀', 'Ōsaka'), stempel('hakone', 'Hakone-jinja', '箱根神社', 'Kanagawa'),
      stempel('okinawa', 'Shuri-jō', '首里城', 'Okinawa'), stempel('gion', 'Yasaka-jinja', '八坂神社', 'Kyōto'),
      stempel('dazaifu', 'Dazaifu Tenman-gū', '太宰府天満宮', 'Fukuoka'), stempel('kinosaki', 'Kinosaki Onsen', '城崎温泉', 'Hyōgo'),
      stempel('shibuya', 'Shibuya-Kreuzung', '渋谷', 'Tōkyō'), stempel('miyajima2', 'Ōtorii', '大鳥居', 'Miyajima'),
    ],
  }),
]

export const ALLE_BELOHNUNGEN = [NEKO, ...SAISONS.flatMap((s) => s.stufen)]

/** Muster als CSS-Hintergrund (auf der Kartenvorderseite). `c` = Akzentfarbe. */
export const MUSTER_CSS: Record<string, (c: string) => string> = {
  ichimatsu: (c) => `repeating-conic-gradient(${c}14 0 25%, transparent 0 50%) 0 0 / 28px 28px`,
  uroko: (c) => `linear-gradient(135deg, ${c}1a 25%, transparent 25%) 0 0 / 24px 24px, linear-gradient(225deg, ${c}1a 25%, transparent 25%) 0 0 / 24px 24px`,
  seigaiha: (c) => `radial-gradient(circle at 50% 100%, transparent 30%, ${c}22 31%, ${c}22 36%, transparent 37%, transparent 52%, ${c}22 53%, ${c}22 58%, transparent 59%) 0 0 / 40px 20px`,
  kikko: (c) => `linear-gradient(30deg, ${c}18 12%, transparent 12.5%, transparent 87%, ${c}18 87.5%) 0 0 / 30px 52px, linear-gradient(150deg, ${c}18 12%, transparent 12.5%, transparent 87%, ${c}18 87.5%) 0 0 / 30px 52px, linear-gradient(90deg, ${c}10 2px, transparent 2px) 0 0 / 30px 52px`,
  asanoha: (c) => `conic-gradient(from 30deg at 50% 50%, ${c}16 0 60deg, transparent 0 120deg, ${c}16 0 180deg, transparent 0 240deg, ${c}16 0 300deg, transparent 0) 0 0 / 34px 34px`,
  sakuramon: (c) => `radial-gradient(circle, ${c}2a 3px, transparent 4px) 0 0 / 26px 26px, radial-gradient(circle, ${c}16 2px, transparent 3px) 13px 13px / 26px 26px`,
  yagasuri: (c) => `repeating-linear-gradient(60deg, ${c}1c 0 8px, transparent 8px 16px) 0 0 / 32px 32px, repeating-linear-gradient(-60deg, ${c}10 0 8px, transparent 8px 16px) 16px 0 / 32px 32px`,
  kanoko: (c) => `radial-gradient(circle, transparent 2px, ${c}24 3px, ${c}24 5px, transparent 6px) 0 0 / 18px 18px`,
}
