/** Profil: Konto, Abo (inkl. Kündigung), Einstellungen, Datensicherung und Rechtliches. */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Access } from '../../../shared/entitlement'
import { PLANS } from '../../../shared/plans'
import { api, errorMessage } from '../../lib/api'
import { useAccount } from '../../lib/account'
import { exportBackup } from '../../lib/db'
import { updateSettings, useSettings, type Settings } from '../../lib/settings'
import { ProgressDetails } from '../../features/ProgressSummary'
import { PageHeader } from '../../layouts/AppLayout'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card, SectionTitle } from '../../ui/Card'
import { cx } from '../../ui/cx'
import { Toggle } from '../../ui/Field'
import { Notice } from '../../ui/Notice'

const date = (seconds: number) => new Date(seconds * 1000).toLocaleDateString('de-DE', { dateStyle: 'long' })

/** Übersetzt den Abo-Stand des Servers in einen Satz für Menschen. */
function describeAccess(access: Access): { title: string; text: string; tone: 'ok' | 'warn' | 'info' } {
  switch (access.reason) {
    case 'aktiv':
      return { title: 'Pro ist aktiv', text: `Nächste Verlängerung am ${date(access.until!)}.`, tone: 'ok' }
    case 'gekuendigt_laeuft':
      return { title: 'Pro ist gekündigt', text: `Du kannst Pro noch bis zum ${date(access.until!)} nutzen. Danach endet das Abo automatisch.`, tone: 'info' }
    case 'zahlung_offen':
      return { title: 'Zahlung fehlgeschlagen', text: `Bitte aktualisiere deine Zahlungsart bis zum ${date(access.until!)}, sonst endet Pro.`, tone: 'warn' }
    case 'zahlung_fehlt':
      return { title: 'Pro ist pausiert', text: 'Die Zahlung für dein Abo fehlt. Aktualisiere deine Zahlungsart, um Pro wieder zu nutzen.', tone: 'warn' }
    case 'abgelaufen':
      return { title: 'Dein Pro-Abo ist beendet', text: 'Dein Lernfortschritt und deine Karteikarten bleiben erhalten.', tone: 'info' }
    case 'kein_abo':
      return { title: 'Du nutzt Kotoba Dojo gratis', text: 'Lernen, Story-Lektionen und Probe-Missionen sind kostenlos.', tone: 'info' }
  }
}

const THEMES: { id: Settings['theme']; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'hell', label: 'Hell' },
  { id: 'dunkel', label: 'Dunkel' },
]

export function Component() {
  const [params, setParams] = useSearchParams()
  const { status, me, pro, signedIn, refresh } = useAccount()
  const settings = useSettings()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const justBought = params.get('kauf') === 'erfolgreich'

  // Nach dem Kauf: Stripe meldet die Zahlung dem Server meist nach wenigen Sekunden. Kurz nachfragen, bis Pro da ist.
  useEffect(() => {
    if (!justBought || pro) return
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      void refresh()
      if (tries >= 10) window.clearInterval(timer)
    }, 2000)
    return () => window.clearInterval(timer)
  }, [justBought, pro, refresh])

  async function openPortal() {
    setBusy(true)
    setError(undefined)
    try {
      window.location.assign((await api.portal()).url)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  async function logout() {
    await api.logout().catch(() => undefined)
    setParams({}, { replace: true })
    await refresh()
  }

  async function downloadBackup() {
    const blob = new Blob([JSON.stringify(await exportBackup())], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `kotoba-dojo-sicherung-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const access = me ? describeAccess(me.access) : undefined
  const hasSubscription = me?.plan != null && me.access.reason !== 'kein_abo'

  return (
    <>
      <PageHeader ja="私" title="Profil" />

      {justBought && (
        <Notice tone="ok" className="mb-6" title={pro ? 'Willkommen bei Pro!' : 'Danke für deinen Kauf!'}>
          {pro ? 'Alle Pro-Bereiche sind freigeschaltet. Viel Spaß – 頑張って!' : 'Deine Zahlung wird gerade bestätigt. Das dauert nur einen Moment …'}
        </Notice>
      )}
      {status === 'offline' && <Notice tone="warn" className="mb-6" title="Keine Verbindung">Konto und Abo lassen sich gerade nicht abrufen. Lernen funktioniert trotzdem.</Notice>}
      {error && <Notice tone="error" className="mb-6">{error}</Notice>}

      <SectionTitle>Konto</SectionTitle>
      <Card>
        {status === 'laden' ? (
          <p className="text-ink-soft">Einen Moment …</p>
        ) : signedIn ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-ink-soft">Angemeldet als</p>
              <p className="truncate font-medium">{me!.user!.email}</p>
            </div>
            <Button size="sm" onClick={() => void logout()}>Abmelden</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ink-soft">Du lernst ohne Konto. Dein Fortschritt liegt auf diesem Gerät.</p>
            <Button to="/anmelden" size="sm" className="shrink-0">Anmelden</Button>
          </div>
        )}
      </Card>

      <div className="mt-10">
        <SectionTitle action={pro ? <Badge tone="accent">Pro</Badge> : undefined}>Abo</SectionTitle>
        <Card>
          {access && (
            <>
              <p className="font-display text-xl">{access.title}</p>
              <p className="mt-1 text-ink-soft">
                {access.text}
                {hasSubscription && me?.plan ? ` Tarif: ${PLANS[me.plan].name}.` : ''}
              </p>
            </>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {!pro && <Button to="/app/upgrade" variant="primary">Pro ansehen</Button>}
            {hasSubscription && <Button loading={busy} onClick={() => void openPortal()}>Abo und Zahlungsart verwalten</Button>}
            <Button to="/kuendigen" variant={hasSubscription ? 'secondary' : 'ghost'}>Verträge hier kündigen</Button>
          </div>
        </Card>
      </div>

      <div className="mt-10">
        <SectionTitle ja="進歩">Fortschritt</SectionTitle>
        <ProgressDetails />
      </div>

      <div className="mt-10">
        <SectionTitle>Einstellungen</SectionTitle>
        <Card className="divide-y divide-line py-2 sm:py-2">
          <div className="py-3">
            <p className="font-medium">Darstellung</p>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Darstellung">
              {THEMES.map((theme) => (
                <button
                  key={theme.id} type="button" role="radio" aria-checked={settings.theme === theme.id}
                  onClick={() => updateSettings({ theme: theme.id })}
                  className={cx(
                    'min-h-11 rounded-control border px-2 text-sm transition-colors',
                    settings.theme === theme.id ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line hover:border-ink-soft',
                  )}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
          <Toggle label="Kana-Lesung zeigen" hint="Lesung in Hiragana über oder unter japanischem Text" checked={settings.showKana} onChange={(showKana) => updateSettings({ showKana })} />
          <Toggle label="Romaji zeigen" hint="Umschrift in lateinischen Buchstaben" checked={settings.showRomaji} onChange={(showRomaji) => updateSettings({ showRomaji })} />
          <div className="flex items-center justify-between gap-4 py-3">
            <label htmlFor="daily-goal">
              <span className="block font-medium">Tagesziel</span>
              <span className="block text-sm text-ink-soft">Übungen pro Tag (Karten, Zeichen, Missionsschritte)</span>
            </label>
            <select
              id="daily-goal" value={settings.dailyGoal} onChange={(e) => updateSettings({ dailyGoal: Number(e.target.value) })}
              className="min-h-11 rounded-control border border-line bg-surface px-3"
            >
              {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <label htmlFor="new-per-day">
              <span className="block font-medium">Neue Wörter pro Tag</span>
              <span className="block text-sm text-ink-soft">Aus dem Grundwortschatz</span>
            </label>
            <select
              id="new-per-day" value={settings.newPerDay} onChange={(e) => updateSettings({ newPerDay: Number(e.target.value) })}
              className="min-h-11 rounded-control border border-line bg-surface px-3"
            >
              {[4, 8, 12, 20].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </Card>
      </div>

      <div className="mt-10">
        <SectionTitle>Deine Daten</SectionTitle>
        <Card>
          <p className="text-ink-soft">Dein Lernfortschritt liegt nur auf diesem Gerät. Mit einer Sicherung nimmst du ihn auf ein anderes Gerät mit.</p>
          <Button className="mt-4" size="sm" onClick={() => void downloadBackup()}>Sicherung herunterladen</Button>
        </Card>
      </div>

      <nav aria-label="Rechtliches" className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
        {[['/impressum', 'Impressum'], ['/datenschutz', 'Datenschutz'], ['/agb', 'AGB'], ['/widerruf', 'Widerrufsbelehrung'], ['/quellen', 'Quellen & Lizenzen']].map(([to, label]) => (
          <Link key={to} to={to} className="hover:text-ink hover:underline">{label}</Link>
        ))}
      </nav>
    </>
  )
}
