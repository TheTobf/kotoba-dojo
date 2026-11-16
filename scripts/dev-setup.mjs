// Läuft automatisch vor `npm run dev`:
// 1. legt eine lokale .env mit zufälligen Test-Geheimnissen an (falls noch keine da ist),
// 2. richtet die lokale Datenbank ein (spielt alle Migrationen ein).
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
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

execFileSync(
  process.execPath,
  [join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'migrations', 'apply', 'kotoba-dojo', '--local'],
  { cwd: root, stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' } },
)
console.log('✔ Lokale Datenbank ist auf dem neuesten Stand')
