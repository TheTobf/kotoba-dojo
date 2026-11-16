/**
 * KI-Figuren für den Sprechmodus (Pro). Alle sind erfundene Figuren und in der Oberfläche klar als KI gekennzeichnet.
 * PLATZHALTER: Namen und Texte sind Beispiele – an die eigene Story anpassen.
 */
export interface Character {
  id: string
  name: string
  /** Name in japanischer Schrift. */
  nameJa: string
  role: string
  /** Kurzbeschreibung auf Deutsch. */
  about: string
  /** Sprachniveau der Antworten. */
  level: 'einfach' | 'mittel'
}

export const CHARACTERS: Character[] = [
  {
    id: 'haru',
    name: 'Haru',
    nameJa: 'はる',
    role: 'Barista im Café Komorebi',
    about: 'Geduldig und freundlich. Spricht langsam und in kurzen, höflichen Sätzen – ideal für den Anfang.',
    level: 'einfach',
  },
  {
    id: 'sora',
    name: 'Sora',
    nameJa: 'そら',
    role: 'Mitbewohnerin in Tokio',
    about: 'Locker und neugierig. Redet über Alltag, Essen und Pläne fürs Wochenende.',
    level: 'mittel',
  },
]

export const findCharacter = (id: string) => CHARACTERS.find((c) => c.id === id)
