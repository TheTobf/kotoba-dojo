import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { loadData, loadKana, type LearnData } from '../data'
import { db } from '../db'
import { speak } from '../audio'
import { isLearned } from '../srs'
import { glyphsFor, isMastered, pickRound, stageProgress, STUFEN, UNLOCK_AT, unlockedStages, type Glyph } from '../schrift'
import { DEFAULT_SETTINGS, type Kana, type SchriftStufe, type Settings } from '../types'
import { Memory, Quizspiel, Zeichnen, type Spiel } from '../components/SchriftSpiele'
import { StrokeOrder } from '../components/Strokes'

const SPIELE: { id: Spiel; icon: string; label: string; desc: string; kana?: boolean }[] = [
  { id: 'erkennen', icon: '⚡', label: 'Blitz-Erkennen', desc: 'Zeichen erkennen unter Zeitdruck' },
  { id: 'hoeren', icon: '🎧', label: 'Hören', desc: 'Laut hören, Zeichen wählen', kana: true },
  { id: 'memory', icon: '🎴', label: 'Memory', desc: 'Paare aufdecken' },
  { id: 'zeichnen', icon: '✍️', label: 'Nachzeichnen', desc: 'Mit Strichreihenfolge' },
]

type Progress = ReturnType<typeof stageProgress>

export default function Schrift() {
  const [data, setData] = useState<LearnData>()
  const [kana, setKana] = useState<Kana[]>()
  const [stage, setStage] = useState<SchriftStufe>('hiragana')
  const [spiel, setSpiel] = useState<{ id: Spiel; round: Glyph[] }>()
  const [last, setLast] = useState<{ right: number; total: number; bestCombo: number; spiel: Spiel }>()
  const [detail, setDetail] = useState<Glyph>()
  const cardsArr = useLiveQuery(() => db.cards.toArray())
  const stored = useLiveQuery(() => db.settings.get('me'))
  const settings: Settings = { ...DEFAULT_SETTINGS, ...stored }

  useEffect(() => { loadData().then(setData); loadKana().then(setKana) }, [])

  const zeichenCards = useMemo(() => new Map((cardsArr ?? []).filter((c) => c.kind === 'zeichen').map((c) => [c.refId, c])), [cardsArr])
  const learnedWords = useMemo(() => new Set((cardsArr ?? []).filter((c) => c.kind === 'vokabel' && isLearned(c)).map((c) => c.refId)), [cardsArr])
  const glyphs = useMemo(() => {
    if (!data || !kana) return undefined
    return Object.fromEntries(STUFEN.map((s) => [s.id, glyphsFor(s.id, kana, data, learnedWords)])) as Record<SchriftStufe, Glyph[]>
  }, [data, kana, learnedWords])

  if (!glyphs || !cardsArr) return <p className="opacity-60">Lade Zeichen …</p>

  const progress = Object.fromEntries(STUFEN.map((s) => [s.id, stageProgress(glyphs[s.id], zeichenCards)])) as Record<SchriftStufe, Progress>
  const unlocked = unlockedStages(Object.fromEntries(STUFEN.map((s) => [s.id, progress[s.id].ratio])) as Record<SchriftStufe, number>)
  const pool = glyphs[stage]

  if (spiel) {
    const props = {
      round: spiel.round, pool, cards: zeichenCards, settings,
      onDone: (r: { right: number; total: number; bestCombo: number }) => { setLast({ ...r, spiel: spiel.id }); setSpiel(undefined) },
    }
    if (spiel.id === 'memory') return <Memory {...props} />
    if (spiel.id === 'zeichnen') return <Zeichnen {...props} />
    return <Quizspiel {...props} mode={spiel.id} />
  }

  const start = (id: Spiel) => {
    const n = id === 'memory' ? 6 : id === 'zeichnen' ? 5 : 12
    setLast(undefined)
    setSpiel({ id, round: pickRound(pool, zeichenCards, n, 5) })
  }
  const nextLocked = STUFEN.find((s) => !unlocked.has(s.id))

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold">
        Schrift <span className="text-sakura">文字</span>
      </h1>

      {last && (
        <div className="card pop-in p-4 text-center">
          <b>{last.spiel === 'memory' ? `Paare gefunden: ${last.right} in ${last.total} Zügen` : `${last.right} / ${last.total} richtig`}</b>
          {last.bestCombo >= 3 && <span> · 🔥 Combo {last.bestCombo}</span>}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STUFEN.map((s) => {
          const open = unlocked.has(s.id)
          const p = progress[s.id]
          return (
            <button key={s.id} disabled={!open} onClick={() => setStage(s.id)}
              className={`card min-w-32 shrink-0 p-3 text-left transition ${stage === s.id ? 'ring-2 ring-sakura' : ''} ${open ? '' : 'opacity-45'}`}>
              <div lang="ja" className="text-lg font-bold">{open ? s.jp : '🔒'}</div>
              <div className="text-xs">{s.label}</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div className="h-full bg-matcha" style={{ width: `${p.ratio * 100}%` }} />
              </div>
              <div className="mt-0.5 text-[10px] opacity-60">{p.mastered}/{p.total} sicher</div>
            </button>
          )
        })}
      </div>
      {nextLocked?.needs && (
        <p className="-mt-3 text-xs opacity-60">
          🔒 {nextLocked.label} wird frei, sobald du {Math.round(UNLOCK_AT * 100)} % der {STUFEN.find((s) => s.id === nextLocked.needs)!.label} sicher kannst.
        </p>
      )}

      {pool.length === 0 ? (
        <div className="card p-5 text-center opacity-80">
          Hier erscheinen die Kanji aus deinen gelernten Vokabeln – lerne zuerst ein paar Wörter mit Kanji.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {SPIELE.filter((s) => !(s.kana && stage === 'kanji')).map((s) => (
              <button key={s.id} onClick={() => start(s.id)} className="card p-4 text-left transition hover:ring-sakura/50 active:scale-95">
                <div className="text-3xl">{s.icon}</div>
                <div className="font-bold">{s.label}</div>
                <div className="text-xs opacity-60">{s.desc}</div>
              </button>
            ))}
          </div>

          <div>
            <h2 className="mb-2 font-bold">Zeichentabelle</h2>
            <div className={`grid gap-1.5 ${stage === 'kanji' ? 'grid-cols-6 sm:grid-cols-8' : 'grid-cols-5'}`}>
              {pool.map((g) => {
                const c = zeichenCards.get(g.char)
                const cls = isMastered(c) ? 'bg-matcha/20 ring-matcha/40' : c ? 'bg-yuzu/15 ring-yuzu/40' : ''
                return (
                  <button key={g.char} onClick={() => { setDetail(g); if (g.audio) speak(g.char, g.audio, { volume: settings.volume }) }}
                    className={`card flex aspect-square flex-col items-center justify-center ${cls}`}>
                    <span lang="ja" className="text-2xl font-bold">{g.char}</span>
                    <span className="max-w-full truncate px-0.5 text-[10px] opacity-60">{g.answer}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs opacity-60">🟩 sicher · 🟨 in Arbeit · ⬜ neu – antippen zeigt die Strichreihenfolge</p>
          </div>
        </>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center" onClick={() => setDetail(undefined)}>
          <div className="card pop-in w-full max-w-sm space-y-3 p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center"><StrokeOrder file={detail.svg} size={200} /></div>
            <div><b lang="ja" className="text-2xl">{detail.char}</b> = <b>{detail.answer}</b></div>
            {detail.hint && <div lang="ja" className="text-sm opacity-70">{detail.hint}</div>}
            <button onClick={() => setDetail(undefined)} className="btn-primary w-full">Schließen</button>
          </div>
        </div>
      )}
    </section>
  )
}
