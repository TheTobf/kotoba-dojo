import type { ApiErrorBody, ApiErrorCode } from '../../shared/api'

/** Fehler, den die API bewusst an die Oberfläche meldet (mit verständlichem deutschem Text). */
export class ApiError extends Error {
  constructor(
    public readonly status: 400 | 401 | 402 | 403 | 404 | 409 | 429 | 503,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message)
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message } }
  }
}

export const invalid = (message: string) => new ApiError(400, 'ungueltig', message)
