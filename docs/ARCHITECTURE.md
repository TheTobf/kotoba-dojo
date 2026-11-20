# Architektur

Stand: 17.11.2026 · Grundgerüst plus Lern-Übungen, Abgleich und Erinnerung

## Überblick

```
Browser (PWA)                         Cloudflare Worker (ein Deployment)                 Außen
┌──────────────────────────┐          ┌──────────────────────────────────────┐
│ src/  React-Oberfläche   │  /api/*  │ worker/  API (Hono)                  │  Checkout   ┌────────┐
│ Lernfortschritt lokal    │ ───────▶ │  auth · billing · cancel · ai · story│ ──────────▶ │ Stripe │
│ (IndexedDB)              │          │  Pro-Regel: shared/entitlement.ts    │ ◀────────── │ (Test) │
└──────────────────────────┘          │  D1-Datenbank (EU)                   │  Webhook    └────────┘
        ▲ statische Dateien           └──────────────────────────────────────┘  (signiert)
        └────────── vom selben Worker ausgeliefert ──────────┘
```

Drei Ordner, eine Richtung der Abhängigkeiten: `src/` und `worker/` dürfen `shared/` benutzen, aber nicht einander.

| Ordner | Aufgabe |
|---|---|
| `shared/` | Was Oberfläche und Server gemeinsam wissen müssen: Preise, Pro-Regel, Missions-Logik, API-Typen, Zustimmungstexte |
| `src/` | Oberfläche. `ui/` Bausteine, `layouts/` Rahmen, `pages/site` öffentliche Seiten, `pages/app` App-Bereich, `lib/` Logik, `content/` Gratis-Inhalte |
| `worker/` | Server. `routes/` Endpunkte, `payments/` Stripe, `ai/` KI, `lib/` Sitzung/Zugriff/Krypto, `content/` Pro-Inhalte |
| `migrations/` | Datenbank-Schema (D1/SQLite) |
| `tests/` | Tests gegen die echte API mit echter lokaler D1 |

## Entscheidungen und Begründungen

### Hosting: Cloudflare Workers mit statischen Dateien (statt Pages)
Cloudflare empfiehlt Workers für neue Projekte; Pages wird nur noch gepflegt. Oberfläche und API sind **ein**
Deployment unter **einer** Adresse – dadurch gibt es kein CORS, und das Sitzungs-Cookie bleibt „same-site“.
Kostenlos und kommerziell nutzbar (100.000 Anfragen/Tag an die API, statische Dateien unbegrenzt, D1 5 GB).
`@cloudflare/vite-plugin` startet Oberfläche, Worker und lokale D1 mit einem einzigen `npm run dev`.

### Paywall: eine Regel, ein Schreiber
- **Eine Regel:** `computeAccess()` in `shared/entitlement.ts` macht aus einem Abo-Stand + Uhrzeit die Antwort
  „Pro ja/nein, warum, bis wann“. Reine Funktion, vollständig getestet.
- **Ein Schreiber:** Die Tabelle `subscriptions` wird nur in `worker/payments/webhook.ts` geschrieben – nach
  geprüfter Stripe-Signatur. Checkout, Portal und Kündigung stoßen bei Stripe nur etwas an; den neuen Stand
  meldet Stripe per Webhook zurück.
- **Der Server sperrt wirklich:** Pro-Routen rufen `requirePro()` (`worker/lib/access.ts`). Pro-Missionen liegen in
  `worker/content/` und werden ohne Pro gar nicht ausgeliefert. Die Oberfläche zeigt nur an (`ProGate`).
- **Robustheit:** doppelte Meldungen (Tabelle `stripe_events`), Meldungen in falscher Reihenfolge
  (`last_event_at`), Meldungen zu alten Abos, unbekannte Konten und unbekannte Stripe-Status sind abgedeckt.
  Pro endet auch dann, wenn Stripe nie wieder etwas meldet (Zeitraum + 1 Tag Puffer).
- **Zuordnung Abo → Konto:** Beim Checkout wird `subscription_data.metadata.user_id` gesetzt. Jede Abo-Meldung
  trägt damit ihr Konto bei sich; die Reihenfolge der Stripe-Meldungen spielt keine Rolle.
- Verarbeitet werden nur `customer.subscription.created/updated/deleted`. Sie enthalten immer den ganzen Stand
  und decken Kauf, Verlängerung, Kündigung, Zahlungsausfall und Ablauf ab.
- Bei fehlgeschlagener Verlängerung (`past_due`) bleibt Pro 3 Tage (Kulanz, in `entitlement.ts` einstellbar).

### Preise zentral, Stripe-Preise per Name
`shared/plans.ts` ist die einzige Stelle für Preise. Der Server sucht den Stripe-Preis über `lookup_key`
(`kotoba_pro_monthly`, `kotoba_pro_yearly`) – es stehen keine Preis-IDs in der Konfiguration.
`npm run stripe:setup` legt Produkt und Preise aus derselben Datei an.

### Nur Testmodus – technisch abgesichert
`worker/deps.ts` lehnt jeden Schlüssel ab, der nicht mit `sk_test_`/`rk_test_` beginnt, solange nicht
`ALLOW_LIVE_PAYMENTS=true` gesetzt ist. `ENVIRONMENT` steht standardmäßig auf `production`; nur die lokale `.env`
setzt `development`.

### Stripe-Simulator (nur lokal)
Ohne Stripe-Konto führt der Checkout auf lokale Ersatzseiten (`/api/dev/stripe/…`). Sie schreiben **nicht** in die
Datenbank, sondern bauen Stripe-Meldungen, signieren sie wie Stripe und schicken sie durch dieselbe
Signaturprüfung und Verarbeitung wie der Webhook. So lässt sich der ganze Ablauf mit einem Befehl durchklicken.
Aktiv nur bei `ENVIRONMENT=development` **und** leerem `STRIPE_SECRET_KEY`; sonst 404 (getestet).
Die Meldungen des Simulators sind Stripe nachgebaut. Dass der Webhook auch die echten Meldungen richtig verarbeitet,
prüft `npm run stripe:verify` gegen Stripe im Testmodus (am 16.11.2026 bestanden).

### Anmeldung: E-Mail-Einmalcode, Sitzungs-Cookie
Kein Passwort (nichts zu stehlen, nichts zu vergessen). Code: 6 Ziffern, 10 Minuten, 5 Versuche, 5 Codes pro
Stunde und Adresse; gespeichert als HMAC. Sitzung: zufälliges Token im HttpOnly-Cookie `kd_session`
(SameSite=Lax, Secure), in der Datenbank nur als SHA-256. 30 Tage, verlängert sich bei Nutzung.
CSRF-Schutz: Schreibende Anfragen müssen den eigenen `Origin` tragen (Ausnahme: Webhook, der sich per Signatur ausweist).
Das Cookie ist technisch notwendig → kein Cookie-Banner.

### KI: ein Endpunkt, zwei Bremsen
`POST /api/ai/chat` prüft der Reihe nach: angemeldet → Pro → Eingabe (max. 300 Zeichen, 12 Verlaufseinträge) →
Monatsbudget → Tageskontingent. Beide Zähler werden atomar mit einer SQL-Anweisung erhöht
(`worker/ai/limits.ts`), auch gleichzeitige Anfragen können sie nicht überziehen. Vor dem Aufruf wird die
Höchstsumme reserviert, danach auf die echten Kosten korrigiert; Fehler kosten nichts. Fehlende oder kaputte
Limits bedeuten „KI aus“. Der Anbieter ist eine Schnittstelle (`worker/ai/provider.ts`), derzeit `MockProvider`.

### Datensparsamkeit
Ohne Konto liegt der Lernfortschritt nur in IndexedDB. Mit Konto zusätzlich als ein komprimierter Lernstand auf dem
Server (Entscheidung von Tobias, 17.11.2026). Außerdem auf dem Server: E-Mail, Abo-Stand, Zustimmungen zum Kauf,
KI-Zähler, Fehlerkarten, Warteliste, Kündigungen, Lern-Erinnerungen (ohne Konto-Bezug).
Keine IP-Adressen, keine Analyse. D1 wird mit `--jurisdiction eu` angelegt.

### Kündigungsbutton (§ 312k BGB)
`/kuendigen` ist im Fuß jeder Seite, in der App-Leiste und im Profil verlinkt und funktioniert ohne Anmeldung.
Der Server antwortet immer mit derselben Eingangsbestätigung (Datum, Uhrzeit, Vorgangsnummer), damit das Formular
nicht verrät, ob es ein Konto gibt. Ordentliche Kündigungen gehen sofort an Stripe (`cancel_at_period_end`);
außerordentliche werden als „offen“ gespeichert. Jede Kündigung liegt als Nachweis in `cancellations`.

### Oberfläche
- **Tokens:** `src/styles/tokens.css` ist die einzige Quelle für Farben, Schriften, Rundungen, Schatten.
  Tailwinds Standardfarben sind abgeschaltet. Dark Mode überschreibt nur Token-Werte.
- **Idee:** Papier und Tusche, ein Akzent (Zinnoberrot), Serifenschrift für Überschriften und Japanisch.
- **Bausteine:** `src/ui/` – Button, Card, Flashcard, ProgressBar, UpgradeHint/UpgradeScreen, Field, Notice, Badge, JaText.
- **PWA:** App und Lerndaten werden vorab gecacht (offline lernen), `/api` nie.
- **Sicherheit:** strenge CSP in `public/_headers`; das Theme-Skript ist deshalb eine eigene Datei.

### Lernen
FSRS (`ts-fsrs`) aus der privaten App übernommen. Drei Kartenarten teilen sich eine Logik: Wort, Satz einer
Story-Folge, Fehlerkarte. `StudyItem` ist die einheitliche Anzeigeform (`src/lib/srs.ts`).
Vorlesen: Zu jedem Text kann es eine Aufnahme geben. Ihr Dateiname ist ein Fingerabdruck des Textes
(`shared/audio.ts`), deshalb braucht es keine Zuordnungsliste: `speak(text)` rechnet den Fingerabdruck aus, schaut in
`public/audio/index.json` nach und spielt die Datei – sonst spricht die Gerätestimme (Web Speech API).
`npm run audio:gen` erzeugt fehlende Aufnahmen aus allen Texten, die die App vorlesen kann (`scripts/audio-texts.ts`).
Aufnahmen werden nicht vorab gecacht, sondern beim ersten Abspielen gemerkt.

### Übungen (alle gratis, alle lokal)
Jede Übung bewertet Karten im selben FSRS-System, nur mit eigener Kartenart (`src/lib/db.ts` → `CardKind`):
`wort`, `satz`, `fehler` (Karteikarten-Sitzung), `zeichen` (Schrift), `quiz` (Lückentext). Satzbau und Nachsprechen
haben keine Karten, sie zählen nur für Punkte und Tagesziel.

| Bereich | Logik (rein, getestet) | Seite |
|---|---|---|
| Schrift (Kana, Kanji, Nachzeichnen) | `src/lib/writing.ts` | `src/pages/app/Writing.tsx`, Spiele in `src/features/writing/` |
| Quiz mit Lückentext | `src/lib/quiz.ts` | `src/pages/app/Quiz.tsx` |
| Satzbau, Partikeln, Grammatik | `src/lib/sentences.ts`, `src/content/grammar.ts` | `src/pages/app/Grammar.tsx` |
| Wörterbuch | `src/lib/search.ts` | `src/pages/app/Dictionary.tsx` |
| Nachsprechen | `src/lib/shadowing.ts` (Berechnung), `src/lib/recorder.ts` (Aufnahme im Browser) | `src/pages/app/Shadowing.tsx` |

Rollen im Satz (Subjekt, Objekt, Verb, Partikel) werden ohne zusätzliche Farben markiert: Unterstreichung,
gestrichelt, Akzentfarbe, blass (`RoleLegend` in `src/ui/JaText.tsx`) – so bleibt es bei einem Akzentton.

### Motivation
`src/lib/progress.ts`: Profil (Punkte, Lernserie, Erfolge, Lernkalender) in der Tabelle `profile` auf dem Gerät.
Jede Übung ruft `recordActivity(xp)`; `rate()` macht das automatisch. Daraus entstehen Meldungen (Level, Serie,
Tagesziel, Erfolg), die `src/ui/Toasts.tsx` oben am Rand zeigt (unten lägen sie über den Knöpfen). Ein Lerntag
beginnt um 4 Uhr (`src/lib/day.ts`). Erfolge tragen ein Kanji als Abzeichen statt Emojis.

### Spracheingabe
`src/lib/listen.ts` nutzt die Spracherkennung des Browsers (Chrome, Safari; Firefox nicht). Weil der Browser den Ton
dafür an Google bzw. Apple schickt, fragt `src/ui/MicButton.tsx` vor der ersten Nutzung um Zustimmung
(`settings.micConsent`, im Profil abschaltbar). Die Permissions-Policy erlaubt das Mikrofon nur für die eigene Seite.
Das Nachsprechen nimmt dagegen nur lokal auf (MediaRecorder) und schickt nichts weg.

### Konto und Abgleich zwischen Geräten
Ein kostenloses Konto sichert den Lernstand. Der Server speichert pro Konto genau eine Zeile in `progress_sync`
(gzip + Base64, höchstens 1,5 MB unkomprimiert) und liest den Inhalt nie aus. Zusammengeführt wird auf dem Gerät
(`src/lib/sync.ts`): pro Karte gewinnt die zuletzt bewertete, Missionen werden vereinigt, Zähler nehmen das Maximum,
die Lernserie kommt vom zuletzt aktiven Gerät. Gleichzeitiges Speichern von zwei Geräten verhindert eine
Versionsnummer (409 → neu holen, neu zusammenführen). Meldet sich auf einem Gerät ein anderes Konto an, wird der
Lernstand des vorigen Kontos dort gelöscht statt vermischt. `src/features/AutoSync.tsx` gleicht beim Öffnen, nach
20 Sekunden Ruhe und beim Verlassen der App ab. Einstellungen und das Bewertungs-Protokoll bleiben pro Gerät.
`DELETE /api/account` löscht das Konto mit allem (nicht bei weiterlaufendem Abo).

### Lern-Erinnerung
Web Push ohne Inhalt: Der Server schickt nur ein mit VAPID unterschriebenes Signal (`worker/lib/webpush.ts`), der
Service Worker (`public/push-sw.js`, über `workbox.importScripts` eingebunden) zeigt den festen Text. Dadurch ist
keine Verschlüsselung nötig und der Server kennt keine Inhalte. Ein Cron-Trigger (alle 15 Minuten, `wrangler.jsonc`)
ruft `sendDueReminders`. Wer an dem Tag schon geübt hat, meldet das („seen“) und bekommt keine Erinnerung.
Gesendet wird nur an bekannte Push-Dienste (Schutz davor, dass der Server beliebige Adressen aufruft).
Funktioniert ohne Konto; die Tabelle `reminders` hat deshalb keinen Bezug zu `users`.

### Tests
Vitest in Node. `tests/helpers.ts` startet die echte Hono-App mit einer D1-Datenbank im Arbeitsspeicher
(über `getPlatformProxy` von wrangler) und einer verstellbaren Uhr. Mail, Zahlungsanbieter und KI lassen sich über
`createApp(deps)` ersetzen. Stripe-Meldungen in den Tests sind echt signiert.

## Datenbank

Siehe `migrations/` (jede Tabelle ist dort erklärt): `users`, `login_codes`, `sessions`, `subscriptions`,
`stripe_events`, `checkout_consents`, `cancellations`, `ai_usage`, `ai_budget`, `mistake_cards`, `waitlist`
(0001), `progress_sync` (0002), `reminders` (0003).

Auf dem Gerät (IndexedDB `kotoba-dojo-v2`, `src/lib/db.ts`): `cards`, `reviewLog`, `missions`, `mistakes`, `profile`.

## API

| Methode und Pfad | Zugang | Zweck |
|---|---|---|
| `GET /api/me` | alle | Konto, Pro-Stand, KI-Kontingent |
| `POST /api/auth/start`, `/verify`, `/logout` | alle | Anmeldung per Code |
| `POST /api/billing/checkout` | angemeldet | Zustimmungen speichern, Stripe-Checkout erzeugen |
| `POST /api/billing/portal` | angemeldet mit Abo | Stripe-Kundenportal |
| `POST /api/stripe/webhook` | Stripe (Signatur) | Abo-Stand schreiben |
| `POST /api/cancel` | alle | Kündigungsbutton |
| `POST /api/ai/chat` | Pro | KI-Gespräch |
| `GET /api/mistakes` | angemeldet | Fehler-Karteikarten abholen |
| `GET /api/story/missions` | alle | Vorschau der Pro-Missionen |
| `GET /api/story/missions/:id` | Pro | vollständige Mission |
| `POST /api/waitlist`, `/waitlist/confirm` | alle | Warteliste (Double-Opt-in) |
| `GET/PUT /api/sync` | angemeldet | Lernstand abholen / speichern (mit Versionsnummer) |
| `DELETE /api/account` | angemeldet | Konto mit allen Daten löschen |
| `GET /api/reminders/key` | alle | öffentlicher Schlüssel für Web Push |
| `POST /api/reminders`, `/reminders/:id/seen`, `DELETE /api/reminders/:id` | alle (mit geheimer ID) | Lern-Erinnerung an/aus, „heute gelernt“ |
| `/api/dev/stripe/*` | nur lokal | Stripe-Simulator |

## Folgen-Generator „Gestrandet in Japan“ (`studio/`)

Eigenes Node-Projekt neben der App (eigene `package.json`), damit die App schlank bleibt. Läuft auf Tobias' Laptop.

```
episodes/epXX/episode.json   ← Claude schreibt (Szenen, Figuren, Kamera, Erzähltext, Lernsätze)
        │  npm run skripte
        ▼
recordings/epXX/script.md    → Tobias spricht ein → recordings/epXX/voice.m4a (nicht in Git)
        │  npm run kontrolle / fertig
        ▼
Ton: säubern → whisper.cpp → Skript-Abgleich → Sätze schneiden │ VOICEVOX (Lesungs-Prüfung)
        ▼
src/episode/timeline.ts: Zeitplan (Schnitte, Kamera, Untertitel, Lernkasten, Quiz) → mix.wav
        ▼
Remotion: Standbilder zur Selbstkontrolle → npm run final → out/epXX/video.mp4, cover.jpg, caption.txt, learned.json
```

**Entscheidungen:**
- **Eine Quelle der Wahrheit:** `episode.json`. Sprechskript, Zeitplan und Begleittexte werden daraus erzeugt.
  `curriculum/progress.json` wird aus allen Folgen berechnet (nicht von Hand gepflegt). So kann nichts auseinanderlaufen.
- **Der Ton bestimmt den Takt:** Erst entstehen die Tonclips (deine Sätze, VOICEVOX), dann rechnet `buildTimeline` die
  Zeiten. Szenen, Untertitel und Kamera richten sich nach der echten Stimme. Pausen werden automatisch gestreckt oder
  gestaucht, damit die Folge 61–75 s lang wird.
- **Tonbearbeitung in TypeScript statt Zusatzprogrammen** (`scripts/lib/dsp.ts`): Das mit Remotion gelieferte ffmpeg
  kann nur umwandeln (keine Rausch- oder Lautheitsfilter). Eigener Code läuft unter Windows, Mac und Linux gleich
  und ist getestet.
- **Versprecher:** whisper.cpp liefert Wörter mit Zeiten. `scripts/lib/align.ts` sucht jeden Skript-Satz unscharf
  (Editierdistanz auf Wortebene) und wählt per dynamischer Programmierung die Reihenfolge-treue Kombination. Bei
  mehreren Fassungen gewinnt die letzte, die fast so gut ist wie die beste. Schnittkanten werden an echte
  Sprechpausen angelegt.
- **Japanisch nie falsch:** VOICEVOX liest den Satz, die Pipeline vergleicht die Aussprache mit der geprüften
  Umschrift. Bei Abweichung liest VOICEVOX die Kana, danach Hiragana nach Aussprache. Passt nichts, bricht die
  Pipeline ab.
- **Kameras über den Bildausschnitt** (`framed()` in `src/scenes/registry.ts`): Hochformat ist seitlich schmal
  (56 % der Höhe), Ole ist fast so breit wie hoch. Kameras werden über „was, aus welcher Richtung, wie viel Bild“
  festgelegt, nicht über Koordinaten.
- **Selbstkontrolle:** Dieselbe Rechnung wie im Video (`frameState`) projiziert Figuren und Texte und meldet
  angeschnittene Hauptfiguren oder verdeckte Gesichter. Claude sieht sich die Standbilder trotzdem einzeln an.
- **Vorschau ≠ fertig:** Ersatzstimmen erzeugen nur `preview.mp4` mit rotem „VORSCHAU“-Hinweis. `final` verweigert
  Vorschau-Ton, offene Kontroll-Hinweise und ungeprüfte Stimmen-Bedingungen.
- **App-Videos** (`app-videos/app-XX/appvideo.json`) laufen durch dieselbe Pipeline, ohne Lernsätze, mit
  Werbe-Kennzeichnung im Bild und in `caption.txt`.

**Wichtige Dateien:** `src/episode/schema.ts` (Aufbau einer Folge) · `src/episode/validate.ts` (Regeln) ·
`src/episode/timeline.ts` (Schnitt) · `src/compositions/EpisodeVideo.tsx` (Video) · `src/scenes/` (Szenen + Verzeichnis) ·
`src/characters/` (Ole, Personen, Bewegungen) · `src/overlay/` (Einblendungen, Kontrolle) · `scripts/kotoba.ts` (Befehle) ·
`scripts/lib/audio.ts` (Ton) · `scripts/lib/voicevox.ts` · `scripts/lib/align.ts` · `scripts/lib/dsp.ts`.

**Umgebungsvariablen (optional):** `VOICEVOX_URL`, `KOTOBA_GL` (`angle` mit Grafikkarte, `swangle` ohne),
`KOTOBA_BROWSER` (eigener Chrome), `KOTOBA_CONCURRENCY`, `KOTOBA_WHISPER_MODEL`/`_VERSION`, `KOTOBA_OPENJTALK_PY`
(Ersatzstimme Japanisch), `KOTOBA_FFMPEG`, `KOTOBA_APP_URL`.
