/** Story: Folgen mit ihren Lektionen (gratis) und Missionen (Pro). */
import { useEffect, useState } from 'react'
import type { MissionTeaser } from '../../../shared/mission'
import { EPISODES } from '../../content/story'
import { api } from '../../lib/api'
import { useAccount } from '../../lib/account'
import { useCards, useCompletedMissions } from '../../lib/hooks'
import { episodeProgress } from '../../lib/srs'
import { PageHeader } from '../../layouts/AppLayout'
import { Badge } from '../../ui/Badge'
import { Card, LinkCard, SectionTitle } from '../../ui/Card'
import { Icon } from '../../ui/Icon'
import { ProgressBar } from '../../ui/ProgressBar'
import { UpgradeHint } from '../../ui/UpgradeHint'

export function Component() {
  const { pro } = useAccount()
  const cards = useCards() ?? []
  const completed = useCompletedMissions() ?? []
  const [missions, setMissions] = useState<MissionTeaser[] | 'fehler'>()

  useEffect(() => {
    let active = true
    api.missionTeasers().then((r) => active && setMissions(r.missions), () => active && setMissions('fehler'))
    return () => { active = false }
  }, [])

  return (
    <>
      <PageHeader ja="物語" title="Story" lead="Jede Folge hat eine kurze Lektion mit den Sätzen, die darin vorkommen." />

      <SectionTitle>Folgen</SectionTitle>
      <div className="space-y-3">
        {EPISODES.map((episode) => {
          const progress = episodeProgress(episode, cards)
          return (
            <LinkCard key={episode.id} to={`/app/story/folge/${episode.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs tracking-widest text-ink-soft uppercase">Folge {episode.number}</p>
                  <p className="font-display text-xl">{episode.title} <span lang="ja" className="ml-1 text-sm text-ink-soft">{episode.titleJa}</span></p>
                </div>
                {progress >= 1 && <Badge tone="ok"><Icon name="check" size={14} /> gelernt</Badge>}
              </div>
              <p className="mt-2 text-sm text-ink-soft">{episode.summary}</p>
              <ProgressBar className="mt-4" value={progress} label={`Fortschritt Folge ${episode.number}`} />
            </LinkCard>
          )
        })}
      </div>

      <div className="mt-12">
        <SectionTitle ja="任務" action={<Badge tone="accent">Pro</Badge>}>Missionen</SectionTitle>
        <p className="mb-4 text-ink-soft">Kleine Szenen aus der Story. Weiter geht es nur mit dem richtigen japanischen Satz.</p>
        {missions === undefined && <p className="text-ink-soft">Missionen werden geladen …</p>}
        {missions === 'fehler' && <Card><p className="text-ink-soft">Die Missionen brauchen eine Internetverbindung. Deine Lektionen funktionieren auch offline.</p></Card>}
        {Array.isArray(missions) && (
          <div className="space-y-3">
            {missions.map((mission) => {
              const done = completed.some((c) => c.missionId === mission.id)
              return (
                <LinkCard key={mission.id} to={`/app/story/mission/${mission.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs tracking-widest text-ink-soft uppercase">{mission.place}</p>
                      <p className="font-display text-xl">{mission.title}</p>
                    </div>
                    {done ? <Badge tone="ok"><Icon name="check" size={14} /> geschafft</Badge> : !pro ? <span className="text-ink-soft" aria-label="Gesperrt – nur mit Pro"><Icon name="lock" /></span> : null}
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{mission.summary}</p>
                  <p className="mt-3 text-sm text-ink-soft">{mission.steps} Schritte</p>
                </LinkCard>
              )
            })}
          </div>
        )}
        {!pro && Array.isArray(missions) && <div className="mt-4"><UpgradeHint title="Missionen gehören zu Pro" /></div>}
      </div>
    </>
  )
}
