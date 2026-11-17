/** Eine Pro-Story-Mission. Der Inhalt kommt vom Server – und nur, wenn dieser Pro bestätigt. */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Mission } from '../../../shared/mission'
import { MissionPlayer } from '../../features/mission/MissionPlayer'
import { ProGate } from '../../features/ProGate'
import { api, ApiError, errorMessage } from '../../lib/api'
import { useAccount } from '../../lib/account'
import { completeMission } from '../../lib/progress'
import { PageHeader } from '../../layouts/AppLayout'
import { Button } from '../../ui/Button'
import { Notice } from '../../ui/Notice'

function LoadedMission({ missionId }: { missionId: string }) {
  const { refresh } = useAccount()
  const [mission, setMission] = useState<Mission>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let active = true
    api.mission(missionId).then(
      (r) => active && setMission(r.mission),
      (e) => {
        if (!active) return
        // Der Server sagt „kein Pro (mehr)“: Konto-Stand neu laden, dann zeigt ProGate den Upgrade-Screen.
        if (e instanceof ApiError && (e.code === 'pro_noetig' || e.code === 'nicht_angemeldet')) void refresh()
        else setError(errorMessage(e))
      },
    )
    return () => { active = false }
  }, [missionId, refresh])

  if (error) return <Notice tone="error">{error}</Notice>
  if (!mission) return <p className="text-ink-soft">Mission wird geladen …</p>
  return (
    <>
      <PageHeader title={mission.title} lead={`${mission.place} – ${mission.summary}`} back={{ to: '/app/story', label: 'Story' }} />
      <MissionPlayer
        mission={mission}
        onComplete={() => void completeMission(mission.id)}
        afterComplete={<Button to="/app/story" variant="primary">Zurück zur Story</Button>}
      />
    </>
  )
}

export function Component() {
  const { missionId = '' } = useParams()
  return (
    <ProGate title="Diese Mission gehört zu Pro" lead="In Story-Missionen wendest du an, was du gelernt hast: Du kommst nur mit dem richtigen japanischen Satz weiter.">
      <LoadedMission missionId={missionId} />
    </ProGate>
  )
}
