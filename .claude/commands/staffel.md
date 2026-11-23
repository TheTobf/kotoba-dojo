---
description: Nächste Staffel „Gestrandet in Japan“ planen (7 Folgen) – alle episode.json + script.md, Übersicht zum Absegnen
---
Plane die nächste Staffel der Serie „Gestrandet in Japan“. Arbeite im Ordner `serie/`. $ARGUMENTS

1. Lies zuerst: `serie/story/series.md` (Stand, Bogen, Fäden, Folgen-Log), `serie/style/stilvorlage.json`, `serie/curriculum/progress.json`, `serie/curriculum/curriculum.json`, die letzte vorhandene `serie/episodes/epXX/episode.json` (als Vorlage fürs Format) und `serie/src/folge/typen.ts` (Format).
2. Staffel = nächste Staffel laut series.md (Ziel, Themen, großer Cliffhanger). Folgen-Nummern laufen weiter (ep08, ep09 …).
3. Lernsätze wählen: pro Folge 1–2 **neue** Einträge (nach `rang`, passend zu den Themen der Staffel, noch nicht in progress.json/früheren Folgen) + **genau 1 Wiederholung** aus früheren Folgen. Nie einen Eintrag mit `pruefen ≠ null`.
4. Pro Folge `serie/episodes/epXX/episode.json` schreiben:
   - Hook in den ersten 2 s (mitten im Problem, `texte` mit `art: "hook"` ab dem ersten Segment), ein konkretes Problem, das nur der richtige Satz löst, 1–2 lustige Fehlversuche, Quiz (`art: "quiz"`) direkt vor der japanischen Auflösung (`wiederholen: true`), Wiederholungssatz natürlich in der Szene, Ende mit Cliffhanger zur nächsten Folge (Folge 7: großer Staffel-Cliffhanger), `naechste` = Teaser.
   - Deutsche Erzählsätze kurz und gut sprechbar (≤ 14 Wörter), Regie in `regie`. Länge 61–75 s (≈ 120–140 gesprochene Wörter + Japanisch).
   - Japanisch nur aus dem Lehrplan (`curriculum`) – freie Sätze nur wenn nötig, kurz, Standard-Höflichkeitsform, mit kana/romaji/de; doppelt prüfen.
   - Shots: Szenen nur aus dem Baukasten (`flughafen`, `bahnsteig`, `konbini`, `strasse`, `hotel`; neue Szene nur bei echtem Bedarf in `serie/src/szenen/` bauen und wiederverwenden). Figuren `knoe`, `mensch` (Varianten in `src/figuren/Mensch.tsx`), `kraehe`. Dialoge mit `ueberSchulter` (fokus/gegen). Neuer Shot ungefähr alle 1–3 Segmente; lange Shots teilt die Pipeline automatisch.
   - Respektvoll, nie klischeehaft: Witz kommt aus Knös Missverständnissen, nicht aus Japan.
5. `cd serie && npx tsx scripts/pruefe-folge.ts epXX …` für alle 7 Folgen → muss ohne ❌ durchlaufen; schreibt automatisch `serie/recordings/epXX/script.md`.
6. Für jede Folge Vorschau-Kontrolle: `npx tsx scripts/render.ts epXX --vorschau --nur-kontrolle`, dann `serie/episodes/epXX/kontrolle/kontaktbogen.jpg` **selbst ansehen** (Figur ganz im Bild, nichts verdeckt, Text lesbar) und Fehler beheben.
7. `serie/story/series.md` aktualisieren (Stand, Folgen-Log, Fäden). `npx tsx scripts/skripte.ts` und `npx tsx scripts/status.ts` ausführen.
8. Zeig mir eine **Übersicht zum Absegnen**: Tabelle Folge | Titel | Problem | neue Sätze (ja + de) | Wiederholung | Cliffhanger, darunter freie japanische Sätze zum Gegenlesen. Noch nichts final rendern.
9. Committen und auf den Session-Branch pushen (Serien-Dateien sind getrennt vom App-Code).
