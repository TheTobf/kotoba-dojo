/**
 * Die fertige Folge: liest den Zeitplan (timeline.json) und zeichnet pro Bild Szene, Figuren, Kamera und Einblendungen.
 * Ton: eine fertig gemischte Spur (mix.wav) aus der Ton-Pipeline.
 */
import { ThreeCanvas } from '@remotion/three'
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from 'remotion'
import { placeActor, type ActorPlacement } from '../characters/actions'
import { FIGURES } from '../characters/figures'
import { Person } from '../characters/Person'
import { Seal } from '../characters/Seal'
import type { TActor, TBeat, TShot, Timeline } from '../episode/timeline'
import { useFonts } from '../fonts'
import { Overlays } from '../overlay/EpisodeOverlays'
import { CheckOverlay } from '../overlay/CheckOverlay'
import { PropFor } from '../props/Props'
import { SCENE_COMPONENTS, SCENE_SKY } from '../scenes'
import { SCENES, type V3 } from '../scenes/registry'
import { applyMove, baseCamera, type CamPose, type PlacedFigure } from '../three/camera'
import { LookProvider } from '../three/materials'
import { CameraRig, StageContent } from '../three/Stage'

export type EpisodeProps = { timeline?: Timeline; audio?: string; check?: boolean }

export interface FrameState { t: number; shot: TShot; beat: TBeat; cam: CamPose; placed: { actor: TActor; place: ActorPlacement }[] }

/** Alles, was ein Bild braucht – auch für die Selbstkontrolle ohne Grafik nutzbar. */
export function frameState(tl: Timeline, t: number): FrameState {
  const shot = tl.shots.find((s) => t >= s.start && t < s.end) ?? tl.shots[tl.shots.length - 1]
  const beat = tl.beats[shot.beat]
  const scene = SCENES[beat.scene]
  // erst ohne Blickziel platzieren, dann mit (damit „face: beamter“ den Ort des anderen kennt)
  const rough = beat.actors.map((a) => ({ who: a.who, pos: (scene.spots[a.at]?.pos ?? [0, 0, 0]) as V3 }))
  const figuresRough: PlacedFigure[] = beat.actors.map((a, i) => ({ who: a.who, figure: a.figure, pos: rough[i].pos, yaw: scene.spots[a.at]?.yaw ?? 0, seated: scene.spots[a.at]?.seated }))
  const base = baseCamera(shot.preset, scene, figuresRough)
  const placed = beat.actors.map((actor) => ({ actor, place: placeActor(actor, beat, scene, t, rough, base.pos) }))
  const figures: PlacedFigure[] = placed.map(({ actor, place }) => ({ who: actor.who, figure: actor.figure, pos: place.pos, yaw: place.yaw, seated: scene.spots[actor.at]?.seated }))
  const p = (t - shot.start) / Math.max(0.01, shot.end - shot.start)
  const cam = applyMove(baseCamera(shot.preset, scene, figures), shot.move, Math.max(0, Math.min(1, p)))
  return { t, shot, beat, cam, placed }
}

/** Nur die 3D-Szene eines Zeitpunkts (für Video und Titelbild). */
export function EpisodeScene({ tl, t }: { tl: Timeline; t: number }) {
  const { width, height } = useVideoConfig()
  const fs = frameState(tl, t)
  const scene = SCENES[fs.beat.scene]
  const Scene = SCENE_COMPONENTS[fs.beat.scene]
  return (
    <ThreeCanvas width={width} height={height} shadows flat linear={false} camera={{ fov: fs.cam.fov, position: fs.cam.pos, near: 0.1, far: 200 }}>
      <LookProvider look="knete">
        <CameraRig position={fs.cam.pos} target={fs.cam.target} fov={fs.cam.fov} />
        <StageContent sky={SCENE_SKY[fs.beat.scene]}>
          {Scene && <Scene beat={fs.beat} t={t} />}
          {!scene.insert && fs.placed.map(({ actor, place }, i) => (
            <group key={actor.who} position={place.pos} rotation={[0, place.yaw, 0]}>
              <Figure actor={actor} place={place} seated={!!scene.spots[actor.at]?.seated} seed={i} />
            </group>
          ))}
        </StageContent>
      </LookProvider>
    </ThreeCanvas>
  )
}

export const fontText = (tl?: Timeline) => 'すみませんパスポートを見せてください観光です入国審査手荷物受取所いつでも帰っておいで。外国人日本人HÖRENSAGEN' + (tl?.ja.map((j) => j.sentence.ja + j.sentence.kana).join('') ?? '')

export function EpisodeVideo({ timeline, audio = 'mix.wav', check = false }: EpisodeProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const ready = useFonts(fontText(timeline))
  if (!timeline) return <AbsoluteFill style={{ background: '#2a2340' }} />
  const t = frame / fps
  const beat = timeline.beats[frameState(timeline, t).beat.index]
  return (
    <AbsoluteFill style={{ background: SCENE_SKY[beat.scene]?.[1] ?? '#d9f2e6' }}>
      {ready && <EpisodeScene tl={timeline} t={t} />}
      {ready && <Overlays tl={timeline} t={t} />}
      {ready && check && <CheckOverlay tl={timeline} fs={frameState(timeline, t)} />}
      {!check && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  )
}

function Figure({ actor, place, seated, seed }: { actor: TActor; place: ActorPlacement; seated: boolean; seed: number }) {
  const hold = actor.prop ? <PropFor prop={actor.prop} /> : undefined
  if (actor.figure === 'ole') return <Seal pose={place.pose} hold={hold} />
  const look = FIGURES[actor.figure]?.person
  if (!look) return null
  return <Person look={look} pose={place.pose} seated={seated} hold={hold} seed={seed} />
}

export const calculateEpisodeMetadata: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  let timeline = props.timeline
  if (!timeline) {
    try { timeline = (await (await fetch(staticFile('timeline.json'))).json()) as Timeline } catch { /* Studio ohne Folge */ }
  }
  const fps = timeline?.fps ?? 30
  return { durationInFrames: Math.max(1, Math.ceil((timeline?.duration ?? 5) * fps)), fps, width: timeline?.width ?? 1080, height: timeline?.height ?? 1920, props: { ...props, timeline } }
}
