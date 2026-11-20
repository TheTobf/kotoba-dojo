/**
 * ffmpeg nur zum Umwandeln (m4a/mp3/wav → WAV). Benutzt das ffmpeg, das Remotion ohnehin mitbringt –
 * nichts extra zu installieren. KOTOBA_FFMPEG überschreibt den Pfad.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { readWav, type Audio } from './wav'

const require = createRequire(import.meta.url)

function compositorDir(): string | undefined {
  const pkgs: Record<string, string> = {
    'win32-x64': '@remotion/compositor-win32-x64-msvc',
    'darwin-arm64': '@remotion/compositor-darwin-arm64',
    'darwin-x64': '@remotion/compositor-darwin-x64',
    'linux-x64': '@remotion/compositor-linux-x64-gnu',
    'linux-arm64': '@remotion/compositor-linux-arm64-gnu',
  }
  const pkg = pkgs[`${process.platform}-${process.arch}`]
  if (!pkg) return undefined
  try { return dirname(require.resolve(`${pkg}/package.json`)) } catch { return undefined }
}

export function ffmpeg(args: string[], opts: { input?: Buffer } = {}): Buffer {
  const custom = process.env.KOTOBA_FFMPEG
  const dir = compositorDir()
  const local = dir ? join(dir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg') : undefined
  const bin = custom || (local && existsSync(local) ? local : 'ffmpeg')
  const env = { ...process.env }
  if (!custom && dir && process.platform === 'linux') env.LD_LIBRARY_PATH = [dir, env.LD_LIBRARY_PATH].filter(Boolean).join(':')
  if (!custom && dir && process.platform === 'darwin') env.DYLD_LIBRARY_PATH = [dir, env.DYLD_LIBRARY_PATH].filter(Boolean).join(':')
  const r = spawnSync(bin, ['-hide_banner', '-loglevel', 'error', ...args], { env, input: opts.input, maxBuffer: 1 << 30 })
  if (r.error) throw new Error(`ffmpeg nicht startbar (${bin}): ${r.error.message}`)
  if (r.status !== 0) throw new Error(`ffmpeg-Fehler: ${r.stderr.toString().trim().slice(0, 500)}`)
  return r.stdout
}

/** Beliebige Audiodatei → Mono-Samples mit gewünschter Abtastrate */
export function decodeAudio(file: string, sampleRate = 48000): Audio {
  if (file.toLowerCase().endsWith('.wav')) {
    const a = readWav(readFileSync(file))
    if (a.sampleRate === sampleRate) return a
  }
  const out = ffmpeg(['-i', resolve(file), '-vn', '-ac', '1', '-ar', String(sampleRate), '-acodec', 'pcm_s16le', '-f', 'wav', 'pipe:1'])
  return readWav(out)
}
