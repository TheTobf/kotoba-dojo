# Einrichtung auf dem Laptop (Windows)

Der Laptop ist immer an und macht die eigentliche Arbeit: VOICEVOX, Spracherkennung und Rendern laufen dort lokal und kostenlos.

## Einmalig

PowerShell öffnen und einfügen:

```powershell
irm https://raw.githubusercontent.com/TheTobf/kotoba-dojo/ccr-0b3bf917-4jzi1j/serie/scripts/einrichten-windows.ps1 | iex
```

Das Skript installiert Git, Node.js, ffmpeg, VOICEVOX (Installer zum Durchklicken), whisper.cpp + Modell `ggml-small` (≈ 470 MB),
klont das Projekt nach `Dokumente\Projekte\kotoba-dojo` und macht einen Selbsttest. Erneut ausführen = aktualisieren.

Das Skript fragt außerdem nach dem **ElevenLabs-Schlüssel** (wird nur lokal als Benutzer-Umgebungsvariable gespeichert)
und ob jede Nacht um 3:10 automatisch bis zu 3 Folgen gerendert werden sollen (geplante Aufgabe, Protokoll `serie/out/automatik.log`).

Danach einmal:
1. `LICENSES.md` → VOICEVOX-Bedingungen prüfen, dann in `serie/style/stilvorlage.json` `"stimmenBedingungenGeprueft": true`.
2. Optional: `serie/serie.json` → `"eingangOrdner"` auf einen Ordner setzen, den Handy und Laptop synchronisieren
   (z. B. `"~/OneDrive/Sprachmemos"`). Sprachmemos mit „Folge 3“ im Namen landen dann automatisch bei `ep03`.
3. Startdatum fürs Posten in `serie/serie.json` (`startdatum`).

## Ablauf (vollautomatisch mit ElevenLabs)

1. Einmal pro Woche in der Claude-Desktop-App (Ordner `kotoba-dojo`): `/staffel` → Übersicht absegnen.
2. Nachts rendert der Laptop automatisch die nächsten Folgen (oder sofort: `/fertig`). Ergebnis in `serie/out/epXX/`.
3. Posten nach `serie/out/POSTPLAN.md` – beim Posten das KI-Label einschalten (steht in caption.txt).
4. `/status` zeigt Vorlauf und ElevenLabs-Guthaben.

Eigene Stimme statt KI (z. B. ab 10.000 Followern): in `serie/style/stilvorlage.json` `erzaehler.quelle` auf `"aufnahme"` setzen,
dann `/skripte` → einsprechen → `serie/recordings/ep03/voice.m4a` (oder Eingangsordner) → `/fertig`. Eine vorhandene Aufnahme hat immer Vorrang.

## Werkzeuge

| Werkzeug | Wo | Zweck |
|---|---|---|
| VOICEVOX | `%LOCALAPPDATA%\Programs\VOICEVOX` | japanische Stimmen; die Pipeline startet die Engine (Port 50021) selbst |
| whisper.cpp | `serie\werkzeuge\whisper\` | Wort-Zeitmarken deiner Aufnahme |
| Chrome Headless Shell | lädt Remotion beim ersten Rendern automatisch | rendert die Bilder (mit Grafikkarte: `angle`) |

Umgebungsvariablen (nur falls nötig): `VOICEVOX_URL`, `VOICEVOX_ENGINE`, `WHISPER_EXE`, `WHISPER_MODELL`, `SERIE_GL` (`angle`/`swangle`).

## Befehle von Hand (ohne Claude)

In PowerShell `npx.cmd` statt `npx` schreiben (die Windows-Skriptrichtlinie blockiert `npx.ps1`).

```powershell
cd Dokumente\Projekte\kotoba-dojo\serie
npx.cmd tsx scripts/status.ts                        # Stand
npx.cmd tsx scripts/render.ts ep01 --vorschau        # Vorschau mit Ersatzstimme → episodes/ep01/preview.mp4
npx.cmd tsx scripts/fertig.ts                        # alle Aufnahmen verarbeiten und fertig rendern
npm.cmd run studio                                   # Remotion Studio zum Anschauen/Debuggen
npm.cmd test                                       # Tests
```
