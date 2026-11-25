# Übergabe – „Gestrandet in Japan“ (Folgen-Generator)

Stand: 23.11.2026 · Branch `ccr-0b3bf917-4jzi1j` · Ordner `serie/` im Repo `kotoba-dojo`

## Wo stehen wir?

- **Laufende Staffel:** 1 – Ankunft. Alle 7 Folgen geplant (`episodes/ep01–ep07/episode.json`), Skripte in `recordings/epXX/script.md`, Sammel-Skript `recordings/AUFNAHME.md`.
- **Fertige Folgen:** 0. **Vorlauf:** 0 Tage (Startdatum in `serie.json`: 01.12.2026) → als Nächstes Folgen 1–7 einsprechen.
- **Vorschau:** `episodes/ep01/preview.mp4` (Ersatzstimmen, nur zum Anschauen).
- **Stil/Maskottchen:** Tusche-Comic + Knö (fest in `style/stilvorlage.json`).
- **Lehrplan:** 153 Einträge, doppelt geprüft (`npm run lehrplan:pruefen`), 0× [PRÜFEN]. Staffel 1 nutzt 11 neue Sätze.

## Änderung 25.11.2026: Erzählung mit ElevenLabs

- Deutsche Erzählung kommt vollautomatisch von ElevenLabs (`scripts/ton/elevenlabs.ts`, Endpunkt *with-timestamps* → wortgenaue Untertitel).
- Sätze werden zwischengespeichert (`episodes/epXX/ton/el-*.wav`), Guthaben wird vor jeder Folge geprüft.
- Konto: Free-Plan (10.000 Zeichen/Monat, nicht kommerziell, nur Standard-Stimmen). Für Monetarisierung: Starter-Plan.
- Laptop: Schlüssel als Benutzer-Umgebungsvariable `ELEVENLABS_API_KEY`; nächtliche geplante Aufgabe rendert bis zu 3 Folgen.

## Offen / bitte bestätigen

1. **VOICEVOX-Nutzungsbedingungen** prüfen (`LICENSES.md`, Seiten waren aus der Cloud nicht erreichbar) → `stimmenBedingungenGeprueft: true`. Vorher rendert `/fertig` nichts Finales.
2. **Freie japanische Sätze** (nicht aus dem Lehrplan) gegenlesen: 次の方、どうぞ · ようこそ、日本へ · 観光ですか · あちらの券売機です · はい、行きますよ · ご予約のお名前は · 一泊のご予約ですね.
3. Laptop einrichten: `docs/SETUP.md` (ein PowerShell-Befehl). Optional Eingangsordner für Sprachmemos in `serie.json`.
4. App-Import für `learned.json`: Die App kann noch keine Lektionen importieren – Format steht (`kotoba-dojo-lektion` v1, Felder wie `Sentence`), Import-Knopf wäre ein eigener PR am App-Code.

## Wie es funktioniert

```
episode.json ──► scripts/ton.ts ──► timing.json + ton/*.wav ──► Remotion (src/folge/Folge.tsx) ──► Video
   │               │  VOICEVOX (jp), deine Aufnahme → whisper.cpp → Abgleich mit Skript
   │               └─ ohne Aufnahme: Vorschau-Stimme (nur preview.mp4)
   └─ scripts/pruefe-folge.ts (Regeln, Skript)      scripts/render.ts: Selbstkontrolle → Bericht + Standbilder → Video → Lautheit → Ausgaben
```

- **Zeitleiste** (`src/folge/zeitleiste.ts`): Segmente (Erzählung / Japanisch / Quiz / Pause) bekommen ihre Dauer aus dem echten Ton; Shots beginnen an Segmenten; lange Shots werden automatisch in ≤ 3-s-Stücke mit Perspektivwechsel geteilt (Dialog: Schuss/Gegenschuss, Kamera auf die sprechende Figur).
- **Kamera** (`src/folge/KameraFahrt.tsx` + `AutoKamera` in `Folge.tsx`): Presets relativ zur Figur, immer in Bewegung; per Raycast wird die erste Variante gewählt, bei der das Gesicht frei ist; Szenengrenzen verhindern Kameras hinter Wänden.
- **Selbstkontrolle** (`src/folge/Pruefer.tsx`, `scripts/render.ts`): Länge, Hook, Schnittlänge, Quiz→Auflösung, Lehrplan/[PRÜFEN], Text in Sicherheitszone (DOM-Messung), Figur angeschnitten, Gesicht verdeckt (Raycast), Sprecher mit Rücken zur Kamera, Lautheit (−14 LUFS). Standbilder + `kontaktbogen.jpg` werden immer zusätzlich von Claude angesehen.
- **Aufnahme** (`scripts/ton/aufnahme.ts`): Hochpass, Rauschminderung, Kompressor, whisper-Wortzeiten, Abgleich pro Skriptzeile (Versprecher/Wiederholungen → letzte gute Version), lange Pausen (> 0,45 s) auf 0,3 s gekürzt, Lautheit −16 LUFS pro Clip.

## Baukasten

| Art | Vorhanden |
|---|---|
| Szenen (`src/szenen/`) | flughafen, bahnsteig (+ Fahrkartenautomaten, Zug per `zugX`), konbini, strasse, hotel, studio (App-Videos) |
| Figuren (`src/figuren/`) | Knö; Mensch-Varianten haru, kassierer, beamtin, bahnpersonal, rezeption, hutmann, passant1/2, mori, ken; Krähe |
| Aktionen | stehen, gehen, rennen, zeigen, verwirrt, freuen, winken, sprechen (automatisch beim Japanisch), erschrecken, traurig, verbeugen |
| Kamera | totale, halbnah, nah, gross, ueberSchulter, frosch, vogel, seite · Bewegung rein/raus/links/rechts/hoch/runter |
| Texte | Badge, Hook, Satzkarte (wortgenau), Untertitel (Wort für Wort), Quiz mit 3-s-Countdown, Endkarte mit Satz-Zähler |

## Nächste Schritte

1. Laptop einrichten, Bedingungen bestätigen, `/status`.
2. Stimme wählen (George oder Bibliotheksstimme mit Starter-Plan), dann `/fertig` bzw. nächtliche Automatik → posten nach `out/POSTPLAN.md`.
3. Rechtzeitig `/staffel` für Staffel 2 (Ein Dach über dem Kopf: Krähennest am Schrein, Frau Mori, Mülltrennung). Neue Szenen nötig: Schrein, Frau Moris Haus/Genkan.
4. Erstes `/appvideo` (z. B. Behind the Scenes: „So entsteht eine Folge“).

## Laufzeiten (gemessen)

- Cloud ohne GPU: Selbstkontrolle ≈ 35 s pro Folge, Video 72 s ≈ 11–12 min. Laptop mit GPU (`angle`): deutlich schneller.
