import { invalid } from './errors'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Prüft und vereinheitlicht eine E-Mail-Adresse (klein geschrieben, ohne Leerzeichen am Rand). */
export function parseEmail(value: unknown): string {
  if (typeof value !== 'string') throw invalid('Bitte gib eine E-Mail-Adresse ein.')
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !EMAIL.test(email)) throw invalid('Diese E-Mail-Adresse sieht nicht richtig aus.')
  return email
}

/** Liest den JSON-Inhalt einer Anfrage; alles andere als ein Objekt wird abgelehnt. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw invalid('Die Anfrage konnte nicht gelesen werden.')
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw invalid('Die Anfrage konnte nicht gelesen werden.')
  return body as Record<string, unknown>
}

export function parseText(value: unknown, field: string, maxLength: number, { optional = false } = {}): string {
  if (value === undefined || value === null || value === '') {
    if (optional) return ''
    throw invalid(`„${field}“ fehlt.`)
  }
  if (typeof value !== 'string') throw invalid(`„${field}“ ist ungültig.`)
  const text = value.trim()
  if (text.length > maxLength) throw invalid(`„${field}“ ist zu lang (höchstens ${maxLength} Zeichen).`)
  if (!text && !optional) throw invalid(`„${field}“ fehlt.`)
  return text
}
