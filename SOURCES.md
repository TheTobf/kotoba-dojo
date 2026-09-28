# Quellen und Lizenzen

Kotoba Dojo ist ein privates, nicht-kommerzielles Lernprojekt. Die Lerndaten in `public/data/` und `public/audio/`
werden von den Skripten in `scripts/` aus den folgenden Quellen erzeugt.

> **Wichtig:** Weil JMdict, KANJIDIC2 und KanjiVG unter **CC BY-SA** stehen, stehen auch die abgeleiteten
> Daten-JSONs (`public/data/*.json`) unter **CC BY-SA 4.0**. Der Programmcode ist davon nicht betroffen.

## Wortliste (Häufigkeit)

| | |
|---|---|
| Quelle | Serge Sharoff, *Japanese Internet Corpus* – Lemma-Frequenzliste, University of Leeds (via [xorgy/japanese-lemmas](https://github.com/xorgy/japanese-lemmas)) |
| Lizenz | CC BY (laut Leeds Centre for Translation Studies; Weitergabe mit Namensnennung) |
| Verwendung | Reihenfolge der Wörter (Rang). Das Korpus stammt aus dem Internet – daher sind Wörter wie コメント, サイト, 投稿 weit vorne. |

Partikel, Hilfsverben und Wortbruchstücke (の, は, ます, て, …) werden nicht als Vokabeln aufgenommen,
sondern im Bereich *Satzbau* geübt. Feinsteuerung: `scripts/manual/lemmas.json`.

## Wörterbuch

| | |
|---|---|
| **JMdict** | © Electronic Dictionary Research and Development Group (EDRDG), [Lizenz CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html). Aufbereitet von [jmdict-simplified](https://github.com/scriptin/jmdict-simplified). Verwendet: Lesungen, Wortarten, deutsche Glossen (stammen großteils aus dem Wadoku-Projekt über JMdict). |
| **KANJIDIC2** | © EDRDG, CC BY-SA 4.0. Verwendet: On-/Kun-Lesungen, Strichzahl, Häufigkeitsrang. |
| **KanjiVG** | © Ulrich Apel, [CC BY-SA 3.0](https://kanjivg.tagaini.net/). Verwendet: Strichpfade und Strichreihenfolge (`public/data/strokes/`). |

Die deutschen Bedeutungen der Wörter und Kanji wurden von Claude (KI) auf Basis der JMdict-/KANJIDIC2-Einträge
knapp formuliert (`scripts/manual/words.json`, `scripts/manual/kanji.json`, Kennzeichnung `meaningSource: "claude"`).

## Beispielsätze

| | |
|---|---|
| **Tatoeba** | [tatoeba.org](https://tatoeba.org), Sätze und Übersetzungen unter [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/). Jeder Satz behält seine `tatoebaId` (Link: `https://tatoeba.org/de/sentences/show/<id>`). Furigana stammen aus den von Tatoeba-Mitgliedern gepflegten Umschriften (`furiganaSource: "tatoeba"`). |
| **Eigene Sätze** | Wo Tatoeba keinen passenden oder nur einen unpassenden Satz hatte, wurde der Satz von Claude (KI) geschrieben (`source: "claude"`). Ebenso fehlende oder fehlerhafte deutsche Übersetzungen und alle Grammatik-Notizen. |
| Tokenisierung | [kuromoji.js](https://github.com/takuyaa/kuromoji.js) (Apache 2.0) mit IPADIC; nur im Build-Skript, nicht in der App. |
| Romaji | [WanaKana](https://github.com/WaniKani/WanaKana) (MIT) |

## Audio

| | |
|---|---|
| **Tatoeba-Aufnahmen** | Muttersprachler-Aufnahmen, nur mit Lizenz **CC BY 4.0** oder **CC BY-NC 4.0** (Aufnahmen ohne Lizenzangabe werden nicht verwendet). Der Name der sprechenden Person steht in `audioCredit`. CC BY-NC erlaubt keine kommerzielle Nutzung – bei einer kommerziellen Version müssten diese Aufnahmen ersetzt werden. |
| **VOICEVOX** | [VOICEVOX](https://voicevox.hiroshiba.jp/) Engine 0.25.2, lokal erzeugt. Stimmen: **VOICEVOX:四国めたん** ([Nutzungsbedingungen](https://zunko.jp/con_ongen_kiyaku.html)) und **VOICEVOX:青山龍星** ([Nutzungsbedingungen](https://www.virvoxproject.com/voicevox%E3%81%AE%E5%88%A9%E7%94%A8%E8%A6%8F%E7%B4%84)). Kostenlos für private Nutzung; Namensnennung („VOICEVOX:Name“) ist Pflicht und steht in der App im Info-Bereich. Eine geschäftliche Nutzung von 青山龍星 bräuchte vorher eine Genehmigung. |
| Fallback | Web Speech API des Browsers (`ja-JP`), wenn keine Datei vorhanden ist. |
| MP3-Kodierung | [@breezystack/lamejs](https://github.com/breezystack/lamejs) (LGPL) – nur im Build-Skript. |

## Schrift

| | |
|---|---|
| Noto Sans JP | Google Fonts, SIL Open Font License 1.1 |

## Videos

Die App bettet **keine** Anime-/Video-Clips ein. Der Button „In echten Videos hören“ öffnet lediglich eine externe
Suche (YouGlish bzw. YouTube).
