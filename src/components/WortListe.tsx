import { useState } from 'react'
import type { LearnData } from '../data'
import type { CardState } from '../types'
import { formatInterval, isLearned } from '../srs'
import SentenceText from './SentenceText'
import PlayButtons from './PlayButtons'

/** Alle Wörter einer Lektion zum Nachschlagen, mit Lernstand. */
export default function WortListe({ data, cards, furigana }: { data: LearnData; cards: Map<string, CardState>; furigana: boolean }) {
  const current = Math.min(...data.words.filter((w) => !cards.get(w.id)).map((w) => w.lesson), Infinity)
  const [lesson, setLesson] = useState(Number.isFinite(current) ? current : 1)
  const lessons = Math.max(...data.words.map((w) => w.lesson))
  const list = data.words.filter((w) => w.lesson === lesson)

  return (
    <div className="space-y-3">
      <select value={lesson} onChange={(e) => setLesson(+e.target.value)}
        className="rounded-lg bg-paper-2 p-2 ring-1 ring-black/10 dark:bg-ink-2 dark:ring-white/20">
        {Array.from({ length: lessons }, (_, i) => (
          <option key={i} value={i + 1}>Lektion {i + 1}</option>
        ))}
      </select>
      <ul className="space-y-3">
        {list.map((w) => {
          const s = data.sentences.get(w.sentenceIds[0])
          const c = cards.get(w.id)
          return (
            <li key={w.id} className="card space-y-2 p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{w.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span lang="ja" className="text-2xl font-bold">{w.surface}</span>
                    <span lang="ja" className="opacity-70">{w.reading}</span>
                    <span className="text-sm opacity-50">{w.romaji} · {w.pos}</span>
                  </div>
                  <div>{w.meaningsDe.join(', ')}</div>
                  <div className="mt-1 text-xs opacity-60">
                    {!c ? '○ neu' : isLearned(c) ? `✓ gelernt · nächste Wiederholung in ${formatInterval(Math.max(0, c.due - Date.now()))}` : '◐ in Arbeit'}
                  </div>
                </div>
                <PlayButtons text={w.reading} file={w.audio} credit={w.audioCredit} size="sm" />
              </div>
              {s && (
                <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                  <div className="flex items-start gap-2">
                    <SentenceText sentence={s} furigana={furigana} className="flex-1 text-xl" />
                    <PlayButtons text={s.ja} file={s.audio} credit={s.audioCredit} size="sm" />
                  </div>
                  <div className="text-sm opacity-60">{s.romaji}</div>
                  <div className="mt-1">{s.de}</div>
                  <div className="mt-2 text-sm opacity-80">💡 {s.grammar}</div>
                  <div className="mt-2 text-xs opacity-50">
                    {s.source === 'tatoeba'
                      ? <a className="underline" href={`https://tatoeba.org/de/sentences/show/${s.tatoebaId}`} target="_blank" rel="noreferrer">Tatoeba #{s.tatoebaId}</a>
                      : 'Satz: Claude'}
                    {s.audioCredit && ` · Audio: ${s.audioCredit}`}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
