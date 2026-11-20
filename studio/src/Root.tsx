import { Composition } from 'remotion'
import { MascotLineup } from './compositions/MascotLineup'
import { StyleProbe } from './compositions/StyleProbe'

export function Root() {
  return (
    <>
      <Composition id="Stilprobe" component={StyleProbe} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={{ look: 'washi' as const, mascot: 'robbe' as const }} />
      <Composition id="Maskottchen" component={MascotLineup} width={1800} height={1080} fps={30} durationInFrames={90} defaultProps={{ look: 'washi' as const }} />
    </>
  )
}
