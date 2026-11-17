/**
 * Tägliche Lern-Erinnerung per Benachrichtigung (Web Push), auch ohne Konto.
 * Hat man heute schon geübt, meldet die App das dem Server („seen“) – dann kommt heute keine Erinnerung.
 * Auf dem iPhone geht das nur, wenn Kotoba Dojo auf dem Home-Bildschirm installiert ist.
 */
import { dayKey } from './day'

const KEY = 'kd.reminder'

export interface ReminderState {
  id: string
  time: string
  seenDay?: string
}

function read(): ReminderState | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
}
function write(state: ReminderState | null) {
  try { if (state) localStorage.setItem(KEY, JSON.stringify(state)); else localStorage.removeItem(KEY) } catch { /* privater Modus */ }
}

export const reminderState = read

export const canRemind = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** Läuft ein Service Worker? (In der lokalen Entwicklung nicht – dann gehen keine Erinnerungen.) */
export async function hasServiceWorker(): Promise<boolean> {
  return canRemind() && !!(await navigator.serviceWorker.getRegistration())
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export class ReminderError extends Error {}

/** Erinnerung einschalten oder Uhrzeit ändern. */
export async function enableReminder(time: string): Promise<ReminderState> {
  if (!canRemind()) throw new ReminderError('Dieser Browser kann keine Erinnerungen anzeigen.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new ReminderError('Benachrichtigungen sind nicht erlaubt. Du kannst sie in den Einstellungen deines Browsers freigeben.')
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) throw new ReminderError('Erinnerungen funktionieren erst in der veröffentlichten App (nicht in der lokalen Entwicklung).')
  const keyResponse = await fetch('/api/reminders/key')
  if (!keyResponse.ok) throw new ReminderError('Erinnerungen sind auf dem Server noch nicht eingerichtet.')
  const { publicKey } = (await keyResponse.json()) as { publicKey: string }
  let subscription: PushSubscription
  try {
    subscription = (await registration.pushManager.getSubscription())
      ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }))
  } catch {
    throw new ReminderError('Der Browser konnte die Benachrichtigungen nicht einrichten. Prüfe, ob sie für Kotoba Dojo erlaubt sind, und versuch es noch einmal.')
  }
  const response = await fetch('/api/reminders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint, time, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  })
  if (!response.ok) throw new ReminderError('Die Erinnerung konnte nicht gespeichert werden.')
  const { id } = (await response.json()) as { id: string }
  const state = { id, time }
  write(state)
  return state
}

export async function disableReminder(): Promise<void> {
  const state = read()
  write(null)
  if (state) await fetch(`/api/reminders/${encodeURIComponent(state.id)}`, { method: 'DELETE' }).catch(() => undefined)
  const registration = canRemind() ? await navigator.serviceWorker.getRegistration() : undefined
  await (await registration?.pushManager.getSubscription())?.unsubscribe().catch(() => undefined)
}

/** Nach einer Übung: dem Server einmal am Tag sagen, dass heute schon gelernt wurde. */
export async function markLearnedToday(now = Date.now()): Promise<void> {
  const state = read()
  const today = dayKey(now)
  if (!state || state.seenDay === today) return
  write({ ...state, seenDay: today })
  const response = await fetch(`/api/reminders/${encodeURIComponent(state.id)}/seen`, { method: 'POST' }).catch(() => undefined)
  if (response?.status === 404) write(null) // auf dem Server abbestellt (z. B. vom Push-Dienst entfernt)
}
