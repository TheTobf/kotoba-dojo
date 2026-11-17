# Übergabe

Stand: 17.11.2026 · Branch `ccr-deda4e3a-13riog` · für das nächste Modell und für Tobias

## Was fertig ist (geprüft)

- **Start mit einem Befehl:** `npm run dev` richtet `.env` und lokale Datenbank ein und startet Oberfläche + Server.
- **Tests:** 155 Tests grün (`npm test`), Typprüfung und Build sauber.
  Abgedeckt: Pro-Regel, Kauf, Verlängerung, Kündigung, abgelaufenes Abo, Webhook-Signatur, Reihenfolge/Dubletten,
  Anmeldung, CSRF, Kündigungsbutton, KI-Kontingent und Monatsbudget, Simulator-Sperre in Produktion, Missionen, FSRS,
  Schrift, Quiz, Satzbau, Grammatik, Wortsuche, Motivation, Abgleich zwischen Geräten, Konto löschen, Lern-Erinnerung.
- **Ablauf im Browser durchgeklickt** (Playwright, Handy-Größe, mit Stripe-Simulator): Gast sieht Upgrade-Screen →
  Anmeldung → Kaufseite mit Pflicht-Häkchen → Bezahlseite → Pro aktiv → Pro-Mission gelöst → KI-Gespräch mit
  Korrektur und Hilfe → Fehlerkarte unter „Lernen“ → Kündigung mit Bestätigung → Abo beendet → wieder gesperrt
  (Server antwortet 402). Keine Fehler in der Browser-Konsole.
- **Echtes Stripe im Testmodus geprüft (16.11.2026):**
  - `npm run stripe:setup` hat Produkt, beide Preise (4,99 € / 39 €) und das Kundenportal angelegt; ein zweiter Lauf
    ändert nichts.
  - `npm run stripe:verify` ist bestanden: Stripe erzeugt an einer Testuhr Kauf, Verlängerung, Kündigung und Ende;
    die echten Meldungen wurden signiert an den Webhook geschickt, und der Server hat jedes Mal richtig entschieden
    (Pro an → weiter an, Zeitraum verlängert → „gekündigt, läuft noch“ → Pro aus, Inhalt 402).
  - Die Stripe-Anbindung (`worker/payments/stripe-gateway.ts`) wurde direkt aufgerufen: Checkout-Seite für beide
    Tarife (richtiger Betrag, Deutsch, Konto-ID, Zustimmungstext), Kundenportal-Link und Kündigung zum Laufzeitende.
- **Seiten mit Design:** Landingpage mit Warteliste, Preise, Anmeldung, Kündigung, Impressum, Datenschutz, AGB,
  Widerruf, Quellen; App: Start, Lernen (+ Lernsitzung), Story (+ Folge, Mission), Sprechen (+ Probe-Mission,
  KI-Gespräch), Profil, Kaufseite. Hell und dunkel, Handy und PC.
- **KI-Endpunkt** mit Tageskontingent pro Nutzer und globalem Monatsbudget, Platzhalter-Antworten.
- **Neu am 17.11.2026 (Wünsche von Tobias aus dem Rundgang), jeweils im Browser durchgespielt:**
  - Schrift (`/app/lernen/schrift`): Hiragana → Katakana → Kanji mit Blitz-Erkennen, Hören, Memory, Nachzeichnen;
    Stufen ab 80 % oder per „Kann ich schon“. Kanji auch direkt aus der Karteikarte nachzeichnen.
  - Quiz (`/app/lernen/quiz`): Lückentext auswählen, eintippen (Romaji → Kana), hören, gemischt.
  - Satzbau (`/app/lernen/satzbau`): Sätze aus Teilen bauen, Partikeln einsetzen, 15 Grammatik-Lektionen.
  - Wörterbuch (`/app/lernen/woerter`): Suche auf Deutsch, Kanji, Kana, Romaji; Blättern nach Lektion.
  - Motivation: Punkte, Level mit Rängen, Lernserie (Tag beginnt 4 Uhr), Tagesziel, 19 Erfolge, Lernkalender.
  - Mikrofon: Antworten in Missionen und KI-Gesprächen sprechen statt tippen (mit Einwilligung, im Profil abschaltbar).
  - Nachsprechen (`/app/sprechen/nachsprechen`): hören, aufnehmen, vergleichen, selbst einschätzen.
  - Kostenloses Konto mit Abgleich zwischen Geräten (getestet mit zwei Browsern und Kontowechsel), Konto löschen,
    Hinweis „Sichere deinen Fortschritt“ nach beiden Probe-Missionen oder 3 Lerntagen (mit iPhone-Hinweis).
  - Tägliche Lern-Erinnerung per Push, auch ohne Konto; nur wenn an dem Tag noch nicht gelernt wurde.
- **Alte Audiodateien entfernt.** Vorlesen: eigene Aufnahme, falls vorhanden, sonst Sprachausgabe des Geräts.
  Es gibt noch keine einzige Aufnahme.

## Was NICHT geprüft ist (ehrlich)

- **Bei Stripe noch offen:** Niemand hat die Stripe-Bezahlseite im Browser mit der Testkarte ausgefüllt, das
  Kundenportal von Hand bedient oder `stripe listen` benutzt. Außerdem lief die Stripe-Anbindung nur unter Node, nicht
  im lokalen Worker selbst – die Aufbau-Umgebung ließ den Worker nicht ins Internet (dort endete der Checkout mit
  einem Verbindungsfehler). Auf einem normalen Rechner sollte das gehen; bitte einmal von Hand durchklicken.
- **Es wird keine E-Mail verschickt** (Platzhalter). In Produktion kann sich deshalb noch niemand anmelden.
- **Nichts ist veröffentlicht.** Kein Deployment, keine echte D1-Datenbank.
- **Lern-Erinnerung:** Eine echte Benachrichtigung ist nie angekommen. Die Aufbau-Umgebung erreicht die Push-Dienste
  (Google, Apple, Mozilla) nicht, und in der lokalen Entwicklung gibt es keinen Service Worker. Geprüft sind
  Server, Zeitplan, VAPID-Unterschrift (mit dem öffentlichen Schlüssel verifiziert) und der Service-Worker-Code.
  Bitte nach dem Veröffentlichen auf einem Android-Handy und einem installierten iPhone ausprobieren.
- **Mikrofon:** Nur mit nachgebauter Spracherkennung bzw. künstlichem Mikrofon getestet, nicht mit echter Stimme.
  Wie gut Chrome und Safari Anfänger-Japanisch erkennen, ist offen.
- Kein Test auf echten Handys, kein Screenreader-Test.

## TODO – in dieser Reihenfolge

1. **Stimmen austauschen – Technik fertig, Quelle wartet auf Antwort.**
   - Fertig: Die App spielt zu einem Text die eigene Aufnahme ab, wenn es eine gibt, sonst die Gerätestimme
     (`src/lib/speech.ts`, `shared/audio.ts`). `npm run audio:gen` erzeugt die Aufnahmen und die Liste
     `public/audio/index.json`; die Namensnennung erscheint automatisch unter `/quellen`. Im Browser geprüft.
   - Entscheidung von Tobias (16.11.2026): zuerst beim Rechteinhaber der VOICEVOX-Stimmen nachfragen
     (Text liegt in `docs/anfragen/voicevox-anfrage.md`, muss er selbst über das Formular abschicken).
     Bei Nein oder ohne Antwort: Microsoft Azure Speech, bezahlte Stufe (Standard S0 – die Gratis-Stufe erlaubt
     keine kommerzielle Nutzung). Dafür ist `audio:gen` schon gebaut, aber noch nie gegen Azure gelaufen.
   - Bei Ja zu VOICEVOX: in `scripts/audio-gen.ts` eine zweite Quelle neben `azure()` ergänzen (VOICEVOX-Engine
     liefert WAV → nach MP3 umwandeln), Namensnennung „VOICEVOX:四国めたん“.
   - Reihenfolge: erst Stufe 1 (59 Texte: Story, Missionen, Figuren), Probe hören lassen, dann `--alles`
     (4.068 Texte, rund 32.000 Zeichen). Lizenz in `LICENSES.md` eintragen. Alte Dateien von `main` nicht verwenden.
2. **Stripe einmal von Hand im Browser durchklicken** (der automatische Testlauf ist bestanden, siehe oben):
   `sk_test_…` in `.env` → `stripe listen --forward-to localhost:5173/api/stripe/webhook` → `whsec_…` in `.env` →
   `npm run dev` → Kauf mit Testkarte 4242 4242 4242 4242 → Kundenportal → kündigen.
   `npm run stripe:verify` nach jeder Änderung an Webhook oder Abo-Logik erneut laufen lassen.
   Im Stripe-Dashboard prüfen: Text am Bezahlknopf (Button-Lösung § 312j BGB), Rechnungs-/Belegversand.
3. **E-Mail-Versand anschließen** (`worker/lib/mailer.ts`): Anmeldecodes, Wartelisten-Bestätigung,
   Kündigungsbestätigung. Vorschlag: Brevo (EU, Gratis-Kontingent). Schlüssel als Secret, Dienst in die
   Datenschutzerklärung. Ohne das ist kein Start möglich.
4. **Echte Story-Inhalte einpflegen:** `src/content/story.ts` (Folgen + Sätze + Video-Link),
   `src/content/trialMissions.ts`, `worker/content/missions.ts`, `shared/characters.ts`. Alles dort ist Platzhalter.
5. **Echte KI anschließen:** neuen Anbieter in `worker/ai/` neben `mock.ts`, Auswahl in `createAiProvider`.
   Kosten pro Aufruf aus den Token-Zahlen berechnen (`costMicro`), `maxCostMicroPerCall` realistisch setzen,
   Antwort als festes JSON (Antwort, Korrektur, Hilfe) verlangen und prüfen. Anbieter in Datenschutz und AGB nennen.
6. **Rechtstexte fertigstellen:** alle `[BITTE AUSFÜLLEN]` in `src/pages/site/legal/`, `shared/legal.ts` und
   `VAPID_SUBJECT` in `wrangler.jsonc`, danach anwaltlich prüfen lassen. Offene Punkte stehen im Text (u. a. Jahrestarif
   und § 309 Nr. 9 BGB, Dienstleistung vs. digitale Inhalte beim Widerruf, Auftragsverarbeitung Cloudflare/Stripe,
   Drittlandübermittlung bei Spracherkennung und Push-Diensten).
7. **Missbrauchsschutz:** Begrenzung pro IP bzw. Cloudflare Turnstile für `/api/auth/start`, `/api/waitlist`,
   `/api/cancel`, `/api/reminders` (bisher nur Begrenzung pro E-Mail-Adresse beim Anmelden).
8. **DSGVO-Auskunft:** Konto löschen gibt es; eine Datenauskunft (alles, was zum Konto gespeichert ist, als Datei) fehlt.
9. **Kündigungen nachbearbeiten:** Einträge mit Status `offen` sichtbar machen (außerordentliche Kündigungen,
   Stripe-Fehler); in der Bestätigungs-Mail einen Link zum Zurücknehmen anbieten.
10. **Aufräumen per Zeitplan:** abgelaufene `sessions`, `login_codes`, alte `stripe_events` (der Cron-Trigger für die
    Erinnerungen läuft schon alle 15 Minuten, dort lässt sich das anhängen).
11. **Veröffentlichen – nur nach Freigabe durch Tobias:** `wrangler d1 create kotoba-dojo --jurisdiction eu`,
    ID in `wrangler.jsonc`, Migrationen `--remote`, Secrets setzen (`SESSION_SECRET`, `STRIPE_*`, `VAPID_*`),
    `wrangler deploy`. Danach Lern-Erinnerung und Mikrofon auf echten Handys prüfen.
12. **Kleineres:** Sicherung wieder einspielen (Export gibt es schon) · Automodus fürs Nachsprechen (freihändig mit
    Sprachbefehlen, gibt es in der privaten App) · Oberflächen-Tests ins Repo (die Prüfskripte dieser Sitzung lagen
    nur im Arbeitsordner) · Testlauf bei jedem Push (GitHub Actions) · ungenutzte `.woff`-Zweitdateien der
    Serifenschrift einsparen. Der bebilderte Rundgang (claude.ai-Artefakt) ist auf dem Stand vom 17.11.2026.

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
- Die Lerndateien (words, sentences, kana, kanji: zusammen ca. 2,3 MB) werden vorab gecacht. Wächst der Inhalt,
  auf Laden nach Bedarf umstellen. Strichdaten (rund 1.100 kleine Dateien) werden erst beim Ansehen geladen.
- Abgleich: Pro Konto eine Zeile in `progress_sync` (gzip, höchstens 1,5 MB unkomprimiert – reicht für alle Karten
  mehrfach). Meldet sich auf einem Gerät ein anderes Konto an, wird der Lernstand des vorigen Kontos dort gelöscht
  (er liegt ja in dessen Konto). Ungesicherte Änderungen eines Gasts gehen beim ersten Anmelden ins neue Konto.
- Neue Chromium-Versionen kennen `SpeechRecognition` ohne Präfix; wer die Spracheingabe in Tests nachbaut, muss
  `window.SpeechRecognition` und `window.webkitSpeechRecognition` ersetzen.
- `wrangler`/`miniflare` laufen in einer Beta-Version (von `@cloudflare/vite-plugin` vorgegeben). Bei Updates
  zuerst `npm test` und `npm run dev` prüfen.
- Hinter einem Proxy brauchen die Stripe-Skripte `NODE_USE_ENV_PROXY=1` (so lief es in der Aufbau-Umgebung).
- Im Startprotokoll von `npm run dev` kann eine Netzwerk-Fehlermeldung von wrangler stehen (Versionsprüfung ohne
  Internet). Sie ist harmlos.
