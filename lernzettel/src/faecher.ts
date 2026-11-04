/** Die Module. Neue Fächer hier eintragen und einen Ordner inhalte/<id>/ anlegen. */
export interface Fach {
  id: string
  name: string
  kurz: string
  icon: string
  farbe: string
  /** Ab diesem Tag (JJJJ-MM-TT) läuft das Modul; davor wird es als „startet bald“ angezeigt. */
  ab?: string
  /** Weitere Schreibweisen, die beim Einfügen eines Lernzettels erkannt werden. */
  alias: string[]
}

export const FAECHER: Fach[] = [
  {
    id: 'mathe',
    name: 'Mathe',
    kurz: 'Mathe',
    icon: '📐',
    farbe: '#2563eb',
    alias: ['mathematik', 'wirtschaftsmathematik', 'mathe-fuer-wirtschaftswissenschaftler', 'math'],
  },
  {
    id: 'externes-rechnungswesen',
    name: 'Externes Rechnungswesen',
    kurz: 'ExReWe',
    icon: '📊',
    farbe: '#059669',
    alias: ['exrewe', 'rewe', 'rechnungswesen', 'buchfuehrung', 'buchhaltung', 'externes-rewe'],
  },
  {
    id: 'internationales-management',
    name: 'Internationales Management',
    kurz: 'IntMan',
    icon: '🌍',
    farbe: '#ea580c',
    alias: ['intman', 'int-management', 'international-management', 'management'],
  },
  {
    id: 'wirtschaftsinformatik',
    name: 'Wirtschaftsinformatik',
    kurz: 'WInfo',
    icon: '💻',
    farbe: '#7c3aed',
    ab: '2026-12-01',
    alias: ['winfo', 'wi', 'informatik', 'business-informatics'],
  },
]

export function fachById(id: string): Fach | undefined {
  return FAECHER.find((f) => f.id === id)
}

/** Vereinheitlicht Schreibweisen: „Externes Rechnungswesen“ → „externes-rechnungswesen“. */
export function normiere(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Findet ein Fach anhand von ID, Name, Kürzel oder Alias. */
export function findeFach(text: string): Fach | undefined {
  const n = normiere(text)
  if (!n) return undefined
  return FAECHER.find((f) => f.id === n || normiere(f.name) === n || normiere(f.kurz) === n || f.alias.includes(n))
}

/** true, wenn das Modul an diesem Tag schon läuft. */
export function fachAktiv(fach: Fach, heute: Date): boolean {
  if (!fach.ab) return true
  return datumKey(heute) >= fach.ab
}

/** JJJJ-MM-TT in lokaler Zeit. */
export function datumKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
