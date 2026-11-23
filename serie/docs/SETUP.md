# Einrichtung auf dem Laptop (Windows)

Der Laptop ist immer an und macht die eigentliche Arbeit: VOICEVOX, Spracherkennung und Rendern laufen dort lokal und kostenlos.

## Einmalig

PowerShell öffnen und einfügen:

```powershell
irm https://raw.githubusercontent.com/TheTobf/kotoba-dojo/ccr-0b3bf917-4jzi1j/serie/scripts/einrichten-windows.ps1 | iex
```

Das Skript installiert Git, Node.js, ffmpeg, VOICEVOX (Installer zum Durchklicken), whisper.cpp + Modell `ggml-small` (≈ 470 MB),
klont das Projekt nach `Dokumente\Projekte\kotoba-dojo` und macht einen Selbsttest. Erneut ausführen = aktualisieren.

Danach einmal:
1. `LICENSES.md` → VOICEVOX-Bedingungen prüfen, dann in `serie/style/stilvorlage.json` `"stimmenBedingungenGeprueft": true`.
2. Optional: `serie/serie.json` → `"eingangOrdner"` auf einen Ordner setzen, den Handy und Laptop synchronisieren
   (z. B. `"~/OneDrive/Sprachmemos"`). Sprachmemos mit „Folge 3“ im Namen landen dann automatisch bei `ep03`.
3. Startdatum fürs Posten in `serie/serie.json` (`startdatum`).

## Täglicher Ablauf

1. In der Claude-Desktop-App eine Claude-Code-Sitzung im Ordner `kotoba-dojo` öffnen.
2. `/status` – zeigt Vorlauf und fehlende Aufnahmen. Geht der Vorrat aus: `/staffel`.
3. `/skripte` – alle offenen Skripte in `serie/recordings/AUFNAHME.md`. Am Handy einsprechen, eine Datei pro Folge.
4. Datei als `serie/recordings/ep03/voice.m4a` ablegen (oder in den Eingangsordner, Name „Folge 3“).
5. `/fertig` – verarbeitet, prüft, rendert. Ergebnis in `serie/out/ep03/` (Video, Beschreibung, Cover, learned.json).
6. Posten nach `serie/out/POSTPLAN.md`.

## Werkzeuge

| Werkzeug | Wo | Zweck |
|---|---|---|
| VOICEVOX | `%LOCALAPPDATA%\Programs\VOICEVOX` | japanische Stimmen; die Pipeline startet die Engine (Port 50021) selbst |
| whisper.cpp | `serie\werkzeuge\whisper\` | Wort-Zeitmarken deiner Aufnahme |
| Chrome Headless Shell | lädt Remotion beim ersten Rendern automatisch | rendert die Bilder (mit Grafikkarte: `angle`) |

Umgebungsvariablen (nur falls nötig): `VOICEVOX_URL`, `VOICEVOX_ENGINE`, `WHISPER_EXE`, `WHISPER_MODELL`, `SERIE_GL` (`angle`/`swangle`).

## Befehle von Hand (ohne Claude)

```powershell
cd Dokumente\Projekte\kotoba-dojo\serie
npx tsx scripts/status.ts                        # Stand
npx tsx scripts/render.ts ep01 --vorschau        # Vorschau mit Ersatzstimme → episodes/ep01/preview.mp4
npx tsx scripts/fertig.ts                        # alle Aufnahmen verarbeiten und fertig rendern
npm run studio                                   # Remotion Studio zum Anschauen/Debuggen
npm test                                         # Tests
```
