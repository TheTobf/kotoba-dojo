/** Eine der beiden Gratis-Probe-Missionen (läuft komplett auf dem Gerät). */
import { useParams } from 'react-router-dom'
import { AccountNudge } from '../../features/AccountNudge'
import { MissionPlayer } from '../../features/mission/MissionPlayer'
import { findTrialMission, TRIAL_MISSIONS } from '../../content/trialMissions'
import { useAccount } from '../../lib/account'
import { completeMission } from '../../lib/progress'
import { PageHeader } from '../../layouts/AppLayout'
import { Button } from '../../ui/Button'
import { Notice } from '../../ui/Notice'

export function Component() {
  const { missionId = '' } = useParams()
  const { pro } = useAccount()
  const mission = findTrialMission(missionId)
  const back = { to: '/app/sprechen', label: 'Sprechen' }
  if (!mission) return <><PageHeader title="Mission nicht gefunden" back={back} /><Notice>Diese Probe-Mission gibt es nicht.</Notice></>

  const other = TRIAL_MISSIONS.find((m) => m.id !== mission.id)
  return (
    <>
      <PageHeader title={mission.title} lead={`${mission.place} – ${mission.summary}`} back={back} />
      <MissionPlayer
        key={mission.id} mission={mission}
        onComplete={() => void completeMission(mission.id)}
        afterComplete={
          <div className="space-y-4">
          <div className="text-left empty:hidden"><AccountNudge /></div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {other && <Button to={`/app/sprechen/probe/${other.id}`} variant={pro ? 'primary' : 'secondary'}>Nächste Probe-Mission</Button>}
            {!pro && <Button to="/app/upgrade" variant="primary">Mehr Missionen mit Pro</Button>}
            {pro && <Button to="/app/story">Zu den Story-Missionen</Button>}
          </div>
          </div>
        }
      />
    </>
  )
}
