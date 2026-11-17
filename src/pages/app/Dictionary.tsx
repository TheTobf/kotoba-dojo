/** Wörterbuch: alle Wörter der App durchsuchen (Deutsch, Kanji, Kana, Romaji) oder nach Lektion blättern. */
import { useMemo, useState } from 'react'
import { KanjiButtons } from '../../features/writing/KanjiPractice'
import type { Word } from '../../lib/data'
import type { CardState } from '../../lib/db'
import { useCards, useLearnData } from '../../lib/hooks'
import { searchWords } from '../../lib/search'
import { formatInterval } from '../../lib/srs'
import { PageHeader } from '../../layouts/AppLayout'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'
import { cx } from '../../ui/cx'
import { Icon } from '../../ui/Icon'
import { JaText, SpeakButton } from '../../ui/JaText'
import { Notice } from '../../ui/Notice'

function status(card: CardState | undefined) {
  if (!card) return <Badge>neu</Badge>
  const due = card.due - Date.now()
  return <Badge tone="ok">gelernt · {due <= 0 ? 'jetzt dran' : `wieder in ${formatInterval(due)}`}</Badge>
}

export function Component() {
  const { data, failed } = useLearnData()
  const cards = useCards()
  const [query, setQuery] = useState('')
  const [onlyLearned, setOnlyLearned] = useState(false)
  const [lesson, setLesson] = useState<number>()
  const wordCards = useMemo(() => new Map((cards ?? []).filter((c) => c.kind === 'wort').map((c) => [c.refId, c])), [cards])
  const header = <PageHeader ja="辞書" title="Wörterbuch" lead="Suchen auf Deutsch oder Japanisch: Wasser, みず, 水 oder mizu." back={{ to: '/app/lernen', label: 'Lernen' }} />

  const results = useMemo(() => {
    if (!data) return []
    const pool = onlyLearned ? data.words.filter((w) => wordCards.has(w.id)) : data.words
    return searchWords(pool, query)
  }, [data, query, onlyLearned, wordCards])

  if (failed) return <>{header}<Notice tone="error">Die Lerndaten konnten nicht geladen werden.</Notice></>
  if (!data || !cards) return <>{header}<p className="text-ink-soft">Wird geladen …</p></>

  const searching = query.trim().length > 0
  const nextLesson = data.words.find((w) => !wordCards.has(w.id))?.lesson ?? 1
  const shownLesson = lesson ?? nextLesson
  const lessons = Math.max(...data.words.map((w) => w.lesson))
  const list: Word[] = searching ? results : data.words.filter((w) => w.lesson === shownLesson)

  return (
    <>
      {header}
      <div className="sticky top-0 z-10 -mx-5 bg-paper/95 px-5 pt-1 pb-3 backdrop-blur sm:mx-0 sm:px-0">
        <label htmlFor="dictionary-search" className="sr-only">Wort suchen</label>
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft" />
          <input
            id="dictionary-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} enterKeyHint="search"
            placeholder="Wasser, みず, 水, mizu …" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            className="min-h-12 w-full rounded-control border border-line bg-surface py-3 pr-4 pl-12 text-lg hover:border-ink-soft focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {searching ? (
            <>
              {([[false, 'Alle Wörter'], [true, 'Nur gelernte']] as const).map(([value, label]) => (
                <button
                  key={label} type="button" aria-pressed={onlyLearned === value} onClick={() => setOnlyLearned(value)}
                  className={cx('min-h-9 rounded-full border px-3 transition-colors', onlyLearned === value ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line text-ink-soft hover:text-ink')}
                >
                  {label}
                </button>
              ))}
              <span className="text-ink-soft">{results.length >= 60 ? 'mehr als 60' : results.length} Treffer</span>
            </>
          ) : (
            <>
              <label htmlFor="lesson" className="text-ink-soft">Lektion</label>
              <select id="lesson" value={shownLesson} onChange={(e) => setLesson(Number(e.target.value))} className="min-h-9 rounded-control border border-line bg-surface px-2">
                {Array.from({ length: lessons }, (_, i) => <option key={i} value={i + 1}>{i + 1}{i + 1 === nextLesson ? ' (als Nächstes)' : ''}</option>)}
              </select>
              <span className="text-ink-soft">von {lessons}</span>
            </>
          )}
        </div>
      </div>

      {searching && results.length === 0 && <Card><p className="text-center text-ink-soft">Nichts gefunden{onlyLearned ? ' unter deinen gelernten Wörtern' : ''}.</p></Card>}

      <ul className="space-y-3">
        {list.map((word) => {
          const sentence = data.sentences.get(word.sentenceIds[0])
          return (
            <li key={word.id}>
              <Card className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-3">
                      <span lang="ja" className="font-display text-2xl">{word.surface}</span>
                      {word.reading !== word.surface && <span lang="ja" className="text-ink-soft">{word.reading}</span>}
                      <span className="text-sm text-ink-soft">{word.romaji} · {word.pos}</span>
                    </p>
                    <p className="mt-1">{word.meaningsDe.join(', ')}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {status(wordCards.get(word.id))}
                      {searching && <span className="text-xs text-ink-soft">Lektion {word.lesson}</span>}
                    </div>
                  </div>
                  <SpeakButton text={word.reading} className="shrink-0" />
                </div>
                {sentence && (
                  <div className="rounded-control bg-sunken p-4">
                    <div className="flex items-start justify-between gap-3">
                      <JaText phrase={sentence} tokens={sentence.tokens} size="md" showTranslation />
                      <SpeakButton text={sentence.ja} className="shrink-0" />
                    </div>
                    {sentence.grammar && <p className="mt-2 text-sm text-ink-soft">{sentence.grammar}</p>}
                    <p className="mt-2 text-xs text-ink-soft">
                      {sentence.source === 'tatoeba' && sentence.tatoebaId
                        ? <a className="underline hover:text-ink" href={`https://tatoeba.org/de/sentences/show/${sentence.tatoebaId}`} target="_blank" rel="noreferrer">Satz von Tatoeba (CC BY 2.0 FR)</a>
                        : 'Satz mit KI-Unterstützung geschrieben'}
                    </p>
                  </div>
                )}
                <KanjiButtons text={word.surface} />
              </Card>
            </li>
          )
        })}
      </ul>
    </>
  )
}
