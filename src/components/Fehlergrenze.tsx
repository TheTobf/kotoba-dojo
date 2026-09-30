import { Component, type ReactNode } from 'react'

/** Fängt Abstürze einer Seite ab: Meldung statt schwarzem Bildschirm, Navigation bleibt bedienbar. */
export default class Fehlergrenze extends Component<{ children: ReactNode; seite: string }, { fehler?: Error }> {
  state: { fehler?: Error } = {}

  static getDerivedStateFromError(fehler: Error) { return { fehler } }

  componentDidUpdate(vorher: { seite: string }) {
    // Beim Seitenwechsel neu versuchen
    if (vorher.seite !== this.props.seite && this.state.fehler) this.setState({ fehler: undefined })
  }

  render() {
    const f = this.state.fehler
    if (!f) return this.props.children
    return (
      <div className="card space-y-3 p-5 text-center">
        <div className="text-4xl">😿</div>
        <div className="font-bold">Hier ist etwas schiefgelaufen.</div>
        <p className="text-sm opacity-70">Dein Fortschritt ist gespeichert. Schick Claude gern einen Screenshot dieser Meldung.</p>
        <pre className="whitespace-pre-wrap rounded-lg bg-black/5 p-2 text-left text-xs opacity-70 dark:bg-white/5">{f.message}{'\n'}{f.stack?.split('\n').slice(0, 4).join('\n')}</pre>
        <button onClick={() => this.setState({ fehler: undefined })} className="btn-primary w-full">Zurück</button>
      </div>
    )
  }
}
