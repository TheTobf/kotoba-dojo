/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// GitHub Pages liefert die App unter /kotoba-dojo/ aus.
const base = process.env.GITHUB_PAGES ? '/kotoba-dojo/' : '/'

export default defineConfig({
  base,
  // Rohdaten (hunderte MB) und Arbeitsdateien nicht beobachten/scannen.
  server: { watch: { ignored: ['**/scripts/raw/**', '**/scripts/work/**'] } },
  optimizeDeps: { entries: ['index.html'] },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Kotoba Dojo – Japanisch lernen',
        short_name: 'Kotoba Dojo',
        description: 'Japanisch lernen mit Sätzen, Spaced Repetition und Spielen',
        lang: 'de',
        theme_color: '#1a1026',
        background_color: '#1a1026',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App + Wort-/Satzdaten sofort offline; Audio und Strichdaten beim ersten Gebrauch (sonst zu groß).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}', 'data/*.json'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/audio/') || url.pathname.includes('/data/strokes/') || url.pathname.includes('/data/kana-strokes/'),
            handler: 'CacheFirst',
            options: { cacheName: 'lernmedien', expiration: { maxEntries: 20000 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
  },
})
