import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Rating, type Grade } from 'ts-fsrs'
import { loadKana, type LearnData } from '../data'
import { db } from '../db'
import { rate } from '../srs'
import { belohnen, XP } from '../motivation'
import { correctSound, unlockSound, wrongSound } from '../sfx'
import type { Kana, Settings } from '../types'
import { StrokeOrder, TraceBoard } from './Strokes'

interface Zeichen { char: string; svg?: string; kanji: boolean }

/** Kanji eines Wortes der Reihe nach (ohne Doppelte), nur solche mit Strichdaten. */
export function kanjiVon(text: string, data: LearnData): string[] {
  return [...new Set([...text].filter((c) => data.kanji.get(c)?.svg))]
}

/**
 * Nachzeichnen direkt aus der Karte: erst jedes Kanji einzeln (ansehen → schreiben),
 * danach das ganze Wort am Stück. Schließt NUR über das ✕ – ein Tipp daneben
 * (z. B. Handballen beim Schreiben mit Stift) darf nichts beenden.
 */
export default function KanjiUeben({ wort, start, data, settings, onClose }: {
  wort: string           // Wort (für „ganzes Wort schreiben“) oder einzelnes Kanji
  start: string          // angetipptes Kanji
  data: LearnData
  settings: Settings
  onClose: () => void
}) {
  // Beim angetippten Kanji beginnen, die übrigen danach – so wird keins übersprungen
  const kanji = useMemo(() => {
    const alle = kanjiVon(wort, data)
    const s = Math.max(0, alle.indexOf(start))
    return [...alle.slice(s), ...alle.slice(0, s)]
  }, [wort, start, data])
  const [kana, setKana] = useState<Map<string, Kana>>()
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<'ansehen' | 'schreiben' | 'fertig' | 'wort' | 'wortFertig'>('ansehen')
  const [replay, setReplay] = useState(0)
  const [fehler, setFehler] = useState(0)
  const [w, setW] = useState(0)              // Position beim ganzen Wort
  const [wortFehler, setWortFehler] = useState(0)
  const sfx = { volume: settings.volume, muted: settings.muted }

  useEffect(() => { loadKana().then((k) => setKana(new Map(k.map((x) => [x.char, x])))) }, [])
  // Seite dahinter nicht scrollen, Tastenkürzel der Karte ruhen lassen
  useEffect(() => {
    document.body.dataset.modal = '1'
    const o = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { delete document.body.dataset.modal; document.body.style.overflow = o }
  }, [])

  // Ganzes Wort: Kanji + Kana (sofern Strichdaten), sonst nur Kanji
  const wortZeichen: Zeichen[] = useMemo(() => [...wort].map((c) => {
    const k = data.kanji.get(c)
    if (k?.svg) return { char: c, svg: k.svg, kanji: true }
    const n = kana?.get(c)
    return { char: c, svg: n?.svg, kanji: false }
  }).filter((z) => z.svg), [wort, data, kana])
  const ganzesWort = wortZeichen.length >= 2 && [...wort].length > 1

  const k = data.kanji.get(kanji[i])
  if (!k) return null

  const kanjiFertig = (mistakes: number) => {
    setFehler(mistakes)
    setPhase('fertig')
    unlockSound(sfx)
    const grade: Grade = mistakes === 0 ? Rating.Good : mistakes <= 2 ? Rating.Hard : Rating.Again
    void db.cards.get(`zeichen:${k.char}`).then((c) => rate({ id: k.char }, c, grade, undefined, db, Date.now(), 'zeichen'))
    void belohnen(mistakes === 0 ? XP.zeichnen : mistakes <= 2 ? XP.zeichenRichtig : XP.zeichenFalsch, { dailyGoal: settings.dailyGoal })
  }
  const weiter = () => {
    if (i + 1 < kanji.length) { setI(i + 1); setPhase('ansehen'); setReplay(0) }
    else if (ganzesWort) { setPhase('wort'); setW(0); setWortFehler(0) }
    else onClose()
  }
  const wortStrich = (mistakes: number) => {
    const f = wortFehler + mistakes
    setWortFehler(f)
    if (w + 1 < wortZeichen.length) { correctSound(w + 1, sfx); setW(w + 1); return }
    setPhase('wortFertig')
    unlockSound(sfx)
    void belohnen(f === 0 ? XP.zeichnen * 2 : XP.zeichnen, { dailyGoal: settings.dailyGoal })
  }
  const strichTon = (ok: boolean) => (ok ? correctSound(0, { ...sfx, volume: sfx.volume * 0.5 }) : wrongSound(sfx))
  const imWort = phase === 'wort' || phase === 'wortFertig'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="card pop-in flex max-h-[100dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-b-none p-5 md:rounded-b-2xl">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1.5">
            {kanji.map((c, n) => (
              <span key={c} className={`h-2 flex-1 rounded-full ${imWort || n < i || (n === i && phase === 'fertig') ? 'bg-matcha' : n === i ? 'bg-sakura' : 'bg-black/10 dark:bg-white/10'}`} />
            ))}
            {ganzesWort && <span className={`h-2 flex-[2] rounded-full ${phase === 'wortFertig' ? 'bg-matcha' : imWort ? 'bg-sakura' : 'bg-black/10 dark:bg-white/10'}`} />}
          </div>
          <button onClick={onClose} className="btn min-h-10 px-3 text-lg" aria-label="Schließen">✕</button>
        </div>

        {!imWort ? (
          <>
            <div className="text-center">
              <span lang="ja" className="text-4xl font-bold">{k.char}</span>
              <span className="ml-2 opacity-80">= {k.meaningsDe.slice(0, 3).join(', ')}</span>
              <div lang="ja" className="text-sm opacity-60">
                {k.onyomi.length > 0 && <>音 {k.onyomi.slice(0, 3).join('・')}</>}
                {k.onyomi.length > 0 && k.kunyomi.length > 0 && ' · '}
                {k.kunyomi.length > 0 && <>訓 {k.kunyomi.slice(0, 3).join('・')}</>}
                <span className="ml-1">· {k.strokes} Striche</span>
              </div>
            </div>
            <div className="flex justify-center">
              {phase === 'ansehen'
                ? <StrokeOrder file={k.svg} size={260} replayKey={replay} />
                : <TraceBoard key={k.char} file={k.svg} onStroke={strichTon} onDone={kanjiFertig} />}
            </div>
            {phase === 'ansehen' && (
              <div className="flex gap-2">
                <button onClick={() => setReplay((r) => r + 1)} className="btn flex-1 bg-black/5 dark:bg-white/10">↻ Nochmal</button>
                <button onClick={() => setPhase('schreiben')} className="btn-primary flex-1">✍️ Selbst schreiben</button>
              </div>
            )}
            {phase === 'schreiben' && <p className="text-center text-sm opacity-60">Strich für Strich in der gezeigten Reihenfolge – der Punkt zeigt den Anfang.</p>}
            {phase === 'fertig' && (
              <div className="pop-in flex flex-col items-center gap-2">
                <div className="font-bold">{fehler === 0 ? '完璧！ Fehlerfrei' : `Geschafft – ${fehler} Fehlversuch${fehler === 1 ? '' : 'e'}`}</div>
                <button onClick={weiter} className="btn-primary w-full">
                  {i + 1 < kanji.length ? `Nächstes Kanji: ${kanji[i + 1]} →` : ganzesWort ? `Jetzt das ganze Wort: ${wort} →` : 'Fertig'}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="text-sm opacity-60">Das ganze Wort am Stück – ohne Vorlage</div>
              <div lang="ja" className="mt-1 flex justify-center gap-1 text-3xl font-bold">
                {wortZeichen.map((z, n) => (
                  <span key={n} className={`rounded-lg px-1 ${n < w || phase === 'wortFertig' ? 'text-matcha' : n === w ? 'bg-sakura/15 text-sakura' : 'opacity-30'}`}>{z.char}</span>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              {phase === 'wort'
                ? <TraceBoard key={`w${w}`} file={wortZeichen[w].svg} showGuide={false} onStroke={strichTon} onDone={wortStrich} />
                : <div className="pop-in py-8 text-center text-5xl" lang="ja">{wort}</div>}
            </div>
            {phase === 'wort' && <p className="text-center text-sm opacity-60">Nach zwei Fehlversuchen wird der Strich eingeblendet.</p>}
            {phase === 'wortFertig' && (
              <div className="pop-in flex flex-col items-center gap-2">
                <div className="font-bold">{wortFehler === 0 ? '完璧！ Ganzes Wort fehlerfrei' : `Geschafft – ${wortFehler} Fehlversuch${wortFehler === 1 ? '' : 'e'}`}</div>
                <div className="flex w-full gap-2">
                  <button onClick={() => { setW(0); setWortFehler(0); setPhase('wort') }} className="btn flex-1 bg-black/5 dark:bg-white/10">↻ Nochmal</button>
                  <button onClick={onClose} className="btn-primary flex-1">Fertig</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
