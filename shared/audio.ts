/**
 * Sprachaufnahmen: Jede Aufnahme gehört zu genau einem japanischen Text.
 * Der Dateiname ist ein Fingerabdruck des Textes – so finden App und Erzeugungs-Skript dieselbe Datei,
 * ohne dass irgendwo eine Zuordnungsliste von Hand gepflegt werden muss.
 *
 *   Text „いくらですか。“  →  public/audio/<fingerabdruck>.mp3
 *
 * Welche Aufnahmen es gibt, steht in public/audio/index.json (schreibt `npm run audio:gen`).
 */

export interface AudioIndex {
  /** Pflicht-Namensnennung der Stimmen, z. B. „Stimme: Microsoft Azure Speech (ja-JP-NanamiNeural)“. */
  credit: string
  /** Fingerabdrücke aller vorhandenen Aufnahmen. */
  keys: string[]
}

/** Fingerabdruck eines Textes: die ersten 16 Hex-Zeichen seines SHA-256. Läuft im Browser und in Node. */
export async function audioKey(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text.trim()))
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const audioPath = (key: string) => `/audio/${key}.mp3`
