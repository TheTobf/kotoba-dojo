/**
 * Web-Push ohne Inhalt („Tickle“): Der Server schickt nur ein Signal, der Service Worker zeigt den Text.
 * Dadurch ist keine Verschlüsselung nötig, nur die VAPID-Unterschrift (ES256-JWT), die den Absender ausweist.
 */

const base64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const encodeJson = (value: unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)))

/** Nur an diese Push-Dienste wird gesendet (schützt davor, dass der Server beliebige Adressen aufruft). */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/]

export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1000) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && PUSH_HOSTS.some((host) => host.test(url.hostname))
  } catch {
    return false
  }
}

export interface VapidKeys {
  /** Öffentlicher Schlüssel (65 Byte, Base64url) – geht auch an den Browser. */
  publicKey: string
  /** Privater Schlüssel als JWK (JSON). Geheim. */
  privateJwk: string
  /** Kontakt für die Push-Dienste: mailto:… oder https://… */
  subject: string
}

/** Kopfzeile `Authorization` für eine Push-Adresse (gültig 12 Stunden). */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys, nowSeconds: number): Promise<string> {
  const jwk = JSON.parse(keys.privateJwk) as JsonWebKey
  const key = await crypto.subtle.importKey('jwk', { ...jwk, key_ops: ['sign'] }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const unsigned = `${encodeJson({ typ: 'JWT', alg: 'ES256' })}.${encodeJson({ aud: new URL(endpoint).origin, exp: nowSeconds + 12 * 3600, sub: keys.subject })}`
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned))
  return `vapid t=${unsigned}.${base64url(signature)}, k=${keys.publicKey}`
}

export type PushResult = 'gesendet' | 'abgemeldet' | 'fehler'

/** Schickt das Signal. „abgemeldet“ = Push-Dienst kennt die Adresse nicht mehr (Erinnerung löschen). */
export async function sendTickle(endpoint: string, keys: VapidKeys, nowSeconds: number, fetcher: typeof fetch = fetch): Promise<PushResult> {
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidAuthorization(endpoint, keys, nowSeconds), TTL: String(4 * 3600), Urgency: 'normal', 'Content-Length': '0' },
  })
  if (response.status === 404 || response.status === 410) return 'abgemeldet'
  return response.ok ? 'gesendet' : 'fehler'
}
