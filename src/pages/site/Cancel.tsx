/**
 * Kündigungsseite nach § 312k BGB. Erreichbar über „Verträge hier kündigen“ – ohne Anmeldung.
 * Gesetzlich vorgegeben: Angaben zu Art der Kündigung, Identifizierung, Vertrag, Zeitpunkt und Kontakt für die
 * Bestätigung; danach eine Bestätigungsseite mit Datum und Uhrzeit, die man speichern kann.
 */
import { useState, type FormEvent } from 'react'
import type { CancelResponse } from '../../../shared/api'
import { api, errorMessage } from '../../lib/api'
import { useAccount } from '../../lib/account'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { RadioCard, TextArea, TextField } from '../../ui/Field'
import { Notice } from '../../ui/Notice'

function Confirmation({ result, email }: { result: CancelResponse; email: string }) {
  const when = new Date(result.receivedAt * 1000)
  return (
    <Card className="sm:p-8">
      <Notice tone="ok" title="Deine Kündigung ist eingegangen" />
      <h1 className="mt-6 text-2xl">Kündigungsbestätigung</h1>
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
        <dt className="text-ink-soft">Vertrag</dt><dd>Kotoba Dojo Pro (Abonnement)</dd>
        <dt className="text-ink-soft">Art</dt><dd>{result.kind === 'ordentlich' ? 'Ordentliche Kündigung' : 'Außerordentliche Kündigung'}</dd>
        <dt className="text-ink-soft">Zeitpunkt</dt>
        <dd>{result.kind === 'ordentlich' ? 'Zum Ende des laufenden Abrechnungszeitraums' : 'Zum frühestmöglichen Zeitpunkt (wird geprüft)'}</dd>
        <dt className="text-ink-soft">E-Mail</dt><dd className="break-all">{email}</dd>
        <dt className="text-ink-soft">Eingegangen am</dt>
        <dd>{when.toLocaleDateString('de-DE', { dateStyle: 'long' })} um {when.toLocaleTimeString('de-DE', { timeStyle: 'short' })} Uhr</dd>
        <dt className="text-ink-soft">Vorgangsnummer</dt><dd className="font-mono">{result.reference}</dd>
      </dl>
      <p className="mt-6 text-sm text-ink-soft">
        Diese Bestätigung schicken wir dir zusätzlich per E-Mail. Bis zum Ende des bezahlten Zeitraums kannst du Pro weiter nutzen.
      </p>
      <div className="no-print mt-6 flex flex-col gap-3 sm:flex-row">
        <Button variant="primary" onClick={() => window.print()}>Bestätigung drucken oder speichern</Button>
        <Button to="/app">Zurück zur App</Button>
      </div>
    </Card>
  )
}

export function Component() {
  const { me } = useAccount()
  const [email, setEmail] = useState('')
  const [kind, setKind] = useState<'ordentlich' | 'ausserordentlich'>('ordentlich')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<CancelResponse>()
  const address = email || me?.user?.email || ''

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      setResult(await api.cancel({ email: address, kind, reason: reason || undefined }))
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-8 sm:py-14">
      {result ? (
        <Confirmation result={result} email={address} />
      ) : (
        <Card className="sm:p-8">
          <h1 className="text-2xl sm:text-3xl">Vertrag kündigen</h1>
          <p className="mt-2 text-ink-soft">Hier kündigst du dein Abo von Kotoba Dojo Pro. Eine Anmeldung ist dafür nicht nötig.</p>

          <form onSubmit={submit} className="mt-8 space-y-7" noValidate>
            <div>
              <p className="mb-1.5 text-sm font-medium">Vertrag</p>
              <p className="rounded-control border border-line bg-sunken px-4 py-3">Kotoba Dojo Pro (Abonnement)</p>
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-sm font-medium">Art der Kündigung</legend>
              <RadioCard name="kind" checked={kind === 'ordentlich'} onChange={() => setKind('ordentlich')}>
                <span className="block font-medium">Ordentliche Kündigung</span>
                <span className="block text-sm text-ink-soft">Zum nächstmöglichen Zeitpunkt: Ende des laufenden Abrechnungszeitraums.</span>
              </RadioCard>
              <RadioCard name="kind" checked={kind === 'ausserordentlich'} onChange={() => setKind('ausserordentlich')}>
                <span className="block font-medium">Außerordentliche Kündigung</span>
                <span className="block text-sm text-ink-soft">Aus wichtigem Grund, vor Ende des Zeitraums.</span>
              </RadioCard>
            </fieldset>

            {kind === 'ausserordentlich' && (
              <TextArea label="Kündigungsgrund" required maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
            )}

            <TextField
              label="E-Mail-Adresse deines Kontos" type="email" name="email" autoComplete="email" inputMode="email" required
              hint="Damit ordnen wir die Kündigung zu. An diese Adresse geht auch die Bestätigung."
              value={address} onChange={(e) => setEmail(e.target.value)}
            />

            {error && <Notice tone="error">{error}</Notice>}
            <Button type="submit" variant="primary" block loading={busy} disabled={!address || (kind === 'ausserordentlich' && !reason.trim())}>
              Jetzt kündigen
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
