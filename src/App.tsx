import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { DEFAULT_SETTINGS } from './types'
import Vokabeln from './pages/Vokabeln'
import Quiz from './pages/Quiz'
import Satzbau from './pages/Satzbau'
import Schrift from './pages/Schrift'
import Statistik from './pages/Statistik'
import Ziele from './pages/Ziele'
import Einstellungen from './pages/Einstellungen'

const TABS = [
  { to: '/vokabeln', label: 'Vokabeln', icon: '🃏', jp: '単語' },
  { to: '/quiz', label: 'Quiz', icon: '❓', jp: 'クイズ' },
  { to: '/satzbau', label: 'Satzbau', icon: '🧩', jp: '文法' },
  { to: '/schrift', label: 'Schrift', icon: '✍️', jp: '文字' },
  { to: '/ziele', label: 'Ziele', icon: '🗾', jp: '目標' },
]

const EXTRA = [
  { to: '/statistik', label: 'Statistik', icon: '📊' },
  { to: '/einstellungen', label: 'Einstellungen', icon: '⚙️' },
]

function useTheme() {
  const settings = useLiveQuery(() => db.settings.get('me'))
  const theme = settings?.theme ?? DEFAULT_SETTINGS.theme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () =>
      document.documentElement.classList.toggle('dark', theme === 'dunkel' || (theme === 'system' && mq.matches))
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
    isActive ? 'bg-sakura/15 text-sakura font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5'
  }`

export default function App() {
  useTheme()
  return (
    <div className="flex h-full">
      {/* Seitenleiste (PC) */}
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-black/5 p-4 md:flex dark:border-white/10">
        <div className="mb-6 px-3">
          <div className="text-2xl font-bold">
            言葉<span className="text-sakura">道場</span>
          </div>
          <div className="text-sm opacity-60">Kotoba Dojo</div>
        </div>
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={linkCls}>
            <span className="text-xl">{t.icon}</span>
            <span>{t.label}</span>
            <span className="ml-auto text-xs opacity-50">{t.jp}</span>
          </NavLink>
        ))}
        <div className="my-3 border-t border-black/5 dark:border-white/10" />
        {EXTRA.map((t) => (
          <NavLink key={t.to} to={t.to} className={linkCls}>
            <span className="text-xl">{t.icon}</span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Kopfzeile (Handy) */}
        <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2 md:hidden">
          <div className="text-xl font-bold">
            言葉<span className="text-sakura">道場</span>
          </div>
          <div className="flex gap-1">
            {EXTRA.map((t) => (
              <NavLink key={t.to} to={t.to} aria-label={t.label} className="btn min-h-10 px-2 text-xl">
                {t.icon}
              </NavLink>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-28 md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto max-w-2xl">
            <Routes>
              <Route path="/" element={<Navigate to="/vokabeln" replace />} />
              <Route path="/vokabeln" element={<Vokabeln />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/satzbau" element={<Satzbau />} />
              <Route path="/schrift" element={<Schrift />} />
              <Route path="/ziele" element={<Ziele />} />
              <Route path="/statistik" element={<Statistik />} />
              <Route path="/einstellungen" element={<Einstellungen />} />
            </Routes>
          </div>
        </main>

        {/* Tab-Leiste (Handy) */}
        <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-black/5 bg-paper-2/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-white/10 dark:bg-ink-2/90">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs transition ${
                  isActive ? 'text-sakura font-bold' : 'opacity-60'
                }`
              }
            >
              <span className="text-2xl">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
