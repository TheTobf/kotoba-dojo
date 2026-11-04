# Lernzettel-App – Anleitung für Claude

Diese App zeigt die Lernzettel, die Claude für das Studium des Nutzers schreibt (Handy-PWA, offline).

**Format, Aufbau, Test-Regeln und Qualitätsregeln stehen in [`FORMAT.md`](FORMAT.md) – vor jedem neuen Lernzettel lesen.**
Dieselbe Datei steckt (über `src/projektanweisung.ts`) in den Projektanweisungen, die der Nutzer aus der App in seine
claude.ai-Projekte kopiert. Änderungen am Format also immer dort machen.

## Was der Nutzer erwartet (merken!)

- Schickt der Nutzer Unterlagen (Folien, Übungsblätter, Lösungen – Foto/PDF), **ohne Nachfrage** daraus Lernzettel
  machen und in die App legen: pro Übung mindestens ein Lernzettel, bei mehreren Themen mehrere Teile.
- **Jeder Lernzettel hat am Ende einen Multiple-Choice-Test** (`## Test` mit `[!FRAGE]`-Kästen, 4 Antworten, davon
  1–2 offensichtlich falsch und 1–2 plausibel, mittleres Niveau). Der Abschlusstest pro Fach wird von der App
  automatisch aus allen Fragen gemischt.
- Vor der Klausur: Klausur-Lernzettel (`typ: klausur`) mit großem Test.
- Fügt der Nutzer Lernzettel-Text aus einem claude.ai-Projekt ein (beginnt mit `---` und `titel:`), diesen als Datei
  übernehmen (gleiches Fach/Übung/Teil → vorhandene Datei ersetzen).

## Wohin?

Ein Lernzettel = eine Markdown-Datei in `lernzettel/inhalte/<fach>/`. Der Ordner bestimmt das Fach
(`fach:` im Kopf ist optional, muss aber zum Ordner passen).

| Ordner | Modul | Hinweis |
|---|---|---|
| `mathe` | Mathe | |
| `externes-rechnungswesen` | Externes Rechnungswesen | |
| `internationales-management` | Internationales Management | |
| `wirtschaftsinformatik` | Wirtschaftsinformatik | läuft erst ab 1. Dezember 2026 |

Neues Fach: in `src/faecher.ts` eintragen und Ordner anlegen.

Dateinamen (klein, ohne Umlaute):

- Übung: `uebung-03-kurztitel.md`, bei mehreren Lernzetteln zur selben Übung `uebung-03-1-…`, `uebung-03-2-…`
- Klausur-Lernzettel: `klausur-kurztitel.md` bzw. `klausur-1-…`, `klausur-2-…`
- Sonstiges: `extra-kurztitel.md`

Vorlage: `inhalte/mathe/extra-beispiel-ableitungsregeln.md`.

## Ablauf

1. Datei(en) anlegen.
2. `cd lernzettel && npm test` – prüft Kopfbereich, doppelte Übungsnummern, ob alle Formeln darstellbar sind und ob
   jeder Lernzettel einen Test mit mindestens 5 korrekten Fragen hat.
3. Committen und pushen. Online (GitHub Pages) erscheinen die Lernzettel, sobald der Stand auf `main` ist; die App zeigt
   dann „Neue Lernzettel sind da“.

## Technik

Vite + React + TypeScript + Tailwind. Markdown mit `marked` + KaTeX (`src/markdown.ts`; `[!FRAGE]`-Kästen werden dort
aus dem Lesetext entfernt), Testfragen in `src/fragen.ts`, Test-Ablauf in `src/pages/Test.tsx`. Nutzerdaten
(Wochen-Check, Testergebnisse, eingefügte Lernzettel) nur lokal im Browser (`src/speicher.ts`). Wochenlogik in
`src/zettel.ts`/`src/woche.ts`. `npm run dev`, `npm test`, `npm run build`.
