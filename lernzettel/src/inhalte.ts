import { useMemo } from 'react'
import { useZustand } from './speicher'
import { ausPfad, baueZettel, type Rohzettel, type Zettel } from './zettel'

// Alle Lernzettel aus inhalte/<fach>/*.md werden beim Bauen in die App gepackt (offline verfügbar).
const dateien = import.meta.glob('../inhalte/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const ROH: Rohzettel[] = Object.entries(dateien).map(([pfad, text]) => {
  const { fach, id } = ausPfad(pfad)
  return baueZettel(id, text, { fach })
})

export const APP_ZETTEL: Zettel[] = ROH.map((r) => r.zettel)

/** Lernzettel aus der App + die auf diesem Gerät eingefügten */
export function useAlleZettel(): Zettel[] {
  const { eigene } = useZustand()
  return useMemo(() => [...APP_ZETTEL, ...eigene], [eigene])
}
