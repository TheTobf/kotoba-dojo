import { Gull } from './Gull'
import { Hedgehog } from './Hedgehog'
import { Seal } from './Seal'

export const MASCOTS = {
  robbe: { name: '1 · Ole, der Seehund', component: Seal, idea: 'Seehund aus der Nordsee mit gelbem Südwester. Rund, gemütlich, wackelt beim Gehen.' },
  igel: { name: '2 · Pieks, der Igel', component: Hedgehog, idea: 'Igel mit rotem Wanderrucksack. Klein, flink, rollt sich bei Schreck zusammen.' },
  moewe: { name: '3 · Jonte, die Hafenmöwe', component: Gull, idea: 'Hamburger Hafenmöwe mit Matrosenmütze. Frech, neugierig, will alles probieren.' },
} as const

export type MascotId = keyof typeof MASCOTS
