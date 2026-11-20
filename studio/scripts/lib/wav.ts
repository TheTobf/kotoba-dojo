/** WAV lesen und schreiben (Mono, Float32 intern). */
export interface Audio { sampleRate: number; samples: Float32Array }

export function readWav(buf: Buffer): Audio {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Keine WAV-Datei')
  let pos = 12
  let fmt: { format: number; channels: number; rate: number; bits: number } | undefined
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4)
    let size = buf.readUInt32LE(pos + 4)
    const body = pos + 8
    if (id === 'fmt ') {
      fmt = { format: buf.readUInt16LE(body), channels: buf.readUInt16LE(body + 2), rate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) }
      if (fmt.format === 0xfffe) fmt.format = buf.readUInt16LE(body + 24)
    } else if (id === 'data' && fmt) {
      if (size === 0 || size === 0xffffffff || body + size > buf.length) size = buf.length - body
      const bytes = fmt.bits / 8
      const frames = Math.floor(size / (bytes * fmt.channels))
      const out = new Float32Array(frames)
      for (let i = 0; i < frames; i++) {
        let sum = 0
        for (let c = 0; c < fmt.channels; c++) {
          const o = body + (i * fmt.channels + c) * bytes
          if (fmt.format === 3 && fmt.bits === 32) sum += buf.readFloatLE(o)
          else if (fmt.bits === 16) sum += buf.readInt16LE(o) / 32768
          else if (fmt.bits === 24) sum += (buf.readIntLE(o, 3)) / 8388608
          else if (fmt.bits === 32) sum += buf.readInt32LE(o) / 2147483648
          else throw new Error(`WAV mit ${fmt.bits} Bit wird nicht unterstützt`)
        }
        out[i] = sum / fmt.channels
      }
      return { sampleRate: fmt.rate, samples: out }
    }
    pos = body + size + (size % 2)
  }
  throw new Error('WAV ohne Daten')
}

export function writeWav(a: Audio): Buffer {
  const n = a.samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0, 'ascii'); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8, 'ascii')
  buf.write('fmt ', 12, 'ascii'); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(a.sampleRate, 24); buf.writeUInt32LE(a.sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36, 'ascii'); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, a.samples[i]))
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  return buf
}

export const duration = (a: Audio) => a.samples.length / a.sampleRate
