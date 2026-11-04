# Lernzettel-App – Anleitung für Claude

Diese App zeigt die Lernzettel, die Claude für das Studium des Nutzers schreibt (Handy-PWA, offline).
Wenn der Nutzer „Mach mir Lernzettel für … Übung …“ oder „Mach mir den Klausur-Lernzettel für …“ sagt, gilt diese Anleitung.

## Wohin?

Ein Lernzettel = eine Markdown-Datei in `lernzettel/inhalte/<fach>/`. Der Ordner bestimmt das Fach.

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

## Kopfbereich (Pflicht)

```markdown
---
titel: Kettenregel und Produktregel
typ: uebung
uebung: 3
teil: 1
datum: 2026-11-04
kurz: Ein Satz, worum es geht (erscheint in der Liste).
---
```

- `typ`: `uebung` (zu einer Übung), `klausur` (Klausur-Zusammenfassung) oder `extra`
- `uebung`: Nummer der Übung – Pflicht bei `typ: uebung`
- `teil`: nur wenn es mehrere Lernzettel zur selben Übung (bzw. mehrere Klausur-Lernzettel) gibt
- `datum`: Stand im Format JJJJ-MM-TT
- Titel mit Doppelpunkt in Anführungszeichen setzen: `titel: "Bilanz: Aufbau"`
- **Keine** `# Überschrift` im Text – der Titel wird von der App angezeigt. Abschnitte mit `##` (werden zum Inhaltsverzeichnis), Unterpunkte mit `###`.

## Bausteine

Kästen (jede Zeile beginnt mit `>`; eigener Titel hinter dem Typ ist optional):

```markdown
> [!MERKE] Kettenregel
> Äußere Ableitung mal innere Ableitung.
```

| Typ | Wofür | Aussehen |
|---|---|---|
| `[!MERKE]` | Kernaussage, die sitzen muss | blau 💡 |
| `[!DEFINITION]` | Fachbegriff exakt definiert | indigo 📖 |
| `[!FORMEL]` | Formel/Regel/Schema | lila 🧮 |
| `[!BEISPIEL]` | durchgerechnetes Beispiel | grün ✏️ |
| `[!ACHTUNG]` | typische Fehler, Fallen | rot ⚠️ |
| `[!TIPP]` | Klausurtipp, Eselsbrücke | orange 🎯 |
| `[!AUFGABE]` | Selbsttest-Aufgabe | grau 📝 |
| `[!LOESUNG]` | Lösung – **zugeklappt**, erst nach Antippen sichtbar | türkis ✅ |
| `[!ZUSAMMENFASSUNG]` | „Kurz & knapp“ am Ende | pink 📌 |

Formeln (KaTeX): inline `$f'(x) = 2x$`, abgesetzt mit `$$` jeweils **auf eigener Zeile**:

```markdown
$$
K'(x) = 0{,}5x + 20
$$
```

Dezimalkomma in Formeln als `{,}` schreiben (`0{,}5`), Text in Formeln mit `\text{…}`. Geldbeträge im Fließtext mit €, nicht mit `$`.

Checkliste (wird in der App jede Woche neu abgehakt; sind alle Punkte abgehakt, gilt der Lernzettel für diese Woche als erledigt):

```markdown
- [ ] Ich kann die Kettenregel anwenden.
```

Außerdem: Tabellen (auf dem Handy seitlich wischbar), nummerierte Listen für Rechenwege, `**fett**` für Schlüsselbegriffe, `<mark>…</mark>` für Hervorhebungen.

## Aufbau eines Übungs-Lernzettels

1. `## Worum geht's?` – 2–4 Sätze: Thema, wozu man es braucht, Bezug zur Vorlesung
2. `## Begriffe` – `[!DEFINITION]`-Kästen oder Tabelle
3. `## Formeln & Regeln` – `[!FORMEL]`/`[!MERKE]`, alles, was man auswendig können muss
4. `## So gehst du vor` – Schritt-für-Schritt-Rezept **pro Aufgabentyp** der Übung
5. `## Beispiele` – je Aufgabentyp mindestens ein vollständig durchgerechnetes `[!BEISPIEL]` im Stil der Übung, mit allen Zwischenschritten
6. `## Typische Fehler` – `[!ACHTUNG]`
7. `## Selbsttest` – je Aufgabentyp eine `[!AUFGABE]` mit direkt folgender `[!LOESUNG]` (andere Zahlen als in den Beispielen)
8. `## Checkliste – das kann ich` – 4–8 Punkte „Ich kann …“

Länge: so lang wie nötig, damit nichts fehlt – lieber vollständig als knapp. Eine Übung mit klar getrennten Themen in
mehrere Lernzettel (`teil: 1`, `teil: 2`, …) aufteilen; jeder Teil muss für sich allein verständlich sein.

## Klausur-Lernzettel (vor der Klausur)

- `typ: klausur`, Datei `klausur-….md` (bei viel Stoff mehrere Teile)
- Fasst **alle** Übungs-Lernzettel des Fachs zusammen: pro Thema die wichtigsten Definitionen, Formeln, das Vorgehen und
  ein kompaktes Beispiel; dazu Klausurtipps und häufige Fehler
- Am Ende eine Checkliste, die jedes Thema abdeckt – der Nutzer geht diesen Zettel **jede Woche** durch
- Sobald ein Fach einen Klausur-Lernzettel hat, steht im Wochen-Check der App nur noch dieser (statt aller Übungen)

## Qualitätsregeln

- Inhalt **nur aus den Unterlagen** des Nutzers (Übungsblatt, Lösungen, Folien, Skript). Nichts erfinden, Notation und
  Begriffe des Kurses übernehmen. Fehlen Unterlagen oder ist etwas unklar: nachfragen bzw. im Zettel als
  `[!ACHTUNG] Unsicher` kennzeichnen.
- Jede Aufgabe des Übungsblatts muss sich mit dem Lernzettel lösen lassen.
- Alle Rechnungen nachrechnen.
- Deutsch, du-Form, kurze Sätze.
- Fachspezifisch:
  - **Mathe:** Rechenwege vollständig, Umformungen begründen, Definitionsbereiche/Sonderfälle nennen.
  - **Externes Rechnungswesen:** Buchungssätze als Tabelle (`| Soll | Haben | Betrag |`), Konten/Kontenarten, Paragraphen
    (HGB) angeben, Bilanz-/GuV-Schemata als Tabelle.
  - **Internationales Management:** Modelle mit Definition, Annahmen, Vor-/Nachteilen (Tabelle) und Praxisbeispiel;
    ähnliche Konzepte voneinander abgrenzen.
  - **Wirtschaftsinformatik:** Begriffe, Abläufe als nummerierte Listen, Modelle/Tabellen, Code in Codeblöcken.

## Ablauf

1. Datei(en) in `lernzettel/inhalte/<fach>/` anlegen (Vorlage: `inhalte/mathe/extra-beispiel-ableitungsregeln.md`).
2. `cd lernzettel && npm test` – prüft Kopfbereich, doppelte Übungsnummern und ob alle Formeln darstellbar sind.
3. Committen und pushen. Online (GitHub Pages) erscheinen die Lernzettel, sobald der Stand auf `main` ist; die App zeigt
   dann „Neue Lernzettel sind da“.

Technik: Vite + React + TypeScript + Tailwind, Markdown mit `marked` + KaTeX (`src/markdown.ts`), Daten nur lokal im
Browser (`src/speicher.ts`), Wochenlogik in `src/zettel.ts`/`src/woche.ts`. `npm run dev`, `npm test`, `npm run build`.
