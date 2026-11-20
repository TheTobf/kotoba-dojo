---
description: Alle neuen Aufnahmen verarbeiten, selbst prüfen und die fertigen Videos rendern
---

Verarbeite alle Folgen, für die eine Aufnahme da ist (`recordings/epXX/voice.m4a|mp3|wav`), und rendere die fertigen Videos.
Läuft auf Tobias' Laptop. **VOICEVOX muss laufen**:
`C:\Users\tobia\Tools\voicevox_engine\windows-cpu\run.exe --host 127.0.0.1 --port 50021`

1. **Stimmen-Bedingungen** (einmalig bzw. bei neuer Stimme): `cd studio && npm run stimmen`. Lies jede Datei in
   `licenses/voicevox/*.md` vollständig. Trage für jede Stimme in `licenses/voicevox/geprueft.json` ein:
   `{ "Name": { "credit": "VOICEVOX:Name", "kommerziell": true/false, "geprueftAm": "JJJJ-MM-TT", "hinweise": "…" } }`.
   Ist eine Stimme nicht erlaubt: in `style/stilvorlage.json` eine andere wählen und Tobias Bescheid sagen.
2. `npm run fertig`. Das macht pro Folge: Aufnahme säubern, Versprecher/Wiederholungen per whisper.cpp erkennen (beste =
   letzte gute Fassung), VOICEVOX mit Lesungs-Prüfung, Zeitplan, Mischung, Standbilder und Bericht.
   Beim ersten Mal lädt es whisper.cpp und das Modell (einmalig, etwa 1,6 GB).
3. **Selbstkontrolle (Pflicht, jede Folge):** `out/epXX/kontrolle/BERICHT.md` lesen und **jedes Standbild** in
   `out/epXX/kontrolle/` mit dem Read-Tool ansehen. Checkliste:
   - Figur vollständig im Bild, nichts schneidet durcheinander
   - Text lesbar und in der Sicherheitszone (gestrichelter Rahmen)
   - Japanisch korrekt (Lernkasten = Lehrplan), Kana/Romaji/Deutsch stimmen
   - Stimme und Untertitel synchron (Bericht: Sätze mit < 85 % Übereinstimmung anhören bzw. Tobias fragen)
   - Lautstärke ausgewogen (Unterschied Stimme/Japanisch ≤ 3 LU)
   - Hook stark, Ende macht neugierig
   Fehler selbst beheben (`episode.json`: Kamera, Plätze, Aktionen; Szenen-Code), dann `npm run kontrolle -- epXX` wiederholen.
   Fehlt ein Satz in der Aufnahme: Tobias genau sagen, welchen Satz er nachsprechen soll.
4. Erst wenn alles passt: `npm run final -- epXX` → `out/epXX/video.mp4`, `cover.jpg`, `caption.txt`, `learned.json`,
   aktualisiert `out/POSTPLAN.md`. (`--trotzdem` nur, wenn ein Kontroll-Hinweis nachweislich ein Fehlalarm ist.)
5. Optional: Lektion in die App übernehmen. `out/epXX/learned.json` hat das Format von `src/content/story.ts` (Episode).
6. `docs/HANDOFF.md` + Obsidian-Notiz aktualisieren (fertige Folgen, Vorlauf, nächste Schritte), committen
   (Videos und Aufnahmen bleiben durch `.gitignore` draußen).
7. **Zusammenfassung für Tobias:** pro Folge, was gelernt wird, Renderzeit, Post-Tag, was er prüfen sollte
   (z. B. Sätze mit niedriger Übereinstimmung), und den Vorlauf laut `npm run status`.
