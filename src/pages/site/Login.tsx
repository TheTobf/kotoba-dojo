/** Anmeldung ohne Passwort: E-Mail eingeben, Code aus der E-Mail eintippen. */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { useAccount } from '../../lib/account'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { TextField } from '../../ui/Field'
import { Notice } from '../../ui/Notice'

/** Nur Ziele innerhalb der eigenen App zulassen (kein Weiterleiten auf fremde Seiten). */
function safeTarget(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/app/profil'
}

export function Component() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { refresh, me } = useAccount()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const target = safeTarget(params.get('weiter'))

  async function requestCode(event?: FormEvent) {
    event?.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      const result = await api.startLogin(email)
      setDevCode(result.devCode)
      setCode('')
      setStep('code')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      await api.verifyLogin(email, code)
      await refresh()
      navigate(target, { replace: true })
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  if (me?.user) {
    return (
      <div className="mx-auto max-w-md px-5 py-12">
        <Card>
          <h1 className="text-2xl">Du bist angemeldet</h1>
          <p className="mt-2 text-ink-soft">Angemeldet als {me.user.email}.</p>
          <Button to={target} variant="primary" className="mt-6" block>Weiter</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-5 py-8 sm:py-16">
      <Card className="sm:p-8">
        <h1 className="text-2xl">Anmelden</h1>
        {step === 'email' ? (
          <form onSubmit={requestCode} className="mt-2 space-y-5" noValidate>
            <p className="text-ink-soft">Ohne Passwort: Wir schicken dir einen Code per E-Mail. Hast du noch kein Konto, wird es dabei angelegt.</p>
            <TextField
              label="E-Mail-Adresse" type="email" name="email" autoComplete="email" inputMode="email" autoFocus required
              placeholder="du@beispiel.de" value={email} onChange={(e) => setEmail(e.target.value)}
            />
            {error && <Notice tone="error">{error}</Notice>}
            <Button type="submit" variant="primary" block loading={busy} disabled={!email}>Code schicken</Button>
            <p className="text-sm text-ink-soft">
              Zum Lernen brauchst du kein Konto – nur für Pro. Es gilt die <Link to="/datenschutz" className="underline">Datenschutzerklärung</Link>.
            </p>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-2 space-y-5" noValidate>
            <p className="text-ink-soft">Wir haben einen sechsstelligen Code an <strong className="text-ink">{email}</strong> geschickt. Er gilt 10 Minuten.</p>
            {devCode && (
              <Notice tone="warn" title="Entwicklungsmodus">
                Es wird keine echte E-Mail verschickt. Dein Code lautet <strong className="font-mono text-base tracking-widest">{devCode}</strong>
              </Notice>
            )}
            <TextField
              label="Code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} autoFocus required
              className="[&_input]:text-center [&_input]:font-mono [&_input]:text-2xl [&_input]:tracking-[0.4em]"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            {error && <Notice tone="error">{error}</Notice>}
            <Button type="submit" variant="primary" block loading={busy} disabled={code.length !== 6}>Anmelden</Button>
            <div className="flex justify-between text-sm">
              <button type="button" className="text-ink-soft underline hover:text-ink" onClick={() => { setStep('email'); setError(undefined) }}>Andere Adresse</button>
              <button type="button" className="text-ink-soft underline hover:text-ink" onClick={() => void requestCode()}>Neuen Code schicken</button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
