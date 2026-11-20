import { Composition, Still } from 'remotion'
import { Cover, type CoverProps } from './compositions/Cover'
import { EpisodeVideo, calculateEpisodeMetadata, type EpisodeProps } from './compositions/EpisodeVideo'
import { MascotLineup } from './compositions/MascotLineup'
import { StyleProbe } from './compositions/StyleProbe'

export function Root() {
  return (
    <>
      <Composition id="Folge" component={EpisodeVideo} width={1080} height={1920} fps={30} durationInFrames={150} defaultProps={{} as EpisodeProps} calculateMetadata={calculateEpisodeMetadata} />
      <Still id="Titelbild" component={Cover} width={1080} height={1920} defaultProps={{} as CoverProps} />
      {/* Stilproben vom 20.11.2026 (Entscheidung: Knete + Ole) */}
      <Composition id="Stilprobe" component={StyleProbe} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={{ look: 'knete' as const, mascot: 'robbe' as const }} />
      <Composition id="Maskottchen" component={MascotLineup} width={1800} height={1080} fps={30} durationInFrames={90} defaultProps={{ look: 'knete' as const }} />
    </>
  )
}
