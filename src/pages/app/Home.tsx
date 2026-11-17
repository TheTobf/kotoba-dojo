/** Start: Was steht heute an? Ein Blick, ein Knopf. */
import { EPISODES } from '../../content/story'
import { TRIAL_MISSIONS } from '../../content/trialMissions'
import { useAccount } from '../../lib/account'
import { useCards, useCompletedMissions, useReviewedToday } from '../../lib/hooks'
import { useSettings } from '../../lib/settings'
import { episodeProgress, overview, startOfDay } from '../../lib/srs'
import { ProgressStrip } from '../../features/ProgressSummary'
import { PageHeader } from '../../layouts/AppLayout'
import { Button } from '../../ui/Button'
import { Card, LinkCard, SectionTitle } from '../../ui/Card'
import { Icon } from '../../ui/Icon'
import { ProgressBar } from '../../ui/ProgressBar'
import { UpgradeHint } from '../../ui/UpgradeHint'

function greeting(): { ja: string; de: string } {
  const hour = new Date().getHours()
  if (hour < 11) return { ja: 'おはよう', de: 'Guten Morgen' }
  if (hour < 18) return { ja: 'こんにちは', de: 'Hallo' }
  return { ja: 'こんばんは', de: 'Guten Abend' }
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  )
}

export function Component() {
  const { pro, status } = useAccount()
  const { newPerDay } = useSettings()
  const cards = useCards() ?? []
  const reviewedToday = useReviewedToday() ?? 0
  const completed = useCompletedMissions() ?? []
  const stats = overview(cards, reviewedToday)
  const hello = greeting()

  const newWordsToday = cards.filter((c) => c.kind === 'wort' && c.introducedAt >= startOfDay()).length
  const newLeft = Math.max(0, newPerDay - newWordsToday)
  const nextEpisode = EPISODES.find((e) => episodeProgress(e, cards) < 1) ?? EPISODES.at(-1)!
  const nextTrial = TRIAL_MISSIONS.find((m) => !completed.some((c) => c.missionId === m.id))

  return (
    <>
      <PageHeader ja={hello.ja} title={`${hello.de}!`} lead={stats.dueNow > 0 ? 'Ein paar Karten warten auf dich.' : 'Bereit für ein paar neue Sätze?'} />

      <ProgressStrip />

      <Card className="mt-3 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-10">
            <Stat value={stats.dueNow} label="fällig" />
            <Stat value={newLeft} label="neue Wörter" />
            <Stat value={stats.reviewedToday} label="heute gelernt" />
          </div>
          <Button to="/app/lernen/sitzung" variant="primary" size="lg" className="sm:shrink-0">
            {stats.dueNow > 0 ? 'Wiederholen' : 'Lernen'} <Icon name="arrowRight" />
          </Button>
        </div>
      </Card>

      <div className="mt-10">
        <SectionTitle ja="物語">Weiter in der Story</SectionTitle>
        <LinkCard to={`/app/story/folge/${nextEpisode.id}`}>
          <p className="text-xs tracking-widest text-ink-soft uppercase">Folge {nextEpisode.number}</p>
          <p className="mt-1 font-display text-xl">{nextEpisode.title}</p>
          <p className="mt-1 text-sm text-ink-soft">{nextEpisode.summary}</p>
          <ProgressBar className="mt-4" value={episodeProgress(nextEpisode, cards)} label={`Fortschritt Folge ${nextEpisode.number}`} />
        </LinkCard>
      </div>

      <div className="mt-10">
        <SectionTitle ja="話す">Sprechen üben</SectionTitle>
        {nextTrial ? (
          <LinkCard to={`/app/sprechen/probe/${nextTrial.id}`}>
            <p className="text-xs tracking-widest text-ink-soft uppercase">Probe-Mission · gratis</p>
            <p className="mt-1 font-display text-xl">{nextTrial.title}</p>
            <p className="mt-1 text-sm text-ink-soft">{nextTrial.summary}</p>
          </LinkCard>
        ) : (
          <LinkCard to="/app/sprechen">
            <p className="font-display text-xl">{pro ? 'Zu deinen Gesprächen' : 'Beide Probe-Missionen geschafft'}</p>
            <p className="mt-1 text-sm text-ink-soft">{pro ? 'Sprich mit Haru oder Sora.' : 'Mit Pro geht es mit Story-Missionen und KI-Gesprächen weiter.'}</p>
          </LinkCard>
        )}
      </div>

      {!pro && status !== 'laden' && (
        <div className="mt-10">
          <UpgradeHint />
        </div>
      )}
    </>
  )
}
