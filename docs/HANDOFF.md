# Übergabe

Stand: 16.11.2026 · Branch `ccr-deda4e3a-13riog` · für das nächste Modell und für Tobias

## Was fertig ist (geprüft)

- **Start mit einem Befehl:** `npm run dev` richtet `.env` und lokale Datenbank ein und startet Oberfläche + Server.
- **Tests:** 96 Tests grün (`npm test`), Typprüfung und Build sauber.
  Abgedeckt: Pro-Regel, Kauf, Verlängerung, Kündigung, abgelaufenes Abo, Webhook-Signatur, Reihenfolge/Dubletten,
  Anmeldung, CSRF, Kündigungsbutton, KI-Kontingent und Monatsbudget, Simulator-Sperre in Produktion, Missionen, FSRS.
- **Ablauf im Browser durchgeklickt** (Playwright, Handy-Größe, mit Stripe-Simulator): Gast sieht Upgrade-Screen →
  Anmeldung → Kaufseite mit Pflicht-Häkchen → Bezahlseite → Pro aktiv → Pro-Mission gelöst → KI-Gespräch mit
  Korrektur und Hilfe → Fehlerkarte unter „Lernen“ → Kündigung mit Bestätigung → Abo beendet → wieder gesperrt
  (Server antwortet 402). Keine Fehler in der Browser-Konsole.
- **Seiten mit Design:** Landingpage mit Warteliste, Preise, Anmeldung, Kündigung, Impressum, Datenschutz, AGB,
  Widerruf, Quellen; App: Start, Lernen (+ Lernsitzung), Story (+ Folge, Mission), Sprechen (+ Probe-Mission,
  KI-Gespräch), Profil, Kaufseite. Hell und dunkel, Handy und PC.
- **KI-Endpunkt** mit Tageskontingent pro Nutzer und globalem Monatsbudget, Platzhalter-Antworten.
- **Alte Audiodateien entfernt**, Vorlesen über die Sprachausgabe des Geräts.

## Was NICHT geprüft ist (ehrlich)

- **Echtes Stripe (Testmodus) ist noch nicht geprüft.** In der Aufbau-Sitzung wurde ein Schlüssel hinterlegt, Stripe
  hat ihn aber als ungültig abgelehnt („Invalid API Key“) – es wurde nichts bei Stripe angelegt.
  `worker/payments/stripe-gateway.ts`, `scripts/stripe-setup.ts` und `scripts/stripe-verify.ts` sind nach
  Dokumentation geschrieben, aber noch nie gegen Stripe gelaufen. Die Stripe-Meldungen in Tests und Simulator sind
  nachgebaut (API 2026-10-28).
- **Es wird keine E-Mail verschickt** (Platzhalter). In Produktion kann sich deshalb noch niemand anmelden.
- **Nichts ist veröffentlicht.** Kein Deployment, keine echte D1-Datenbank.
- Kein Test auf echten Handys, kein Screenreader-Test.

## TODO – in dieser Reihenfolge

1. **Stimmen austauschen.** Jetzt: Sprachausgabe des Geräts (`src/lib/speech.ts`) – Qualität schwankt je nach Gerät,
   manche haben keine japanische Stimme (die App warnt dann). Ziel: eigene Aufnahmen mit klarer kommerzieller Lizenz
   als bevorzugte Quelle, Gerätestimme als Rückfall. Zuerst nur Story-Sätze und Missionen (wenige Dutzend Dateien),
   erst danach der Grundwortschatz. Lizenz vor dem Erzeugen schriftlich klären und in `LICENSES.md` eintragen.
   Die alten Dateien auf `main` nicht verwenden. Dateien wegen der Menge nicht vorab cachen (Laufzeit-Cache).
2. **Echten Stripe-Testlauf machen.** Schnellster Weg: `sk_test_…` in `.env` → `npm run stripe:setup` →
   `npm run dev` → in einem zweiten Fenster `npm run stripe:verify`. Das Skript legt bei Stripe ein Test-Abo an,
   spult mit einer Stripe-Testuhr vor und prüft Kauf → Verlängerung → Kündigung → Ende mit echten Stripe-Meldungen
   (ohne Browser, ohne `stripe listen`). Schlägt ein Schritt fehl, die echte Meldung mit
   `worker/payments/simulator.ts` vergleichen und Abweichungen in Webhook, Simulator **und** Tests nachziehen.
   Danach einmal von Hand: `stripe listen --forward-to localhost:5173/api/stripe/webhook`, `whsec_…` in `.env`,
   Kauf mit Testkarte 4242 4242 4242 4242, Kundenportal, kündigen.
   Im Stripe-Dashboard prüfen: Text am Bezahlknopf (Button-Lösung § 312j BGB), Rechnungs-/Belegversand.
3. **E-Mail-Versand anschließen** (`worker/lib/mailer.ts`): Anmeldecodes, Wartelisten-Bestätigung,
   Kündigungsbestätigung. Vorschlag: Brevo (EU, Gratis-Kontingent). Schlüssel als Secret, Dienst in die
   Datenschutzerklärung. Ohne das ist kein Start möglich.
4. **Echte Story-Inhalte einpflegen:** `src/content/story.ts` (Folgen + Sätze + Video-Link),
   `src/content/trialMissions.ts`, `worker/content/missions.ts`, `shared/characters.ts`. Alles dort ist Platzhalter.
5. **Echte KI anschließen:** neuen Anbieter in `worker/ai/` neben `mock.ts`, Auswahl in `createAiProvider`.
   Kosten pro Aufruf aus den Token-Zahlen berechnen (`costMicro`), `maxCostMicroPerCall` realistisch setzen,
   Antwort als festes JSON (Antwort, Korrektur, Hilfe) verlangen und prüfen. Anbieter in Datenschutz und AGB nennen.
6. **Rechtstexte fertigstellen:** alle `[BITTE AUSFÜLLEN]` in `src/pages/site/legal/` und `shared/legal.ts`,
   danach anwaltlich prüfen lassen. Offene Punkte stehen im Text (u. a. Jahrestarif und § 309 Nr. 9 BGB,
   Dienstleistung vs. digitale Inhalte beim Widerruf, Auftragsverarbeitung Cloudflare/Stripe).
7. **Konto löschen und Auskunft (DSGVO):** Endpunkt + Knopf im Profil; aktives Abo vorher kündigen.
8. **Missbrauchsschutz:** Begrenzung pro IP bzw. Cloudflare Turnstile für `/api/auth/start`, `/api/waitlist`,
   `/api/cancel` (bisher nur Begrenzung pro E-Mail-Adresse beim Anmelden).
9. **Kündigungen nachbearbeiten:** Einträge mit Status `offen` sichtbar machen (außerordentliche Kündigungen,
   Stripe-Fehler); in der Bestätigungs-Mail einen Link zum Zurücknehmen anbieten.
10. **Aufräumen per Zeitplan (Cron Trigger):** abgelaufene `sessions`, `login_codes`, alte `stripe_events`.
11. **Veröffentlichen – nur nach Freigabe durch Tobias:** `wrangler d1 create kotoba-dojo --jurisdiction eu`,
    ID in `wrangler.jsonc`, Migrationen `--remote`, Secrets setzen, `wrangler deploy`.
12. **Kleineres:** Sicherung wieder einspielen (Export gibt es schon) · Spracheingabe per Mikrofon (Achtung:
    Chromes Spracherkennung schickt Ton an Google → nur mit Einwilligung) · Übungen der privaten App
    (Quiz, Satzbau, Kanji-Schreiben) bei Bedarf von `main` übernehmen · Oberflächen-Tests ins Repo ·
    Testlauf bei jedem Push (GitHub Actions) · ungenutzte `.woff`-Zweitdateien der Serifenschrift einsparen.

## Bekannte Probleme und Stolperfallen

- **Nicht nach `main` mergen:** Dort liegt die private Lern-App, die über GitHub Pages läuft und in der Tobias lernt.
  Ein Merge würde sie ersetzen. Der Deploy-Workflow ist auf diesem Branch entfernt.
- **Das Repository ist öffentlich.** Niemals Schlüssel committen (`.env` ist in `.gitignore`).
- Reihenfolge der Stripe-Meldungen wird über `event.created` (Sekunden) entschieden. Zwei Meldungen in derselben
  Sekunde werden beide übernommen – die später zugestellte gewinnt. Bei Bedarf stattdessen das Abo bei Stripe
  frisch abrufen.
- Ein Konto kann genau ein Abo haben (`subscriptions.user_id` ist Primärschlüssel). Doppelkäufe verhindert der
  Checkout (409), nicht die Datenbank.
- Kündigung ohne Anmeldung ist gesetzlich nötig, heißt aber: Wer die E-Mail-Adresse kennt, kann die Kündigung zum
  Laufzeitende auslösen. Sie ist bis dahin im Portal rücknehmbar; die Bestätigung geht an den Kontoinhaber.
- Die zwei Lerndateien (zusammen ca. 2 MB) werden vorab gecacht. Wächst der Inhalt, auf Laden nach Bedarf umstellen.
- `wrangler`/`miniflare` laufen in einer Beta-Version (von `@cloudflare/vite-plugin` vorgegeben). Bei Updates
  zuerst `npm test` und `npm run dev` prüfen.
- Im Startprotokoll von `npm run dev` kann eine Netzwerk-Fehlermeldung von wrangler stehen (Versionsprüfung ohne
  Internet). Sie ist harmlos.
