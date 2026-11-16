/** Rahmen für die öffentlichen Seiten: Landingpage, Preise, Anmeldung, Kündigung, Rechtliches. */
import { Link, Outlet, ScrollRestoration } from 'react-router-dom'
import { useAccount } from '../lib/account'
import { Button } from '../ui/Button'
import { Logo } from '../ui/Logo'

const LEGAL_LINKS = [
  { to: '/impressum', label: 'Impressum' },
  { to: '/datenschutz', label: 'Datenschutz' },
  { to: '/agb', label: 'AGB' },
  { to: '/widerruf', label: 'Widerrufsbelehrung' },
  { to: '/quellen', label: 'Quellen & Lizenzen' },
]

/** Fußbereich mit Rechtslinks und dem gesetzlich geforderten Kündigungsbutton (§ 312k BGB). */
export function SiteFooter() {
  return (
    <footer className="no-print mt-24 border-t border-line">
      <div className="mx-auto flex max-w-site flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Rechtliches" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-ink hover:underline">{link.label}</Link>
          ))}
        </nav>
        <Button to="/kuendigen" size="sm" className="self-start md:self-auto">Verträge hier kündigen</Button>
      </div>
      <p className="mx-auto max-w-site px-5 pb-10 text-sm text-ink-soft sm:px-8">© {new Date().getFullYear()} Kotoba Dojo</p>
    </footer>
  )
}

export default function SiteLayout() {
  const { signedIn } = useAccount()
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#inhalt" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2">
        Zum Inhalt springen
      </a>
      <header className="no-print mx-auto flex w-full max-w-site items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-6">
        <Link to="/" aria-label="Kotoba Dojo – Startseite"><Logo /></Link>
        <nav aria-label="Hauptnavigation" className="flex items-center gap-1 sm:gap-2">
          <Button to="/preise" variant="ghost" size="sm">Preise</Button>
          {!signedIn && <Button to="/anmelden" variant="ghost" size="sm" className="hidden sm:inline-flex">Anmelden</Button>}
          <Button to="/app" variant="primary" size="sm">App öffnen</Button>
        </nav>
      </header>
      <main id="inhalt" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}
