import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { assetUrl } from '../data'
import { speak } from '../audio'
import { abspielen, aufnehmen, kannAufnehmen, kurveAusBlob, kurveAusDatei, type Aufnahme } from '../shadowing'
import { belohnen } from '../motivation'
import { correctSound, wrongSound } from '../sfx'
import type { Sentence, Settings } from '../types'
import SentenceText from './SentenceText'

type Kurve = { kurve: number[]; dauer: number }
export type Urteil = 'nochmal' | 'fast' | 'passt'

const XP_SHADOW: Record<Urteil, number> = { nochmal: 2, fast: 6, passt: 12 }

/** Ein Satz: anhören → nachsprechen → Original + eigene Aufnahme vergleichen → selbst einschätzen. */
export function ShadowSatz({ s, settings, onUrteil }: { s: Sentence; settings: Settings; onUrteil?: (u: Urteil) => void }) {
  const [orig, setOrig] = useState<Kurve>()
  const [eigen, setEigen] = useState<Kurve & { url: string }>()
  const [rec, setRec] = useState<Aufnahme>()
  const [pegel, setPegel] = useState(0)
  const [spielt, setSpielt] = useState(false)
  const [fehler, setFehler] = useState<string>()
  const urlRef = useRef<string>(undefined)
  const vol = settings.muted ? 0 : settings.volume

  useEffect(() => {
    setOrig(undefined); setEigen(undefined); setFehler(undefined)
    if (s.audio) kurveAusDatei(s.audio).then(setOrig).catch(() => {})
    if (!settings.muted) speak(s.ja, s.audio, { volume: settings.volume })
  }, [s]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  const original = (slow = false) => s.audio ? abspielen(assetUrl(s.audio), vol, slow ? 0.7 : 1) : (speak(s.ja, undefined, { slow, volume: vol }), new Promise<void>((r) => setTimeout(r, 400 + s.ja.length * 180)))

  const starten = async () => {
    setFehler(undefined)
    try {
      const r = await aufnehmen(setPegel)
      setRec(r)
      const blob = await r.fertig
      setRec(undefined); setPegel(0)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      const k = await kurveAusBlob(blob).catch(() => ({ kurve: [], dauer: 0 }))
      setEigen({ ...k, url })
      void vergleichen(url)
    } catch (e) {
      setRec(undefined)
      setFehler((e as Error).name === 'NotAllowedError' ? 'Mikrofon nicht erlaubt – bitte in den Browser-Einstellungen freigeben.' : `Aufnahme nicht möglich: ${(e as Error).message}`)
    }
  }
  const vergleichen = async (url = eigen?.url) => {
    if (!url) return
    setSpielt(true)
    await original()
    await new Promise((r) => setTimeout(r, 250))
    await abspielen(url, 1)
    setSpielt(false)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
        <SentenceText sentence={s} furigana={settings.furigana} className="text-2xl" />
        <div className="text-sm opacity-60">{s.romaji}</div>
        <div className="mt-1">{s.de}</div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => original()} disabled={spielt || !!rec} className="btn flex-1 bg-sakura/15 text-sakura">🔊 Anhören</button>
        <button onClick={() => original(true)} disabled={spielt || !!rec} className="btn flex-1 bg-neon/15">🐢 Langsam</button>
      </div>

      {!kannAufnehmen() ? (
        <p className="text-center text-sm opacity-70">Dieser Browser kann nicht aufnehmen – probier es in Chrome. Nachsprechen geht trotzdem: anhören, laut mitsprechen.</p>
      ) : rec ? (
        <button onClick={rec.stop} className="btn-primary relative w-full overflow-hidden py-4 text-lg">
          <span className="absolute inset-y-0 left-0 bg-white/25 transition-[width]" style={{ width: `${pegel * 100}%` }} />
          <span className="relative">⏺ Ich höre zu … (Tippen zum Stoppen)</span>
        </button>
      ) : (
        <button onClick={starten} disabled={spielt} className="btn-primary w-full py-4 text-lg">🎙️ {eigen ? 'Nochmal aufnehmen' : 'Nachsprechen'}</button>
      )}
      {fehler && <p className="text-center text-sm text-rose-500">{fehler}</p>}

      {(orig || eigen) && (
        <div className="space-y-1">
          <Welle kurve={orig?.kurve} farbe="text-sakura" label="Original" />
          <Welle kurve={eigen?.kurve} farbe="text-neon" label="Du" />
          {orig && eigen && eigen.dauer > 0 && (
            <p className="text-center text-xs opacity-60">
              Länge: Original {orig.dauer.toFixed(1)} s · du {eigen.dauer.toFixed(1)} s
            </p>
          )}
        </div>
      )}

      {eigen && (
        <>
          <button onClick={() => vergleichen()} disabled={spielt} className="btn w-full bg-black/5 dark:bg-white/10">
            {spielt ? '▶️ spielt …' : '🔁 Original + ich nacheinander'}
          </button>
          {onUrteil && (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => onUrteil('nochmal')} className="btn bg-rose-500/15 text-rose-600 dark:text-rose-300">Nochmal</button>
              <button onClick={() => onUrteil('fast')} className="btn bg-amber-500/15 text-amber-700 dark:text-amber-300">Fast</button>
              <button onClick={() => onUrteil('passt')} className="btn bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Passt!</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Welle({ kurve, farbe, label }: { kurve?: number[]; farbe: string; label: string }) {
  const n = kurve?.length ?? 0
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-right text-xs opacity-60">{label}</span>
      <svg viewBox="0 0 80 20" preserveAspectRatio="none" className={`h-10 flex-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] ${farbe}`}>
        {kurve?.map((v, i) => (
          <rect key={i} x={(i * 80) / n + 0.15} width={80 / n - 0.3} y={10 - v * 9} height={Math.max(0.4, v * 18)} rx={0.3} fill="currentColor" />
        ))}
      </svg>
    </div>
  )
}

/** Runde mit mehreren Sätzen. */
export function ShadowRunde({ runde, settings, onDone }: { runde: Sentence[]; settings: Settings; onDone: (r: { right: number; total: number }) => void }) {
  const [i, setI] = useState(0)
  const [right, setRight] = useState(0)
  const sfx = { volume: settings.volume, muted: settings.muted }
  const urteil = (u: Urteil) => {
    const r = right + (u === 'passt' ? 1 : 0)
    setRight(r)
    if (u === 'nochmal') { wrongSound(sfx); return } // gleicher Satz nochmal
    correctSound(r, sfx)
    void belohnen(XP_SHADOW[u], { dailyGoal: settings.dailyGoal })
    if (i + 1 >= runde.length) onDone({ right: r, total: runde.length })
    else setI(i + 1)
  }
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => onDone({ right, total: i })} className="btn min-h-10 px-2 opacity-60" aria-label="Beenden">✕</button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="h-full rounded-full bg-sakura transition-all" style={{ width: `${(100 * i) / runde.length}%` }} />
        </div>
        <span className="text-sm tabular-nums opacity-60">{runde.length - i}</span>
      </div>
      <div className="card p-5">
        <div className="mb-3 text-xs font-bold uppercase tracking-wide opacity-50">Hören · Nachsprechen · Vergleichen</div>
        <ShadowSatz key={runde[i].id} s={runde[i]} settings={settings} onUrteil={urteil} />
      </div>
    </section>
  )
}

/** Fenster für einen einzelnen Satz (aus der Vokabelkarte). Schließt nur über ✕. */
export function ShadowFenster({ s, settings, onClose }: { s: Sentence; settings: Settings; onClose: () => void }) {
  useEffect(() => {
    document.body.dataset.modal = '1'
    const o = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { delete document.body.dataset.modal; document.body.style.overflow = o }
  }, [])
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="card pop-in max-h-[100dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-b-none p-5 md:rounded-b-2xl">
        <div className="flex items-center justify-between">
          <span className="font-bold">🎙️ Shadowing</span>
          <button onClick={onClose} className="btn min-h-10 px-3 text-lg" aria-label="Schließen">✕</button>
        </div>
        <ShadowSatz s={s} settings={settings}
          onUrteil={(u) => { void belohnen(XP_SHADOW[u], { dailyGoal: settings.dailyGoal }); if (u !== 'nochmal') onClose() }} />
      </div>
    </div>,
    document.body,
  )
}
