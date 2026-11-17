/**
 * Einmal freundlich fragen, ob jemand ein kostenloses Konto möchte – aber erst, wenn schon etwas zu sichern ist:
 * nach beiden Probe-Missionen oder nach 3 Lerntagen. Wegklicken = 7 Tage Ruhe, nach dem zweiten Mal nie wieder.
 * Auf dem iPhone kommt der Hinweis dazu, dass Safari Webseiten-Daten nach 7 Tagen ohne Besuch löscht.
 */
import { useAccount } from '../lib/account'
import { useCompletedMissions } from '../lib/hooks'
import { updateSettings, useSettings } from '../lib/settings'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { useProfile } from './ProgressSummary'

const DAY = 86_400_000

/** iPhone/iPad im Browser (nicht als App auf dem Startbildschirm installiert)? */
export function isIosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const installed = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  return ios && !installed
}

export function AccountNudge({ force = false }: { force?: boolean }) {
  const { signedIn, status } = useAccount()
  const settings = useSettings()
  const profile = useProfile()
  const missions = useCompletedMissions() ?? []

  const trialsDone = missions.filter((m) => m.missionId.startsWith('probe-')).length >= 2
  const learningDays = Object.keys(profile.activeDays).length
  const earned = force || trialsDone || learningDays >= 3
  const resting = Date.now() - settings.nudgeDismissedAt < 7 * DAY
  if (signedIn || status !== 'bereit' || !earned || settings.nudgeDismissals >= 2 || (resting && !force)) return null

  return (
    <Card className="border-accent/40">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-accent"><Icon name="user" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Sichere deinen Fortschritt</p>
          <p className="mt-1 text-sm text-ink-soft">
            Mit einem kostenlosen Konto geht nichts verloren, und du lernst auf Handy und PC mit demselben Stand weiter.
            Du brauchst nur deine E-Mail-Adresse, kein Passwort.
          </p>
          {isIosBrowser() && (
            <p className="mt-2 text-sm text-ink-soft">
              Wichtig auf dem iPhone: Safari löscht die Daten einer Webseite, wenn du sie 7 Tage nicht öffnest. Ein Konto oder
              „Zum Home-Bildschirm“ schützt deinen Lernstand.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button to="/anmelden?weiter=%2Fapp%2Fprofil" variant="primary" size="sm">Kostenloses Konto anlegen</Button>
            <Button variant="ghost" size="sm" onClick={() => updateSettings({ nudgeDismissedAt: Date.now(), nudgeDismissals: settings.nudgeDismissals + 1 })}>
              Später
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
