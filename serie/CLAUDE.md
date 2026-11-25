# Serie „Gestrandet in Japan“ – Anleitung für Claude

Folgen-Generator für eine tägliche Kurzvideo-Serie (Japanisch lernen mit dem Maskottchen Knö). Läuft normalerweise auf dem
Laptop des Nutzers (Windows, immer an); dort rendert Remotion lokal; Japanisch spricht Open JTalk „Mei“ (vom Nutzer gewählt, CC BY 3.0). **Deutsche Erzählung: ElevenLabs (KI-Stimme, vollautomatisch)**
– einzige Ausnahme von „0 € Zusatzkosten“, vom Nutzer gewünscht (Entscheidung 25.11.2026). Eigene Aufnahmen (whisper.cpp) bleiben möglich und haben Vorrang.
Guthaben sparen: Sätze werden zwischengespeichert; vor Änderungen an Erzähltexten bedenken, dass jede neue Zeile Zeichen kostet.
In der Cloud: Befehle mit `NODE_USE_ENV_PROXY=1 ELEVENLABS_API_KEY=proxy-injected` starten.

- **Zuerst lesen:** `docs/HANDOFF.md` (Stand), `story/series.md` (Geschichte, Fäden, Folgen-Log), `style/stilvorlage.json` (fester Stil + Schnittregeln).
- **Befehle:** `/staffel`, `/folge`, `/skripte`, `/fertig`, `/status`, `/appvideo` (in `../.claude/commands/`).
- **Regeln:** Japanisch nur aus `curriculum/curriculum.json` (nie `[PRÜFEN]`-Einträge); freie Sätze doppelt prüfen und melden. Pro Folge 1–2 neu + 1 Wiederholung.
  Keine Werbung in Folgen; App-Videos klar als Werbung. Keine fremden Bilder/Logos/Marken/Musik. Respektvoll, nie klischeehaft.
- Japanisch in Erzähltexten immer als `[[ja|romaji]]` (optional `|lesung`) markieren – dann spricht es VOICEVOX statt der deutschen Stimme (`scripts/ton/erzaehlung.ts`); `pruefe-folge` meldet unmarkiertes Romaji als Fehler.
- Captions: KI-Erzählstimme kennzeichnen (TikTok „KI-generierte Inhalte“); im ElevenLabs-Free-Plan ist kommerzielle Nutzung nicht erlaubt.
- **Nie** ein Video mit Vorschau-Stimme als fertiges Video ausgeben (`preview.mp4` bleibt in `episodes/`).
- **Selbstkontrolle ist Pflicht:** `npx tsx scripts/render.ts epXX [--vorschau] --nur-kontrolle`, Bericht lesen **und** Kontaktbogen/Standbilder selbst ansehen, Fehler beheben, erst dann rendern.
- Nach Änderungen: `npm test` (Abgleich, Ausgaben, Lehrplan, Typen). `story/series.md`, `docs/HANDOFF.md`, `docs/obsidian-kotoba-dojo-uebersicht.md` aktuell halten.
- Serien-Dateien liegen getrennt vom App-Code (`../src`); App-Änderungen nur per eigenem PR.
