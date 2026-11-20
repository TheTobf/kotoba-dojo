---
description: Nächste Staffel von „Gestrandet in Japan“ planen (7 Folgen, Lernsätze, alle episode.json und Sprechskripte)
---

Plane die **nächste Staffel** (7 Folgen = 1 Woche) der Serie „Gestrandet in Japan“. Sprich mit Tobias Deutsch und einfach.
Zusätzliche Wünsche von Tobias: $ARGUMENTS

## 1. Lesen (Pflicht)
- `story/series.md` (Gesamtgeschichte, Staffel-Bogen, Figuren, Orte, laufende Fäden, was Ole schon kann)
- `style/stilvorlage.json` (Schnittregeln, Stimmen, verbotene Wörter)
- `curriculum/curriculum.json` (nur `status: "ok"`), `curriculum/progress.json` (was schon dran war)
- die letzte geplante Folge `episodes/epXX/episode.json` und `episodes/ep01/episode.json` als Vorbild
- `studio/src/episode/schema.ts` (Aufbau), `studio/src/scenes/registry.ts` (Szenen, Plätze, Kameras), `studio/src/characters/figures.ts`

## 2. Planen
- Staffel-Ziel und großer Cliffhanger kommen aus dem Staffel-Bogen in `series.md`. Er darf verbessert werden, muss aber zur Gesamtgeschichte passen.
- Pro Folge **ein konkretes Problem**, das nur mit dem richtigen Satz gelöst wird. Spannend, eher witzig. Der Witz kommt aus Oles Missgeschicken, **nie aus Japan**. Keine Klischees, Japaner sind freundlich und kompetent.
- Lernsätze: **1–2 neue** (noch nicht eingeführt, nach Nutzen im Lehrplan) plus **1 Wiederholung** aus früheren Folgen, natürlich eingebaut. Nur Sätze mit `status: "ok"`. Jede Folge hat einen **Quiz-Moment** mit einem neuen SAGEN-Satz (Ole spricht die Lösung).
- Länge 61–75 s: etwa 110–130 gesprochene deutsche Wörter in 18–24 kurzen Sätzen plus 2–3 japanische Abschnitte.
- Hook: Der erste Satz spielt mitten im Problem, höchstens 9 Wörter, dazu ein starker Hook-Titel (≤ 26 Zeichen).
- Ende: Cliffhanger auf die nächste Folge, kurz und neugierig machend (`endCard`).
- **Keine Werbung:** kein App-Hinweis, keine Wörter aus `verboteneWoerter`.
- Post-Tage: täglich, direkt nach der letzten geplanten Folge (`postDate`).

## 3. Schreiben
- Für jede Folge `episodes/epXX/episode.json` (fortlaufende Nummer). Sprechskript-Nummern `n` zählen pro Folge ab 1.
- Szenen: vorhandene wiederverwenden. Neue Orte in `studio/src/scenes/registry.ts` eintragen (mit Plätzen, Kameras über `framed(...)`, `built: false`) und die Grafik in `studio/src/scenes/` bauen, sobald die Folge gerendert werden soll. Neue Personen in `figures.ts` (schlicht, keine Firmenfarben/Logos).
- Kameras: Hochformat beachten. Das Bild zeigt seitlich nur 56 % der Höhe, Ole ist fast so breit wie hoch. Gesichter oberhalb der Bildmitte, unten liegt der Lernkasten.

## 4. Prüfen und Skripte
```
cd studio
npm run pruefen        # alle Fehler beheben, Hinweise ernst nehmen
npm run skripte        # recordings/epXX/script.md, recordings/AUFNAHME.md, progress.json
```

## 5. Übergabe
- `story/series.md` aktualisieren: Staffel-Tabelle, laufende Fäden, „Was Ole schon kann“. Ersetzen, nicht anhängen.
- `docs/HANDOFF.md` (Abschnitt Folgen-Generator) und die Obsidian-Notiz `docs/obsidian/Kotoba Dojo – Übersicht.md` aktualisieren.
- Git-Commit mit klarer deutscher Nachricht.

## 6. Tobias zeigen und auf OK warten
Kurze Tabelle: Folge · Post-Tag · Titel · Problem · neue Sätze (Japanisch + Deutsch) · Wiederholung · Cliffhanger.
Dazu: „Einsprechen: `recordings/AUFNAHME.md`“. Erst nach seinem OK Vorschauen rendern (`npm run vorschau -- epXX`).
