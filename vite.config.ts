import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// `npm run dev` startet hiermit alles zusammen: Oberfläche (Vite), Server (Cloudflare Worker) und lokale Datenbank (D1).
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Kotoba Dojo – Japanisch lernen',
        short_name: 'Kotoba Dojo',
        description: 'Japanisch lernen mit Sätzen, Story und Gesprächen',
        lang: 'de',
        start_url: '/app',
        scope: '/',
        theme_color: '#f6f3ec',
        background_color: '#f6f3ec',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // App und Lerndaten sofort offline. Schriften (viele kleine Teil-Dateien) erst beim ersten Gebrauch.
        globPatterns: ['**/*.{js,css,html,svg,png}', 'data/*.json'],
        // Lern-Erinnerung: Benachrichtigung anzeigen, wenn der Server das tägliche Signal schickt.
        importScripts: ['push-sw.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Die API wird nie zwischengespeichert – Abo-Stand und Konto kommen immer frisch vom Server.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Strichdaten für Kana und Kanji: erst beim ersten Ansehen laden, danach auch offline.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && (url.pathname.startsWith('/data/strokes/') || url.pathname.startsWith('/data/kana-strokes/')),
            handler: 'CacheFirst',
            options: { cacheName: 'striche', expiration: { maxEntries: 1500 } },
          },
          {
            // Sprachaufnahmen: beim ersten Abspielen merken, danach auch offline.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/audio/') && url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: { cacheName: 'aufnahmen', expiration: { maxEntries: 6000 } },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith('.woff2'),
            handler: 'CacheFirst',
            options: { cacheName: 'schriften', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
