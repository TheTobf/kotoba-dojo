# Lizenzen und Nutzungsbedingungen

Stand: 23.11.2026. Alles kostenlos; keine kostenpflichtigen APIs. Keine fremden Bilder, Logos, Marken oder Musik.

## Stimmen

### VOICEVOX (Japanisch) – Pflicht-Namensnennung

Software: VOICEVOX (Engine LGPL v3 + Nutzungsbedingungen), lokal auf dem Laptop. Jede Stimme hat **eigene** Bedingungen.
Die Videobeschreibung (`caption.txt`) enthält automatisch `Stimmen: VOICEVOX:<Name>` für jede Stimme, die in der Folge spricht.

> **[PRÜFEN] – bitte einmal bestätigen.** Von der Cloud-Sitzung aus waren die Bedingungs-Seiten nicht erreichbar.
> Die Angaben unten stammen aus meinem Wissen und müssen auf dem Laptop gegen die aktuellen Seiten geprüft werden.
> Erst danach in `style/stilvorlage.json` `"stimmenBedingungenGeprueft": true` setzen – vorher rendert `/fertig` kein fertiges Video.

| Rolle | Stimme | Namensnennung | Kommerziell (Werbeeinnahmen, eigene App) | Bedingungen |
|---|---|---|---|---|
| Knö | 春日部つむぎ (Kasukabe Tsumugi) | `VOICEVOX:春日部つむぎ` | nach meinem Stand erlaubt | https://voicevox.hiroshiba.jp/product/kasukabe_tsumugi/ |
| Personal, Durchsagen | 冥鳴ひまり (Meimei Himari) | `VOICEVOX:冥鳴ひまり` | nach meinem Stand erlaubt | https://voicevox.hiroshiba.jp/product/meimei_himari/ |
| Haru, Frau Mori | 四国めたん (Shikoku Metan) | `VOICEVOX:四国めたん` | erlaubt, Leitlinien des 東北ずん子-Projekts beachten | https://voicevox.hiroshiba.jp/product/shikoku_metan/ · https://zunko.jp/con_ongen_kiyaku.html |
| Personal 2 | 青山龍星 (Aoyama Ryūsei) | `VOICEVOX:青山龍星` | nach meinem Stand erlaubt | https://voicevox.hiroshiba.jp/product/aoyama_ryusei/ |
| Ken | 玄野武宏 (Kurono Takehiro) | `VOICEVOX:玄野武宏` | nach meinem Stand erlaubt | https://voicevox.hiroshiba.jp/product/kurono_takehiro/ |

Typische Verbote (für alle prüfen): Rufschädigung der Figur/Sprecher, politische oder religiöse Werbung, Erwachsenen-/Gewaltinhalte,
Behauptung, die Stimme sei ein echter Mensch. Unsere Nutzung (Lernvideos, freundlich) fällt nach meinem Stand nicht darunter.
Stimme wechseln: in `style/stilvorlage.json` → `stimmen`, dann diese Tabelle anpassen.

### Deutsche Erzählung – ElevenLabs (KI-Stimme, kostenpflichtig ab Monetarisierung)

Seit 25.11.2026 spricht standardmäßig eine ElevenLabs-Stimme (`style/stilvorlage.json` → `erzaehler`). Eigene Aufnahmen haben Vorrang.

| Plan | Zeichen/Monat | Kommerzielle Nutzung | Namensnennung | ≈ Folgen/Monat |
|---|---|---|---|---|
| Free (aktuell) | 10.000 | **nein** | Pflicht („elevenlabs.io“) | ≈ 11 |
| Starter (≈ 5 $/Monat) | 30.000 | ja | nicht nötig (wir nennen sie trotzdem) | ≈ 35 |

[PRÜFEN] Stand nach meinem Wissen – aktuelle Bedingungen: https://elevenlabs.io/terms-of-use · https://elevenlabs.io/pricing.
Free-Plan kann keine Stimmen aus der Bibliothek per API nutzen (nur Standard-Stimmen wie George). Folge ≈ 700–900 Zeichen.
Die Caption nennt die KI-Stimme und erinnert an das KI-Label der Plattform.

### Eigene Aufnahme (optional)

Deine eigene Stimme. Vorschau-Stimmen (nur `preview.mp4`, nie im fertigen Video): Windows-Sprachausgabe (Laptop),
espeak-ng (GPL v3, nur Cloud-Test), Japanisch-Ersatz pyopenjtalk + HTS-Stimme (MIT/BSD, nur Cloud-Test).

## Software

| Paket | Lizenz | Hinweis |
|---|---|---|
| Remotion (`remotion`, `@remotion/*`) | Remotion License | kostenlos für Einzelpersonen und Firmen bis 3 Personen; bei Wachstum Firmenlizenz nötig (remotion.dev/license) |
| three.js, React, @react-three/fiber, @react-three/drei | MIT | |
| kuromoji (Lesungen/Wortgrenzen) | Apache-2.0 | Wörterbuch IPADIC |
| wanakana | MIT | |
| whisper.cpp | MIT | lokal, Modell `ggml-small` (Whisper-Gewichte MIT) |
| ffmpeg | LGPL/GPL | als Programm aufgerufen |

## Schriften (selbst gehostet in `public/fonts/`)

| Schrift | Lizenz |
|---|---|
| Noto Sans JP | SIL Open Font License 1.1 |
| M PLUS Rounded 1c | SIL Open Font License 1.1 |

## Bild, Ton, Musik

- Alle Figuren, Szenen und Texturen werden im Code erzeugt (eigene Formen, fiktive Läden „まちかど“, „Hotel Kamome“; keine echten Logos).
- Geräusche (Countdown-Tick, Pling) werden mit ffmpeg selbst synthetisiert.
- **Keine Musik.** Musik nur, wenn ein Titel lizenzfrei und kommerziell nutzbar ist – Datei + Lizenz nach `music/`, hier eintragen.
- App-Videos zeigen Screenshots der eigenen App.
