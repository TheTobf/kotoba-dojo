# Kotoba Dojo 言葉道場

Japanisch-Lern-App als PWA: Sätze statt Einzelwörter, Spaced Repetition (FSRS), Spiele und Motivation.

## Starten

```bash
npm install
npm run dev
```

Dann <http://localhost:5173> öffnen.

## Tests

```bash
npm test
```

## Build

```bash
npm run build
npm run preview
```

Für GitHub Pages: `GITHUB_PAGES=1 npm run build` (setzt den Pfad auf `/kotoba-dojo/`). Deployment-Anleitung folgt in Phase 8.

## Aufbau

- `src/types.ts` – Datenmodell (Wörter, Sätze, Kanji, Karten, Profil, Einstellungen)
- `src/db.ts` – IndexedDB (Dexie) nur für Nutzerdaten + Export/Import
- `src/pages/` – die 4 Bereiche plus Statistik und Einstellungen
- `scripts/` – Daten-Pipeline (ab Phase 2)
- Lerninhalte werden als statisches JSON ausgeliefert und vom Service Worker offline gecacht.
