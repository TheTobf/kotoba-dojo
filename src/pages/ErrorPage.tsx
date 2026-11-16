/** Letzte Auffanglinie: Wenn eine Seite abstürzt, sieht man das hier statt eines leeren Bildschirms. */
import { Button } from '../ui/Button'
import { Seal } from '../ui/Logo'

export default function ErrorPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <Seal size={56} />
      <h1 className="mt-6 text-2xl">Da ist etwas schiefgelaufen</h1>
      <p className="mt-2 text-ink-soft">Dein Lernfortschritt ist sicher gespeichert. Lade die Seite neu – meist ist es damit erledigt.</p>
      <div className="mt-6 flex gap-3">
        <Button variant="primary" onClick={() => window.location.reload()}>Neu laden</Button>
        <Button href="/">Zur Startseite</Button>
      </div>
    </div>
  )
}
