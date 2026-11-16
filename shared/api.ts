/** Formen der Daten, die zwischen Oberfläche (src/) und Server (worker/) ausgetauscht werden. */
import type { Access } from './entitlement'
import type { PlanId } from './plans'

export interface Phrase {
  ja: string
  kana: string
  romaji: string
  de: string
}

export interface MeResponse {
  user: { email: string } | null
  access: Access
  plan: PlanId | null
  ai: { usedToday: number; dailyLimit: number } | null
}

export interface AuthStartResponse {
  ok: true
  /** Nur in der lokalen Entwicklung gefüllt (es gibt dort keinen Mailversand). */
  devCode?: string
}

export interface CheckoutRequest {
  plan: PlanId
  consentImmediateStart: boolean
  consentWithdrawalExpires: boolean
}

export interface UrlResponse {
  url: string
}

export interface CancelRequest {
  email: string
  kind: 'ordentlich' | 'ausserordentlich'
  reason?: string
}

export interface CancelResponse {
  /** Eingangsbestätigung mit Datum und Uhrzeit (§ 312k Abs. 4 BGB). */
  receivedAt: number
  reference: string
  kind: 'ordentlich' | 'ausserordentlich'
}

export interface ChatTurn {
  role: 'user' | 'character'
  text: string
}

export interface ChatRequest {
  characterId: string
  history: ChatTurn[]
  message: string
  /** true = „Ich weiß nicht weiter“: Die Figur hilft auf Deutsch. */
  help?: boolean
}

export interface Correction {
  original: string
  better: Phrase
  /** Erklärung auf Deutsch. */
  explanation: string
}

export interface ChatResponse {
  reply: Phrase
  /** Hilfe auf Deutsch (nur wenn danach gefragt wurde). */
  help?: string
  correction?: Correction
  quota: { usedToday: number; dailyLimit: number }
  /** true, solange keine echte KI angeschlossen ist. */
  mock: boolean
}

export interface MistakeCard extends Phrase {
  id: string
  note: string
  createdAt: number
}

/** Einheitliche Fehlerantwort der API. `code` ist maschinenlesbar, `message` für Menschen (Deutsch). */
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string }
}

export type ApiErrorCode =
  | 'ungueltig' | 'nicht_angemeldet' | 'pro_noetig' | 'zu_viele_anfragen' | 'tageslimit' | 'budget_erschoepft'
  | 'nicht_gefunden' | 'zahlung_nicht_eingerichtet' | 'kein_abo' | 'herkunft_abgelehnt' | 'serverfehler'
