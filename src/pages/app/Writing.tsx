/** Schrift: Hiragana, Katakana und Kanji – mit vier Spielen und einer Zeichentabelle. */
import { useEffect, useMemo, useState } from 'react'
import { ChoiceGame, MemoryGame, TraceGame, type GameId, type GameResult } from '../../features/writing/Games'
import { loadData, loadKana, loadKanji, type Kana, type Kanji, type LearnData, type WritingStage } from '../../lib/data'
import { useCards } from '../../lib/hooks'
import { updateSettings, useSettings } from '../../lib/settings'
import { speak } from '../../lib/speech'
import {
  isMastered, kanaGlyphs, kanjiGlyphs, pickRound, stageProgress, STAGES, UNLOCK_AT, unlockedStages, type Glyph,
} from '../../lib/writing'
import { PageHeader } from '../../layouts/AppLayout'
import { Button } from '../../ui/Button'
import { Card, SectionTitle } from '../../ui/Card'
import { cx } from '../../ui/cx'
import { Dialog } from '../../ui/Dialog'
import { Icon, type IconName } from '../../ui/Icon'
import { Notice } from '../../ui/Notice'
import { ProgressBar } from '../../ui/ProgressBar'
import { StrokeOrder } from '../../ui/Strokes'

const GAMES: { id: GameId; icon: IconName; label: string; text: string; kanaOnly?: boolean; size: number }[] = [
  { id: 'erkennen', icon: 'bolt', label: 'Blitz-Erkennen', text: 'Zeichen sehen, schnell die Bedeutung wählen', size: 12 },
  { id: 'hoeren', icon: 'sound', label: 'Hören', text: 'Laut hören, das passende Zeichen wählen', kanaOnly: true, size: 12 },
  { id: 'memory', icon: 'grid', label: 'Memory', text: 'Zeichen und Lesung als Paare finden', size: 6 },
  { id: 'zeichnen', icon: 'pen', label: 'Nachzeichnen', text: 'In der richtigen Strichreihenfolge schreiben', size: 5 },
]

export function Component() {
  const settings = useSettings()
  const cards = useCards()
  const [source, setSource] = useState<{ kana: Kana[]; kanji: Map<string, Kanji>; data: LearnData }>()
  const [failed, setFailed] = useState(false)
  const [stage, setStage] = useState<WritingStage>('hiragana')
  const [game, setGame] = useState<{ id: GameId; round: Glyph[] }>()
  const [last, setLast] = useState<GameResult & { id: GameId }>()
  const [detail, setDetail] = useState<Glyph>()

  useEffect(() => {
    let active = true
    Promise.all([loadKana(), loadKanji(), loadData()]).then(
      ([kana, kanji, data]) => active && setSource({ kana, kanji, data }),
      () => active && setFailed(true),
    )
    return () => { active = false }
  }, [])

  const glyphCards = useMemo(() => new Map((cards ?? []).filter((c) => c.kind === 'zeichen').map((c) => [c.refId, c])), [cards])
  const learnedWords = useMemo(() => new Set((cards ?? []).filter((c) => c.kind === 'wort').map((c) => c.refId)), [cards])
  const glyphs = useMemo(() => {
    if (!source) return undefined
    const result = {} as Record<WritingStage, Glyph[]>
    for (const s of STAGES) result[s.id] = s.id === 'kanji' ? kanjiGlyphs(source.kanji, source.data.wordsById, learnedWords) : kanaGlyphs(s.id, source.kana)
    return result
  }, [source, learnedWords])

  const header = <PageHeader ja="文字" title="Schrift" lead="Erst Hiragana, dann Katakana, dann die Kanji aus deinen Wörtern." back={{ to: '/app/lernen', label: 'Lernen' }} />
  if (failed) return <>{header}<Notice tone="error">Die Zeichen konnten nicht geladen werden. Bitte prüfe deine Verbindung.</Notice></>
  if (!glyphs || !cards) return <>{header}<p className="text-ink-soft">Zeichen werden geladen …</p></>

  const progress = Object.fromEntries(STAGES.map((s) => [s.id, stageProgress(glyphs[s.id], glyphCards)])) as Record<WritingStage, ReturnType<typeof stageProgress>>
  const unlocked = unlockedStages(Object.fromEntries(STAGES.map((s) => [s.id, progress[s.id].ratio])) as Record<WritingStage, number>, settings.unlockedStages)
  const current = STAGES.find((s) => s.id === stage)!
  const pool = glyphs[stage]

  if (game) {
    const props = {
      round: game.round, pool, cards: glyphCards,
      onDone: (result: GameResult) => { setLast({ ...result, id: game.id }); setGame(undefined); window.scrollTo({ top: 0 }) },
    }
    return (
      <>
        <PageHeader title={GAMES.find((g) => g.id === game.id)!.label} lead={current.label} />
        {game.id === 'memory' ? <MemoryGame {...props} /> : game.id === 'zeichnen' ? <TraceGame {...props} /> : <ChoiceGame {...props} mode={game.id} />}
      </>
    )
  }

  const start = (id: GameId) => {
    setLast(undefined)
    setGame({ id, round: pickRound(pool, glyphCards, GAMES.find((g) => g.id === id)!.size, 5) })
  }

  return (
    <>
      {header}

      {last && (
        <Notice tone="ok" className="mb-6" title={last.id === 'memory' ? `Alle Paare gefunden, in ${last.total} Zügen` : `${last.right} von ${last.total} richtig`}>
          {last.bestStreak >= 3 ? `Beste Serie: ${last.bestStreak} richtig in Folge.` : 'Die Zeichen kommen wieder, wenn sie dran sind.'}
        </Notice>
      )}

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0" role="tablist" aria-label="Schrift-Stufe">
        {STAGES.map((s) => {
          const open = unlocked.has(s.id)
          const p = progress[s.id]
          return (
            <button
              key={s.id} type="button" role="tab" aria-selected={stage === s.id} disabled={!open} onClick={() => setStage(s.id)}
              className={cx(
                'w-36 shrink-0 rounded-control border bg-surface p-3 text-left transition-colors sm:w-auto',
                stage === s.id ? 'border-accent bg-accent-soft' : 'border-line hover:border-ink-soft',
                !open && 'opacity-50',
              )}
            >
              <span lang="ja" className="flex items-center gap-1.5 font-display text-lg">{!open && <Icon name="lock" size={16} />}{s.ja}</span>
              <span className="block text-xs text-ink-soft">{s.label}</span>
              <ProgressBar className="mt-2" value={p.ratio} label={`${s.label}: ${p.mastered} von ${p.total} sicher`} />
              <span className="mt-1 block text-xs text-ink-soft tabular-nums">{p.mastered} / {p.total} sicher</span>
            </button>
          )
        })}
      </div>

      {STAGES.filter((s) => !unlocked.has(s.id)).slice(0, 1).map((s) => (
        <p key={s.id} className="mt-2 text-sm text-ink-soft">
          {s.label} wird frei, sobald du {Math.round(UNLOCK_AT * 100)} % der {STAGES.find((x) => x.id === s.needs)!.label} sicher kannst.{' '}
          <button type="button" className="underline hover:text-ink" onClick={() => updateSettings({ unlockedStages: [...settings.unlockedStages, s.id] })}>
            Kann ich schon – freischalten
          </button>
        </p>
      ))}

      {pool.length === 0 ? (
        <Card className="mt-8 text-center">
          <p className="text-ink-soft">Hier erscheinen die Kanji aus den Wörtern, die du schon gelernt hast. Lerne zuerst ein paar Wörter mit Kanji.</p>
          <Button to="/app/lernen/sitzung" variant="primary" className="mt-4">Wörter lernen</Button>
        </Card>
      ) : (
        <>
          <div className="mt-8">
            <SectionTitle>Spiele</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {GAMES.filter((g) => !(g.kanaOnly && stage === 'kanji')).map((g) => (
                <button
                  key={g.id} type="button" onClick={() => start(g.id)}
                  className="flex items-start gap-4 rounded-card border border-line bg-surface p-5 text-left transition-[border-color,box-shadow,transform] duration-200 ease-soft hover:-translate-y-0.5 hover:border-ink-soft hover:shadow-card"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon name={g.icon} /></span>
                  <span>
                    <span className="block font-display text-lg">{g.label}</span>
                    <span className="block text-sm text-ink-soft">{g.text}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <SectionTitle>Zeichentabelle</SectionTitle>
            <div className={cx('grid gap-1.5', stage === 'kanji' ? 'grid-cols-5 sm:grid-cols-8' : 'grid-cols-5')}>
              {pool.map((g) => {
                const card = glyphCards.get(g.char)
                return (
                  <button
                    key={g.char} type="button" onClick={() => { setDetail(g); void speak(g.char) }}
                    aria-label={`${g.char}, ${g.answer}${isMastered(card) ? ', sicher' : card ? ', in Arbeit' : ''}`}
                    className={cx(
                      'flex aspect-square flex-col items-center justify-center rounded-control border transition-colors hover:border-ink-soft',
                      isMastered(card) ? 'border-ok/40 bg-ok-soft' : card ? 'border-warn/40 bg-warn-soft' : 'border-line bg-surface',
                    )}
                  >
                    <span lang="ja" className="font-display text-2xl leading-tight">{g.char}</span>
                    <span className="max-w-full truncate px-1 text-[11px] text-ink-soft">{g.answer}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
              <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-ok/40 bg-ok-soft" /> sicher</span>
              <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-warn/40 bg-warn-soft" /> in Arbeit</span>
              <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-line bg-surface" /> neu</span>
              <span>Antippen zeigt die Strichreihenfolge.</span>
            </p>
          </div>
        </>
      )}

      {detail && (
        <Dialog title={`${detail.char} = ${detail.answer}`} onClose={() => setDetail(undefined)}>
          <div className="flex flex-col items-center gap-4 text-center">
            <StrokeOrder file={detail.svg} size={200} label={`Strichreihenfolge von ${detail.char}`} />
            {detail.hint && <p lang="ja" className="text-sm text-ink-soft">{detail.hint}</p>}
            <Button onClick={() => void speak(detail.char)}><Icon name="sound" /> Vorlesen</Button>
          </div>
        </Dialog>
      )}
    </>
  )
}
