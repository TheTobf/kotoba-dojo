import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EpisodeZ, type CurriculumEntry } from '../src/episode/schema'
import { buildTimeline, chunkCaptions, type AudioInfo, type StyleRules } from '../src/episode/timeline'
import { validateEpisode } from '../src/episode/validate'

const style = JSON.parse(readFileSync(new URL('../../style/stilvorlage.json', import.meta.url), 'utf8')) as StyleRules & { verboteneWoerter: string[]; stimmen: Record<string, unknown> }
const curriculum = new Map((JSON.parse(readFileSync(new URL('../../curriculum/curriculum.json', import.meta.url), 'utf8')).eintraege as CurriculumEntry[]).map((e) => [e.id, e]))
const raw = JSON.parse(readFileSync(new URL('../../episodes/ep01/episode.json', import.meta.url), 'utf8'))
const ep = EpisodeZ.parse(raw)

/** künstlicher Ton: 0,38 s pro Wort, 0,12 s pro Kana */
function fakeAudio(): AudioInfo {
  const lines: AudioInfo['lines'] = {}
  const ja: AudioInfo['ja'] = {}
  ep.beats.forEach((b, i) => {
    if (b.kind === 'erzaehler') for (const l of b.lines) {
      const words = l.text.split(' ')
      lines[l.n] = { file: `lines/${l.n}.wav`, duration: words.length * 0.38, words: words.map((w, k) => ({ text: w, start: k * 0.38, end: k * 0.38 + 0.3 })) }
    } else {
      const kana = [...curriculum.get(b.sentence)!.kana.replace(/[。、]/g, '')]
      const clip = (f: number) => ({ file: `ja/${i}.wav`, duration: kana.length * 0.12 * f + 0.2, moras: kana.map((k, m) => ({ kana: k, start: 0.08 + m * 0.12 * f, end: 0.08 + (m + 1) * 0.12 * f })) })
      ja[String(i)] = clip(1)
      ja[`${i}-slow`] = clip(1.25)
    }
  })
  return { lines, ja, preview: true }
}

describe('Schnitt (Zeitplan)', () => {
  const tl = buildTimeline({ episode: ep, style, audio: fakeAudio(), curriculum, counterBase: 0, knownBefore: new Set() })

  it('Länge liegt zwischen 61 und 75 s', () => {
    expect(tl.duration).toBeGreaterThanOrEqual(61)
    expect(tl.duration).toBeLessThanOrEqual(75)
  })
  it('schneidet alle 2–3 s (außer bei sehr kurzen Abschnitten)', () => {
    for (const s of tl.shots) expect(s.end - s.start).toBeLessThanOrEqual(3.01)
    expect(tl.shots.length).toBeGreaterThan(tl.duration / 3.1)
  })
  it('nie zweimal dieselbe Kamera hintereinander in derselben Szene', () => {
    tl.shots.forEach((s, i) => { if (i > 0 && tl.shots[i - 1].scene === s.scene && tl.shots[i - 1].beat === s.beat) expect(s.preset).not.toBe(tl.shots[i - 1].preset) })
  })
  it('Hook: Stimme ab Sekunde 0, Titel bis höchstens 3,2 s', () => {
    expect(tl.clips.find((c) => c.kind === 'voice')!.start).toBeLessThan(0.2)
    expect(tl.hook.end).toBeLessThanOrEqual(3.2)
  })
  it('Quiz: 3 s Countdown mit Ticks, danach die Lösung', () => {
    const q = tl.quiz[0]
    expect(q.revealStart - q.countdownStart).toBe(3)
    expect(tl.clips.filter((c) => c.src.includes('tick')).length).toBe(3)
    const answer = tl.ja.find((j) => j.quiz)!
    expect(answer.moras[0].start).toBeGreaterThan(q.revealStart)
  })
  it('Zähler steigt, wenn Ole seinen ersten Satz sagt', () => {
    expect(tl.counter.steps).toEqual([expect.objectContaining({ value: 1 })])
  })
  it('Lernsätze werden langsam wiederholt, Kontext-Sätze nicht', () => {
    expect(tl.ja.filter((j) => j.role === 'lernen').every((j) => j.slow)).toBe(true)
    expect(tl.ja.filter((j) => j.role === 'kontext').every((j) => !j.slow)).toBe(true)
  })
  it('Untertitel höchstens 4 Wörter', () => {
    for (const c of tl.captions) expect(c.words.length).toBeLessThanOrEqual(4)
    expect(chunkCaptions([{ text: 'Tokio.', start: 0, end: 0.3 }, { text: 'Passkontrolle.', start: 0.4, end: 0.9 }], 4, 1)).toHaveLength(2)
  })
})

describe('Prüfung einer Folge', () => {
  const ctx = { curriculum, introducedBefore: new Map<string, string>(), hasEarlierEpisodes: false, voices: Object.keys(style.stimmen).filter((k) => k !== 'hinweis'), forbiddenWords: style.verboteneWoerter, strict: true }
  it('Folge 1 ist fehlerfrei', () => {
    expect(validateEpisode(raw, ctx).errors).toEqual([])
  })
  it('erkennt Werbung im Erzähltext', () => {
    const bad = structuredClone(raw)
    bad.beats[0].lines[0].text = 'Lad dir die App runter!'
    expect(validateEpisode(bad, ctx).errors.join(' ')).toContain('App')
  })
  it('sperrt [PRÜFEN]-Sätze und schon eingeführte Sätze', () => {
    const bad = structuredClone(raw)
    bad.beats[7].sentence = 'c162'
    const r = validateEpisode(bad, { ...ctx, introducedBefore: new Map([['c020', 'ep00']]) })
    expect(r.errors.join(' ')).toContain('[PRÜFEN]')
    expect(r.errors.join(' ')).toContain('c020')
  })
  it('verlangt einen Quiz-Moment', () => {
    const bad = structuredClone(raw)
    bad.beats = bad.beats.filter((b: { kind: string }) => b.kind !== 'quiz')
    expect(validateEpisode(bad, ctx).errors.join(' ')).toContain('Quiz')
  })
})
