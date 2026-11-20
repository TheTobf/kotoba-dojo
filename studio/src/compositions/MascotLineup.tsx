/** Maskottchen-Entwürfe nebeneinander in einem Look. */
import { ThreeCanvas } from '@remotion/three'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { MASCOTS, type MascotId } from '../characters'
import { useFonts } from '../fonts'
import { LOOKS, type LookId } from '../look/looks'
import { LookProvider, Part } from '../three/materials'
import { cylinder } from '../three/shapes'
import { CameraRig, StageContent } from '../three/Stage'

const ORDER: MascotId[] = ['robbe', 'igel', 'moewe']

export function MascotLineup({ look }: { look: LookId }) {
  const frame = useCurrentFrame()
  const { width, height, fps } = useVideoConfig()
  const L = LOOKS[look]
  const ready = useFonts(ORDER.map((m) => MASCOTS[m].name).join('') + L.name)
  const t = frame / fps
  const moods = ['happy', 'confused', 'shocked'] as const
  return (
    <AbsoluteFill style={{ background: L.palette.skyBottom }}>
      {ready && (
        <ThreeCanvas width={width} height={height} shadows flat camera={{ fov: 30, position: [0, 1.4, 9] }}>
          <LookProvider look={look}>
            <CameraRig position={[0, 1.6, 9.2]} target={[0, 0.95, 0]} fov={28} />
            <StageContent>
              <Part geometry={cylinder(48)} color={L.palette.ground} position={[0, -0.05, 0]} scale={[7, 0.1, 3]} receiveShadow castShadow={false} outline={false} />
              {ORDER.map((id, i) => {
                const M = MASCOTS[id].component
                return (
                  <group key={id} position={[(i - 1) * 2.4, 0, 0]} rotation={[0, (1 - i) * 0.25, 0]}>
                    <M pose={{ t: t + i, mood: moods[i], armLeft: i === 0 ? 0.6 : 0, armRight: i === 2 ? 0.4 : 0, tilt: i === 1 ? -0.15 : 0 }} />
                  </group>
                )
              })}
            </StageContent>
          </LookProvider>
        </ThreeCanvas>
      )}
      {ready && (
        <>
          <div style={{ position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center', fontFamily: L.text.font, fontWeight: 900, fontSize: 54, color: L.palette.ink }}>{L.name}</div>
          <div style={{ position: 'absolute', bottom: 46, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '0 20px' }}>
            {ORDER.map((id) => (
              <div key={id} style={{ fontFamily: L.text.font, fontWeight: 700, fontSize: 40, color: L.palette.ink, width: 560, textAlign: 'center' }}>{MASCOTS[id].name}</div>
            ))}
          </div>
        </>
      )}
    </AbsoluteFill>
  )
}
