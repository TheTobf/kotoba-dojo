# Lernzettel-Format (Lernzettel-App)

Jeder Lernzettel ist Markdown mit einem Kopfbereich. Die App zeigt ihn mit Formeln, farbigen Kästen,
zugeklappten Lösungen, einer wöchentlichen Checkliste und einem Multiple-Choice-Test am Ende an.

## Kopfbereich (Pflicht)

```markdown
---
titel: Kettenregel und Produktregel
fach: mathe
typ: uebung
uebung: 3
teil: 1
datum: 2026-11-04
kurz: Ein Satz, worum es geht (erscheint in der Liste).
---
```

- `fach`: `mathe`, `externes-rechnungswesen`, `internationales-management` oder `wirtschaftsinformatik`
- `typ`: `uebung` (Lernzettel zu einer Übung), `klausur` (Klausur-Lernzettel = Zusammenfassung) oder `extra`
- `uebung`: Nummer der Übung wie auf dem Übungsblatt – Pflicht bei `typ: uebung`
- `teil`: nur wenn es mehrere Lernzettel zur selben Übung (bzw. mehrere Klausur-Lernzettel) gibt: 1, 2, …
- `datum`: Stand im Format JJJJ-MM-TT
- Titel mit Doppelpunkt in Anführungszeichen: `titel: "Bilanz: Aufbau"`
- **Keine** `# Überschrift` im Text – den Titel zeigt die App. Abschnitte mit `##` (werden zum Inhaltsverzeichnis),
  Unterpunkte mit `###`.

## Bausteine

Kästen – jede Zeile beginnt mit `>`, ein eigener Titel hinter dem Typ ist optional:

```markdown
> [!MERKE] Kettenregel
> Äußere Ableitung mal innere Ableitung.
```

| Typ | Wofür |
|---|---|
| `[!MERKE]` | Kernaussage, die sitzen muss |
| `[!DEFINITION]` | Fachbegriff exakt definiert |
| `[!FORMEL]` | Formel, Regel, Schema |
| `[!BEISPIEL]` | vollständig durchgerechnetes Beispiel |
| `[!ACHTUNG]` | typische Fehler und Fallen |
| `[!TIPP]` | Klausurtipp, Eselsbrücke |
| `[!AUFGABE]` | Selbsttest-Aufgabe (zum Selberrechnen) |
| `[!LOESUNG]` | Lösung dazu – zugeklappt, erst nach Antippen sichtbar |
| `[!ZUSAMMENFASSUNG]` | „Kurz & knapp“ |
| `[!FRAGE]` | Multiple-Choice-Testfrage (siehe „Test“) |

Formeln (KaTeX): inline `$f'(x) = 2x$`, abgesetzt mit `$$` jeweils **auf eigener Zeile**:

```markdown
$$
K'(x) = 0{,}5x + 20
$$
```

Dezimalkomma in Formeln als `{,}` (`0{,}5`), Text in Formeln mit `\text{…}`. Geldbeträge im Fließtext mit €, nie mit `$`.

Checkliste „Das kann ich“ (wird in der App jede Woche neu abgehakt):

```markdown
- [ ] Ich kann die Kettenregel anwenden.
```

Außerdem: Tabellen (auf dem Handy seitlich wischbar), nummerierte Listen für Rechenwege, `**fett**` für
Schlüsselbegriffe. Codeblöcke im Lernzettel mit `~~~sql` … `~~~` schreiben (nicht mit Backticks).

## Aufbau eines Übungs-Lernzettels

1. `## Worum geht's?` – 2–4 Sätze: Thema, wozu man es braucht, Bezug zur Vorlesung
2. `## Begriffe` – `[!DEFINITION]`-Kästen oder Tabelle
3. `## Formeln & Regeln` – `[!FORMEL]`/`[!MERKE]`: alles, was man auswendig können muss
4. `## So gehst du vor` – Schritt-für-Schritt-Rezept **pro Aufgabentyp** der Übung
5. `## Beispiele` – je Aufgabentyp mindestens ein vollständig durchgerechnetes `[!BEISPIEL]` im Stil der Übung
6. `## Typische Fehler` – `[!ACHTUNG]`
7. `## Selbsttest` – je Aufgabentyp eine `[!AUFGABE]` mit direkt folgender `[!LOESUNG]` (andere Zahlen als in den Beispielen)
8. `## Checkliste – das kann ich` – 4–8 Punkte „Ich kann …“
9. `## Test` – Multiple-Choice-Fragen (Pflicht, siehe unten)

Länge: so lang wie nötig, damit nichts fehlt – lieber vollständig als knapp. Eine Übung mit klar getrennten Themen in
mehrere Lernzettel (`teil: 1`, `teil: 2`, …) aufteilen; jeder Teil ist für sich verständlich und hat einen eigenen Test.

## Test (Multiple Choice) – in jedem Lernzettel

Ans Ende jedes Lernzettels kommt `## Test` mit Fragen als `[!FRAGE]`-Kasten. Die App zeigt die Fragen nicht im Text,
sondern als Test am Ende des Lernzettels; der **Abschlusstest** eines Fachs mischt die Fragen aller Lernzettel.

```markdown
> [!FRAGE]
> Was ist die Ableitung von $f(x) = e^{2x}$?
> - [ ] $e^{2x}$
> - [x] $2e^{2x}$
> - [ ] $2x\,e^{2x-1}$
> - [ ] $\frac{1}{2x}$
>
> Kettenregel: Die e-Funktion bleibt, dazu kommt die innere Ableitung $2$. Nur $e^{2x}$ vergisst die innere Ableitung.
```

- **Genau 4 Antworten, genau eine richtig** (`[x]`). Nach einer Zeile mit nur `>` folgt die **Erklärung**.
- **Falsche Antworten mischen:** 1–2 sind mit Grundverständnis sofort auszuschließen, 1–2 sind plausibel – typische
  Fehler oder Verwechslungen (z. B. innere Ableitung vergessen, Soll und Haben vertauscht, zwei ähnliche Modelle
  verwechselt). Insgesamt wirken also 2–3 Antworten möglich. **Mittleres Niveau:** nicht zu leicht, nicht zu schwer.
- Antworten ähnlich lang und gleich formuliert; kein „Alle/Keine der genannten“, keine doppelten Verneinungen.
- Mix aus Begriffen, Verständnis („Was bedeutet …?“), kleinen Rechnungen (im Kopf lösbar), Anwendung auf einen Fall
  und typischen Fehlern. Jeder Abschnitt des Lernzettels kommt mindestens einmal vor.
- Jede Frage muss für sich allein verständlich sein (sie taucht auch im gemischten Abschlusstest auf) und sich mit dem
  Lernzettel beantworten lassen.
- Erklärung: 1–3 Sätze – warum die Antwort stimmt und warum die plausibelste Falle falsch ist.
- Anzahl: Übungs-Lernzettel **6–10 Fragen** (mindestens 5), Klausur-Lernzettel **15–25 Fragen**.

## Klausur-Lernzettel (vor der Klausur)

- `typ: klausur` (bei viel Stoff mehrere Teile)
- Fasst **alle** Übungen des Fachs zusammen: pro Thema die wichtigsten Definitionen, Formeln, das Vorgehen und ein
  kompaktes Beispiel; dazu Klausurtipps und häufige Fehler
- Am Ende eine Checkliste über alle Themen – dieser Zettel wird **jede Woche** komplett durchgegangen
- Großer Test (15–25 Fragen) quer durch alle Themen

## Qualitätsregeln

- Inhalt **nur aus den Unterlagen** (Übungsblatt, Lösungen, Folien, Skript). Nichts erfinden, Notation und Begriffe
  des Kurses übernehmen. Ist etwas unklar oder fehlt eine Unterlage: nachfragen bzw. als `[!ACHTUNG] Unsicher` markieren.
- Jede Aufgabe des Übungsblatts muss sich mit dem Lernzettel lösen lassen.
- Alle Rechnungen nachrechnen – auch in den Testfragen.
- Deutsch, du-Form, kurze Sätze.
- Fachspezifisch:
  - **Mathe:** Rechenwege vollständig, Umformungen begründen, Definitionsbereiche und Sonderfälle nennen.
  - **Externes Rechnungswesen:** Buchungssätze als Tabelle (`| Soll | Haben | Betrag |`), Kontenarten, Paragraphen (HGB)
    angeben, Bilanz-/GuV-Schemata als Tabelle.
  - **Internationales Management:** Modelle mit Definition, Annahmen, Vor-/Nachteilen (Tabelle) und Praxisbeispiel;
    ähnliche Konzepte voneinander abgrenzen.
  - **Wirtschaftsinformatik:** Begriffe, Abläufe als nummerierte Listen, Modelle als Tabellen, Code in `~~~`-Blöcken.
