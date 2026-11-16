# Kotoba Dojo 言葉道場

Japanisch lernen mit den Sätzen aus der Story: Karteikarten mit Spaced Repetition, Lektionen zu jeder Folge,
Missionen und Gespräche zum Anwenden. Dieser Branch ist das Grundgerüst der kommerziellen Version.

> Die private Lern-App liegt weiterhin unverändert auf dem Branch `main`.

## Starten

```bash
npm install
npm run dev
```

Dann <http://localhost:5173> öffnen. Beim ersten Start werden automatisch eine `.env` mit Test-Geheimnissen und die
lokale Datenbank angelegt. Es wird kein Konto bei Cloudflare oder Stripe gebraucht.

## Den ganzen Ablauf ausprobieren (ohne Stripe-Konto)

1. `/app/sprechen` → eine KI-Figur antippen → Upgrade-Screen → Tarif wählen.
2. Anmelden: E-Mail eingeben. Lokal wird keine Mail verschickt, der Code steht direkt auf der Seite.
3. Beide Häkchen setzen → „Weiter zur Zahlung“ → auf der Simulator-Seite „Testzahlung erfolgreich abschließen“.
4. Profil zeigt „Pro ist aktiv“. Missionen und Gespräche sind offen.
5. „Verträge hier kündigen“ → Bestätigung. Profil zeigt „Pro ist gekündigt“.
6. Profil → „Abo und Zahlungsart verwalten“ → „Zeit vorspulen: Abo ist beendet“ → Pro ist wieder gesperrt.

Der Simulator schickt dabei signierte Meldungen durch den echten Webhook – siehe `docs/ARCHITECTURE.md`.

## Mit echtem Stripe im Testmodus

1. Testschlüssel (`sk_test_…`) in `.env` bei `STRIPE_SECRET_KEY` eintragen.
2. `npm run stripe:setup` – legt Produkt, beide Preise und das Kundenportal an.
3. `stripe listen --forward-to localhost:5173/api/stripe/webhook` starten und das angezeigte `whsec_…` in `.env`
   bei `STRIPE_WEBHOOK_SECRET` eintragen.
4. `npm run dev` neu starten und mit der Testkarte `4242 4242 4242 4242` kaufen.

Automatische Prüfung ohne Browser: Schritte 1 und 2, dann `npm run dev` und in einem zweiten Fenster
`npm run stripe:verify` (Kauf → Verlängerung → Kündigung → Ende mit echten Stripe-Meldungen und Testuhr).

Live-Schlüssel lehnt der Server ab. Einrichtung und automatische Prüfung sind erprobt; der Kauf von Hand im Browser
noch nicht – siehe `docs/HANDOFF.md`.

## Befehle

| Befehl | Wirkung |
|---|---|
| `npm run dev` | Oberfläche, Server und lokale Datenbank starten |
| `npm test` | alle Tests |
| `npm run typecheck` | TypeScript prüfen |
| `npm run build` | Produktions-Build |
| `npm run stripe:setup` | Stripe-Testmodus einrichten |
| `npm run stripe:verify` | Paywall gegen echtes Stripe (Testmodus) prüfen |

## Weiterlesen

- `CLAUDE.md` – Regeln und wichtigste Dateien
- `docs/ARCHITECTURE.md` – Aufbau und Entscheidungen
- `docs/HANDOFF.md` – Stand, TODO-Liste, bekannte Probleme
- `LICENSES.md` – Quellen und Lizenzen
