/** Service-Worker-Teil der Lern-Erinnerung (public/push-sw.js) mit nachgebautem Service Worker. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

function load() {
  const handlers: Record<string, (event: unknown) => void> = {}
  const shown: { title: string; options: Record<string, unknown> }[] = []
  const opened: string[] = []
  const focused: string[] = []
  const windows: { url: string; focus: () => void }[] = []
  const self = {
    addEventListener: (type: string, fn: (event: unknown) => void) => { handlers[type] = fn },
    registration: { showNotification: async (title: string, options: Record<string, unknown>) => { shown.push({ title, options }) } },
    clients: {
      matchAll: async () => windows,
      openWindow: async (url: string) => { opened.push(url) },
    },
  }
  runInNewContext(readFileSync(join(import.meta.dirname, '../public/push-sw.js'), 'utf8'), { self, URL })
  const fire = async (type: string, extra: Record<string, unknown> = {}) => {
    let waited: Promise<unknown> | undefined
    handlers[type]({ waitUntil: (p: Promise<unknown>) => { waited = p }, ...extra })
    await waited
  }
  return { fire, shown, opened, focused, windows }
}

describe('Service Worker der Lern-Erinnerung', () => {
  it('zeigt bei einem Signal die Erinnerung (immer dieselbe, ersetzt die alte)', async () => {
    const sw = load()
    await sw.fire('push')
    expect(sw.shown).toHaveLength(1)
    expect(sw.shown[0]).toMatchObject({ title: 'Zeit für Japanisch', options: { tag: 'kotoba-erinnerung', lang: 'de' } })
  })

  it('Antippen öffnet die App – oder holt ein offenes App-Fenster nach vorn', async () => {
    const sw = load()
    const notification = { close: () => undefined }
    await sw.fire('notificationclick', { notification })
    expect(sw.opened).toEqual(['/app'])

    const again = load()
    let focused = false
    again.windows.push({ url: 'https://kotoba.test/app/lernen', focus: () => { focused = true } })
    await again.fire('notificationclick', { notification })
    expect(focused).toBe(true)
    expect(again.opened).toEqual([])
  })
})
