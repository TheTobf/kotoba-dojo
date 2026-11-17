/** Lern-Erinnerung: Anmelden, „heute gelernt“, Abbestellen und der Zeitplan, der die Signale verschickt. */
import { generateKeyPairSync } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { isPushEndpoint, vapidAuthorization } from '../worker/lib/webpush'
import { localTime, sendDueReminders } from '../worker/routes/reminders'
import { disposeDatabase, json, TestApp } from './helpers'

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const pub = publicKey.export({ format: 'jwk' })
const VAPID = {
  VAPID_PUBLIC_KEY: Buffer.concat([Buffer.from([4]), Buffer.from(pub.x!, 'base64url'), Buffer.from(pub.y!, 'base64url')]).toString('base64url'),
  VAPID_PRIVATE_JWK: JSON.stringify(privateKey.export({ format: 'jwk' })),
  VAPID_SUBJECT: 'mailto:test@example.com',
}
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123'

let t: TestApp
beforeEach(async () => {
  t = await TestApp.create({ env: VAPID })
  t.nowMs = Date.UTC(2026, 10, 17, 17, 0, 0) // 18:00 in Berlin
})
afterAll(disposeDatabase)

const subscribe = (body: Record<string, unknown>) => t.post('/api/reminders', { endpoint: ENDPOINT, time: '18:00', timeZone: 'Europe/Berlin', ...body })

/** Nachgebauter Push-Dienst: merkt sich alle Aufrufe. */
function pushService(status = 201) {
  const calls: { url: string; headers: Headers }[] = []
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, headers: new Headers(init.headers) })
    return new Response(null, { status })
  }) as unknown as typeof fetch
  return { calls, fetcher }
}

describe('Anmelden und Abbestellen', () => {
  it('öffentlicher Schlüssel ist abrufbar; ohne Schlüssel sind Erinnerungen aus', async () => {
    expect(await json(await t.get('/api/reminders/key'))).toEqual({ publicKey: VAPID.VAPID_PUBLIC_KEY })
    const off = await TestApp.create()
    expect((await off.get('/api/reminders/key')).status).toBe(503)
  })

  it('nur Adressen bekannter Push-Dienste, gültige Uhrzeit und Zeitzone', async () => {
    expect(isPushEndpoint('https://evil.example/push')).toBe(false)
    expect(isPushEndpoint('http://fcm.googleapis.com/x')).toBe(false)
    expect(isPushEndpoint('https://web.push.apple.com/abc')).toBe(true)
    expect((await subscribe({ endpoint: 'https://evil.example/push' })).status).toBe(400)
    expect((await subscribe({ time: '25:00' })).status).toBe(400)
    expect((await subscribe({ timeZone: 'Mond/Basis' })).status).toBe(400)
  })

  it('dasselbe Gerät zweimal anmelden ändert nur die Uhrzeit', async () => {
    const first = await json(await subscribe({}))
    const second = await json(await subscribe({ time: '07:30' }))
    expect(second.id).toBe(first.id)
    const row = await t.db.prepare('SELECT COUNT(*) AS n, MAX(minute_of_day) AS m FROM reminders').first<{ n: number; m: number }>()
    expect(row).toEqual({ n: 1, m: 450 })
  })

  it('abbestellen löscht die Erinnerung', async () => {
    const { id } = await json(await subscribe({}))
    await t.request('DELETE', `/api/reminders/${id}`)
    expect(await t.db.prepare('SELECT COUNT(*) AS n FROM reminders').first('n')).toBe(0)
  })
})

describe('Zeitplan', () => {
  it('Ortszeit wird richtig berechnet (Winterzeit Berlin = UTC+1)', () => {
    expect(localTime(Date.UTC(2026, 10, 17, 17, 5), 'Europe/Berlin')).toEqual({ day: '2026-11-17', minute: 18 * 60 + 5 })
    expect(localTime(Date.UTC(2026, 10, 17, 23, 30), 'Europe/Berlin').day).toBe('2026-11-18')
  })

  it('erinnert zur Wunschzeit genau einmal am Tag – mit gültiger VAPID-Unterschrift', async () => {
    await subscribe({})
    const push = pushService()
    expect(await sendDueReminders(t.env, t.nowMs - 15 * 60_000, push.fetcher)).toEqual({ sent: 0, removed: 0 }) // 17:45: noch nicht
    expect(await sendDueReminders(t.env, t.nowMs, push.fetcher)).toEqual({ sent: 1, removed: 0 })
    expect(await sendDueReminders(t.env, t.nowMs + 15 * 60_000, push.fetcher)).toEqual({ sent: 0, removed: 0 }) // schon erinnert
    expect(push.calls[0].url).toBe(ENDPOINT)
    const auth = push.calls[0].headers.get('authorization')!
    expect(auth).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/)
    const [header, payload, signature] = auth.slice(8).split(',')[0].split('.')
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toMatchObject({ aud: 'https://fcm.googleapis.com', sub: 'mailto:test@example.com' })
    const key = await crypto.subtle.importKey('jwk', pub as never, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, Buffer.from(signature, 'base64url'), new TextEncoder().encode(`${header}.${payload}`))
    expect(valid).toBe(true)
  })

  it('wer heute schon gelernt hat, bekommt keine Erinnerung', async () => {
    const { id } = await json(await subscribe({}))
    await t.post(`/api/reminders/${id}/seen`)
    const push = pushService()
    expect((await sendDueReminders(t.env, t.nowMs, push.fetcher)).sent).toBe(0)
    expect(push.calls).toHaveLength(0)
  })

  it('mehr als 3 Stunden zu spät wird nicht mehr erinnert', async () => {
    await subscribe({ time: '13:00' })
    expect((await sendDueReminders(t.env, t.nowMs + 60 * 60_000, pushService().fetcher)).sent).toBe(0)
  })

  it('kennt der Push-Dienst die Adresse nicht mehr, wird die Erinnerung gelöscht', async () => {
    await subscribe({})
    expect(await sendDueReminders(t.env, t.nowMs, pushService(410).fetcher)).toEqual({ sent: 0, removed: 1 })
    expect(await t.db.prepare('SELECT COUNT(*) AS n FROM reminders').first('n')).toBe(0)
  })

  it('ohne Schlüssel wird nichts verschickt', async () => {
    const off = await TestApp.create()
    expect(await sendDueReminders(off.env, Date.now(), pushService().fetcher)).toEqual({ sent: 0, removed: 0 })
  })

  it('JWT läuft nach 12 Stunden ab', async () => {
    const auth = await vapidAuthorization(ENDPOINT, { publicKey: VAPID.VAPID_PUBLIC_KEY, privateJwk: VAPID.VAPID_PRIVATE_JWK, subject: VAPID.VAPID_SUBJECT }, 1000)
    const payload = JSON.parse(Buffer.from(auth.slice(8).split('.')[1], 'base64url').toString())
    expect(payload.exp).toBe(1000 + 12 * 3600)
  })
})
