/** Landingpage: erklärt in einem Bildschirm, was Kotoba Dojo ist, und sammelt Anmeldungen für die Warteliste. */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, PLANS, TAX_NOTE } from '../../../shared/plans'
import { api, errorMessage } from '../../lib/api'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Checkbox, TextField } from '../../ui/Field'
import { Icon } from '../../ui/Icon'
import { Notice } from '../../ui/Notice'
import { PRO_BENEFITS } from '../../ui/UpgradeHint'

const STEPS = [
  { ja: '見る', title: 'Folge ansehen', text: 'Jede Story-Folge auf TikTok dauert eine Minute und endet mit einem Satz, den du wirklich brauchen kannst.' },
  { ja: '学ぶ', title: 'Sätze lernen', text: 'Die Lektion zur Folge bringt dir genau diese Sätze bei – mit Kana, Romaji, Vorlesen und kurzer Erklärung auf Deutsch.' },
  { ja: '話す', title: 'Selbst sprechen', text: 'In Missionen kommst du nur mit dem richtigen japanischen Satz weiter. So wird aus Wissen Können.' },
]

const FREE_FEATURES = [
  'Sätze und Vokabeln mit Wiederholen in klugen Abständen',
  'Lektionen zu allen Story-Folgen',
  'Kana, Romaji und Vorlesen',
  '2 Probe-Missionen im Sprechmodus',
  'Ohne Konto, Fortschritt bleibt auf deinem Gerät',
]

function Waitlist() {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'done'; error?: string; devUrl?: string }>({ status: 'idle' })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setState({ status: 'sending' })
    try {
      const result = await api.joinWaitlist(email)
      setState({ status: 'done', devUrl: result.devConfirmUrl })
    } catch (error) {
      setState({ status: 'idle', error: errorMessage(error) })
    }
  }

  if (state.status === 'done') {
    return (
      <Notice tone="ok" title="Fast geschafft – bitte bestätige deine E-Mail-Adresse">
        Wir haben dir einen Link geschickt. Erst nach dem Klick darauf stehst du auf der Warteliste.
        {state.devUrl && (
          <p className="mt-2">
            <strong>Entwicklungsmodus:</strong> Es wird keine echte E-Mail verschickt.{' '}
            <a className="underline" href={state.devUrl}>Hier direkt bestätigen</a>
          </p>
        )}
      </Notice>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <TextField
          className="flex-1" label="E-Mail-Adresse" type="email" name="email" autoComplete="email" inputMode="email"
          placeholder="du@beispiel.de" required value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" variant="primary" loading={state.status === 'sending'} disabled={!consent || !email}>
          Auf die Warteliste
        </Button>
      </div>
      <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} required>
        Ja, schickt mir zum Start von Kotoba Dojo eine E-Mail. Das kann ich jederzeit widerrufen. Mehr dazu in der{' '}
        <Link to="/datenschutz" className="underline">Datenschutzerklärung</Link>.
      </Checkbox>
      {state.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  )
}

export default function Landing() {
  return (
    <>
      {/* Einstieg */}
      <section className="mx-auto grid max-w-site items-center gap-12 px-5 pt-10 pb-16 sm:px-8 md:grid-cols-[1.15fr_0.85fr] md:pt-20 md:pb-28">
        <div className="rise">
          <p lang="ja" className="mb-4 text-sm tracking-[0.35em] text-accent">言葉道場</p>
          <h1 className="text-4xl leading-tight sm:text-5xl md:text-6xl">Japanisch lernen, Satz für Satz.</h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            Kotoba Dojo ist die Lern-App zur Story: Du lernst die Sätze aus jeder Folge, wiederholst sie im richtigen
            Moment und probierst sie in kleinen Missionen selbst aus.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/app" variant="primary" size="lg">Kostenlos loslegen <Icon name="arrowRight" /></Button>
            <Button href="#warteliste" size="lg">Auf die Warteliste</Button>
          </div>
          <p className="mt-4 text-sm text-ink-soft">Ohne Konto, ohne Tracking, ohne Cookie-Banner.</p>
        </div>

        {/* Beispielkarte – zeigt, wie eine Karteikarte in der App aussieht */}
        <div className="rise mx-auto w-full max-w-sm [animation-delay:120ms]" aria-hidden="true">
          <div className="rotate-2 rounded-card border border-line bg-surface p-8 shadow-raised">
            <p className="text-xs tracking-widest text-ink-soft uppercase">Folge 2</p>
            <p lang="ja" className="mt-8 font-display text-3xl leading-snug">コーヒーを一つください。</p>
            <p lang="ja" className="mt-2 text-ink-soft">コーヒーをひとつください。</p>
            <p className="text-sm text-ink-soft italic">Kōhī o hitotsu kudasai.</p>
            <div className="my-6 border-t border-line" />
            <p className="text-lg">Einen Kaffee, bitte.</p>
            <p className="mt-2 text-sm text-ink-soft">Muster zum Bestellen: ○○をください。</p>
          </div>
        </div>
      </section>

      {/* So funktioniert es */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-site px-5 py-16 sm:px-8 md:py-24">
          <h2 className="text-2xl sm:text-3xl">So funktioniert es</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <p lang="ja" aria-hidden="true" className="font-display text-4xl text-accent">{step.ja}</p>
                <h3 className="mt-4 font-sans text-lg font-semibold">{index + 1}. {step.title}</h3>
                <p className="mt-2 text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Gratis und Pro */}
      <section className="mx-auto max-w-site px-5 py-16 sm:px-8 md:py-24">
        <h2 className="text-2xl sm:text-3xl">Gratis lernen. Mit Pro sprechen.</h2>
        <p className="mt-3 max-w-2xl text-ink-soft">Alles zum Lernen der Sätze ist kostenlos und bleibt es. Pro ist für alle, die das Gelernte anwenden wollen.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card className="sm:p-8">
            <h3 className="text-xl">Gratis</h3>
            <p className="mt-1 text-ink-soft">0 € – für immer</p>
            <ul className="mt-6 space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex gap-3"><span className="mt-0.5 shrink-0 text-ok"><Icon name="check" /></span>{feature}</li>
              ))}
            </ul>
            <Button to="/app" className="mt-8" block>App öffnen</Button>
          </Card>
          <Card className="border-accent sm:p-8">
            <h3 className="text-xl">Pro</h3>
            <p className="mt-1 text-ink-soft">
              {formatPrice(PLANS.monthly.priceCents)} im Monat oder {formatPrice(PLANS.yearly.priceCents)} im Jahr
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex gap-3"><span className="mt-0.5 shrink-0 text-accent"><Icon name="check" /></span>Alles aus Gratis</li>
              {PRO_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex gap-3"><span className="mt-0.5 shrink-0 text-accent"><Icon name="check" /></span>{benefit}</li>
              ))}
            </ul>
            <Button to="/preise" variant="primary" className="mt-8" block>Preise ansehen</Button>
            <p className="mt-3 text-center text-sm text-ink-soft">{TAX_NOTE}</p>
          </Card>
        </div>
      </section>

      {/* Warteliste */}
      <section id="warteliste" className="mx-auto max-w-site scroll-mt-8 px-5 sm:px-8">
        <Card className="mx-auto max-w-2xl sm:p-10">
          <h2 className="text-2xl">Sag mir Bescheid, wenn es losgeht</h2>
          <p className="mt-2 mb-6 text-ink-soft">Kotoba Dojo ist noch im Aufbau. Trag dich ein und du bekommst eine einzige E-Mail zum Start – sonst nichts.</p>
          <Waitlist />
        </Card>
      </section>
    </>
  )
}
