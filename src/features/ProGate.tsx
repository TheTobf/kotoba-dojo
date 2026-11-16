/**
 * Zeigt Pro-Inhalte nur, wenn der Server Pro bestätigt hat – sonst den Upgrade-Screen.
 * Das ist die freundliche Seite der Paywall. Die harte Seite sitzt im Server: Ohne Pro liefert er die
 * Inhalte gar nicht erst aus, egal was der Browser anzeigt.
 */
import type { ReactNode } from 'react'
import { useAccount } from '../lib/account'
import { Notice } from '../ui/Notice'
import { UpgradeScreen } from '../ui/UpgradeHint'

export function ProGate({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  const { status, pro } = useAccount()
  if (status === 'laden') return <p className="py-10 text-center text-ink-soft">Einen Moment …</p>
  if (status === 'offline') {
    return <Notice tone="warn" title="Keine Verbindung">Für diesen Bereich brauchst du Internet. Deine Lernkarten funktionieren auch offline.</Notice>
  }
  if (!pro) return <UpgradeScreen title={title} lead={lead} />
  return <>{children}</>
}
