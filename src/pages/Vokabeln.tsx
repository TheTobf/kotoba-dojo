import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { loadData, type LearnData } from '../data'
import { db } from '../db'
import { DEFAULT_SETTINGS } from '../types'
import SentenceText from '../components/SentenceText'
import PlayButtons from '../components/PlayButtons'

/** Vorläufige Datenvorschau (Phase 2) – wird in Phase 3 durch die Karteikarten ersetzt. */
export default function Vokabeln() {
  const [data, setData] = useState<LearnData>()
  const [lesson, setLesson] = useState(1)
  const [roles, setRoles] = useState(false)
  const settings = useLiveQuery(() => db.settings.get('me'))
  const furigana = settings?.furigana ?? DEFAULT_SETTINGS.furigana

  useEffect(() => { loadData().then(setData) }, [])
  if (!data) return <p className="opacity-60">Lade Wörter …</p>

  const lessons = Math.max(...data.words.map((w) => w.lesson))
  const list = data.words.filter((w) => w.lesson === lesson)

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">
        Vokabeln <span className="text-sakura">単語</span>
      </h1>
      <p className="text-sm opacity-60">
        Vorschau der Lerndaten ({data.words.length} Wörter). Die Karteikarten mit FSRS kommen in Phase 3.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select value={lesson} onChange={(e) => setLesson(+e.target.value)}
          className="rounded-lg bg-paper-2 p-2 ring-1 ring-black/10 dark:bg-ink-2 dark:ring-white/20">
          {Array.from({ length: lessons }, (_, i) => (
            <option key={i} value={i + 1}>Lektion {i + 1}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={roles} onChange={(e) => setRoles(e.target.checked)} className="accent-sakura" />
          Satzrollen einfärben
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={furigana}
            onChange={(e) => db.settings.put({ ...DEFAULT_SETTINGS, ...settings, furigana: e.target.checked })}
            className="accent-sakura" />
          Furigana
        </label>
      </div>

      {roles && (
        <p className="flex flex-wrap gap-3 text-xs">
          <span className="text-sky-500 dark:text-sky-300">■ Thema/Subjekt</span>
          <span className="text-amber-600 dark:text-amber-300">■ Objekt</span>
          <span className="text-rose-500 dark:text-rose-300">■ Verb/Adjektiv</span>
          <span className="text-emerald-600 dark:text-emerald-300">■ Partikel</span>
        </p>
      )}

      <ul className="space-y-3">
        {list.map((w) => {
          const s = data.sentences.get(w.sentenceIds[0])
          return (
            <li key={w.id} className="card space-y-2 p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{w.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span lang="ja" className="text-2xl font-bold">{w.surface}</span>
                    <span lang="ja" className="opacity-70">{w.reading}</span>
                    <span className="text-sm opacity-50">{w.romaji} · {w.pos} · #{w.rank}</span>
                  </div>
                  <div>{w.meaningsDe.join(', ')}</div>
                </div>
                <PlayButtons text={w.reading} file={w.audio} credit={w.audioCredit} size="sm" />
              </div>
              {s && (
                <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                  <div className="flex items-start gap-2">
                    <SentenceText sentence={s} furigana={furigana} roles={roles} className="flex-1 text-xl" />
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
    </section>
  )
}
