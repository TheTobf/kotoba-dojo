# Quellen und Lizenzen

Kotoba Dojo soll kommerziell betrieben werden. Diese Datei hält fest, was in der App steckt und unter welchen
Bedingungen es genutzt werden darf. In der App steht die Kurzfassung unter `/quellen` (Namensnennung ist Pflicht).

## Lerndaten (`public/data/`)

| Bestandteil | Quelle | Lizenz | Kommerziell? |
|---|---|---|---|
| Lesungen, Wortarten, Grundlage der Bedeutungen | JMdict, © Electronic Dictionary Research and Development Group (EDRDG) | [CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html) | Ja, mit Namensnennung und Weitergabe unter gleicher Lizenz |
| Beispielsätze und Übersetzungen (1908 von 2034) | [Tatoeba](https://tatoeba.org), jeder Satz mit `tatoebaId` | [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/) | Ja, mit Namensnennung |
| Wortreihenfolge (Häufigkeit) | Japanese Internet Corpus, Serge Sharoff, University of Leeds | CC BY | Ja, mit Namensnennung |
| Kanji-Lesungen, Strichzahl, Häufigkeit (`kanji.json`) | KANJIDIC2, © EDRDG | CC BY-SA 4.0 | Ja, mit Namensnennung und Weitergabe unter gleicher Lizenz |
| Strichpfade und Strichreihenfolge (`strokes/`, `kana-strokes/`) | [KanjiVG](https://kanjivg.tagaini.net/), © Ulrich Apel | CC BY-SA 3.0 | Ja, mit Namensnennung und Weitergabe unter gleicher Lizenz |
| Kana-Liste (`kana.json`) | eigen, Striche aus KanjiVG | eigen / CC BY-SA 3.0 | Ja |
| Grammatik-Lektionen (`src/content/grammar.ts`) | mit KI-Unterstützung geschrieben (aus der privaten App) | eigen | Ja |
| Deutsche Kurzbedeutungen, 126 eigene Sätze, alle Grammatik-Notizen | mit KI-Unterstützung (Claude) geschrieben | eigen | Ja |

**Folge von CC BY-SA:** Die abgeleiteten Dateien `words.json`, `sentences.json`, `kanji.json` und die Strichdaten stehen
selbst unter CC BY-SA und müssen so weitergegeben werden dürfen. Der Programmcode ist davon nicht betroffen.

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

## Folgen-Generator „Gestrandet in Japan“ (`studio/`)

Alles läuft lokal und kostenlos. Stand 20.11.2026.

| Bestandteil | Wofür | Lizenz / Bedingung |
|---|---|---|
| [Remotion](https://www.remotion.dev/license) 4 | Videos aus Code rendern | Remotion-Lizenz: kostenlos für Einzelpersonen und Firmen bis 3 Personen. Ab 4 Personen Firmenlizenz nötig. |
| three.js, @react-three/fiber | 3D-Szenen | MIT |
| whisper.cpp (über @remotion/install-whisper-cpp), Whisper-Modell `large-v3-turbo` | Spracherkennung deiner Aufnahmen (nur Zeitmarken, lokal) | MIT (Programm und Modellgewichte) |
| VOICEVOX Engine | japanische Stimmen (lokal) | Engine: LGPL/MIT. **Jede Stimme hat eigene Bedingungen**, siehe unten. |
| OpenJTalk (pyopenjtalk), espeak-ng | nur Ersatzstimmen für Vorschauen (`preview.mp4`, wird nie gepostet) | BSD bzw. GPL – Ausgabe wird nicht veröffentlicht |
| Windows-Sprachausgabe / macOS `say` | nur Vorschau-Erzähler | Betriebssystem, Ausgabe wird nicht veröffentlicht |
| Zen Maru Gothic, Noto Sans JP, Noto Serif JP | Schrift in den Videos | SIL Open Font License 1.1 (keine Nennung im Video nötig) |
| Geräusche (Tick, Pling, Wusch) | Quiz und Schnitte | selbst erzeugt im Code (`studio/scripts/lib/dsp.ts`) – eigen |
| Musik | – | keine (es gibt noch keine geprüft lizenzfreie, kommerziell nutzbare Musik) |
| Figuren, Szenen, Postkarte, Schilder | alles im Code gezeichnet | eigen, keine fremden Bilder, Logos oder Marken |

### VOICEVOX-Stimmen in den Folgen

Pflicht ist die Namensnennung „VOICEVOX:Name“. `caption.txt` enthält sie automatisch für jede Stimme, die in der Folge
spricht. Die genauen Bedingungen stehen **in der Engine selbst** (`/speaker_info`). `npm run stimmen` speichert sie nach
`licenses/voicevox/<Name>.md`. Diese Dateien landen nicht in Git, weil es fremde Texte sind. Claude liest sie und trägt das
Ergebnis in `licenses/voicevox/geprueft.json` ein: Nennung, kommerziell erlaubt, Datum, Hinweise. **Ohne diesen Eintrag
gibt `npm run final` kein Video frei.**

| Rolle | Stimme | Stand |
|---|---|---|
| Ole | 白上虎太郎 (ふつう) | Bedingungen auf dem Laptop prüfen (`npm run stimmen`) |
| Beamter / Männer | 玄野武宏 (ノーマル) | Bedingungen auf dem Laptop prüfen |
| Frauen | 冥鳴ひまり, 九州そら (ノーマル) | Bedingungen auf dem Laptop prüfen |
| Durchsagen | 四国めたん (ノーマル) | Bedingungen auf dem Laptop prüfen |
| nicht verwenden | 青山龍星 | geschäftliche Nutzung nur mit vorheriger Genehmigung |

Die Webseite von VOICEVOX war aus der Cloud-Umgebung nicht erreichbar. Darum läuft die Prüfung bewusst über die Engine
auf dem Laptop.
