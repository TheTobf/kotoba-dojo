/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// GitHub Pages liefert die App unter /kotoba-dojo/lernzettel/ aus (neben Kotoba Dojo).
const base = process.env.GITHUB_PAGES ? '/kotoba-dojo/lernzettel/' : '/'

export default defineConfig({
  base,
  define: { __BAUZEIT__: JSON.stringify(new Date().toISOString()) },
  // KaTeX (Formeln) macht das Paket groß – es wird einmal geladen und dann offline gespeichert.
  build: { chunkSizeWarningLimit: 900 },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: 'lernzettel',
        name: 'Lernzettel',
        short_name: 'Lernzettel',
        description: 'Deine Lernzettel für alle Module – pro Übung, mit Klausur-Zusammenfassung und Wochen-Check',
        lang: 'de',
        theme_color: '#f5f3ee',
        background_color: '#f5f3ee',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Alles (inkl. Lernzettel und Formel-Schriften) sofort offline verfügbar.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
