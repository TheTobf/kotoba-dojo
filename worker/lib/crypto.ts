/** Kleine Krypto-Helfer auf Basis von Web Crypto (läuft in Cloudflare Workers und in Node). */

const encoder = new TextEncoder()

const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  [...(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('')

/** Zufälliges, nicht erratbares Token (Standard: 32 Byte = 64 Hex-Zeichen). */
export function randomToken(bytes = 32): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)))
}

export const randomId = (prefix: string) => `${prefix}_${randomToken(12)}`

/** Sechsstelliger Einmalcode, gleichmäßig verteilt. */
export function randomCode(): string {
  const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000
  const buffer = new Uint32Array(1)
  let value: number
  do {
    crypto.getRandomValues(buffer)
    value = buffer[0]
  } while (value >= limit)
  return String(value % 1_000_000).padStart(6, '0')
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(text)))
}

export async function hmacHex(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(text)))
}

/** Vergleich ohne Zeitunterschiede (verhindert, dass man einen Code Zeichen für Zeichen errät). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
