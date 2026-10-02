import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { autoStart, autoWeiter, MAX_VERSUCHE, reihum, type AutoStand, type Befehl, type Urteil } from '../automodus'
import { befehlHoeren, kannBefehle, type Problem } from '../sprachbefehl'
import { abspielen, aufnehmen, kannAufnehmen, satzAbspielen, warten, XP_SHADOW } from '../shadowing'
import { belohnen } from '../motivation'
import { correctSound, dranSound, frageSound, rateSound, vibrate, wrongSound } from '../sfx'
import type { Sentence, Settings } from '../types'
import SentenceText from './SentenceText'

/** So lange wartet der Automodus nach jedem Satz auf „passt / fast / nochmal / stopp“. */
const ANTWORT_MS = 6000

type Phase = 'hoeren' | 'sprechen' | 'vergleichen' | 'antwort' | 'pause'
type Grund = 'tipp' | 'stopp' | 'still' | 'versteckt' | 'fehler' | 'leer'

const SCHRITTE: [Exclude<Phase, 'pause'>, string, string][] = [
  ['hoeren', '🔊', 'Hören'], ['sprechen', '🎙️', 'Du'], ['vergleichen', '🔁', 'Vergleich'], ['antwort', '💬', 'Antwort'],
]
const GRUND: Record<Grund, string> = {
  tipp: 'Pausiert.',
  stopp: '„Stopp“ gehört – pausiert.',
  still: 'Drei Sätze ohne Antwort – pausiert. Bist du noch da?',
  versteckt: 'Die App war im Hintergrund – pausiert.',
  fehler: 'Pausiert.',
  leer: 'Keine Sätze mehr da.',
}
const ANZEIGE: Record<Urteil, string> = { passt: '✓ Passt!', fast: '〜 Fast', nochmal: '↻ Nochmal' }
const OHNE_BEFEHLE = 'Sprachbefehle gehen in diesem Browser nicht – tipp auf die Knöpfe (am besten in Chrome öffnen).'

/**
 * Automodus: Shadowing freihändig. Satz hören → nachsprechen → Original + du → Antwort per Stimme.
 * Läuft endlos, bis „stopp“, ein Tipp auf den Bildschirm oder drei Sätze ohne Antwort.
 */
export default function Automodus({ vorrat, settings, onDone }: {
  vorrat: Sentence[]
  settings: Settings
  onDone: (r: { right: number; total: number }) => void
}) {
  const [nachschub] = useState(() => reihum(vorrat))
  const [stand, setStand] = useState<AutoStand<Sentence>>(() => autoStart(nachschub()))
  const [phase, setPhase] = useState<Phase>('hoeren')
  const [grund, setGrund] = useState<Grund>()
  const [pegel, setPegel] = useState(0)
  const [hinweis, setHinweis] = useState<string | undefined>(() => kannBefehle() ? undefined : OHNE_BEFEHLE)
  const [erkannt, setErkannt] = useState<string>()
  const standRef = useRef(stand)
  const laufRef = useRef<AbortController>(undefined)
  const knopfRef = useRef<(b: Befehl | undefined) => void>(undefined)
  const befehleRef = useRef(kannBefehle()) // für die laufende Schleife
  const [befehleAn, setBefehleAn] = useState(kannBefehle) // für die Anzeige
  const vol = settings.muted ? 0 : settings.volume
  const sfx = { volume: settings.volume, muted: settings.muted }

  const setzeStand = (s: AutoStand<Sentence>) => { standRef.current = s; setStand(s) }

  const anhalten = (g: Grund) => {
    laufRef.current?.abort()
    laufRef.current = undefined
    knopfRef.current = undefined
    setPegel(0)
    setGrund(g)
    setPhase('pause')
  }

  const problem = (p: Problem) => {
    if (p === 'offline') setHinweis('Sprachbefehle brauchen Internet – gerade keins. Tipp einfach auf die Knöpfe.')
    else {
      befehleRef.current = false
      setBefehleAn(false)
      setHinweis(OHNE_BEFEHLE)
    }
  }

  /** Wartet auf Stimme oder Knopf – höchstens ANTWORT_MS; `undefined` = keine Antwort. */
  const antwortHolen = (sig: AbortSignal) => new Promise<Befehl | undefined>((ok) => {
    const hoeren = new AbortController()
    let fertig = false
    const ende = (b: Befehl | undefined) => {
      if (fertig) return
      fertig = true
      clearTimeout(t)
      hoeren.abort()
      sig.removeEventListener('abort', abbruch)
      knopfRef.current = undefined
      ok(b)
    }
    const abbruch = () => ende(undefined)
    const t = setTimeout(abbruch, ANTWORT_MS)
    sig.addEventListener('abort', abbruch, { once: true })
    knopfRef.current = ende
    if (befehleRef.current) {
      void befehlHoeren(ANTWORT_MS, { signal: hoeren.signal, onProblem: problem })
        .then((b) => { if (b) { setHinweis(undefined); ende(b) } })
    }
  })

  const rueckmeldung = (b: Urteil | undefined) => {
    setErkannt(b ? ANZEIGE[b] : '… keine Antwort')
    setTimeout(() => setErkannt(undefined), 1400)
    if (b === 'passt') correctSound(standRef.current.zaehler.passt, sfx)
    else if (b === 'nochmal') wrongSound(sfx)
    else rateSound(2, sfx)
    vibrate(settings.vibration, b === 'passt' ? [15, 40, 15] : 15)
  }

  const lauf = async (sig: AbortSignal) => {
    while (!sig.aborted) {
      const s = standRef.current.schlange[0]
      if (!s) return anhalten('leer')

      setPhase('hoeren')
      await satzAbspielen(s, vol, false, sig)
      await warten(350, sig)
      if (sig.aborted) return

      setPhase('sprechen')
      dranSound(sfx)
      await warten(300, sig) // Ton nicht mit aufnehmen
      if (sig.aborted) return
      let eigene: string | undefined
      if (kannAufnehmen()) {
        try {
          const rec = await aufnehmen(setPegel, 12_000, 6_000)
          sig.addEventListener('abort', rec.stop, { once: true })
          const blob = await rec.fertig
          sig.removeEventListener('abort', rec.stop)
          setPegel(0)
          if (sig.aborted) return
          if (rec.gesprochen()) eigene = URL.createObjectURL(blob)
        } catch (e) {
          setHinweis((e as Error).name === 'NotAllowedError'
            ? 'Mikrofon nicht erlaubt – bitte in den Browser-Einstellungen freigeben.'
            : `Aufnahme nicht möglich: ${(e as Error).message}`)
          return anhalten('fehler')
        }
      } else {
        await warten(1500 + s.ja.length * 250, sig) // ohne Mikrofon: Zeit zum lauten Mitsprechen
        if (sig.aborted) return
      }

      if (eigene) {
        setPhase('vergleichen')
        await satzAbspielen(s, vol, false, sig)
        await warten(250, sig)
        await abspielen(eigene, 1, 1, sig)
        URL.revokeObjectURL(eigene)
        if (sig.aborted) return
      }

      setPhase('antwort')
      frageSound(sfx)
      const b = await antwortHolen(sig)
      if (sig.aborted) return
      if (b === 'stopp') return anhalten('stopp')
      rueckmeldung(b)
      if (b) void belohnen(XP_SHADOW[b], { dailyGoal: settings.dailyGoal })
      const { stand: neu, pausieren } = autoWeiter(standRef.current, b, nachschub)
      setzeStand(neu)
      if (pausieren) return anhalten('still')
      await warten(500, sig)
    }
  }

  const starten = () => {
    const c = new AbortController()
    laufRef.current = c
    setGrund(undefined)
    setzeStand({ ...standRef.current, stille: 0 })
    void lauf(c.signal)
  }

  // Beim Öffnen sofort loslegen; beim Verlassen alles anhalten
  useEffect(() => {
    starten()
    return () => laufRef.current?.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Bildschirm wach halten, solange es läuft; im Hintergrund pausieren (Chrome stoppt dann das Mikrofon)
  const laeuft = phase !== 'pause'
  useEffect(() => {
    if (!laeuft) return
    let lock: { release: () => Promise<void> } | undefined
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<typeof lock> } }).wakeLock
    wl?.request('screen').then((l) => { lock = l }).catch(() => {})
    const sichtbar = () => { if (document.hidden) anhalten('versteckt') }
    document.addEventListener('visibilitychange', sichtbar)
    return () => {
      document.removeEventListener('visibilitychange', sichtbar)
      void lock?.release().catch(() => {})
    }
  }, [laeuft]) // eslint-disable-line react-hooks/exhaustive-deps

  const z = stand.zaehler
  const bewertet = z.passt + z.fast + z.nochmal + z.still
  const fertig = () => onDone({ right: z.passt, total: bewertet })
  const s = stand.schlange[0]
  const knopf = (b: Befehl) => (e: MouseEvent) => { e.stopPropagation(); knopfRef.current?.(b) }

  return (
    <section className="space-y-4" onClick={() => { if (laeuft) anhalten('tipp') }}>
      <div className="flex items-center gap-3">
        <button onClick={(e) => { e.stopPropagation(); laufRef.current?.abort(); fertig() }} className="btn min-h-10 px-2 opacity-60" aria-label="Beenden">✕</button>
        <span className="font-bold">🚆 Automodus</span>
        <span className="ml-auto text-sm tabular-nums opacity-70">
          ✓ {z.passt} · 〜 {z.fast} · ↻ {z.nochmal}{z.still ? ` · … ${z.still}` : ''}
        </span>
      </div>

      {s && (
        <div className="card p-5">
          <SentenceText sentence={s} furigana={settings.furigana} className="text-2xl" />
          <div className="text-sm opacity-60">{s.romaji}</div>
          <div className="mt-1">{s.de}</div>
          {stand.versuche > 1 && <div className="mt-2 text-xs opacity-60">Versuch {stand.versuche} von {MAX_VERSUCHE}</div>}
        </div>
      )}

      {laeuft ? (
        <>
          <div className="grid grid-cols-4 gap-1 text-center text-xs">
            {SCHRITTE.map(([id, icon, label]) => (
              <div key={id} className={`rounded-xl py-2 transition ${phase === id ? 'bg-sakura/15 font-bold text-sakura' : 'opacity-40'}`}>
                <div className="text-xl">{icon}</div>{label}
              </div>
            ))}
          </div>

          {phase === 'sprechen' && (
            <div className="space-y-1 text-center">
              <div className="font-bold">Jetzt du – sprich nach!</div>
              {kannAufnehmen() && (
                <div className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div className="h-full rounded-full bg-neon transition-[width]" style={{ width: `${pegel * 100}%` }} />
                </div>
              )}
            </div>
          )}

          {phase === 'antwort' && (
            <div className="space-y-2">
              <div className="text-center font-bold">
                {befehleAn ? 'Sag: „passt“, „fast“, „nochmal“ oder „stopp“' : 'Wie war’s?'}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div key={bewertet} className="h-full rounded-full bg-sakura" style={{ animation: `shrink ${ANTWORT_MS}ms linear forwards` }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={knopf('nochmal')} className="btn bg-rose-500/15 text-rose-600 dark:text-rose-300">Nochmal</button>
                <button onClick={knopf('fast')} className="btn bg-amber-500/15 text-amber-700 dark:text-amber-300">Fast</button>
                <button onClick={knopf('passt')} className="btn bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Passt!</button>
              </div>
            </div>
          )}

          {erkannt && <div className="pop-in text-center text-lg font-bold">{erkannt}</div>}
          {hinweis && <p className="text-center text-sm text-amber-700 dark:text-amber-300">{hinweis}</p>}

          <button onClick={(e) => { e.stopPropagation(); anhalten('tipp') }} className="btn w-full bg-black/5 py-4 text-lg dark:bg-white/10">
            ⏸ Stopp <span className="text-sm opacity-60">(oder irgendwo tippen)</span>
          </button>
        </>
      ) : (
        <div className="card pop-in space-y-3 p-5 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-lg font-bold">{grund ? GRUND[grund] : 'Pausiert.'}</div>
          {hinweis && <p className="text-sm text-amber-700 dark:text-amber-300">{hinweis}</p>}
          <p className="opacity-80">
            {bewertet} Sätze: ✓ {z.passt} passt · 〜 {z.fast} fast · ↻ {z.nochmal} nochmal{z.still ? ` · ${z.still} ohne Antwort` : ''}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={fertig} className="btn bg-black/5 dark:bg-white/10">Fertig</button>
            {grund !== 'leer' && <button onClick={() => { setHinweis(undefined); starten() }} className="btn-primary">▶ Weiter</button>}
          </div>
        </div>
      )}
    </section>
  )
}
