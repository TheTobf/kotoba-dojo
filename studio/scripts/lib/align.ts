/**
 * Skript ↔ Aufnahme: Findet jeden Skript-Satz in der Spracherkennung (whisper), auch wenn er mehrfach
 * gesprochen wurde (Versprecher → einfach wiederholen). Gewählt wird die letzte gute Fassung.
 * Ergebnis: pro Satz Start/Ende in der Aufnahme und Wort-Zeiten für die Untertitel.
 */

export interface TWord { text: string; start: number; end: number }
export interface ScriptLine { n: number; text: string }
export interface Take { start: number; end: number; score: number; from: number; to: number }
export interface LineMatch {
  n: number
  take?: Take
  /** alle gefundenen Fassungen (für den Bericht) */
  takes: Take[]
  /** Wort-Zeiten mit dem Skript-Text (absolute Zeiten in der Aufnahme) */
  words: TWord[]
}

const NUMBERS: Record<string, string> = {
  null: '0', ein: '1', eins: '1', eine: '1', einen: '1', zwei: '2', drei: '3', vier: '4', fünf: '5', fuenf: '5', sechs: '6', sieben: '7',
  acht: '8', neun: '9', zehn: '10', elf: '11', zwölf: '12', zwoelf: '12', zwanzig: '20', dreißig: '30', dreissig: '30', hundert: '100',
}

/** Wort vereinfachen: klein, ohne Satzzeichen, Umlaute ausgeschrieben, Zahlwörter als Ziffern */
export function norm(w: string): string {
  let s = w.toLowerCase().replace(/[%]/g, ' prozent ').replace(/[^\p{L}\p{N}\s-]/gu, '').trim()
  if (NUMBERS[s]) return NUMBERS[s]
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/-/g, '')
  return NUMBERS[s] ?? s
}

export function tokens(text: string): string[] {
  return text.split(/[\s–—/]+/).map(norm).filter(Boolean)
}

/** Ähnlichkeit zweier Wörter 0…1 (Levenshtein auf Buchstaben) */
export function wordSim(a: string, b: string): number {
  if (a === b) return 1
  if (!a || !b) return 0
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return 1 - prev[n] / Math.max(m, n)
}

const subCost = (a: string, b: string) => { const s = wordSim(a, b); return s >= 0.8 ? (1 - s) * 0.5 : 1 - s * 0.5 }

/** Editierdistanz Wortfolge ↔ Wortfolge, mit Zuordnung (welches Skriptwort ↔ welches erkannte Wort) */
export function alignTokens(script: string[], heard: string[]): { cost: number; pairs: (number | -1)[] } {
  const m = script.length, n = heard.length
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j * 0.8 : j === 0 ? i : 0)))
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 0.8, d[i - 1][j - 1] + subCost(script[i - 1], heard[j - 1]))
  }
  const pairs: (number | -1)[] = new Array(m).fill(-1)
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (Math.abs(d[i][j] - (d[i - 1][j - 1] + subCost(script[i - 1], heard[j - 1]))) < 1e-9) {
      if (wordSim(script[i - 1], heard[j - 1]) >= 0.5) pairs[i - 1] = j - 1
      i--; j--
    } else if (Math.abs(d[i][j] - (d[i - 1][j] + 1)) < 1e-9) i--
    else j--
  }
  return { cost: d[m][n], pairs }
}

/** Alle Stellen, an denen ein Satz gesprochen wurde (mit Güte 0…1) */
export function findTakes(line: string[], heard: string[], times: TWord[]): Take[] {
  const n = line.length
  if (!n) return []
  const found: Take[] = []
  const minL = Math.max(1, Math.floor(n * 0.6)), maxL = Math.ceil(n * 1.45) + 1
  const lineSet = new Set(line)
  for (let p = 0; p < heard.length; p++) {
    // schneller Vorfilter: Anfang des Satzes muss ungefähr passen
    if (Math.max(wordSim(heard[p], line[0]), n > 1 ? wordSim(heard[p], line[1]) * 0.9 : 0) < 0.55) continue
    let best: Take | undefined
    for (let L = minL; L <= maxL && p + L <= heard.length; L++) {
      const window = heard.slice(p, p + L)
      const overlap = window.filter((w) => lineSet.has(w)).length / n
      if (overlap < 0.35) continue
      const { cost } = alignTokens(line, window)
      const score = 1 - cost / Math.max(n, L)
      if (!best || score > best.score) best = { from: p, to: p + L - 1, start: times[p].start, end: times[p + L - 1].end, score }
    }
    if (best && best.score >= 0.55) found.push(best)
  }
  // Überlappende Treffer: den besten behalten
  found.sort((a, b) => b.score - a.score)
  const kept: Take[] = []
  for (const t of found) if (!kept.some((k) => t.from <= k.to && k.from <= t.to)) kept.push(t)
  return kept.sort((a, b) => a.start - b.start)
}

/**
 * Für alle Sätze die beste Fassung wählen: Reihenfolge bleibt erhalten, bei Wiederholungen gewinnt die letzte
 * Fassung, die fast so gut ist wie die beste (wer wiederholt, war mit der vorigen nicht zufrieden).
 */
export function matchScript(lines: ScriptLine[], words: TWord[]): LineMatch[] {
  const heard = words.map((w) => norm(w.text))
  const all = lines.map((l) => findTakes(tokens(l.text), heard, words))
  type State = { total: number; prev: number; choice: number }
  const dp: State[][] = []
  const SKIP = -1.2
  lines.forEach((_, i) => {
    const options = [...all[i].map((_, k) => k), -1]
    dp[i] = options.map((choice) => {
      const take = choice >= 0 ? all[i][choice] : undefined
      const value = take ? take.score + lateBonus(all[i], choice) : SKIP
      if (i === 0) return { total: value, prev: -1, choice }
      let best: State = { total: -Infinity, prev: -1, choice }
      dp[i - 1].forEach((ps, pi) => {
        const pt = ps.choice >= 0 ? all[i - 1][ps.choice] : undefined
        const endPrev = pt ? pt.to : lastEnd(dp, all, i - 1, pi)
        if (take && endPrev >= take.from) return
        const total = ps.total + value
        if (total > best.total) best = { total, prev: pi, choice }
      })
      return best
    })
  })
  // zurückverfolgen
  const choice: number[] = new Array(lines.length).fill(-1)
  let idx = dp[lines.length - 1].reduce((b, s, i, arr) => (s.total > arr[b].total ? i : b), 0)
  for (let i = lines.length - 1; i >= 0; i--) {
    choice[i] = dp[i][idx].choice
    idx = dp[i][idx].prev
  }
  return lines.map((l, i) => {
    const take = choice[i] >= 0 ? all[i][choice[i]] : undefined
    return { n: l.n, take, takes: all[i], words: take ? wordTimes(l.text, words.slice(take.from, take.to + 1)) : [] }
  })
}

function lastEnd(dp: { prev: number; choice: number }[][], all: Take[][], i: number, pi: number): number {
  let row = i, k = pi
  while (row >= 0) {
    const s = dp[row][k]
    if (s.choice >= 0) return all[row][s.choice].to
    k = s.prev; row--
    if (k < 0) break
  }
  return -1
}

function lateBonus(takes: Take[], k: number): number {
  const best = Math.max(...takes.map((t) => t.score))
  const good = takes.map((t, i) => (t.score >= best - 0.08 ? i : -1)).filter((i) => i >= 0)
  return k === good[good.length - 1] ? 0.05 : 0
}

/** Skript-Wörter mit Zeiten aus der Erkennung (fehlende Wörter werden dazwischen verteilt) */
export function wordTimes(scriptText: string, heardWords: TWord[]): TWord[] {
  const raw = scriptText.split(/\s+/).filter(Boolean)
  const { pairs } = alignTokens(raw.map(norm), heardWords.map((w) => norm(w.text)))
  const out: TWord[] = raw.map((text, i) => {
    const j = pairs[i]
    return j >= 0 ? { text, start: heardWords[j].start, end: heardWords[j].end } : { text, start: NaN, end: NaN }
  })
  const first = heardWords[0]?.start ?? 0, last = heardWords[heardWords.length - 1]?.end ?? first
  for (let i = 0; i < out.length; i++) {
    if (!Number.isNaN(out[i].start)) continue
    let a = i - 1; while (a >= 0 && Number.isNaN(out[a].start)) a--
    let b = i + 1; while (b < out.length && Number.isNaN(out[b].start)) b++
    const from = a >= 0 ? out[a].end : first, to = b < out.length ? out[b].start : last
    const count = b - a - 1, pos = i - a
    out[i] = { text: out[i].text, start: from + ((to - from) * (pos - 1)) / count, end: from + ((to - from) * pos) / count }
  }
  return out
}

/** Gleichmäßig verteilte Wort-Zeiten (für die Vorschau-Stimme ohne Erkennung) */
export function evenWordTimes(text: string, start: number, end: number): TWord[] {
  const raw = text.split(/\s+/).filter(Boolean)
  const weights = raw.map((w) => Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, '').length) + 1.5)
  const total = weights.reduce((a, b) => a + b, 0)
  let t = start
  return raw.map((w, i) => {
    const d = ((end - start) * weights[i]) / total
    const word = { text: w, start: t, end: t + d * 0.92 }
    t += d
    return word
  })
}
