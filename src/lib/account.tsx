/**
 * Konto-Zustand für die ganze Oberfläche: Wer ist angemeldet, und sagt der SERVER, dass Pro aktiv ist?
 *
 * Wichtig: Das hier steuert nur die Anzeige (z. B. Upgrade-Screen statt Inhalt). Die eigentliche Sperre sitzt
 * im Server – Pro-Inhalte und KI gibt er nur heraus, wenn er selbst Pro festgestellt hat.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MeResponse } from '../../shared/api'
import { api } from './api'

type Status = 'laden' | 'bereit' | 'offline'

interface AccountValue {
  status: Status
  me: MeResponse | null
  /** Kurzform: Server bestätigt Pro. */
  pro: boolean
  signedIn: boolean
  refresh(): Promise<MeResponse | null>
}

const AccountContext = createContext<AccountValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('laden')
  const [me, setMe] = useState<MeResponse | null>(null)

  const refresh = useCallback(async () => {
    try {
      const fresh = await api.me()
      setMe(fresh)
      setStatus('bereit')
      return fresh
    } catch {
      // Ohne Verbindung bleibt die App als Gast benutzbar (Gratis-Lernen funktioniert offline).
      setStatus('offline')
      return null
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AccountValue>(
    () => ({ status, me, pro: me?.access.pro ?? false, signedIn: !!me?.user, refresh }),
    [status, me, refresh],
  )
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountValue {
  const value = useContext(AccountContext)
  if (!value) throw new Error('useAccount braucht einen AccountProvider')
  return value
}
