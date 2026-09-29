# Kotoba Dojo 言葉道場

Japanisch-Lern-App als PWA: Sätze statt Einzelwörter, Spaced Repetition (FSRS), Spiele und Motivation.
2034 Wörter in 339 Lektionen à 6 Wörtern, zuerst ein Reise-Block für die Japan-Reise (Sept. 2027).

## Bereiche

| Bereich | Inhalt |
|---|---|
| 🃏 Vokabeln | Karteikarten wie Anki mit 3D-Drehung, Schreibmaschinen-Text, Sounds, FSRS, „Kenn ich schon“ (→ 7 Tage), Wortliste, YouGlish-Link |
| ❓ Quiz | Lückentext: Auswahl, Eintippen (Romaji → Kana), Hören, Gemischt – eigene FSRS-Karten |
| 🧩 Satzbau | Sätze aus Kacheln bauen, Partikel-Lücken, 15 Grammatik-Lektionen mit Rollenfarben |
| ✍️ Schrift | Hiragana → Katakana → Kanji (Freischaltung ab 80 %), Blitz-Erkennen, Hören, Memory, Nachzeichnen mit Strichprüfung |
| 🗾 Ziele | 16 Japan-Situationen mit Fortschritt, freischaltbare Podcasts/Anime/Manga, Reise-Countdown |
| 📊 Statistik | Level/Rang, Trefferquote, Heatmap, Prognose fälliger Karten, Erfolge |
| ⚙️ Einstellungen | Farbthemen, Tageslimits, Ton, Furigana, Sicherung speichern/laden |

Motivation: XP, Level mit Rängen 見習い → 学生 → 先輩 → 先生 → 達人, Streak (Lerntag beginnt um 4 Uhr),
Tagesziel-Ring, 21 Erfolge, 6 freischaltbare Farbthemen, Maskottchen, Konfetti, Combo-Töne mit steigender Tonhöhe.
Alle Sounds werden live per Web Audio erzeugt (keine Dateien).

## Starten

```bash
npm install
npm run dev
```

Dann die angezeigte Adresse öffnen (Standard <http://localhost:5173>).

## Tests

```bash
npm test
```

## Build

```bash
npm run build
npm run preview
```

## Deployment auf GitHub Pages

Der Workflow `.github/workflows/deploy.yml` testet, baut (`GITHUB_PAGES=true` → Pfad `/kotoba-dojo/`) und veröffentlicht
bei jedem Push auf `main`. Einmalig nötig:

1. Auf GitHub ein Repository `kotoba-dojo` anlegen (öffentlich – Pages ist für private Repos kostenpflichtig).
2. Lokal verbinden und hochladen:
   ```bash
   git remote add origin https://github.com/<dein-name>/kotoba-dojo.git
   git push -u origin main
   ```
3. Im Repo: **Settings → Pages → Source: „GitHub Actions“**.

Danach läuft die App unter `https://<dein-name>.github.io/kotoba-dojo/`. Auf dem Handy im Browser öffnen →
„Zum Startbildschirm hinzufügen“ – dann funktioniert sie wie eine App, auch offline.

**Fortschritt übertragen:** Der Lernstand liegt lokal im Browser. Einstellungen → „Sicherung speichern“ auf Gerät A,
„Sicherung laden“ auf Gerät B.

## Lerndaten erzeugen

Die fertigen Daten liegen im Repo (`public/data/`, `public/audio/`). Neu erzeugen nur, wenn sich Wortanzahl,
manuelle Ergänzungen oder Quellen ändern:

```bash
npm run data:download
```

Lädt Rohdaten (~600 MB entpackt) nach `scripts/raw/`.

```bash
npm run data:build -- 2000
```

Baut Wörter/Sätze/Kanji (Zahl = Anzahl Wörter; Lektionsgröße `LESSON_SIZE` in `scripts/build-data.ts`, aktuell 6 –
anpassen, wenn sich das Reisedatum ändert). Braucht viel RAM: vorher in PowerShell
`$env:NODE_OPTIONS="--max-old-space-size=8192"` setzen. Offene Punkte stehen danach in `scripts/work/review.json`.

```bash
npm run audio:gen
```

Erzeugt Audio. Vorher die VOICEVOX-Engine starten
(`C:\Users\tobia\Tools\voicevox_engine\windows-cpu\run.exe --host 127.0.0.1 --port 50021`),
danach `npm run data:build` erneut ausführen, damit das Audio verknüpft wird.

```bash
npm run kana:build -- --audio
```

Kana-Daten mit Strichen und Aussprache für den Schrift-Bereich (VOICEVOX muss laufen; ohne `--audio` nur die Striche).

Handarbeit (Bedeutungen, Grammatik-Notizen, eigene Sätze, Korrekturen) steht in `scripts/manual/`:
`words*.json` (pro Wort-ID), `kanji*.json`, `lemmas.json` (Wortauswahl, Lesungen, Reise-Block). Quellen und Lizenzen: `SOURCES.md`.

## Aufbau

- `src/types.ts` – Datenmodell (Wörter, Sätze, Kanji, Kana, Karten, Profil, Einstellungen)
- `src/db.ts` – IndexedDB (Dexie) nur für Nutzerdaten + Export/Import
- `src/srs.ts` – FSRS-Planung (Karten je Bereich: vokabel/quiz/zeichen), Warteschlangen
- `src/quiz.ts`, `src/satzbau.ts`, `src/schrift.ts` – Übungslogik (getestet)
- `src/motivation.ts` – XP, Level, Streak, Erfolge, Themen; `src/sfx.ts` – Sounds
- `src/progress.ts`, `src/content/ziele.ts` – Japan-Situationen und Medien
- `src/content/grammatik.ts` – Grammatik-Lektionen
- `src/pages/` – die Bereiche; `scripts/` – Daten-Pipeline
- Lerninhalte werden als statisches JSON ausgeliefert und vom Service Worker offline gecacht.
