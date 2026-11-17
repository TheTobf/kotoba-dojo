/** Nachsprechen: 8 Sätze anhören, nachsprechen, vergleichen. Aufnahmen bleiben nur im Arbeitsspeicher. */
import { useMemo, useState } from 'react'
import { ShadowSentence } from '../../features/ShadowSentence'
import type { Sentence } from '../../lib/data'
import { useCards, useLearnData } from '../../lib/hooks'
import { recordActivity } from '../../lib/progress'
import { SHADOW_XP, shadowSentences, type Verdict } from '../../lib/shadowing'
import { PageHeader } from '../../layouts/AppLayout'
import { Button, IconButton } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Icon } from '../../ui/Icon'
import { Notice } from '../../ui/Notice'
import { ProgressBar } from '../../ui/ProgressBar'

export function Component() {
  const { data, failed } = useLearnData()
  const cards = useCards()
  const [round, setRound] = useState<Sentence[]>()
  const [index, setIndex] = useState(0)
  const [good, setGood] = useState(0)
  const [result, setResult] = useState<{ good: number; total: number }>()
  const learned = useMemo(() => new Set((cards ?? []).filter((c) => c.kind === 'wort').map((c) => c.refId)), [cards])
  const header = <PageHeader ja="シャドーイング" title="Nachsprechen" lead="Hören, sofort nachsprechen, vergleichen – so wird die Aussprache natürlich." back={{ to: '/app/sprechen', label: 'Sprechen' }} />

  if (failed) return <>{header}<Notice tone="error">Die Lerndaten konnten nicht geladen werden.</Notice></>
  if (!data || !cards) return <>{header}<p className="text-ink-soft">Wird geladen …</p></>

  function finish(total: number, goodCount: number) {
    setRound(undefined)
    setResult({ good: goodCount, total })
  }

  if (round) {
    const sentence = round[index]
    const verdict = (v: Verdict) => {
      const goodNow = good + (v === 'passt' ? 1 : 0)
      void recordActivity(SHADOW_XP[v])
      setGood(goodNow)
      if (index + 1 >= round.length) finish(round.length, goodNow)
      else setIndex(index + 1)
    }
    return (
      <>
        <PageHeader title="Nachsprechen" />
        <div className="mb-5 flex items-center gap-3">
          <IconButton label="Runde beenden" onClick={() => finish(index, good)}><Icon name="close" /></IconButton>
          <ProgressBar className="flex-1" value={index / round.length} label="Fortschritt der Runde" />
          <span className="text-sm text-ink-soft tabular-nums">{index + 1} / {round.length}</span>
        </div>
        <Card><ShadowSentence key={sentence.id} sentence={sentence} onVerdict={verdict} /></Card>
      </>
    )
  }

  return (
    <>
      {header}
      {result && result.total > 0 && (
        <Notice tone="ok" className="mb-6" title={`${result.good} von ${result.total} Sätzen „passt“`}>Weiter so – jeden Tag ein paar Sätze reichen.</Notice>
      )}
      <Card className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Satz anhören.</li>
          <li>Sofort nachsprechen, mit derselben Melodie und demselben Tempo.</li>
          <li>Original und deine Aufnahme hintereinander hören, dann selbst einschätzen.</li>
        </ol>
        <p className="text-sm text-ink-soft">
          8 Sätze {learned.size ? 'aus deinen gelernten Wörtern' : 'mit den häufigsten Wörtern'}. Deine Aufnahmen bleiben nur auf diesem Gerät und
          verschwinden nach der Runde. Am besten mit Kopfhörern.
        </p>
        <Button variant="primary" size="lg" block onClick={() => { setResult(undefined); setGood(0); setIndex(0); setRound(shadowSentences(data, learned)) }}>
          Runde starten
        </Button>
      </Card>
    </>
  )
}
