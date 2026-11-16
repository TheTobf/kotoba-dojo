/** Lernen: Überblick über alles, was sich wiederholen lässt – Story-Lektionen, Grundwortschatz, Fehlerkarten. */
import { useEffect } from 'react'
import { EPISODES } from '../../content/story'
import { useAccount } from '../../lib/account'
import { useCards, useLearnData, useMissingJapaneseVoice, useMistakes, useReviewedToday } from '../../lib/hooks'
import { useSettings } from '../../lib/settings'
import { episodeProgress, overview, startOfDay, syncMistakes } from '../../lib/srs'
import { PageHeader } from '../../layouts/AppLayout'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card, LinkCard, SectionTitle } from '../../ui/Card'
import { Icon } from '../../ui/Icon'
import { Notice } from '../../ui/Notice'
import { ProgressBar } from '../../ui/ProgressBar'
import { UpgradeHint } from '../../ui/UpgradeHint'

export function Component() {
  const { pro, signedIn } = useAccount()
  const { newPerDay } = useSettings()
  const { data, failed } = useLearnData()
  const cards = useCards() ?? []
  const mistakes = useMistakes() ?? []
  const reviewedToday = useReviewedToday() ?? 0
  const missingVoice = useMissingJapaneseVoice()
  const stats = overview(cards, reviewedToday)

  // Neue Fehlerkarten vom Server abholen (nur mit Konto; scheitert offline still).
  useEffect(() => {
    if (signedIn) void syncMistakes().catch(() => undefined)
  }, [signedIn])

  const totalWords = data?.words.length ?? 0
  const newWordsToday = cards.filter((c) => c.kind === 'wort' && c.introducedAt >= startOfDay()).length
  const newLeft = Math.max(0, Math.min(newPerDay - newWordsToday, totalWords - stats.learnedWords))
  const learnedMistakes = cards.filter((c) => c.kind === 'fehler').length
  const dueMistakes = cards.filter((c) => c.kind === 'fehler' && c.due <= Date.now()).length + (mistakes.length - learnedMistakes)

  return (
    <>
      <PageHeader ja="学ぶ" title="Lernen" lead="Karten kommen genau dann wieder, wenn du sie fast vergessen hättest." />

      {failed && <Notice tone="error" className="mb-6">Die Lerndaten konnten nicht geladen werden. Bitte prüfe deine Verbindung und lade die Seite neu.</Notice>}
      {missingVoice && (
        <Notice tone="warn" className="mb-6" title="Keine japanische Stimme gefunden">
          Vorlesen nutzt die Sprachausgabe deines Geräts. Installiere in den Systemeinstellungen eine japanische Stimme, damit es richtig klingt.
        </Notice>
      )}

      <Card className="sm:p-8">
        <p className="text-xs tracking-widest text-ink-soft uppercase">Heute</p>
        <p className="mt-2 font-display text-2xl">
          {stats.dueNow} fällig <span className="text-ink-soft">·</span> {newLeft} neu
        </p>
        <p className="mt-1 text-sm text-ink-soft">{stats.reviewedToday > 0 ? `Heute schon ${stats.reviewedToday} Karten gelernt.` : 'Fünf Minuten reichen für den Anfang.'}</p>
        <Button to="/app/lernen/sitzung" variant="primary" className="mt-6" block>
          Lernen starten <Icon name="arrowRight" />
        </Button>
      </Card>

      <div className="mt-10">
        <SectionTitle ja="物語">Story-Lektionen</SectionTitle>
        <div className="space-y-3">
          {EPISODES.map((episode) => {
            const progress = episodeProgress(episode, cards)
            return (
              <LinkCard key={episode.id} to={`/app/story/folge/${episode.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs tracking-widest text-ink-soft uppercase">Folge {episode.number}</p>
                    <p className="font-display text-lg">{episode.title}</p>
                  </div>
                  {progress >= 1 ? <Badge tone="ok"><Icon name="check" size={14} /> gelernt</Badge> : <span className="text-sm text-ink-soft">{episode.sentences.length} Sätze</span>}
                </div>
                <ProgressBar className="mt-4" value={progress} label={`Fortschritt Folge ${episode.number}`} />
              </LinkCard>
            )
          })}
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle ja="単語">Grundwortschatz</SectionTitle>
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <p><span className="font-display text-2xl">{stats.learnedWords}</span> <span className="text-ink-soft">von {totalWords || '…'} Wörtern</span></p>
            <p className="text-sm text-ink-soft">{newPerDay} neue pro Tag</p>
          </div>
          <ProgressBar className="mt-4" value={totalWords ? stats.learnedWords / totalWords : 0} label="Fortschritt Grundwortschatz" />
          <p className="mt-4 text-sm text-ink-soft">Die häufigsten Wörter, jedes mit Beispielsatz. Sie sind in „Lernen starten“ enthalten.</p>
        </Card>
      </div>

      <div className="mt-10">
        <SectionTitle ja="間違い">Fehlerkarten</SectionTitle>
        {mistakes.length > 0 ? (
          <Card className="flex items-center justify-between gap-4">
            <div>
              <p><span className="font-display text-2xl">{mistakes.length}</span> <span className="text-ink-soft">Karten aus deinen Gesprächen</span></p>
              <p className="text-sm text-ink-soft">{dueMistakes > 0 ? `${dueMistakes} davon sind dran.` : 'Gerade ist keine fällig.'}</p>
            </div>
            <Button to="/app/lernen/sitzung?fehler=1" size="sm" className="shrink-0">Üben</Button>
          </Card>
        ) : pro ? (
          <Card><p className="text-ink-soft">Noch keine Fehlerkarten. Sie entstehen automatisch, wenn dich eine KI-Figur im Gespräch korrigiert.</p></Card>
        ) : (
          <UpgradeHint title="Aus Fehlern werden Karteikarten">In Pro-Gesprächen wirst du auf Deutsch korrigiert – jeder Fehler landet automatisch hier.</UpgradeHint>
        )}
      </div>
    </>
  )
}
