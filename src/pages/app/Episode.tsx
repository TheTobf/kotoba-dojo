/** Eine Story-Folge: Zusammenfassung, alle Sätze zum Nachlesen und der Einstieg in die Lektion. */
import { useParams } from 'react-router-dom'
import { findEpisode } from '../../content/story'
import { useCards } from '../../lib/hooks'
import { episodeProgress } from '../../lib/srs'
import { PageHeader } from '../../layouts/AppLayout'
import { Button } from '../../ui/Button'
import { Card, SectionTitle } from '../../ui/Card'
import { Icon } from '../../ui/Icon'
import { JaText, SpeakButton } from '../../ui/JaText'
import { Notice } from '../../ui/Notice'
import { ProgressBar } from '../../ui/ProgressBar'

export function Component() {
  const { episodeId = '' } = useParams()
  const episode = findEpisode(episodeId)
  const cards = useCards() ?? []
  const back = { to: '/app/story', label: 'Story' }

  if (!episode) return <><PageHeader title="Folge nicht gefunden" back={back} /><Notice>Diese Folge gibt es (noch) nicht.</Notice></>

  const progress = episodeProgress(episode, cards)
  return (
    <>
      <PageHeader ja={episode.titleJa} title={`Folge ${episode.number}: ${episode.title}`} lead={episode.summary} back={back} />

      <Card>
        <div className="flex items-center justify-between gap-3 text-sm text-ink-soft">
          <span>{episode.sentences.length} Sätze</span>
          <span>{Math.round(progress * 100)} % gelernt</span>
        </div>
        <ProgressBar className="mt-2" value={progress} label="Fortschritt dieser Folge" />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button to={`/app/lernen/sitzung?folge=${episode.id}`} variant="primary" className="flex-1">
            {progress > 0 ? 'Lektion fortsetzen' : 'Lektion starten'} <Icon name="arrowRight" />
          </Button>
          {episode.videoUrl && (
            <Button href={episode.videoUrl} target="_blank" rel="noreferrer">Folge ansehen <Icon name="external" size={18} /></Button>
          )}
        </div>
      </Card>

      <div className="mt-10">
        <SectionTitle>Sätze dieser Folge</SectionTitle>
        <ol className="space-y-3">
          {episode.sentences.map((sentence, index) => (
            <li key={index}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <JaText phrase={sentence} size="md" showTranslation />
                  <SpeakButton text={sentence.ja} className="shrink-0" />
                </div>
                <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">{sentence.note}</p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </>
  )
}
