/**
 * Bildschirmfotos der App für ein App-Video: npm run app:bilder -- app-01
 * Vorher die App starten (im Repo-Ordner: npm run dev → http://localhost:5173). KOTOBA_APP_URL überschreibt die Adresse.
 * Nutzt einen vorhandenen Browser (Windows: Edge, sonst Chrome bzw. KOTOBA_BROWSER) – nichts wird heruntergeladen.
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { APPVIDEOS_DIR } from './lib/paths'
import { loadApp } from './lib/project'

const id = process.argv[2]
if (!id?.startsWith('app-')) throw new Error('Bitte App-Video angeben, z. B. app-01')
const app = loadApp(id)
const base = process.env.KOTOBA_APP_URL ?? 'http://localhost:5173'
const dir = join(APPVIDEOS_DIR, id, 'screens')
mkdirSync(dir, { recursive: true })
const browser = await chromium.launch(process.env.KOTOBA_BROWSER ? { executablePath: process.env.KOTOBA_BROWSER } : { channel: process.platform === 'win32' ? 'msedge' : 'chrome' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'light' })
for (const s of app.screens) {
  await page.goto(base + s.pfad, { waitUntil: 'networkidle' })
  if (s.warten) await page.getByText(s.warten).first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(dir, s.datei) })
  console.log(`✓ screens/${s.datei} ← ${s.pfad}`)
}
await browser.close()
