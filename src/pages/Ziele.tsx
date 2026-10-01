import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { loadData, type LearnData } from '../data'
import { db } from '../db'
import { MEDIEN, REISE_START } from '../content/ziele'
import { learnedIds, situationStatus } from '../progress'
import { abdeckung, hochrechnung, stufe, tempo } from '../coverage'
import { DEFAULT_SETTINGS } from '../types'

/** Wohin du hinarbeitest: Was geht in Japan schon, welche Medien sind freigeschaltet. */
export default function Ziele() {
  const [data, setData] = useState<LearnData>()
  const [open, setOpen] = useState<string>()
  const cards = useLiveQuery(() => db.cards.where('kind').equals('vokabel').toArray())
  const settings = useLiveQuery(() => db.settings.get('me'))
  useEffect(() => { loadData().then(setData) }, [])
  if (!data || !cards) return <p className="opacity-60">Lade …</p>

  const learned = learnedIds(cards)
  const status = situationStatus(data.words, learned)
  const ready = status.filter((x) => x.ready).length
  const days = Math.ceil((new Date(REISE_START).getTime() - Date.now()) / 86_400_000)
  const nextMedium = MEDIEN.find((m) => learned.size < m.minWords)
  const jetzt = abdeckung(data.words, learned)
  const t = tempo(cards, settings?.newPerDay ?? DEFAULT_SETTINGS.newPerDay)
  const reise = hochrechnung(data.words, learned, t.proTag, Math.max(0, days))

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">
        Ziele <span className="text-sakura">目標</span>
      </h1>

      <div className="card grid grid-cols-3 gap-2 p-5 text-center">
        <Big n={days > 0 ? days : 0} label="Tage bis Japan" />
        <Big n={learned.size} label={`von ${data.words.length} Wörtern`} />
        <Big n={ready} label={`von ${status.length} Situationen`} />
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">📈 Wie weit bist du?</h2>
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold">Reise-Situationen</span>
            <span className="text-sm tabular-nums opacity-70">{ready} / {status.length} bereit</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div className="h-full rounded-full bg-matcha" style={{ width: `${(ready / status.length) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold">Wortabdeckung im Alltagsjapanisch</span>
            <span className="text-sm tabular-nums opacity-70">ca. {jetzt.low}–{jetzt.high} %</span>
          </div>
          <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div className="absolute inset-y-0 left-0 rounded-full bg-sakura/35" style={{ width: `${jetzt.high}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-sakura" style={{ width: `${jetzt.low}%` }} />
          </div>
          <p className="mt-1 text-sm opacity-80">{stufe(jetzt.mid)}</p>
        </div>
        <div className="rounded-lg bg-black/[0.03] p-3 text-sm dark:bg-white/[0.04]">
          <div className="font-bold">Zum Reisestart ({days > 0 ? `in ${days} Tagen` : 'jetzt'})</div>
          {days > 0 ? (
            <p className="opacity-80">
              Bei {String(t.proTag).replace('.', ',')} neuen Wörtern pro Tag {t.gemessen ? '(dein gemessenes Tempo)' : '(dein Tageslimit)'}
              {' '}hast du ca. <b>{reise.woerter}</b> Wörter, <b>{reise.situationenBereit} von {reise.situationen}</b> Situationen
              {' '}und eine Wortabdeckung von ca. {reise.abdeckung.low}–{reise.abdeckung.high} %. Vorausgesetzt, du bleibst dran und wiederholst.
            </p>
          ) : <p className="opacity-80">Die Reise läuft – viel Spaß!</p>}
        </div>
        <p className="text-xs opacity-60">
          Das ist eine Schätzung, keine Messung. Sie rechnet aus der Häufigkeit deiner gelernten Wörter (Web-Texte, nicht gesprochene Sprache), deshalb die Spanne.
          Wortabdeckung ist nicht Verständnis: Grammatik, Tempo und Aussprache kommen dazu. Für dein Ziel – dich auf Reisen verständigen – zählen die Situationen mehr als die Prozentzahl.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-bold">🗾 Was du in Japan schon kannst</h2>
        {status.map(({ s, pct, ready, missing, known, total }) => (
          <div key={s.id} className={`card overflow-hidden ${ready ? 'ring-2 ring-matcha/60' : ''}`}>
            <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(open === s.id ? undefined : s.id)}>
              <span className={`text-3xl ${pct === 0 ? 'grayscale opacity-50' : ''}`}>{s.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold">{s.title}</span>
                  <span className={`text-sm tabular-nums ${ready ? 'font-bold text-emerald-600 dark:text-matcha' : 'opacity-60'}`}>
                    {ready ? '✓ kannst du' : `${pct} %`}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div className={`h-full rounded-full transition-all ${ready ? 'bg-matcha' : 'bg-sakura'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </button>
            {open === s.id && (
              <div className="space-y-2 border-t border-black/5 p-4 text-sm dark:border-white/10">
                <p>{s.canDo}</p>
                <p className="rounded-lg bg-black/[0.03] p-2 dark:bg-white/[0.04]">
                  <span lang="ja" className="text-lg">{s.phrase.ja}</span><br />
                  <span className="opacity-70">{s.phrase.de}</span>
                </p>
                <p className="opacity-70">Schlüsselwörter: {known} / {total}
                  {s.minWords && ` · Gesamtwortschatz: ${Math.min(learned.size, s.minWords)} / ${s.minWords}`}</p>
                {missing.length > 0 && (
                  <p className="opacity-70">Noch offen: <span lang="ja">{missing.map((w) => w.surface).join('、')}</span></p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-bold">🎧 Echtes Japanisch – freigeschaltet</h2>
        <p className="text-sm opacity-60">
          Die Wortschwellen sind grobe Schätzungen: ab da solltest du einen großen Teil verstehen. Lücken füllst du dabei oft aus dem Zusammenhang.
        </p>
        {MEDIEN.map((m) => {
          const unlocked = learned.size >= m.minWords
          const inner = (
            <>
              <span className="text-3xl">{unlocked ? { Podcast: '🎧', YouTube: '▶️', Anime: '📺', Manga: '📚', Lesen: '📖' }[m.art] : '🔒'}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{m.title}</div>
                <div className="text-xs opacity-60">{m.art} · ab ca. {m.minWords} Wörtern</div>
                <div className="mt-1 text-sm opacity-80">{m.note}</div>
                {!unlocked && m === nextMedium && (
                  <div className="mt-1 text-sm font-bold text-sakura">Noch {m.minWords - learned.size} Wörter – dein nächstes Ziel!</div>
                )}
              </div>
            </>
          )
          return unlocked
            ? <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="card flex gap-3 p-4 transition hover:ring-sakura/50">{inner} <span className="self-center opacity-50">↗</span></a>
            : <div key={m.id} className="card flex gap-3 p-4 opacity-60">{inner}</div>
        })}
      </div>
    </section>
  )
}

function Big({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-sakura tabular-nums">{n}</div>
      <div className="text-xs opacity-60">{label}</div>
    </div>
  )
}
