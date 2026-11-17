/**
 * Läuft im Hintergrund der App. Meldet „heute gelernt“ für die Lern-Erinnerung und gleicht für angemeldete Nutzer ab: beim Öffnen der App, kurz nach dem Lernen
 * (20 Sekunden Ruhe) und wenn die App in den Hintergrund geht. Ohne Konto passiert nichts.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { useAccount } from '../lib/account'
import { ACTIVITY_EVENT } from '../lib/progress'
import { markLearnedToday } from '../lib/reminders'
import { lastSyncAt, syncNow } from '../lib/sync'

const QUIET_MS = 20_000

type Status = { state: 'bereit' | 'laeuft' | 'fehler'; at: number; error?: string }
let status: Status = { state: 'bereit', at: 0 }
const listeners = new Set<() => void>()
const setStatus = (next: Status) => { status = next; listeners.forEach((l) => l()) }

export function useSyncStatus(): Status {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => status, () => status)
}

/** Abgleich jetzt starten (auch für den Knopf im Profil). */
export async function runSync(userId: string): Promise<void> {
  setStatus({ ...status, state: 'laeuft' })
  try {
    await syncNow(userId)
    setStatus({ state: 'bereit', at: lastSyncAt() })
  } catch (error) {
    setStatus({ state: 'fehler', at: lastSyncAt(), error: error instanceof Error ? error.message : 'Abgleich fehlgeschlagen.' })
  }
}

export function AutoSync() {
  const { me } = useAccount()
  const userId = me?.user?.id

  // Lern-Erinnerung: wer heute schon geübt hat, bekommt heute keine (geht auch ohne Konto).
  useEffect(() => {
    const onActivity = () => void markLearnedToday()
    window.addEventListener(ACTIVITY_EVENT, onActivity)
    return () => window.removeEventListener(ACTIVITY_EVENT, onActivity)
  }, [])

  useEffect(() => {
    if (!userId) return
    let dirty = false
    let timer: ReturnType<typeof setTimeout> | undefined
    void runSync(userId)

    const onActivity = () => {
      dirty = true
      clearTimeout(timer)
      timer = setTimeout(() => { dirty = false; void runSync(userId) }, QUIET_MS)
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden' && dirty) { dirty = false; clearTimeout(timer); void runSync(userId) }
    }
    window.addEventListener(ACTIVITY_EVENT, onActivity)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      clearTimeout(timer)
      window.removeEventListener(ACTIVITY_EVENT, onActivity)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [userId])

  return null
}
