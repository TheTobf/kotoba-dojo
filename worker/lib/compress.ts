/** gzip + Base64 mit den eingebauten Streams (Cloudflare Workers und Node). */

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function gzipBase64(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return toBase64(await collect(stream))
}

export async function gunzipBase64(data: string): Promise<string> {
  const stream = new Blob([fromBase64(data)]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new TextDecoder().decode(await collect(stream))
}
