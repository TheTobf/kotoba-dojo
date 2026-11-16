/**
 * Upgrade-Hinweise. Gesperrte Pro-Bereiche zeigen nie eine Fehlermeldung, sondern erklären freundlich,
 * was Pro bringt und was es kostet.
 *   <UpgradeHint>   – kleine Karte innerhalb einer Seite
 *   <UpgradeScreen> – ganze Ansicht anstelle des gesperrten Inhalts
 */
import type { ReactNode } from 'react'
import { formatPrice, PLANS, TAX_NOTE, yearlySavingsPercent } from '../../shared/plans'
import { useAccount } from '../lib/account'
import { Button } from './Button'
import { Card } from './Card'
import { Icon } from './Icon'
import { Seal } from './Logo'

export const PRO_BENEFITS = [
  'Story-Missionen: weiterkommen mit dem richtigen japanischen Satz',
  'Gespräche mit KI-Figuren – mit Hilfe auf Deutsch, wenn du nicht weiterweißt',
  'Korrekturen auf Deutsch; Fehler werden automatisch zu Karteikarten',
]

export function UpgradeHint({ title = 'Mehr mit Kotoba Dojo Pro', children }: { title?: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4 border-accent/40 bg-accent-soft sm:flex-row sm:items-center">
      <div className="flex flex-1 items-start gap-3">
        <span className="mt-0.5 text-accent"><Icon name="lock" /></span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-ink-soft">
            {children ?? `Story-Missionen und KI-Gespräche ab ${formatPrice(PLANS.monthly.priceCents)} im Monat.`}
          </p>
        </div>
      </div>
      <Button to="/app/upgrade" variant="primary" size="sm" className="shrink-0">Pro ansehen</Button>
    </Card>
  )
}

export function UpgradeScreen({ title, lead }: { title: string; lead: string }) {
  const { signedIn } = useAccount()
  return (
    <section className="rise mx-auto max-w-md py-6 text-center sm:py-10" aria-labelledby="upgrade-title">
      <div className="relative mx-auto mb-6 w-fit">
        <Seal size={72} />
        <span className="absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink">
          <Icon name="lock" size={16} />
        </span>
      </div>
      <p className="mb-2 text-xs tracking-[0.2em] text-accent uppercase">Kotoba Dojo Pro</p>
      <h1 id="upgrade-title" className="text-2xl sm:text-3xl">{title}</h1>
      <p className="mt-3 text-ink-soft">{lead}</p>

      <ul className="mt-8 space-y-3 text-left">
        {PRO_BENEFITS.map((benefit) => (
          <li key={benefit} className="flex gap-3">
            <span className="mt-0.5 shrink-0 text-accent"><Icon name="check" /></span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-3">
        <Button to="/app/upgrade?tarif=yearly" variant="primary" block>
          Jährlich für {formatPrice(PLANS.yearly.priceCents)} <span className="font-normal opacity-90">· {yearlySavingsPercent()} % günstiger</span>
        </Button>
        <Button to="/app/upgrade?tarif=monthly" block>Monatlich für {formatPrice(PLANS.monthly.priceCents)}</Button>
      </div>
      <p className="mt-4 text-sm text-ink-soft">{TAX_NOTE} Jederzeit kündbar.</p>
      {!signedIn && (
        <p className="mt-6 text-sm">
          Du hast schon Pro? <Button to="/anmelden" variant="ghost" size="sm" className="-mx-2">Anmelden</Button>
        </p>
      )}
    </section>
  )
}
