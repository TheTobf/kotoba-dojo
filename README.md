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

## Lerndaten erzeugen

Die fertigen Daten liegen im Repo (`public/data/`, `public/audio/`). Neu erzeugen nur, wenn sich Wortanzahl,
manuelle Ergänzungen oder Quellen ändern:

```bash
npm run data:download
```

Lädt Rohdaten (~600 MB entpackt) nach `scripts/raw/`.

```bash
npm run data:build -- 200
```

Baut Wörter/Sätze/Kanji (Zahl = Anzahl Wörter). Braucht viel RAM: vorher in PowerShell
`$env:NODE_OPTIONS="--max-old-space-size=8192"` setzen. Offene Punkte stehen danach in `scripts/work/review.json`.

```bash
npm run audio:gen
```

Erzeugt Audio. Vorher die VOICEVOX-Engine starten
(`C:\Users\tobia\Tools\voicevox_engine\windows-cpu\run.exe --host 127.0.0.1 --port 50021`),
danach `npm run data:build` erneut ausführen, damit das Audio verknüpft wird.

Handarbeit (Bedeutungen, Grammatik-Notizen, eigene Sätze, Korrekturen) steht in `scripts/manual/`:
`words.json` (pro Wort-ID), `kanji.json`, `lemmas.json` (Wortauswahl, Lesungen). Quellen und Lizenzen: `SOURCES.md`.

## Aufbau

- `src/types.ts` – Datenmodell (Wörter, Sätze, Kanji, Karten, Profil, Einstellungen)
- `src/db.ts` – IndexedDB (Dexie) nur für Nutzerdaten + Export/Import
- `src/pages/` – die 4 Bereiche plus Statistik und Einstellungen
- `scripts/` – Daten-Pipeline (ab Phase 2)
- Lerninhalte werden als statisches JSON ausgeliefert und vom Service Worker offline gecacht.
