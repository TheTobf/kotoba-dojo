import { afterEach, describe, expect, it, vi } from 'vitest'
import { autoStart, autoWeiter, befehlAus, FAST_ABSTAND, MAX_VERSUCHE, reihum, STILLE_PAUSE } from './automodus'
import { befehlHoeren, type Erkenner } from './sprachbefehl'

const satz = (id: string) => ({ id })
const S = (n: number) => Array.from({ length: n }, (_, i) => satz(`s${i + 1}`))
const leer = () => [] as { id: string }[]
const ids = (xs: { id: string }[]) => xs.map((x) => x.id)

describe('Befehle erkennen', () => {
  it('erkennt die vier Befehle und typische Verhörer', () => {
    expect(befehlAus('passt')).toBe('passt')
    expect(befehlAus('Pass')).toBe('passt')
    expect(befehlAus('gut')).toBe('passt')
    expect(befehlAus('fast')).toBe('fast')
    expect(befehlAus('Fass')).toBe('fast')
    expect(befehlAus('nochmal')).toBe('nochmal')
    expect(befehlAus('noch mal')).toBe('nochmal')
    expect(befehlAus('Noch einmal bitte')).toBe('nochmal')
    expect(befehlAus('Stopp!')).toBe('stopp')
    expect(befehlAus('aufhören')).toBe('stopp')
  })
  it('„stopp“ hat Vorrang, „fast“ schlägt „ja“', () => {
    expect(befehlAus('passt stopp')).toBe('stopp')
    expect(befehlAus('ja fast')).toBe('fast')
  })
  it('nur ganze Wörter, Unsinn ergibt nichts', () => {
    expect(befehlAus('Passagier')).toBeUndefined()
    expect(befehlAus('Gutschein')).toBeUndefined()
    expect(befehlAus('sieht gut aus')).toBe('passt')
    expect(befehlAus('')).toBeUndefined()
    expect(befehlAus('Hallo Zug Durchsage')).toBeUndefined()
  })
})

describe('Satz-Reihenfolge im Automodus', () => {
  it('passt: nächster Satz', () => {
    const { stand, pausieren } = autoWeiter(autoStart(S(6)), 'passt', leer)
    expect(stand.schlange[0].id).toBe('s2')
    expect(stand.zaehler.passt).toBe(1)
    expect(pausieren).toBe(false)
  })

  it('nochmal: derselbe Satz, höchstens MAX_VERSUCHE-mal, dann weiter (kommt später wieder)', () => {
    let st = autoStart(S(8))
    for (let i = 1; i < MAX_VERSUCHE; i++) {
      st = autoWeiter(st, 'nochmal', leer).stand
      expect(st.schlange[0].id).toBe('s1')
      expect(st.versuche).toBe(i + 1)
    }
    st = autoWeiter(st, 'nochmal', leer).stand
    expect(st.schlange[0].id).toBe('s2')
    expect(st.versuche).toBe(1)
    expect(ids(st.schlange)).toContain('s1')
  })

  it('fast: weiter, Satz kommt nach FAST_ABSTAND anderen noch einmal – aber nur einmal', () => {
    let st = autoWeiter(autoStart(S(8)), 'fast', leer).stand
    expect(st.schlange[0].id).toBe('s2')
    expect(st.schlange[FAST_ABSTAND].id).toBe('s1')
    // s2…s5 mit passt abarbeiten, dann ist s1 wieder dran
    for (let i = 0; i < FAST_ABSTAND; i++) st = autoWeiter(st, 'passt', leer).stand
    expect(st.schlange[0].id).toBe('s1')
    st = autoWeiter(st, 'fast', leer).stand
    expect(ids(st.schlange)).not.toContain('s1')
  })

  it('keine Antwort zählt wie „fast“; nach STILLE_PAUSE in Folge wird pausiert, eine Antwort setzt zurück', () => {
    let st = autoStart(S(10))
    let r = autoWeiter(st, undefined, leer)
    expect(r.stand.zaehler.still).toBe(1)
    expect(r.stand.schlange[FAST_ABSTAND].id).toBe('s1')
    for (let i = 1; i < STILLE_PAUSE - 1; i++) r = autoWeiter(r.stand, undefined, leer)
    r = autoWeiter(r.stand, 'passt', leer)
    expect(r.stand.stille).toBe(0)
    st = r.stand
    for (let i = 0; i < STILLE_PAUSE; i++) r = autoWeiter(i ? r.stand : st, undefined, leer)
    expect(r.pausieren).toBe(true)
  })

  it('läuft endlos: Nachschub, wenn die Schlange knapp wird – ohne Doppelte', () => {
    const nachschub = reihum(S(5), 3)
    let st = autoStart(nachschub())
    for (let i = 0; i < 20; i++) {
      st = autoWeiter(st, 'passt', nachschub).stand
      expect(st.schlange.length).toBeGreaterThan(0)
      expect(new Set(ids(st.schlange)).size).toBe(st.schlange.length)
    }
  })

  it('verändert den alten Stand nicht', () => {
    const st = autoStart(S(4))
    autoWeiter(st, 'fast', leer)
    expect(ids(st.schlange)).toEqual(['s1', 's2', 's3', 's4'])
    expect(st.zaehler.fast).toBe(0)
  })
})

/** Nachgebaute Spracherkennung: sagt nacheinander die vorgegebenen Sätze (oder meldet Fehler). */
function fakeErkenner(ablauf: ({ text: string } | { fehler: string })[], starts: { n: number }) {
  return class implements Erkenner {
    lang = ''; continuous = false; interimResults = false; maxAlternatives = 1
    onresult: Erkenner['onresult'] = null
    onerror: Erkenner['onerror'] = null
    onend: Erkenner['onend'] = null
    start() {
      starts.n++
      const schritt = ablauf.shift()
      setTimeout(() => {
        if (!schritt) return this.onend?.()
        if ('fehler' in schritt) this.onerror?.({ error: schritt.fehler })
        else this.onresult?.({ resultIndex: 0, results: [[{ transcript: schritt.text }]] })
        this.onend?.()
      }, 500)
    }
    abort() {}
  }
}

describe('Sprachbefehl hören', () => {
  afterEach(() => { vi.useRealTimers() })

  it('erkennt einen Befehl, auch wenn vorher etwas anderes gesagt wurde', async () => {
    vi.useFakeTimers()
    const starts = { n: 0 }
    const p = befehlHoeren(6000, { Klasse: fakeErkenner([{ text: 'äh hm' }, { text: 'ja passt' }], starts) })
    await vi.advanceTimersByTimeAsync(2000)
    await expect(p).resolves.toBe('passt')
    expect(starts.n).toBe(2)
  })

  it('ohne Befehl: nach Ablauf der Zeit undefined', async () => {
    vi.useFakeTimers()
    const p = befehlHoeren(3000, { Klasse: fakeErkenner([{ fehler: 'no-speech' }], { n: 0 }) })
    await vi.advanceTimersByTimeAsync(3100)
    await expect(p).resolves.toBeUndefined()
  })

  it('offline / nicht erlaubt wird gemeldet und nicht endlos neu gestartet', async () => {
    vi.useFakeTimers()
    const probleme: string[] = []
    const starts = { n: 0 }
    const p = befehlHoeren(3000, { Klasse: fakeErkenner([{ fehler: 'network' }, { text: 'passt' }], starts), onProblem: (x) => probleme.push(x) })
    await vi.advanceTimersByTimeAsync(3100)
    await expect(p).resolves.toBeUndefined()
    expect(probleme).toEqual(['offline'])
    expect(starts.n).toBe(1)
  })

  it('ohne Spracherkennung im Browser: sofort undefined und Hinweis', async () => {
    const probleme: string[] = []
    await expect(befehlHoeren(3000, { Klasse: undefined, onProblem: (x) => probleme.push(x) })).resolves.toBeUndefined()
    expect(probleme).toEqual(['nicht-unterstuetzt'])
  })

  it('Abbruch (Stopp-Tipp) beendet sofort', async () => {
    const c = new AbortController()
    const p = befehlHoeren(60_000, { signal: c.signal, Klasse: fakeErkenner([], { n: 0 }) })
    c.abort()
    await expect(p).resolves.toBeUndefined()
  })
})
