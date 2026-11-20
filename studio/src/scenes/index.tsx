/** Zuordnung Szene → Grafik. Die Daten (Plätze, Kameras) stehen in registry.ts. */
import type { ComponentType } from 'react'
import type { TBeat } from '../episode/timeline'
import type { LightMood } from '../three/Stage'
import { Bahnhof } from './Bahnhof'
import { Gepaeckband } from './Gepaeckband'
import { HotelLobby } from './HotelLobby'
import { Konbini } from './Konbini'
import { Strasse } from './Strasse'
import { ZugInnen } from './ZugInnen'
import { GepaeckSchalter } from './GepaeckSchalter'
import { AppHandy, HandyInsert, PostkarteInsert } from './Inserts'
import { Passkontrolle } from './Passkontrolle'
import { Platform } from './Platform'

export interface SceneProps { beat: TBeat; t: number }

export const SCENE_COMPONENTS: Record<string, ComponentType<SceneProps>> = {
  passkontrolle: Passkontrolle,
  gepaeckband: Gepaeckband,
  'gepaeck-schalter': GepaeckSchalter,
  handy: HandyInsert,
  postkarte: PostkarteInsert,
  bahnsteig: Platform,
  'app-handy': AppHandy,
  'bahnhof-automat': Bahnhof,
  'zug-innen': ZugInnen,
  konbini: Konbini,
  strasse: Strasse,
  'hotel-lobby': HotelLobby,
}

/** Hintergrundfarbe (Himmel bzw. Raum) je Szene */
export const SCENE_SKY: Record<string, [string, string]> = {
  passkontrolle: ['#dfe9ef', '#f6f1e7'],
  gepaeckband: ['#dfe9ef', '#f3eee5'],
  'gepaeck-schalter': ['#dfe9ef', '#f4efe6'],
  handy: ['#2f3550', '#5b5470'],
  postkarte: ['#6b4f3a', '#3d2c22'],
  bahnsteig: ['#9fd8cb', '#d9f2e6'],
  'app-handy': ['#ff8f7a', '#ffcf9a'],
  'bahnhof-automat': ['#e4ecf2', '#f3efe6'],
  'zug-innen': ['#1b2140', '#3a3157'],
  konbini: ['#f6f8f8', '#fbfbf8'],
  strasse: ['#141a33', '#3a3157'],
  'hotel-lobby': ['#efe2cf', '#efe2cf'],
}

/** Licht je Szene (Standard: Tag/Innenraum hell) */
export const SCENE_LIGHT: Record<string, LightMood> = { strasse: 'nacht' }
