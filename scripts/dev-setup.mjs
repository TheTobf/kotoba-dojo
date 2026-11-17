// Läuft automatisch vor `npm run dev`:
// 1. legt eine lokale .env mit zufälligen Test-Geheimnissen an (falls noch keine da ist),
// 2. richtet die lokale Datenbank ein (spielt alle Migrationen ein).
import { execFileSync } from 'node:child_process'
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envFile = join(root, '.env')

if (!existsSync(envFile)) {
  const vorlage = readFileSync(join(root, '.env.example'), 'utf8')
  const inhalt = vorlage
    .replace('SESSION_SECRET=__AUTO__', `SESSION_SECRET=${randomBytes(32).toString('hex')}`)
    .replace('STRIPE_WEBHOOK_SECRET=__AUTO__', `STRIPE_WEBHOOK_SECRET=whsec_lokal_${randomBytes(24).toString('hex')}`)
  writeFileSync(envFile, inhalt)
  console.log('✔ .env mit lokalen Test-Geheimnissen angelegt')
}

// Schlüssel für die Lern-Erinnerung (Web Push) ergänzen, falls sie fehlen (auch bei älteren .env-Dateien).
const env = readFileSync(envFile, 'utf8')
if (!/^VAPID_PRIVATE_JWK=./m.test(env)) {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const pub = publicKey.export({ format: 'jwk' })
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')])
  const lines = env.replace(/^VAPID_(PUBLIC_KEY|PRIVATE_JWK)=.*\n?/gm, '').trimEnd() +
    `\n\n# Lern-Erinnerung (Web Push), lokal erzeugt\nVAPID_PUBLIC_KEY=${raw.toString('base64url')}\nVAPID_PRIVATE_JWK=${JSON.stringify(privateKey.export({ format: 'jwk' }))}\n`
  writeFileSync(envFile, lines)
  console.log('✔ Schlüssel für Lern-Erinnerungen angelegt')
}

execFileSync(
  process.execPath,
  [join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'migrations', 'apply', 'kotoba-dojo', '--local'],
  { cwd: root, stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' } },
)
console.log('✔ Lokale Datenbank ist auf dem neuesten Stand')
