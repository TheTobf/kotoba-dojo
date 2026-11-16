/** Anmeldung per E-Mail-Code, Sitzungs-Cookie und Schutz vor fremden Webseiten. */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { CODE_MINUTES, MAX_ATTEMPTS, MAX_CODES_PER_HOUR } from '../worker/routes/auth'
import { DAY, disposeDatabase, json, TestApp } from './helpers'

let t: TestApp
beforeEach(async () => {
  t = await TestApp.create()
})
afterAll(disposeDatabase)

const codeFromMail = () => t.mails.at(-1)!.text.match(/\b(\d{6})\b/)![1]

describe('Anmeldung', () => {
  it('Code anfordern, eingeben, angemeldet sein, abmelden', async () => {
    expect(await json(await t.post('/api/auth/start', { email: ' Mika@Example.com ' }))).toEqual({ ok: true })
    expect(t.mails[0].to).toBe('mika@example.com')

    const response = await t.post('/api/auth/verify', { email: 'mika@example.com', code: codeFromMail() })
    expect(response.status).toBe(200)
    const setCookie = response.headers.get('set-cookie')!
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/Secure/i)
    expect(setCookie).toMatch(/SameSite=Lax/i)
    const cookie = setCookie.split(';')[0]

    expect((await json(await t.get('/api/me', cookie))).user).toMatchObject({ email: 'mika@example.com' })
    await t.post('/api/auth/logout', {}, cookie)
    expect((await json(await t.get('/api/me', cookie))).user).toBeNull()
  })

  it('in der Datenbank liegen weder Code noch Sitzungs-Token im Klartext', async () => {
    const { cookie } = await t.login('mika@example.com')
    const token = cookie.split('=')[1]
    const session = await t.db.prepare('SELECT token_hash FROM sessions').first<{ token_hash: string }>()
    expect(session!.token_hash).not.toBe(token)
    await t.post('/api/auth/start', { email: 'mika@example.com' })
    const row = await t.db.prepare('SELECT code_hash FROM login_codes').first<{ code_hash: string }>()
    expect(row!.code_hash).not.toContain(codeFromMail())
  })

  it('der Code wird außerhalb der lokalen Entwicklung nie in der Antwort mitgeschickt', async () => {
    const body = await json(await t.post('/api/auth/start', { email: 'mika@example.com' }))
    expect(body.devCode).toBeUndefined()

    const dev = await TestApp.create({ env: { ENVIRONMENT: 'development' } })
    expect((await json(await dev.post('/api/auth/start', { email: 'mika@example.com' }))).devCode).toMatch(/^\d{6}$/)
  })

  it('falscher Code wird abgelehnt; nach zu vielen Versuchen ist auch der richtige gesperrt', async () => {
    await t.post('/api/auth/start', { email: 'mika@example.com' })
    const right = codeFromMail()
    const wrong = right === '000000' ? '111111' : '000000'
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect((await t.post('/api/auth/verify', { email: 'mika@example.com', code: wrong })).status).toBe(400)
    }
    expect((await t.post('/api/auth/verify', { email: 'mika@example.com', code: right })).status).toBe(400)
  })

  it('abgelaufener und bereits benutzter Code gelten nicht', async () => {
    await t.post('/api/auth/start', { email: 'mika@example.com' })
    const code = codeFromMail()
    t.advance(CODE_MINUTES * 60)
    expect((await t.post('/api/auth/verify', { email: 'mika@example.com', code })).status).toBe(400)

    await t.post('/api/auth/start', { email: 'mika@example.com' })
    const fresh = codeFromMail()
    expect((await t.post('/api/auth/verify', { email: 'mika@example.com', code: fresh })).status).toBe(200)
    expect((await t.post('/api/auth/verify', { email: 'mika@example.com', code: fresh })).status).toBe(400)
  })

  it('pro Adresse gibt es nur wenige Codes pro Stunde', async () => {
    for (let i = 0; i < MAX_CODES_PER_HOUR; i++) {
      expect((await t.post('/api/auth/start', { email: 'mika@example.com' })).status).toBe(200)
    }
    expect((await t.post('/api/auth/start', { email: 'mika@example.com' })).status).toBe(429)
    t.advance(3600)
    expect((await t.post('/api/auth/start', { email: 'mika@example.com' })).status).toBe(200)
  })

  it('ungültige E-Mail-Adressen werden abgelehnt', async () => {
    for (const email of ['', 'kein-at-zeichen', 'a@b', 42, null]) {
      expect((await t.post('/api/auth/start', { email })).status).toBe(400)
    }
  })

  it('Sitzung läuft nach 30 Tagen ohne Nutzung ab, bei regelmäßiger Nutzung verlängert sie sich', async () => {
    const { cookie } = await t.login('mika@example.com')
    t.advance(20 * DAY)
    expect((await json(await t.get('/api/me', cookie))).user).not.toBeNull() // verlängert die Sitzung
    t.advance(20 * DAY)
    expect((await json(await t.get('/api/me', cookie))).user).not.toBeNull()
    t.advance(31 * DAY)
    expect((await json(await t.get('/api/me', cookie))).user).toBeNull()
  })
})

describe('Schutz vor fremden Webseiten (CSRF)', () => {
  it('schreibende Anfragen von fremder Herkunft oder ohne Herkunft werden abgelehnt', async () => {
    const { cookie } = await t.login('mika@example.com')
    const foreign = await t.request('POST', '/api/auth/logout', { cookie, headers: { origin: 'https://boese.example' } })
    expect(foreign.status).toBe(403)
    const missing = await t.request('POST', '/api/auth/logout', { cookie, headers: { origin: '' } })
    expect(missing.status).toBe(403)
    expect((await json(await t.get('/api/me', cookie))).user).not.toBeNull()
  })

  it('API-Antworten werden nicht zwischengespeichert', async () => {
    expect((await t.get('/api/me')).headers.get('cache-control')).toBe('no-store')
  })
})
