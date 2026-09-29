import { NEKO, SAISONS, STUFEN_PRO_SAISON, XP_PRO_STUFE, type Belohnung, type Saison } from './content/pass'
import type { Profile } from './types'

const tag = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Aktuelle Saison (vor der ersten → erste, nach der letzten → letzte). */
export function aktuelleSaison(now = Date.now()): Saison {
  const t = tag(now)
  return SAISONS.find((s) => t >= s.von && t <= s.bis) ?? (t < SAISONS[0].von ? SAISONS[0] : SAISONS[SAISONS.length - 1])
}

export function tageBisEnde(s: Saison, now = Date.now()) {
  const [y, m, d] = s.bis.split('-').map(Number)
  return Math.max(0, Math.ceil((new Date(y, m - 1, d, 23, 59).getTime() - now) / 86_400_000))
}

/** Stufe (0–25) und Fortschritt innerhalb der Stufe aus den Saison-XP. */
export function stufeAus(xp: number) {
  const stufe = Math.min(STUFEN_PRO_SAISON, Math.floor(xp / XP_PRO_STUFE))
  const rest = stufe >= STUFEN_PRO_SAISON ? XP_PRO_STUFE : xp - stufe * XP_PRO_STUFE
  return { stufe, rest, ratio: rest / XP_PRO_STUFE, fertig: stufe >= STUFEN_PRO_SAISON }
}

/** Alle Belohnungen, die das Profil besitzt (aus den XP der jeweiligen Saison abgeleitet). */
export function besitz(p: Pick<Profile, 'seasonXp'>): Belohnung[] {
  const out: Belohnung[] = [NEKO]
  for (const s of SAISONS) {
    const { stufe } = stufeAus(p.seasonXp?.[s.id] ?? 0)
    out.push(...s.stufen.slice(0, stufe))
  }
  return out
}

export const besitztId = (p: Pick<Profile, 'seasonXp'>, id: string) => besitz(p).some((b) => b.id === id)

export function omamoriVerfuegbar(p: Pick<Profile, 'seasonXp' | 'omamoriUsed'>) {
  return besitz(p).filter((b) => b.art === 'omamori').length - (p.omamoriUsed ?? 0)
}

/** Neu erreichte Belohnungen beim Wechsel von xpAlt → xpNeu in einer Saison. */
export function neueBelohnungen(s: Saison, xpAlt: number, xpNeu: number) {
  return s.stufen.slice(stufeAus(xpAlt).stufe, stufeAus(xpNeu).stufe)
}
