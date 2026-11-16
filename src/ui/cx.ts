/** Setzt CSS-Klassen zusammen und lässt leere Werte weg: cx('a', bedingung && 'b') */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
