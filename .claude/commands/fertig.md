---
description: Alle geplanten Folgen/App-Videos (ElevenLabs oder eigene Aufnahme) prüfen und final rendern
---
Arbeite im Ordner `serie/`.

1. Voraussetzungen prüfen: VOICEVOX läuft oder ist installiert (die Pipeline startet die Engine selbst); Erzählung: `ELEVENLABS_API_KEY` gesetzt (Standard, vollautomatisch) oder Aufnahme + whisper.cpp in `serie/werkzeuge/whisper/` (sonst `serie/scripts/einrichten-windows.ps1` erneut ausführen lassen). ElevenLabs-Guthaben im Blick behalten (die Pipeline bricht ab, bevor es überzogen wird). `stimmenBedingungenGeprueft` in `style/stilvorlage.json` muss `true` sein (siehe `serie/LICENSES.md`).
2. Erst nur prüfen: `npx tsx scripts/fertig.ts --nur-kontrolle`. Für jede Folge `serie/episodes/epXX/kontrolle/bericht.md` lesen und **die Standbilder bzw. den Kontaktbogen selbst ansehen**. Checkliste: Figur vollständig im Bild, nichts schneidet/verdeckt, Text lesbar und in der Sicherheitszone, Japanisch korrekt, Stimme und Untertitel synchron (Erkennungs-Score ≥ 75 %), Lautstärke Stimme/VOICEVOX ausgewogen, Hook stark genug.
3. Fehler selbst beheben (episode.json, Kamera, Text; bei unsicherer Erkennung `serie/episodes/epXX/aufnahme/woerter.json` prüfen) und erneut prüfen.
4. Dann final: `npx tsx scripts/fertig.ts` → `serie/out/epXX/` mit video.mp4, caption.txt, cover.jpg, learned.json (Folgen), kontrolle.md; `serie/out/POSTPLAN.md` wird aktualisiert, `curriculum/progress.json` merkt sich die Sätze.
5. `serie/story/series.md` (Stand, Log), `serie/docs/HANDOFF.md` und `serie/docs/obsidian-kotoba-dojo-uebersicht.md` aktualisieren.
6. Zusammenfassung im Chat: pro Video was gelernt wird, Renderzeit, Lautheit, was ich prüfen sollte (z. B. unsichere Zeilen), Posttermin. Committen und pushen (Videos sind per .gitignore ausgeschlossen).
