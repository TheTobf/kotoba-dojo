/** Sprechen: zwei Gratis-Probe-Missionen und die Gespräche mit KI-Figuren (Pro). */
import { FREE_TRIAL_MISSIONS } from '../../../shared/plans'
import { CHARACTERS } from '../../../shared/characters'
import { TRIAL_MISSIONS } from '../../content/trialMissions'
import { useAccount } from '../../lib/account'
import { useCompletedMissions } from '../../lib/hooks'
import { PageHeader } from '../../layouts/AppLayout'
import { AiBadge, Badge } from '../../ui/Badge'
import { LinkCard, SectionTitle } from '../../ui/Card'
import { Icon } from '../../ui/Icon'
import { UpgradeHint } from '../../ui/UpgradeHint'

export function Component() {
  const { pro, me } = useAccount()
  const completed = useCompletedMissions() ?? []

  return (
    <>
      <PageHeader ja="話す" title="Sprechen" lead="Erst antworten, dann nachschlagen: So bleibt Japanisch hängen." />

      <SectionTitle action={<Badge>gratis</Badge>}>Probe-Missionen</SectionTitle>
      <div className="space-y-3">
        {TRIAL_MISSIONS.slice(0, FREE_TRIAL_MISSIONS).map((mission) => {
          const done = completed.some((c) => c.missionId === mission.id)
          return (
            <LinkCard key={mission.id} to={`/app/sprechen/probe/${mission.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs tracking-widest text-ink-soft uppercase">{mission.place}</p>
                  <p className="font-display text-xl">{mission.title}</p>
                </div>
                {done && <Badge tone="ok"><Icon name="check" size={14} /> geschafft</Badge>}
              </div>
              <p className="mt-2 text-sm text-ink-soft">{mission.summary}</p>
            </LinkCard>
          )
        })}
      </div>

      <div className="mt-12">
        <SectionTitle ja="会話" action={<Badge tone="accent">Pro</Badge>}>Gespräche</SectionTitle>
        <p className="mb-4 text-ink-soft">
          Freie Gespräche mit erfundenen Figuren. Alle Figuren sind <strong className="text-ink">KI</strong>, keine echten Menschen. Sie korrigieren dich
          auf Deutsch und helfen, wenn du nicht weiterweißt.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CHARACTERS.map((character) => (
            <LinkCard key={character.id} to={`/app/sprechen/figur/${character.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span lang="ja" aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-accent">{character.nameJa}</span>
                  <div>
                    <p className="flex items-center gap-2 font-display text-xl">{character.name} <AiBadge /></p>
                    <p className="text-sm text-ink-soft">{character.role}</p>
                  </div>
                </div>
                {!pro && <span className="text-ink-soft" aria-label="Gesperrt – nur mit Pro"><Icon name="lock" /></span>}
              </div>
              <p className="mt-3 text-sm text-ink-soft">{character.about}</p>
            </LinkCard>
          ))}
        </div>
        {pro && me?.ai && (
          <p className="mt-4 text-sm text-ink-soft">Heute {me.ai.usedToday} von {me.ai.dailyLimit} Nachrichten verbraucht.</p>
        )}
        {!pro && <div className="mt-4"><UpgradeHint title="Gespräche gehören zu Pro" /></div>}
      </div>
    </>
  )
}
