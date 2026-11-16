import { Button } from '../ui/Button'

export function Component() {
  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p lang="ja" className="font-display text-5xl text-accent">迷子</p>
      <h1 className="mt-6 text-2xl">Diese Seite gibt es nicht</h1>
      <p className="mt-2 text-ink-soft">„Maigo“ heißt „verlaufen“. Zurück geht es hier:</p>
      <Button to="/" variant="primary" className="mt-6">Zur Startseite</Button>
    </div>
  )
}
