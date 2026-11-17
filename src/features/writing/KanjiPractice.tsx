/**
 * Kanji aus einer Karteikarte üben: Strichreihenfolge ansehen, dann selbst schreiben.
 * Die Bewertung landet auf derselben Zeichen-Karte wie im Schrift-Bereich.
 */
import { useEffect, useState } from 'react'
import { db } from '../../lib/db'
import { loadKanji, type Kanji } from '../../lib/data'
import { Rating } from '../../lib/srs'
import { glyphCardId } from '../../lib/writing'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Icon } from '../../ui/Icon'
import { StrokeOrder, TraceBoard } from '../../ui/Strokes'
import { rateGlyph } from './Games'

/** Kanji eines Textes mit Strichdaten, in Reihenfolge und ohne Doppelte. */
export function useKanjiIn(text: string): Kanji[] {
  const [list, setList] = useState<Kanji[]>([])
  useEffect(() => {
    let active = true
    loadKanji().then(
      (all) => active && setList([...new Set([...text])].map((c) => all.get(c)).filter((k): k is Kanji => !!k?.svg)),
      () => undefined,
    )
    return () => { active = false }
  }, [text])
  return list
}

export function KanjiPractice({ kanji, onClose }: { kanji: Kanji; onClose: () => void }) {
  const [phase, setPhase] = useState<'ansehen' | 'schreiben' | 'fertig'>('ansehen')
  const [replay, setReplay] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const glyph = { char: kanji.char, answer: kanji.meaningsDe[0] ?? '', stage: 'kanji' as const, svg: kanji.svg }

  async function done(count: number) {
    setMistakes(count)
    setPhase('fertig')
    const card = await db.cards.get(glyphCardId(kanji.char))
    await rateGlyph(glyph, card, count === 0 ? Rating.Good : count <= 2 ? Rating.Hard : Rating.Again)
  }

  const readings = [...kanji.onyomi.slice(0, 2), ...kanji.kunyomi.slice(0, 2)].join('・')
  return (
    <Dialog title={`${kanji.char} = ${kanji.meaningsDe.slice(0, 2).join(', ')}`} onClose={onClose}>
      <div className="flex flex-col items-center gap-4 text-center">
        {readings && <p lang="ja" className="text-sm text-ink-soft">{readings} · {kanji.strokes} Striche</p>}
        {phase === 'ansehen' ? (
          <>
            <StrokeOrder file={kanji.svg} size={220} replayKey={replay} label={`Strichreihenfolge von ${kanji.char}`} />
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setReplay((r) => r + 1)}><Icon name="replay" /> Nochmal zeigen</Button>
              <Button variant="primary" onClick={() => setPhase('schreiben')}><Icon name="pen" /> Selbst schreiben</Button>
            </div>
          </>
        ) : (
          <>
            <TraceBoard file={kanji.svg} onDone={(count) => void done(count)} />
            {phase === 'fertig' ? (
              <div className="flex flex-col items-center gap-2" aria-live="polite">
                <p className="font-semibold">{mistakes === 0 ? 'Fehlerfrei geschrieben' : `Geschafft, mit ${mistakes} ${mistakes === 1 ? 'Fehlversuch' : 'Fehlversuchen'}`}</p>
                <div className="flex gap-2">
                  <Button onClick={() => { setPhase('schreiben'); setMistakes(0) }}>Nochmal schreiben</Button>
                  <Button variant="primary" onClick={onClose} autoFocus>Fertig</Button>
                </div>
              </div>
            ) : (
              <p className="max-w-xs text-sm text-ink-soft">Strich für Strich in der richtigen Reihenfolge. Der rote Punkt zeigt den Anfang.</p>
            )}
          </>
        )}
      </div>
    </Dialog>
  )
}

/** Knöpfe für alle Kanji eines Wortes; Antippen öffnet das Üben. */
export function KanjiButtons({ text }: { text: string }) {
  const kanji = useKanjiIn(text)
  const [open, setOpen] = useState<Kanji>()
  if (kanji.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs tracking-widest text-ink-soft uppercase">Kanji schreiben</span>
      {kanji.map((k) => (
        <button
          key={k.char} type="button" lang="ja" aria-label={`${k.char} nachzeichnen`}
          onClick={(e) => { e.stopPropagation(); setOpen(k) }}
          className="flex size-11 items-center justify-center rounded-control border border-line bg-surface font-display text-xl transition-colors hover:border-accent hover:text-accent"
        >
          {k.char}
        </button>
      ))}
      {open && <KanjiPractice kanji={open} onClose={() => setOpen(undefined)} />}
    </div>
  )
}
