import { useMemo, useState } from 'react'
import { sucheWoerter } from '../suche'
import type { LearnData } from '../data'
import type { CardState, Settings } from '../types'
import { formatInterval, isLearned } from '../srs'
import SentenceText, { KanjiTippbar } from './SentenceText'
import KanjiUeben from './KanjiUeben'
import PlayButtons from './PlayButtons'

/** Alle Wörter einer Lektion zum Nachschlagen, mit Lernstand. */
export default function WortListe({ data, cards, settings }: { data: LearnData; cards: Map<string, CardState>; settings: Settings }) {
  const furigana = settings.furigana
  const [ueben, setUeben] = useState<{ wort: string; start: string }>()
  const current = Math.min(...data.words.filter((w) => !cards.get(w.id)).map((w) => w.lesson), Infinity)
  const [lesson, setLesson] = useState(Number.isFinite(current) ? current : 1)
  const lessons = Math.max(...data.words.map((w) => w.lesson))
  const [suche, setSuche] = useState('')
  const [nurGelernt, setNurGelernt] = useState(false)
  const treffer = useMemo(() => {
    const pool = nurGelernt ? data.words.filter((w) => { const c = cards.get(w.id); return c && isLearned(c) }) : data.words
    return sucheWoerter(pool, suche)
  }, [data, cards, suche, nurGelernt])
  const sucht = suche.trim().length > 0
  const list = sucht ? treffer : data.words.filter((w) => w.lesson === lesson)

  return (
    <div className="space-y-3">
      <div className="relative">
        <input type="search" value={suche} onChange={(e) => setSuche(e.target.value)} enterKeyHint="search"
          placeholder="🔍 Suchen: Wasser, みず, 水, mizu …" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          className="w-full rounded-xl bg-paper-2 px-4 py-3 text-lg ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-sakura dark:bg-ink-2 dark:ring-white/20" />
        {sucht && <button onClick={() => setSuche('')} aria-label="Suche leeren" className="absolute inset-y-0 right-2 px-2 opacity-60">✕</button>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!sucht && (
          <select value={lesson} onChange={(e) => setLesson(+e.target.value)}
            className="rounded-lg bg-paper-2 p-2 ring-1 ring-black/10 dark:bg-ink-2 dark:ring-white/20">
            {Array.from({ length: lessons }, (_, i) => (
              <option key={i} value={i + 1}>Lektion {i + 1}</option>
            ))}
          </select>
        )}
        {sucht && (
          <>
            {([[false, 'Alle Wörter'], [true, 'Nur gelernte']] as const).map(([v, label]) => (
              <button key={label} onClick={() => setNurGelernt(v)}
                className={`btn min-h-9 px-3 text-sm ${nurGelernt === v ? 'bg-sakura/15 font-bold text-sakura' : 'opacity-60'}`}>{label}</button>
            ))}
            <span className="text-sm opacity-60">{treffer.length >= 60 ? '60+' : treffer.length} Treffer</span>
          </>
        )}
      </div>
      {sucht && treffer.length === 0 && <p className="card p-4 text-center opacity-70">Nichts gefunden{nurGelernt ? ' unter deinen gelernten Wörtern' : ''}.</p>}
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
                    <span lang="ja" className="text-2xl font-bold">
                      <KanjiTippbar text={w.surface} onKanji={(k) => setUeben({ wort: w.surface, start: k })} />
                    </span>
                    <span lang="ja" className="opacity-70">{w.reading}</span>
                    <span className="text-sm opacity-50">{w.romaji} · {w.pos}</span>
                  </div>
                  <div>{w.meaningsDe.join(', ')}</div>
                  <div className="mt-1 text-xs opacity-60">
                    {sucht && `Lektion ${w.lesson} · `}{!c ? '○ neu' : isLearned(c) ? `✓ gelernt · nächste Wiederholung in ${formatInterval(Math.max(0, c.due - Date.now()))}` : '◐ in Arbeit'}
                  </div>
                </div>
                <PlayButtons text={w.reading} file={w.audio} credit={w.audioCredit} size="sm" />
              </div>
              {s && (
                <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                  <div className="flex items-start gap-2">
                    <SentenceText sentence={s} furigana={furigana} className="flex-1 text-xl"
                      onKanji={(k) => setUeben(w.surface.includes(k) ? { wort: w.surface, start: k } : { wort: k, start: k })} />
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
      {ueben && <KanjiUeben wort={ueben.wort} start={ueben.start} data={data} settings={settings} onClose={() => setUeben(undefined)} />}
    </div>
  )
}
