# Architektur

Stand: 16.11.2026 · Grundgerüst

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
Grenze: Die Form der Meldungen ist Stripes Dokumentation (API 2026-10-28) nachgebaut, aber noch nicht mit echten
Stripe-Meldungen abgeglichen – siehe HANDOFF.

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
Lernfortschritt (Karten, Protokoll, erledigte Missionen) liegt nur in IndexedDB – für Gratis **und** Pro.
Auf dem Server: E-Mail, Abo-Stand, Zustimmungen zum Kauf, KI-Zähler, Fehlerkarten, Warteliste, Kündigungen.
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
Vorlesen: Web Speech API des Geräts (keine Audiodateien).

### Tests
Vitest in Node. `tests/helpers.ts` startet die echte Hono-App mit einer D1-Datenbank im Arbeitsspeicher
(über `getPlatformProxy` von wrangler) und einer verstellbaren Uhr. Mail, Zahlungsanbieter und KI lassen sich über
`createApp(deps)` ersetzen. Stripe-Meldungen in den Tests sind echt signiert.

## Datenbank

Siehe `migrations/0001_init.sql` (jede Tabelle ist dort erklärt): `users`, `login_codes`, `sessions`,
`subscriptions`, `stripe_events`, `checkout_consents`, `cancellations`, `ai_usage`, `ai_budget`, `mistake_cards`,
`waitlist`.

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
| `/api/dev/stripe/*` | nur lokal | Stripe-Simulator |
