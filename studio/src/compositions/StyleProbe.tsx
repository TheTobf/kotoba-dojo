/** Stilprobe: dieselbe Szene (Bahnsteig, Maskottchen, Texte) in einem Look – zum Vergleichen der Stilrichtungen. */
import { ThreeCanvas } from '@remotion/three'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { MASCOTS, type MascotId } from '../characters'
import { useFonts } from '../fonts'
import { LOOKS, type LookId } from '../look/looks'
import { HookTitle, LearnLine } from '../overlay/Texts'
import { Platform } from '../scenes/Platform'
import { LookProvider } from '../three/materials'
import { CameraRig, StageContent } from '../three/Stage'

export function StyleProbe({ look, mascot }: { look: LookId; mascot: MascotId }) {
  const frame = useCurrentFrame()
  const { width, height, fps } = useVideoConfig()
  const ready = useFonts('すみませんひがしまちHigashimachiAkku 1 %. Kein Wort Japanisch.Entschuldigung.Sumimasen.')
  const L = LOOKS[look]
  const Mascot = MASCOTS[mascot].component
  const t = frame / fps
  return (
    <AbsoluteFill style={{ background: L.palette.skyBottom }}>
      {ready && (
        <ThreeCanvas width={width} height={height} shadows flat linear={false} camera={{ fov: 38, position: [0.4, 1.6, 6.4] }}>
          <LookProvider look={look}>
            <CameraRig position={[0.9, 2.4, 11.5]} target={[0.45, 0.2, 0]} fov={34} />
            <StageContent>
              <Platform trainX={-1.5} />
              <group position={[-0.35, 0, 0.9]} rotation={[0, 0.2, 0]}>
                <Mascot pose={{ t, mood: 'confused', tilt: 0.12, armRight: 0.55 }} />
              </group>
            </StageContent>
          </LookProvider>
        </ThreeCanvas>
      )}
      {ready && (
        <>
          <HookTitle look={L} text="Akku 1 %." sub="Kein Wort Japanisch." />
          <LearnLine look={L} label="Satz 1" ja="すみません。" kana="すみません" romaji="Sumimasen." de="Entschuldigung." />
        </>
      )}
    </AbsoluteFill>
  )
}
