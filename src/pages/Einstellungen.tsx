import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, exportBackup, importBackup } from '../db'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, type Settings } from '../types'
import { THEMEN } from '../motivation'

export default function Einstellungen() {
  const stored = useLiveQuery(() => db.settings.get('me'))
  const s: Settings = { ...DEFAULT_SETTINGS, ...stored }
  const set = (patch: Partial<Settings>) => db.settings.put({ ...s, ...patch })
  const profile = { ...DEFAULT_PROFILE, ...useLiveQuery(() => db.profile.get('me')) }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">
        Einstellungen <span className="text-sakura">設定</span>
      </h1>

      <div className="card divide-y divide-black/5 dark:divide-white/10">
        <Row label="Design">
          <select className="rounded-lg bg-transparent p-2 ring-1 ring-black/10 dark:ring-white/20"
            value={s.theme} onChange={(e) => set({ theme: e.target.value as Settings['theme'] })}>
            <option value="system">wie System</option>
            <option value="hell">Hell</option>
            <option value="dunkel">Dunkel</option>
          </select>
        </Row>
        <div className="space-y-2 px-4 py-3">
          <div>Farbthema</div>
          <div className="flex flex-wrap gap-2">
            {THEMEN.map((t) => {
              const frei = profile.unlockedThemes.includes(t.id) || t.id === 'sakura'
              return (
                <button key={t.id} type="button" disabled={!frei} onClick={() => set({ accent: t.id })}
                  title={frei ? t.name : `Freischalten: ${t.bedingung}`}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 transition ${
                    s.accent === t.id ? 'ring-2 ring-current font-bold' : 'ring-black/10 dark:ring-white/20'} ${frei ? '' : 'opacity-40'}`}>
                  <span className="h-4 w-4 rounded-full" style={{ background: t.farbe }} />
                  {frei ? t.name : `🔒 ${t.bedingung}`}
                </button>
              )
            })}
          </div>
        </div>
        <Row label={`Neue Karten pro Tag: ${s.newPerDay}`}>
          <input type="range" min={0} max={50} value={s.newPerDay}
            onChange={(e) => set({ newPerDay: +e.target.value })} className="accent-sakura" />
        </Row>
        <Row label={`Tagesziel: ${s.dailyGoal} Karten`}>
          <input type="range" min={5} max={100} step={5} value={s.dailyGoal}
            onChange={(e) => set({ dailyGoal: +e.target.value })} className="accent-sakura" />
        </Row>
        <Toggle label="Furigana anzeigen" value={s.furigana} onChange={(v) => set({ furigana: v })} />
        <Toggle label="Schreibmaschinen-Effekt beim Umdrehen" value={s.typewriter} onChange={(v) => set({ typewriter: v })} />
        <Toggle label="Audio automatisch abspielen" value={s.autoplayAudio} onChange={(v) => set({ autoplayAudio: v })} />
        <Toggle label="Ton aus" value={s.muted} onChange={(v) => set({ muted: v })} />
        <Row label={`Lautstärke: ${Math.round(s.volume * 100)} %`}>
          <input type="range" min={0} max={1} step={0.05} value={s.volume}
            onChange={(e) => set({ volume: +e.target.value })} className="accent-sakura" />
        </Row>
        <Toggle label="Vibration" value={s.vibration} onChange={(v) => set({ vibration: v })} />
      </div>

      <Daten />

      <div className="card space-y-1 p-4 text-xs opacity-70">
        <div className="font-bold">Quellen & Lizenzen</div>
        <p>Wörterbuch: JMdict/KANJIDIC2 (EDRDG, CC BY-SA 4.0) · Strichreihenfolge: KanjiVG (CC BY-SA 3.0) · Häufigkeit: Leeds-Korpus</p>
        <p>Sätze & Aufnahmen: Tatoeba (CC BY 2.0 FR; Audio CC BY / CC BY-NC) · Sprachausgabe: VOICEVOX:四国めたん, VOICEVOX:青山龍星</p>
        <p>Deutsche Übersetzungen, Notizen und Ersatzsätze teils von Claude (in der Wortliste als „Claude“ markiert).</p>
      </div>
    </section>
  )
}

/** Sicherung als JSON-Datei exportieren und auf einem anderen Gerät wieder einlesen. */
function Daten() {
  const [msg, setMsg] = useState<string>()
  const exportieren = async () => {
    const b = await exportBackup()
    const url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `kotoba-dojo-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg(`✓ ${b.cards.length} Karten gesichert`)
  }
  const importieren = async (f?: File) => {
    if (!f) return
    if (!confirm('Alle Lerndaten auf diesem Gerät werden durch die Sicherung ersetzt. Fortfahren?')) return
    try {
      const b = JSON.parse(await f.text())
      await importBackup(b)
      setMsg(`✓ ${b.cards.length} Karten wiederhergestellt`)
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`)
    }
  }
  return (
    <div className="card space-y-3 p-4">
      <div className="font-bold">Daten & Sicherung</div>
      <p className="text-sm opacity-70">Dein Fortschritt liegt nur auf diesem Gerät. Mit einer Sicherungsdatei kannst du ihn auf Handy/PC übertragen.</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportieren} className="btn-primary">⬇️ Sicherung speichern</button>
        <label className="btn cursor-pointer bg-black/5 dark:bg-white/10">
          ⬆️ Sicherung laden
          <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => importieren(e.target.files?.[0])} />
        </label>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-h-14 items-center justify-between gap-4 px-4 py-2">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row label={label}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-6 accent-sakura" />
    </Row>
  )
}
