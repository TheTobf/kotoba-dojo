/**
 * KI als austauschbare Schnittstelle. Der Schlüssel der echten KI liegt später nur auf dem Server –
 * der Browser spricht ausschließlich mit /api/ai/chat.
 *
 * Vorerst gibt es nur `MockProvider` (mock.ts) mit Platzhalter-Antworten.
 * TODO (docs/HANDOFF.md): echten Anbieter hier anschließen und in `createAiProvider` auswählen.
 */
import type { ChatTurn, Correction, Phrase } from '../../shared/api'
import type { Character } from '../../shared/characters'
import type { Env } from '../env'
import { MockProvider } from './mock'

export interface AiChatInput {
  character: Character
  history: ChatTurn[]
  message: string
  help: boolean
}

export interface AiChatOutput {
  reply: Phrase
  help?: string
  correction?: Correction
  /** Tatsächliche Kosten dieses Aufrufs in Millionstel Euro. */
  costMicro: number
}

export interface AiProvider {
  readonly isMock: boolean
  /** Obergrenze der Kosten EINES Aufrufs in Millionstel Euro – wird vor dem Aufruf vom Monatsbudget reserviert. */
  readonly maxCostMicroPerCall: number
  chat(input: AiChatInput): Promise<AiChatOutput>
}

export function createAiProvider(_env: Env): AiProvider {
  // Sobald es einen echten Anbieter gibt: hier nach env.AI_PROVIDER unterscheiden.
  return new MockProvider()
}
