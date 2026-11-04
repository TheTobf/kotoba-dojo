import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

let bereit = false
const hoerer = new Set<() => void>()

/** Lädt die neue Version (neue Lernzettel) und startet die App neu. */
export const aktualisiere = registerSW({
  onNeedRefresh() {
    bereit = true
    hoerer.forEach((h) => h())
  },
  onRegisteredSW(_url, reg) {
    if (!reg) return
    // Auf dem Handy bleibt die App lange offen: regelmäßig und beim Zurückkehren nach neuen Lernzetteln schauen.
    const pruefe = () => {
      if (navigator.onLine) reg.update().catch(() => {})
    }
    setInterval(pruefe, 30 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') pruefe()
    })
  },
})

export function useUpdateBereit(): boolean {
  return useSyncExternalStore(
    (h) => {
      hoerer.add(h)
      return () => hoerer.delete(h)
    },
    () => bereit,
  )
}

/** Notfall: Zwischenspeicher leeren und neu laden (Lernstand bleibt erhalten). */
export async function neuLaden(): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
    await Promise.all(regs.map((r) => r.unregister()))
    const keys = (await window.caches?.keys()) ?? []
    await Promise.all(keys.map((k) => caches.delete(k)))
  } finally {
    location.reload()
  }
}
