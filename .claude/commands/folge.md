---
description: Einzelne Folge „Gestrandet in Japan“ erzeugen (ohne Angabe: nächste Folge der laufenden Staffel)
argument-hint: "[optional: Situation, z. B. 'Apotheke']"
---
Erzeuge **eine** neue Folge der Serie „Gestrandet in Japan“ im Ordner `serie/`. Situation: $ARGUMENTS (leer = nächste Folge der laufenden Staffel laut `serie/story/series.md`).

Gehe vor wie in `/staffel` (Schritte 1, 3–7), nur für eine Folge:
- Lies series.md, stilvorlage.json, progress.json, curriculum.json, die letzte episode.json.
- 1–2 neue Lehrplan-Sätze passend zur Situation + genau 1 Wiederholung, kein `[PRÜFEN]`-Eintrag.
- `serie/episodes/epXX/episode.json` schreiben, `npx tsx scripts/pruefe-folge.ts epXX` (ohne ❌), Vorschau-Kontrolle mit `npx tsx scripts/render.ts epXX --vorschau --nur-kontrolle`, Kontaktbogen selbst ansehen, Fehler beheben.
- Optional Vorschau-Video: `npx tsx scripts/render.ts epXX --vorschau` → `serie/episodes/epXX/preview.mp4` (nie als fertiges Video ausgeben).
- series.md (Folgen-Log, Fäden) aktualisieren, Skript liegt in `serie/recordings/epXX/script.md`.
- Kurz berichten: Titel, Problem, neue Sätze, Wiederholung, Cliffhanger, geschätzte Länge. Committen und pushen.
