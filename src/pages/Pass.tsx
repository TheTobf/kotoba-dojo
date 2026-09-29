import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { aktuelleSaison, besitz, omamoriVerfuegbar, stufeAus, tageBisEnde } from '../pass'
import { MUSTER_CSS, NEKO, SAISONS, XP_PRO_STUFE, type Belohnung, type BelohnungsArt } from '../content/pass'
import { THEMEN } from '../motivation'
import { previewPack } from '../sfx'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, type Settings } from '../types'

const ARTEN: { art: BelohnungsArt; titel: string; feld?: keyof Settings }[] = [
  { art: 'tier', titel: '🐾 Begleiter', feld: 'companion' },
  { art: 'farbe', titel: '🎨 Farben', feld: 'accent' },
  { art: 'muster', titel: '🀄 Kartenmuster', feld: 'cardPattern' },
  { art: 'klang', titel: '🎐 Klangpakete', feld: 'soundPack' },
  { art: 'effekt', titel: '✨ Bildschirmrand', feld: 'edgeEffect' },
  { art: 'titel', titel: '🏷️ Titel', feld: 'title' },
]

/** Wert, der beim Auswählen in den Einstellungen landet. */
const wertVon = (b: Belohnung, feld: keyof Settings) =>
  feld === 'companion' || feld === 'title' || feld === 'accent' ? b.id : (b.wert ?? '')

export default function Pass() {
  const p = { ...DEFAULT_PROFILE, ...useLiveQuery(() => db.profile.get('me')) }
  const s: Settings = { ...DEFAULT_SETTINGS, ...useLiveQuery(() => db.settings.get('me')) }
  const aktuell = aktuelleSaison()
  const [saisonId, setSaisonId] = useState(aktuell.id)
  const saison = SAISONS.find((x) => x.id === saisonId)!
  const xp = p.seasonXp?.[saison.id] ?? 0
  const { stufe, rest, fertig } = stufeAus(xp)
  const owned = besitz(p)
  const ownedIds = new Set(owned.map((b) => b.id))
  const set = (patch: Partial<Settings>) => db.settings.put({ ...s, ...patch })
  const leiste = useRef<HTMLDivElement>(null)
  const istAktuell = saison.id === aktuell.id
  const vergangen = saison.bis < aktuell.von

  // Zur aktuellen Stufe scrollen
  useEffect(() => {
    const el = leiste.current?.querySelector<HTMLElement>(`[data-stufe="${Math.min(stufe + 1, 25)}"]`)
    el?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [saisonId, stufe])

  const stempel = owned.filter((b) => b.art === 'stempel')
  const alleStempel = SAISONS.flatMap((x) => x.stufen.filter((b) => b.art === 'stempel'))

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold">
        Reise-Pass <span className="text-sakura">旅のパス</span>
      </h1>

      <div className="flex gap-2 overflow-x-auto">
        {SAISONS.map((x) => (
          <button key={x.id} onClick={() => setSaisonId(x.id)}
            className={`btn min-h-10 shrink-0 ${x.id === saisonId ? 'bg-sakura/15 font-bold text-sakura' : 'opacity-60'}`}>
            {x.icon} {x.name}{x.id === aktuell.id ? ' •' : ''}
          </button>
        ))}
      </div>

      <div className="card space-y-2 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-xl font-bold">{saison.icon} {saison.name} <span lang="ja" className="text-sakura">{saison.jp}</span></div>
          <div className="text-sm opacity-60">
            {istAktuell ? `noch ${tageBisEnde(saison)} Tage` : vergangen ? 'vorbei' : `ab ${saison.von.split('-').reverse().join('.')}`}
          </div>
        </div>
        <div className="text-sm opacity-80">
          {fertig ? '🌟 Alle 25 Stufen geschafft!' : `Stufe ${stufe} von 25 · noch ${XP_PRO_STUFE - rest} XP bis Stufe ${stufe + 1}`}
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-yuzu to-amber-500" style={{ width: `${(Math.min(xp, 25 * XP_PRO_STUFE) / (25 * XP_PRO_STUFE)) * 100}%` }} />
        </div>
        <p className="text-xs opacity-60">Jede Übung bringt Koban 🪙 – {XP_PRO_STUFE} XP pro Stufe. Freigeschaltetes bleibt dir für immer.</p>
      </div>

      {/* Stufen-Leiste */}
      <div ref={leiste} className="flex gap-2 overflow-x-auto pb-2">
        {saison.stufen.map((b, i) => {
          const n = i + 1
          const hat = n <= stufe
          const naechste = n === stufe + 1 && istAktuell
          return (
            <div key={b.id} data-stufe={n}
              className={`card flex w-24 shrink-0 flex-col items-center gap-1 p-2 text-center transition ${
                hat ? 'ring-2 ring-yuzu/70' : naechste ? 'ring-2 ring-sakura' : 'opacity-50'} ${n === 25 ? 'w-32 bg-gradient-to-b from-sakura/15 to-transparent' : ''}`}>
              <span className="text-[10px] font-bold opacity-60">STUFE {n}</span>
              <span className={`text-3xl ${hat ? '' : 'blur-[1.5px] grayscale'}`} style={b.art === 'farbe' ? { color: b.wert } : undefined}>
                {b.art === 'farbe' ? '●' : b.icon}
              </span>
              <span className="line-clamp-2 text-xs font-bold leading-tight">{b.name}</span>
              <span className="text-[10px]">{hat ? '✓' : naechste ? `${Math.round((rest / XP_PRO_STUFE) * 100)} %` : '🔒'}</span>
            </div>
          )
        })}
      </div>

      {/* Sammlung */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Deine Sammlung</h2>

        {ARTEN.map(({ art, titel, feld }) => {
          const alle = art === 'tier' ? [NEKO, ...SAISONS.flatMap((x) => x.stufen.filter((b) => b.art === art))] : SAISONS.flatMap((x) => x.stufen.filter((b) => b.art === art))
          const standard = art === 'farbe' ? THEMEN.filter((t) => t.id === 'sakura' || p.unlockedThemes.includes(t.id)) : []
          return (
            <div key={art} className="space-y-2">
              <div className="text-sm font-bold">{titel}</div>
              <div className="flex flex-wrap gap-2">
                {(art === 'muster' || art === 'klang' || art === 'effekt' || art === 'titel') && feld && (
                  <Chip aktiv={!s[feld]} onClick={() => set({ [feld]: '' })}>Aus / Standard</Chip>
                )}
                {standard.map((t) => (
                  <Chip key={t.id} aktiv={s.accent === t.id} onClick={() => set({ accent: t.id })}>
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: t.farbe }} /> {t.name}
                  </Chip>
                ))}
                {alle.map((b) => {
                  const hat = ownedIds.has(b.id)
                  const wert = feld ? wertVon(b, feld) : ''
                  return (
                    <Chip key={b.id} gesperrt={!hat} aktiv={!!feld && s[feld] === wert}
                      onClick={() => {
                        if (!hat || !feld) return
                        set({ [feld]: wert })
                        if (art === 'klang') previewPack(b.wert ?? '', { volume: s.volume, muted: s.muted })
                      }}
                      title={hat ? b.text : 'Noch nicht freigeschaltet'}>
                      {art === 'farbe'
                        ? <span className="h-3.5 w-3.5 rounded-full" style={{ background: b.wert }} />
                        : art === 'muster'
                          ? <span className="h-4 w-6 rounded ring-1 ring-black/10" style={{ background: MUSTER_CSS[b.wert!]('#ff5fa2') }} />
                          : art !== 'titel' && <span>{hat ? b.icon : '🔒'}</span>}
                      {hat ? b.name : art === 'titel' ? '🔒 ???' : b.name}
                    </Chip>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="card space-y-3 p-4">
          <div className="flex items-baseline justify-between">
            <div className="font-bold">御朱印帳 Stempelbuch</div>
            <div className="text-sm opacity-60">{stempel.length} / {alleStempel.length}</div>
          </div>
          <p className="text-xs opacity-60">In Japan sammelt man an Tempeln und Schreinen handgeschriebene Stempel (Goshuin). Hier für jede Pass-Stufe einen.</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {alleStempel.map((b) => {
              const hat = ownedIds.has(b.id)
              return (
                <div key={b.id} title={hat ? `${b.name} (${b.text})` : '???'}
                  className={`flex aspect-square flex-col items-center justify-center rounded-full border-2 p-1 text-center ${
                    hat ? 'rotate-[-6deg] border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400' : 'border-dashed border-black/15 opacity-40 dark:border-white/20'}`}>
                  <span lang="ja" className="text-[11px] font-bold leading-tight [writing-mode:vertical-rl]">{hat ? b.jp : '？'}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card flex items-center gap-3 p-4">
          <span className="text-3xl">🧧</span>
          <div>
            <div className="font-bold">Omamori: {omamoriVerfuegbar(p)}</div>
            <div className="text-xs opacity-70">Glücksbringer retten deinen Streak automatisch, wenn du einen Tag verpasst (je Tag eins).</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Chip({ children, aktiv, gesperrt, onClick, title }: { children: React.ReactNode; aktiv?: boolean; gesperrt?: boolean; onClick?: () => void; title?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={gesperrt} title={title}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 transition ${
        aktiv ? 'bg-sakura/15 font-bold text-sakura ring-2 ring-sakura' : 'ring-black/10 dark:ring-white/20'} ${gesperrt ? 'opacity-40' : 'active:scale-95'}`}>
      {children}
    </button>
  )
}
