# Quellen und Lizenzen

Kotoba Dojo soll kommerziell betrieben werden. Diese Datei hält fest, was in der App steckt und unter welchen
Bedingungen es genutzt werden darf. In der App steht die Kurzfassung unter `/quellen` (Namensnennung ist Pflicht).

## Lerndaten (`public/data/`)

| Bestandteil | Quelle | Lizenz | Kommerziell? |
|---|---|---|---|
| Lesungen, Wortarten, Grundlage der Bedeutungen | JMdict, © Electronic Dictionary Research and Development Group (EDRDG) | [CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html) | Ja, mit Namensnennung und Weitergabe unter gleicher Lizenz |
| Beispielsätze und Übersetzungen (1908 von 2034) | [Tatoeba](https://tatoeba.org), jeder Satz mit `tatoebaId` | [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/) | Ja, mit Namensnennung |
| Wortreihenfolge (Häufigkeit) | Japanese Internet Corpus, Serge Sharoff, University of Leeds | CC BY | Ja, mit Namensnennung |
| Deutsche Kurzbedeutungen, 126 eigene Sätze, alle Grammatik-Notizen | mit KI-Unterstützung (Claude) geschrieben | eigen | Ja |

**Folge von CC BY-SA:** Die abgeleiteten Dateien `words.json` und `sentences.json` stehen selbst unter CC BY-SA 4.0
und müssen so weitergegeben werden dürfen. Der Programmcode ist davon nicht betroffen.

Die Dateien wurden mit der Daten-Pipeline der privaten App erzeugt. Sie liegt auf dem Branch `main` unter `scripts/`
(dort auch die Rohdaten-Quellen, kuromoji, WanaKana).

## Story, Missionen, Figuren

`src/content/`, `worker/content/` und `shared/characters.ts` enthalten frei erfundene Platzhalter-Inhalte (eigen).
Es werden keine fremden geschützten Inhalte verwendet (keine Anime-/Video-Ausschnitte, keine fremden Texte oder Bilder).

## Audio – bewusst entfernt

Die frühere private App hatte 7.886 Audiodateien. Sie sind auf diesem Branch **gelöscht und dürfen nicht
wiederverwendet werden**:

- 324 Tatoeba-Aufnahmen unter CC BY-NC 4.0 (keine kommerzielle Nutzung),
- 3.830 Dateien der VOICEVOX-Stimme 青山龍星 (geschäftliche Nutzung nur mit vorheriger Genehmigung),
- 3.730 Dateien der VOICEVOX-Stimme 四国めたん (eigene Nutzungsbedingungen, nicht für diesen Zweck geprüft).

Vorgelesen wird derzeit mit der Sprachausgabe des Geräts (Web Speech API); es gibt noch keine eigenen Aufnahmen.

**Geplante Quelle für neue Aufnahmen** (Stand 16.11.2026, siehe `docs/HANDOFF.md` Punkt 1):

1. VOICEVOX 四国めたん / ずんだもん – nur wenn der Rechteinhaber (SSS合同会社) die Nutzung in einer bezahlten App
   bestätigt. Anfrage: `docs/anfragen/voicevox-anfrage.md`. Pflicht wäre die Nennung „VOICEVOX:四国めたん“.
2. Sonst Microsoft Azure Speech in der **bezahlten** Stufe (Standard S0). Laut Microsofts Produktbedingungen darf nur
   die Ausgabe der bezahlten Stufe kommerziell genutzt werden, nicht die der Gratis-Stufe F0.

Sobald Aufnahmen erzeugt sind: Quelle, Stimme, Datum und Lizenzgrundlage hier eintragen.

## Schriften (selbst gehostet über npm-Pakete)

| Schrift | Paket | Lizenz |
|---|---|---|
| Noto Sans JP | `@fontsource-variable/noto-sans-jp` | SIL Open Font License 1.1 |
| Noto Serif JP | `@fontsource/noto-serif-jp` | SIL Open Font License 1.1 |

## Software

Alle Laufzeit-Abhängigkeiten erlauben kommerzielle Nutzung:

| Paket | Lizenz |
|---|---|
| react, react-dom, react-router-dom | MIT |
| hono | MIT |
| stripe (Stripe Node SDK) | MIT |
| dexie, dexie-react-hooks | Apache 2.0 |
| ts-fsrs | MIT |
| wanakana | MIT |
| tailwindcss, vite, vitest, wrangler (Entwicklung) | MIT bzw. MIT/Apache 2.0 |

Icons und Logo sind selbst gezeichnet (`src/ui/Icon.tsx`, `public/icon.svg`).
