# Kotoba Dojo – Anleitung für Claude

Japanisch-Lern-App (deutsche Oberfläche) zur TikTok-Story des Nutzers. Gratis: Sätze und Vokabeln mit Spaced
Repetition, Story-Lektionen, 2 Probe-Missionen. Pro (Abo über Stripe): Story-Missionen, Gespräche mit KI-Figuren,
Korrekturen, Fehler-Karteikarten. Dieser Branch ist das **Grundgerüst** für die kommerzielle Version.

**Zuerst lesen:** `docs/HANDOFF.md` (Stand, priorisierte TODO-Liste, bekannte Probleme) und `docs/ARCHITECTURE.md`
(Aufbau und Begründungen). Lizenzen: `LICENSES.md`.

## Befehle

| Befehl | Wirkung |
|---|---|
| `npm install` | einmalig |
| `npm run dev` | startet alles: Oberfläche, Server und lokale Datenbank → <http://localhost:5173> |
| `npm test` | alle Tests (API gegen echte lokale D1-Datenbank) |
| `npm run typecheck` | TypeScript prüfen |
| `npm run build` | Produktions-Build nach `dist/` |
| `npm run stripe:setup` | Produkt und Preise im Stripe-Testmodus anlegen (braucht `sk_test_…` in `.env`) |
| `npm run audio:gen` | Sprachaufnahmen erzeugen (Azure Speech, bezahlte Stufe; Schlüssel in `.env`) |
| `npm run stripe:verify` | Paywall gegen echtes Stripe im Testmodus prüfen (braucht laufendes `npm run dev`) |

`npm run dev` legt beim ersten Start `.env` mit Test-Geheimnissen an und richtet die lokale Datenbank ein.
Ohne Stripe-Schlüssel läuft lokal der Stripe-Simulator (siehe ARCHITECTURE.md).

## Folgen-Generator „Gestrandet in Japan“ (`studio/`)

TikTok-Serie mit Ole, dem Seehund (Stil „Knete“, fest in `style/stilvorlage.json`). Befehle für Claude Code:
`/staffel`, `/skripte`, `/folge`, `/appvideo`, `/fertig`, `/status` (Anleitungen in `.claude/commands/`).
Im Ordner `studio/`: `npm install` (einmalig), `npm test`, `npm run pruefen|skripte|vorschau|kontrolle|final|status|stimmen`.

Regeln (vom Nutzer vorgegeben):
- **Folgen sind reiner Lerninhalt:** kein App-Hinweis, keine Werbe-Endkarte. Werbung nur im App-Video (`/appvideo`),
  dort klar gekennzeichnet.
- **Japanisch muss stimmen:** nur Lehrplan-Sätze mit `status: "ok"`. [PRÜFEN]-Sätze erst nach Bestätigung des Nutzers.
  1–2 neue Sätze plus 1 Wiederholung pro Folge, `curriculum/progress.json` wird berechnet, nie von Hand ändern.
- **Vorschauen** mit Ersatzstimmen heißen `preview.mp4` und werden nie als fertiges Video ausgegeben.
- **Selbstkontrolle Pflicht:** vor `npm run final` jedes Standbild in `out/epXX/kontrolle/` ansehen.
- **Stimmen:** VOICEVOX-Bedingungen je Stimme prüfen (`npm run stimmen` → `licenses/voicevox/geprueft.json`),
  Namensnennung kommt automatisch in `caption.txt`. 青山龍星 nicht verwenden.
- **Aufnahmen und Videos nie in Git** (Repo ist öffentlich): `recordings/**/*.m4a|mp3|wav` und `out/` sind ignoriert.
- Keine fremden Bilder, Logos, Marken oder Musik. Alles wird im Code gezeichnet bzw. erzeugt.

## Regeln (vom Nutzer vorgegeben – nicht aufweichen)

1. **Sprache:** Mit dem Nutzer Deutsch und einfach. Oberfläche und Kommentare auf Deutsch, Bezeichner im Code Englisch.
2. **0 € Fixkosten:** nur Dienste mit kostenlosem, kommerziell nutzbarem Kontingent (Cloudflare Workers + D1).
3. **Stripe nur im Testmodus.** Keine echten Schlüssel, keine echten Zahlungen. **Nichts veröffentlichen
   (kein `wrangler deploy`) ohne ausdrückliche Freigabe des Nutzers.**
4. **Paywall:** Ob jemand Pro hat, entscheidet nur der Server über `shared/entitlement.ts`. Den Abo-Stand schreibt
   ausschließlich der verifizierte Stripe-Webhook (`worker/payments/webhook.ts`). Dem Browser wird nie vertraut.
   Pro-Inhalte liegen auf dem Server (`worker/content/`), nicht im App-Paket.
5. **KI nur über `/api/ai/chat`**, mit Tageskontingent pro Nutzer und globalem Monatsbudget. KI-Schlüssel nie im Browser.
6. **Datensparsam:** Ohne Konto bleibt der Lernfortschritt nur auf dem Gerät (IndexedDB). Mit (kostenlosem) Konto wird
   er zusätzlich als ein komprimierter Lernstand pro Konto abgeglichen (`progress_sync`, Entscheidung des Nutzers vom
   17.11.2026). Sonst auf dem Server nur E-Mail, Abo-Stand, KI-Verbrauch, Fehlerkarten, Warteliste, Kündigungen.
   Datenbank mit Speicherort EU. Konto samt Daten lässt sich im Profil selbst löschen.
7. **Kein Tracking, keine fremden Server im Browser:** Schriften selbst gehostet, keine Analyse-Dienste,
   kein Cookie-Banner nötig. Die CSP in `public/_headers` erlaubt nur die eigene Adresse.
8. **Geheimnisse nur in `.env`** (lokal) bzw. als `wrangler secret` (online) – nie im Code, nie in Git, nie in Notizen.
9. **Recht (Deutschland):** Kündigungsbutton „Verträge hier kündigen“ (§ 312k BGB) bleibt überall erreichbar und
   funktioniert ohne Anmeldung. Beide Zustimmungs-Häkchen vor dem Kauf bleiben Pflicht (Server prüft sie).
   KI-Figuren sind überall als KI gekennzeichnet. Rechtstexte sind Entwürfe mit `[BITTE AUSFÜLLEN]`.
10. **Keine fremden geschützten Inhalte.** Die alten Audiodateien (auf `main`) nicht wiederverwenden.
11. **Design:** Farben, Schriften, Rundungen nur über die Tokens in `src/styles/tokens.css`; ein Akzentton;
    vorhandene Bausteine aus `src/ui/` benutzen statt neue Stile zu erfinden. Mobile first, Dark Mode,
    Tastaturbedienung, Kontrast mindestens WCAG AA.
12. **Übergabe pflegen:** Nach jedem größeren Schritt `docs/HANDOFF.md`, bei Architektur-Änderungen
    `docs/ARCHITECTURE.md` und die Obsidian-Notiz (`docs/obsidian/`) aktualisieren (ersetzen statt anhängen),
    dann ein Git-Commit mit klarer deutscher Nachricht.
13. **Branch:** Die private Lern-App des Nutzers liegt auf `main` und läuft über GitHub Pages. Diesen Branch
    **nicht nach `main` mergen**, solange der Nutzer das nicht entschieden hat.

## Wichtigste Dateien

| Datei | Inhalt |
|---|---|
| `shared/plans.ts` | Preise und Tarife – die eine Stelle |
| `shared/entitlement.ts` | DIE Pro-Regel (reine Funktion) |
| `shared/mission.ts` | Missions-Modell und Antwortprüfung |
| `worker/app.ts` | API: Schutzschichten und Routen |
| `worker/payments/webhook.ts` | Signaturprüfung und Verarbeitung der Stripe-Meldungen |
| `worker/payments/simulator.ts`, `worker/routes/dev-stripe.ts` | lokaler Stripe-Simulator (nur development) |
| `worker/routes/ai.ts`, `worker/ai/` | KI-Endpunkt, Limits, Platzhalter-KI |
| `worker/routes/cancel.ts` | Kündigungsbutton |
| `migrations/0001_init.sql` | Datenbank-Schema mit Erklärungen |
| `src/styles/tokens.css` | Design-Tokens |
| `src/ui/` | Bausteine: Button, Card, Flashcard, ProgressBar, UpgradeHint, Field, JaText … |
| `src/router.tsx` | alle Seiten |
| `src/lib/speech.ts`, `shared/audio.ts`, `scripts/audio-gen.ts` | Vorlesen: eigene Aufnahmen mit Rückfall auf die Gerätestimme |
| `src/lib/srs.ts`, `src/lib/db.ts` | Wiederholungs-Logik (FSRS) und lokaler Lernfortschritt |
| `src/lib/writing.ts`, `quiz.ts`, `sentences.ts`, `search.ts`, `shadowing.ts` | Logik der Übungen (Schrift, Quiz, Satzbau, Wörterbuch, Nachsprechen) |
| `src/lib/progress.ts` | Punkte, Level, Lernserie, Tagesziel, Erfolge |
| `src/lib/sync.ts`, `worker/routes/sync.ts` | Abgleich zwischen Geräten (Zusammenführen auf dem Gerät) |
| `src/lib/listen.ts`, `src/ui/MicButton.tsx` | Spracheingabe mit Einwilligung |
| `src/lib/reminders.ts`, `worker/routes/reminders.ts`, `public/push-sw.js` | tägliche Lern-Erinnerung (Web Push) |
| `src/content/`, `worker/content/` | Story-Folgen, Probe-Missionen, Pro-Missionen (Platzhalter) |
| `tests/` | Tests; `tests/paywall.test.ts` ist der wichtigste |
