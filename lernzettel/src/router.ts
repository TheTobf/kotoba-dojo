import { useSyncExternalStore } from 'react'

/** Einfaches Hash-Routing (#/fach/mathe), damit GitHub Pages und Offline-Betrieb ohne Server-Regeln funktionieren. */
export interface Route {
  teile: string[]
  query: URLSearchParams
}

function lies(): string {
  return location.hash
}

function abonniere(h: () => void): () => void {
  window.addEventListener('hashchange', h)
  return () => window.removeEventListener('hashchange', h)
}

export function zerlege(hash: string): Route {
  const ohne = hash.replace(/^#\/?/, '')
  const [pfad, q = ''] = ohne.split('?')
  return { teile: pfad.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q) }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(abonniere, lies, lies)
  return zerlege(hash)
}

export const pfad = {
  start: () => '#/',
  fach: (id: string) => `#/fach/${encodeURIComponent(id)}`,
  zettel: (id: string) => `#/zettel/${encodeURIComponent(id)}`,
  woche: () => '#/woche',
  neu: (bearbeiten?: string) => (bearbeiten ? `#/neu?bearbeiten=${encodeURIComponent(bearbeiten)}` : '#/neu'),
  mehr: () => '#/mehr',
}

export function geheZu(hash: string): void {
  location.hash = hash
}
