/** Ziel des Bestätigungslinks der Warteliste (Double-Opt-in). */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Notice } from '../../ui/Notice'

export function Component() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<{ status: 'laden' | 'ok' | 'fehler'; message?: string }>({ status: 'laden' })

  useEffect(() => {
    let active = true
    api.confirmWaitlist(token).then(
      () => active && setState({ status: 'ok' }),
      (error) => active && setState({ status: 'fehler', message: errorMessage(error) }),
    )
    return () => { active = false }
  }, [token])

  return (
    <div className="mx-auto max-w-md px-5 py-12 sm:py-20">
      <Card className="sm:p-8">
        <h1 className="text-2xl">Warteliste</h1>
        <div className="mt-4">
          {state.status === 'laden' && <p className="text-ink-soft">Einen Moment …</p>}
          {state.status === 'ok' && <Notice tone="ok" title="Du stehst auf der Warteliste">Danke! Du bekommst eine E-Mail, sobald Kotoba Dojo startet.</Notice>}
          {state.status === 'fehler' && <Notice tone="error">{state.message}</Notice>}
        </div>
        <Button to="/app" variant="primary" className="mt-6" block>Schon mal kostenlos lernen</Button>
      </Card>
    </div>
  )
}
