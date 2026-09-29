import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { loadData } from '../data'
import { db } from '../db'
import { isLearned, startOfDay } from '../srs'
import { aktuellerStreak, ERFOLGE, levelInfo, RAENGE, rangFuer } from '../motivation'
import { heatmap, prognose, trefferquote } from '../statistik'
import { DEFAULT_PROFILE, type CardKind } from '../types'

const ART: Record<CardKind, string> = { vokabel: 'Vokabeln', quiz: 'Quiz', zeichen: 'Zeichen' }

export default function Statistik() {
  const [total, setTotal] = useState(0)
  const cards = useLiveQuery(() => db.cards.toArray())
  const log = useLiveQuery(() => db.reviewLog.where('at').above(Date.now() - 30 * 86_400_000).toArray())
  const p = { ...DEFAULT_PROFILE, ...useLiveQuery(() => db.profile.get('me')) }
  useEffect(() => { loadData().then((d) => setTotal(d.words.length)) }, [])
  if (!cards || !log) return <p className="opacity-60">Lade …</p>

  const lv = levelInfo(p.xp)
  const rang = rangFuer(lv.level)
  const naechsterRang = RAENGE.find((r) => r.ab > lv.level)
  const woerter = cards.filter((c) => c.kind === 'vokabel' && isLearned(c)).length
  const heuteFaellig = cards.filter((c) => c.due <= startOfDay() + 86_400_000).length
  const quote = trefferquote(log)
  const tage = heatmap(p.activeDays, 26)
  const prog = prognose(cards, 14)
  const maxProg = Math.max(1, ...prog.map((x) => x.anzahl))
  const lernTage = Object.keys(p.activeDays).length
  const erfolge = new Set(p.achievements)

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold">
        Statistik <span className="text-sakura">統計</span>
      </h1>

      <div className="card flex items-center gap-4 p-5">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-sakura/15 text-sakura">
          <span className="text-xs">Lv</span><span className="text-2xl font-bold leading-none">{lv.level}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold"><span lang="ja" className="text-lg">{rang.jp}</span> · {rang.de}</div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div className="h-full rounded-full bg-yuzu" style={{ width: `${lv.ratio * 100}%` }} />
          </div>
          <div className="mt-1 text-xs opacity-60">
            {lv.into} / {lv.need} XP bis Level {lv.level + 1} · {p.xp} XP gesamt
            {naechsterRang && ` · ${naechsterRang.jp} ab Level ${naechsterRang.ab}`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Zahl n={`${woerter}`} sub={`von ${total} Wörtern`} />
        <Zahl n={`🔥 ${aktuellerStreak(p)}`} sub={`Streak · Rekord ${p.bestStreak}`} />
        <Zahl n={quote.gesamt === undefined ? '–' : `${Math.round(quote.gesamt * 100)} %`} sub="Treffer (30 Tage)" />
        <Zahl n={`${heuteFaellig}`} sub="heute fällig" />
      </div>

      {Object.keys(quote.proArt).length > 0 && (
        <div className="card space-y-2 p-4">
          <h2 className="font-bold">Trefferquote nach Bereich</h2>
          {(Object.entries(quote.proArt) as [CardKind, number][]).map(([k, q]) => (
            <div key={k} className="flex items-center gap-3 text-sm">
              <span className="w-20">{ART[k]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div className="h-full rounded-full bg-matcha" style={{ width: `${q * 100}%` }} />
              </div>
              <span className="w-10 text-right tabular-nums">{Math.round(q * 100)} %</span>
            </div>
          ))}
        </div>
      )}

      <div className="card space-y-2 p-4">
        <h2 className="font-bold">Lerntage <span className="text-sm font-normal opacity-60">· {lernTage} Tage insgesamt</span></h2>
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {tage.map((woche, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {woche.map((t) => (
                <div key={t.tag} title={`${t.tag}: ${t.anzahl} Übungen`}
                  className={`h-3.5 w-3.5 rounded-[3px] ${t.zukunft ? 'opacity-0' : ''} ${
                    t.anzahl === 0 ? 'bg-black/[0.06] dark:bg-white/[0.07]'
                      : t.anzahl < 10 ? 'bg-sakura/30' : t.anzahl < 30 ? 'bg-sakura/60' : 'bg-sakura'}`} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-2 p-4">
        <h2 className="font-bold">Prognose: fällige Karten</h2>
        <div className="flex h-32 items-end gap-1">
          {prog.map((x, i) => (
            <div key={x.tag} className="flex flex-1 flex-col items-center gap-1" title={`${x.tag}: ${x.anzahl}`}>
              <span className="text-[10px] tabular-nums opacity-60">{x.anzahl || ''}</span>
              <div className={`w-full rounded-t ${i === 0 ? 'bg-sakura' : 'bg-neon/60'}`} style={{ height: `${(x.anzahl / maxProg) * 88}px` }} />
              <span className="text-[9px] opacity-50">{i === 0 ? 'heute' : x.kurz}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-bold">Erfolge <span className="text-sm font-normal opacity-60">· {ERFOLGE.filter((e) => erfolge.has(e.id)).length} / {ERFOLGE.length}</span></h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ERFOLGE.map((e) => {
            const da = erfolge.has(e.id)
            return (
              <div key={e.id} className={`card flex items-center gap-2 p-3 ${da ? 'ring-yuzu/50' : 'opacity-45 grayscale'}`}>
                <span className="text-2xl" lang="ja">{da ? e.icon : '🔒'}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{e.name}</span>
                  <span className="block text-xs opacity-70">{e.text}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Zahl({ n, sub }: { n: string; sub: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold tabular-nums">{n}</div>
      <div className="text-xs opacity-60">{sub}</div>
    </div>
  )
}
