/**
 * Kaufseite vor dem Wechsel zu Stripe: Tarif wählen, Endpreis sehen und die beiden gesetzlich nötigen
 * Zustimmungen geben (sofortiger Beginn, Erlöschen des Widerrufsrechts). Der Server prüft die Häkchen erneut
 * und speichert sie mit Zeitstempel.
 */
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CHECKOUT_CONSENTS } from '../../../shared/legal'
import { formatPrice, isPlanId, PLANS, PRODUCT_NAME, TAX_NOTE, yearlySavingsPercent, type PlanId } from '../../../shared/plans'
import { api, errorMessage } from '../../lib/api'
import { useAccount } from '../../lib/account'
import { PageHeader } from '../../layouts/AppLayout'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Checkbox, RadioCard } from '../../ui/Field'
import { Icon } from '../../ui/Icon'
import { Notice } from '../../ui/Notice'
import { PRO_BENEFITS } from '../../ui/UpgradeHint'

export function Component() {
  const [params, setParams] = useSearchParams()
  const { status, signedIn, pro, me } = useAccount()
  const requested = params.get('tarif')
  const plan: PlanId = isPlanId(requested) ? requested : 'yearly'
  const [immediate, setImmediate] = useState(false)
  const [withdrawal, setWithdrawal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const selected = PLANS[plan]
  const period = plan === 'yearly' ? 'Jahr' : 'Monat'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      const { url } = await api.checkout({ plan, consentImmediateStart: immediate, consentWithdrawalExpires: withdrawal })
      window.location.assign(url) // weiter zur Bezahlseite von Stripe
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  if (pro) {
    return (
      <>
        <PageHeader title="Du hast bereits Pro" />
        <Notice tone="ok" title="Kotoba Dojo Pro ist aktiv">Dein Abo verwaltest du im Profil.</Notice>
        <Button to="/app/profil" variant="primary" className="mt-6">Zum Profil</Button>
      </>
    )
  }

  return (
    <>
      <PageHeader ja="プロ" title={PRODUCT_NAME} lead="Missionen, Gespräche und Korrekturen – jederzeit kündbar." />

      <ul className="mb-8 space-y-2">
        {PRO_BENEFITS.map((benefit) => (
          <li key={benefit} className="flex gap-3"><span className="mt-0.5 shrink-0 text-accent"><Icon name="check" /></span>{benefit}</li>
        ))}
      </ul>

      <form onSubmit={submit}>
        <Card className="space-y-6 sm:p-8">
          <fieldset className="space-y-2">
            <legend className="mb-2 font-semibold">1. Tarif wählen</legend>
            {(['yearly', 'monthly'] as const).map((id) => (
              <RadioCard key={id} name="plan" checked={plan === id} onChange={() => setParams({ tarif: id }, { replace: true })}>
                <span className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-medium">{PLANS[id].name}</span>
                    <span className="block text-sm text-ink-soft">
                      {id === 'yearly' ? `Entspricht ${formatPrice(Math.round(PLANS.yearly.priceCents / 12))} im Monat` : 'Monatlich kündbar'}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-xl">{formatPrice(PLANS[id].priceCents)}</span>
                    {id === 'yearly' && <Badge tone="accent">{yearlySavingsPercent()} % günstiger</Badge>}
                  </span>
                </span>
              </RadioCard>
            ))}
          </fieldset>

          <div>
            <p className="mb-2 font-semibold">2. Deine Bestellung</p>
            <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 rounded-control bg-sunken px-4 py-3">
              <dt>{PRODUCT_NAME}, {selected.name.toLowerCase()}</dt>
              <dd className="text-right font-semibold">{formatPrice(selected.priceCents)} / {period}</dd>
              <dt className="col-span-2 text-sm text-ink-soft">
                {TAX_NOTE} Verlängert sich automatisch um jeweils ein {period}, bis du kündigst. Kündbar jederzeit zum Ende des bezahlten Zeitraums.
              </dt>
            </dl>
          </div>

          <fieldset className="space-y-4">
            <legend className="mb-3 font-semibold">3. Sofort loslegen</legend>
            <Checkbox checked={immediate} onChange={(e) => setImmediate(e.target.checked)}>{CHECKOUT_CONSENTS.immediateStart}</Checkbox>
            <Checkbox checked={withdrawal} onChange={(e) => setWithdrawal(e.target.checked)}>{CHECKOUT_CONSENTS.withdrawalExpires}</Checkbox>
            <p className="text-sm text-ink-soft">
              Es gelten die <Link to="/agb" className="underline">AGB</Link> und die <Link to="/widerruf" className="underline">Widerrufsbelehrung</Link>.
              Informationen zur Datenverarbeitung stehen in der <Link to="/datenschutz" className="underline">Datenschutzerklärung</Link>.
            </p>
          </fieldset>

          {error && <Notice tone="error">{error}</Notice>}

          {status === 'laden' ? (
            <p className="text-ink-soft">Einen Moment …</p>
          ) : signedIn ? (
            <div>
              <Button type="submit" variant="primary" size="lg" block loading={busy} disabled={!immediate || !withdrawal}>
                Weiter zur Zahlung · {formatPrice(selected.priceCents)}
              </Button>
              <p className="mt-3 text-center text-sm text-ink-soft">
                Angemeldet als {me?.user?.email}. Bezahlt wird sicher über Stripe; dort schließt du die Bestellung ab.
              </p>
            </div>
          ) : (
            <div>
              <Button to={`/anmelden?weiter=${encodeURIComponent(`/app/upgrade?tarif=${plan}`)}`} variant="primary" size="lg" block>
                Anmelden und fortfahren
              </Button>
              <p className="mt-3 text-center text-sm text-ink-soft">Für Pro brauchst du ein Konto – nur deine E-Mail-Adresse, kein Passwort.</p>
            </div>
          )}
        </Card>
      </form>
    </>
  )
}
