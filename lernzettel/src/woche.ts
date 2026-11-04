/** Kalenderwochen nach ISO 8601 (Woche beginnt Montag). Alles in lokaler Zeit. */

function utcTag(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

/** z. B. „2026-W45“ */
export function wochenKey(d: Date): string {
  const t = utcTag(d)
  const wt = t.getUTCDay() || 7
  // Donnerstag derselben Woche bestimmt das Jahr
  t.setUTCDate(t.getUTCDate() + 4 - wt)
  const jahr = t.getUTCFullYear()
  const jan1 = Date.UTC(jahr, 0, 1)
  const kw = Math.ceil(((t.getTime() - jan1) / 86400000 + 1) / 7)
  return `${jahr}-W${String(kw).padStart(2, '0')}`
}

export function kalenderwoche(d: Date): number {
  return Number(wochenKey(d).split('-W')[1])
}

/** Montag der Woche (00:00 lokale Zeit). */
export function wochenStart(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const wt = m.getDay() || 7
  m.setDate(m.getDate() - (wt - 1))
  return m
}

const MONATE = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.']

/** „2.–8. Nov.“ bzw. „30. Nov. – 6. Dez.“ */
export function wochenSpanne(d: Date): string {
  const mo = wochenStart(d)
  const so = new Date(mo)
  so.setDate(mo.getDate() + 6)
  if (mo.getMonth() === so.getMonth()) return `${mo.getDate()}.–${so.getDate()}. ${MONATE[so.getMonth()]}`
  return `${mo.getDate()}. ${MONATE[mo.getMonth()]} – ${so.getDate()}. ${MONATE[so.getMonth()]}`
}

/** Tage von heute bis zum Datum (JJJJ-MM-TT); negativ, wenn vorbei. */
export function tageBis(heute: Date, ziel: string): number {
  const [j, m, t] = ziel.split('-').map(Number)
  const a = Date.UTC(heute.getFullYear(), heute.getMonth(), heute.getDate())
  const b = Date.UTC(j, m - 1, t)
  return Math.round((b - a) / 86400000)
}

/** „KW 45“ aus „2026-W45“ */
export function kwLabel(key: string): string {
  return `KW ${Number(key.split('-W')[1])}`
}

/** Lesbares Datum: „4. Nov. 2026“ */
export function datumLang(iso: string): string {
  const [j, m, t] = iso.split('-').map(Number)
  if (!j || !m || !t) return iso
  return `${t}. ${MONATE[m - 1]} ${j}`
}

export function klausurText(tage: number): string {
  if (tage < 0) return 'Klausur vorbei'
  if (tage === 0) return 'Klausur heute – viel Erfolg!'
  if (tage === 1) return 'Klausur morgen'
  if (tage < 14) return `Klausur in ${tage} Tagen`
  return `Klausur in ${Math.floor(tage / 7)} Wochen`
}
