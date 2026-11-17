/** Aufrufe an den eigenen Server (/api/…). Fehler kommen als `ApiError` mit verständlichem deutschem Text zurück. */
import type {
  ApiErrorBody, ApiErrorCode, AuthStartResponse, CancelRequest, CancelResponse, ChatRequest, ChatResponse,
  CheckoutRequest, MeResponse, MistakeCard, UrlResponse,
} from '../../shared/api'
import type { Mission, MissionTeaser } from '../../shared/mission'

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode | 'offline',
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}

async function call<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('offline', 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.', 0)
  }
  const data = (await response.json().catch(() => null)) as T | ApiErrorBody | null
  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error
    throw new ApiError(error?.code ?? 'serverfehler', error?.message ?? 'Da ist etwas schiefgelaufen. Bitte versuch es noch einmal.', response.status)
  }
  return data as T
}

export const api = {
  me: () => call<MeResponse>('GET', '/me'),
  startLogin: (email: string) => call<AuthStartResponse>('POST', '/auth/start', { email }),
  verifyLogin: (email: string, code: string) => call<{ ok: true }>('POST', '/auth/verify', { email, code }),
  logout: () => call<{ ok: true }>('POST', '/auth/logout'),
  deleteAccount: () => call<{ ok: true }>('DELETE', '/account'),
  checkout: (request: CheckoutRequest) => call<UrlResponse>('POST', '/billing/checkout', request),
  portal: () => call<UrlResponse>('POST', '/billing/portal'),
  cancel: (request: CancelRequest) => call<CancelResponse>('POST', '/cancel', request),
  chat: (request: ChatRequest) => call<ChatResponse>('POST', '/ai/chat', request),
  mistakes: (since: number) => call<{ cards: MistakeCard[] }>('GET', `/mistakes?since=${since}`),
  missionTeasers: () => call<{ missions: MissionTeaser[] }>('GET', '/story/missions'),
  mission: (id: string) => call<{ mission: Mission }>('GET', `/story/missions/${encodeURIComponent(id)}`),
  joinWaitlist: (email: string) => call<{ ok: true; devConfirmUrl?: string }>('POST', '/waitlist', { email, consent: true }),
  confirmWaitlist: (token: string) => call<{ ok: true }>('POST', '/waitlist/confirm', { token }),
}

export const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Da ist etwas schiefgelaufen. Bitte versuch es noch einmal.'
