# Serie „Gestrandet in Japan“ – Anleitung für Claude

Folgen-Generator für eine tägliche Kurzvideo-Serie (Japanisch lernen mit dem Maskottchen Knö). Läuft normalerweise auf dem
Laptop des Nutzers (Windows, immer an); dort rendern VOICEVOX, whisper.cpp und Remotion lokal. 0 € Zusatzkosten.

- **Zuerst lesen:** `docs/HANDOFF.md` (Stand), `story/series.md` (Geschichte, Fäden, Folgen-Log), `style/stilvorlage.json` (fester Stil + Schnittregeln).
- **Befehle:** `/staffel`, `/folge`, `/skripte`, `/fertig`, `/status`, `/appvideo` (in `../.claude/commands/`).
- **Regeln:** Japanisch nur aus `curriculum/curriculum.json` (nie `[PRÜFEN]`-Einträge); freie Sätze doppelt prüfen und melden. Pro Folge 1–2 neu + 1 Wiederholung.
  Keine Werbung in Folgen; App-Videos klar als Werbung. Keine fremden Bilder/Logos/Marken/Musik. Respektvoll, nie klischeehaft.
- **Nie** ein Video mit Vorschau-Stimme als fertiges Video ausgeben (`preview.mp4` bleibt in `episodes/`).
- **Selbstkontrolle ist Pflicht:** `npx tsx scripts/render.ts epXX [--vorschau] --nur-kontrolle`, Bericht lesen **und** Kontaktbogen/Standbilder selbst ansehen, Fehler beheben, erst dann rendern.
- Nach Änderungen: `npm test` (Abgleich, Ausgaben, Lehrplan, Typen). `story/series.md`, `docs/HANDOFF.md`, `docs/obsidian-kotoba-dojo-uebersicht.md` aktuell halten.
- Serien-Dateien liegen getrennt vom App-Code (`../src`); App-Änderungen nur per eigenem PR.
