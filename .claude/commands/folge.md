---
description: Eine einzelne Folge erzeugen (ohne Angabe die nächste der laufenden Staffel)
argument-hint: "[optional: Situation, z. B. Apotheke]"
---

Erzeuge **eine** Folge von „Gestrandet in Japan“. Situation/Wunsch: $ARGUMENTS
(leer = die nächste noch nicht geplante Folge der laufenden Staffel laut `story/series.md`).

Es gelten dieselben Regeln wie bei `/staffel` (bitte `.claude/commands/staffel.md` lesen): Lehrplan (1–2 neue + 1 Wiederholung,
nur `ok`), Quiz-Moment, Hook in 2 s, 61–75 s, Cliffhanger, keine Werbung, respektvoll gegenüber Japan.

1. Lesen: `story/series.md`, `style/stilvorlage.json`, Lehrplan + `curriculum/progress.json`, die vorige Folge, `studio/src/scenes/registry.ts`.
2. `episodes/epXX/episode.json` schreiben (nächste freie Nummer, `postDate` = Tag nach der letzten geplanten Folge).
   Bei einer Sonder-Situation außerhalb des Staffel-Bogens: so einbauen, dass sie zur Geschichte passt, oder Tobias fragen.
3. Fehlt eine Szene oder Figur: in `registry.ts`/`figures.ts` eintragen und die Grafik in `studio/src/scenes/` bauen (Knete-Look, `Part`-Bausteine).
4. `cd studio && npm run pruefen -- epXX`, dann `npm run skripte`.
5. Vorschau: `npm run vorschau -- epXX` (Ersatzstimmen, `out/epXX/preview.mp4`, **nie posten**). Vorher die Standbilder in
   `out/epXX/kontrolle/` ansehen (Read-Tool, jedes Bild) und Probleme in `episode.json`/Szenen beheben.
6. `story/series.md`, `docs/HANDOFF.md`, Obsidian-Notiz aktualisieren, committen.
7. Tobias in 3–5 Zeilen: Titel, Problem, Lernsätze, Cliffhanger, Post-Tag, wo das Skript liegt.
