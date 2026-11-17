/**
 * Rahmen für den App-Bereich. Handy: Tab-Leiste unten (mit dem Daumen erreichbar).
 * PC: dieselben fünf Bereiche als Leiste links.
 */
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router-dom'
import { cx } from '../ui/cx'
import { Icon, type IconName } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { Toasts } from '../ui/Toasts'
import { AutoSync } from '../features/AutoSync'

const TABS: { to: string; label: string; ja: string; icon: IconName; end?: boolean }[] = [
  { to: '/app', label: 'Start', ja: '始め', icon: 'home', end: true },
  { to: '/app/lernen', label: 'Lernen', ja: '学ぶ', icon: 'cards' },
  { to: '/app/story', label: 'Story', ja: '物語', icon: 'story' },
  { to: '/app/sprechen', label: 'Sprechen', ja: '話す', icon: 'speak' },
  { to: '/app/profil', label: 'Profil', ja: '私', icon: 'user' },
]

export default function AppLayout() {
  return (
    <div className="min-h-dvh md:flex">
      <a href="#inhalt" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2">
        Zum Inhalt springen
      </a>

      {/* Leiste links (PC) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
        <Link to="/" className="mb-8 px-3" aria-label="Kotoba Dojo – Startseite"><Logo /></Link>
        <nav aria-label="App-Bereiche" className="flex flex-col gap-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to} to={tab.to} end={tab.end}
              className={({ isActive }) =>
                cx('flex items-center gap-3 rounded-control px-3 py-2.5 transition-colors', isActive ? 'bg-accent-soft font-semibold text-accent' : 'text-ink-soft hover:bg-sunken hover:text-ink')
              }
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
              <span lang="ja" aria-hidden="true" className="ml-auto text-xs font-normal opacity-60">{tab.ja}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1 px-3 text-sm text-ink-soft">
          <Link to="/kuendigen" className="block hover:text-ink hover:underline">Verträge hier kündigen</Link>
          <Link to="/impressum" className="block hover:text-ink hover:underline">Impressum</Link>
          <Link to="/datenschutz" className="block hover:text-ink hover:underline">Datenschutz</Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Kopfzeile (Handy) */}
        <header className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-2 md:hidden">
          <Link to="/" aria-label="Kotoba Dojo – Startseite"><Logo /></Link>
        </header>

        <main id="inhalt" className="flex-1 px-5 pt-4 pb-28 sm:px-8 md:py-10">
          <div className="mx-auto max-w-app">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Tab-Leiste unten (Handy) */}
      <nav
        aria-label="App-Bereiche"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to} to={tab.to} end={tab.end}
            className={({ isActive }) =>
              cx('flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors', isActive ? 'font-semibold text-accent' : 'text-ink-soft')
            }
          >
            <Icon name={tab.icon} size={22} />
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Toasts />
      <AutoSync />
      <ScrollRestoration />
    </div>
  )
}

/** Einheitlicher Seitenkopf im App-Bereich. */
export function PageHeader({ title, ja, lead, back }: { title: string; ja?: string; lead?: string; back?: { to: string; label: string } }) {
  return (
    <div className="mb-8">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
          <Icon name="arrowLeft" size={16} /> {back.label}
        </Link>
      )}
      {ja && <p lang="ja" aria-hidden="true" className="mb-1 text-xs tracking-[0.3em] text-accent">{ja}</p>}
      <h1 className="text-2xl sm:text-3xl">{title}</h1>
      {lead && <p className="mt-2 text-ink-soft">{lead}</p>}
    </div>
  )
}
