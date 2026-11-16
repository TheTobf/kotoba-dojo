/** Preisseite: Gratis und Pro nebeneinander, Endpreise gut sichtbar. */
import { useSearchParams } from 'react-router-dom'
import { formatPrice, PLANS, TAX_NOTE, yearlySavingsPercent } from '../../../shared/plans'
import { useAccount } from '../../lib/account'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Icon } from '../../ui/Icon'
import { Notice } from '../../ui/Notice'
import { PRO_BENEFITS } from '../../ui/UpgradeHint'

const FAQ = [
  { q: 'Kann ich jederzeit kündigen?', a: 'Ja. Du kündigst mit zwei Klicks über „Verträge hier kündigen“ unten auf jeder Seite oder in deinem Profil. Pro läuft dann bis zum Ende des bezahlten Zeitraums weiter.' },
  { q: 'Was passiert mit meinem Lernfortschritt, wenn Pro endet?', a: 'Nichts. Dein Fortschritt liegt auf deinem Gerät und bleibt erhalten, auch deine Fehler-Karteikarten. Es sind nur die Pro-Bereiche wieder gesperrt.' },
  { q: 'Brauche ich für Gratis ein Konto?', a: 'Nein. Ein Konto (nur deine E-Mail-Adresse) brauchst du erst für Pro.' },
  { q: 'Sind die Gesprächspartner echte Menschen?', a: 'Nein. Die Figuren im Sprechmodus sind KI-Figuren und überall deutlich als KI gekennzeichnet.' },
]

export function Component() {
  const [params] = useSearchParams()
  const { pro } = useAccount()
  const monthlyOfYearly = formatPrice(Math.round(PLANS.yearly.priceCents / 12))

  return (
    <div className="mx-auto max-w-site px-5 py-8 sm:px-8 md:py-16">
      <div className="max-w-2xl">
        <p lang="ja" className="mb-3 text-sm tracking-[0.35em] text-accent">料金</p>
        <h1 className="text-3xl sm:text-4xl">Einfache Preise</h1>
        <p className="mt-3 text-lg text-ink-soft">Lernen ist gratis. Pro schaltet Missionen und Gespräche frei.</p>
      </div>

      {params.get('kauf') === 'abgebrochen' && (
        <Notice className="mt-8 max-w-2xl" title="Kauf abgebrochen">Es wurde nichts berechnet. Du kannst es jederzeit noch einmal versuchen.</Notice>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col sm:p-8">
          <h2 className="text-xl">Gratis</h2>
          <p className="mt-4"><span className="font-display text-4xl">0 €</span></p>
          <p className="mt-1 text-sm text-ink-soft">Für immer, ohne Konto.</p>
          <ul className="mt-6 flex-1 space-y-3 text-sm">
            {['Sätze und Vokabeln mit Wiederholungs-System', 'Lektionen zu allen Story-Folgen', 'Kana, Romaji und Vorlesen', '2 Probe-Missionen'].map((f) => (
              <li key={f} className="flex gap-3"><span className="shrink-0 text-ok"><Icon name="check" size={18} /></span>{f}</li>
            ))}
          </ul>
          <Button to="/app" className="mt-8" block>App öffnen</Button>
        </Card>

        {([PLANS.monthly, PLANS.yearly] as const).map((plan) => {
          const yearly = plan.id === 'yearly'
          return (
            <Card key={plan.id} className={`flex flex-col sm:p-8 ${yearly ? 'border-accent shadow-card' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl">Pro {plan.name.toLowerCase()}</h2>
                {yearly && <Badge tone="accent">{yearlySavingsPercent()} % günstiger</Badge>}
              </div>
              <p className="mt-4">
                <span className="font-display text-4xl">{formatPrice(plan.priceCents)}</span>
                <span className="text-ink-soft"> / {yearly ? 'Jahr' : 'Monat'}</span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {yearly ? `Entspricht ${monthlyOfYearly} im Monat. ` : ''}{TAX_NOTE}
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                <li className="flex gap-3"><span className="shrink-0 text-accent"><Icon name="check" size={18} /></span>Alles aus Gratis</li>
                {PRO_BENEFITS.map((b) => (
                  <li key={b} className="flex gap-3"><span className="shrink-0 text-accent"><Icon name="check" size={18} /></span>{b}</li>
                ))}
              </ul>
              {pro ? (
                <Button to="/app/profil" className="mt-8" block>Du hast Pro – zum Profil</Button>
              ) : (
                <Button to={`/app/upgrade?tarif=${plan.id}`} variant={yearly ? 'primary' : 'secondary'} className="mt-8" block>
                  Pro {plan.name.toLowerCase()} wählen
                </Button>
              )}
              <p className="mt-3 text-center text-xs text-ink-soft">
                Verlängert sich automatisch {yearly ? 'jährlich' : 'monatlich'}, jederzeit zum Ende des Zeitraums kündbar.
              </p>
            </Card>
          )
        })}
      </div>

      <section className="mt-20 max-w-2xl">
        <h2 className="text-2xl">Häufige Fragen</h2>
        <dl className="mt-6 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-1.5 text-ink-soft">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
