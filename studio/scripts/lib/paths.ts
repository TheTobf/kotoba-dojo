/** Feste Orte im Projekt (alles relativ zum Repo, funktioniert auf Windows, Mac und Linux). */
import { join, resolve } from 'node:path'

export const STUDIO = resolve(import.meta.dirname, '../..')
export const REPO = resolve(STUDIO, '..')
export const STYLE_FILE = join(REPO, 'style/stilvorlage.json')
export const CURRICULUM_FILE = join(REPO, 'curriculum/curriculum.json')
export const PROGRESS_FILE = join(REPO, 'curriculum/progress.json')
export const SERIES_FILE = join(REPO, 'story/series.md')
export const EPISODES_DIR = join(REPO, 'episodes')
export const APPVIDEOS_DIR = join(REPO, 'app-videos')
export const RECORDINGS_DIR = join(REPO, 'recordings')
export const OUT_DIR = join(REPO, 'out')
export const LICENSES_DIR = join(REPO, 'licenses/voicevox')
/** Werkzeuge (whisper.cpp, Modelle) – einmalig heruntergeladen, nicht in Git */
export const TOOLS_DIR = join(STUDIO, '.tools')

export const episodeFile = (id: string) => (id.startsWith('app-') ? join(APPVIDEOS_DIR, id, 'appvideo.json') : join(EPISODES_DIR, id, 'episode.json'))
export const recordingDir = (id: string) => join(RECORDINGS_DIR, id)
export const outDir = (id: string) => join(OUT_DIR, id)
export const workDir = (id: string) => join(OUT_DIR, id, 'work')
