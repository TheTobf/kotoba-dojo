import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { DEFAULT_SETTINGS, type Settings } from '../types'

export default function Einstellungen() {
  const stored = useLiveQuery(() => db.settings.get('me'))
  const s: Settings = { ...DEFAULT_SETTINGS, ...stored }
  const set = (patch: Partial<Settings>) => db.settings.put({ ...s, ...patch })

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
        <Row label={`Neue Karten pro Tag: ${s.newPerDay}`}>
          <input type="range" min={0} max={50} value={s.newPerDay}
            onChange={(e) => set({ newPerDay: +e.target.value })} className="accent-sakura" />
        </Row>
        <Row label={`Tagesziel: ${s.dailyGoal} Karten`}>
          <input type="range" min={5} max={100} step={5} value={s.dailyGoal}
            onChange={(e) => set({ dailyGoal: +e.target.value })} className="accent-sakura" />
        </Row>
        <Toggle label="Furigana anzeigen" value={s.furigana} onChange={(v) => set({ furigana: v })} />
        <Toggle label="Audio automatisch abspielen" value={s.autoplayAudio} onChange={(v) => set({ autoplayAudio: v })} />
        <Toggle label="Ton aus" value={s.muted} onChange={(v) => set({ muted: v })} />
        <Row label={`Lautstärke: ${Math.round(s.volume * 100)} %`}>
          <input type="range" min={0} max={1} step={0.05} value={s.volume}
            onChange={(e) => set({ volume: +e.target.value })} className="accent-sakura" />
        </Row>
        <Toggle label="Vibration" value={s.vibration} onChange={(v) => set({ vibration: v })} />
      </div>
    </section>
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
