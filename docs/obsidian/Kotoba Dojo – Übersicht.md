---
tags: [projekt, kotoba-dojo]
aktualisiert: 2026-11-20
---
# Kotoba Dojo – Übersicht

> Diese Notiz zeigt immer den aktuellen Stand. Veraltetes wird ersetzt, nicht ergänzt.
> Keine Schlüssel oder Passwörter hier eintragen.

## Ziel
Japanisch-Lern-App zur eigenen TikTok-Story. Lernen ist gratis, Sprechen und Missionen sind das bezahlte Pro-Abo.
0 € Fixkosten, so wenig Nutzerdaten wie möglich.

## Produkt
**Gratis:** Karteikarten mit Spaced Repetition (Wörter, Story-Sätze), Lektionen zu den Story-Folgen, Schrift lernen
(Hiragana, Katakana, Kanji, Nachzeichnen), Quiz mit Lückentext, Satzbau und 15 Grammatik-Lektionen, Wörterbuch,
Nachsprechen, 2 Probe-Missionen, Punkte/Lernserie/Erfolge, tägliche Erinnerung. Ohne Konto bleibt alles auf dem Gerät;
mit kostenlosem Konto wird der Lernstand zwischen Geräten abgeglichen.

**Pro (4,99 €/Monat oder 39 €/Jahr):** Story-Missionen, Gespräche mit KI-Figuren (Hilfe auf Deutsch, auch per
Mikrofon), Korrekturen auf Deutsch, Fehler werden automatisch zu Karteikarten.

## Technik
- Oberfläche: React, TypeScript, Tailwind, als PWA (Handy und PC)
- Server: Cloudflare Worker (API, Zeitplan für Erinnerungen) + Cloudflare D1 (Datenbank, EU)
- Bezahlung: Stripe Checkout und Kundenportal, nur Testmodus
- KI: nur über den eigenen Server, mit Tageskontingent und Monatsbudget; derzeit Platzhalter-Antworten
- Start lokal: `npm run dev`, Tests: `npm test`

## Aktueller Stand (17.11.2026)
- Grundgerüst fertig; alle Wünsche aus dem Rundgang umgesetzt (Kana, Kanji, Quiz, Satzbau, Grammatik, Motivation,
  Mikrofon, Nachsprechen, Wortsuche, Abgleich zwischen Geräten, Lern-Erinnerung)
- 155 Tests grün; jede neue Übung im Browser durchgespielt
- Echtes Stripe im Testmodus geprüft (Kauf, Verlängerung, Kündigung, Ende); Bezahlen von Hand im Browser steht noch aus
- Noch nichts veröffentlicht; es werden noch keine E-Mails verschickt
- Lern-Erinnerung und Mikrofon noch nicht auf echten Handys getestet
- Story-Folgen, Missionen und Figuren sind Platzhalter
- Stimmen: Anfrage an den VOICEVOX-Rechteinhaber vorbereitet, muss noch abgeschickt werden; bei Nein Azure Speech

## TikTok-Serie „Gestrandet in Japan“ (Folgen-Generator)
- Ole, ein Seehund aus Hamburg, strandet in Tokio und lernt Satz für Satz Japanisch. Stil: Knete (3D aus Code).
- Staffel 1 „Angekommen“ geplant: 7 Folgen, Post täglich Mo 30.11. bis So 06.12.2026
- Fertig: 0 von 7 · **Vorlauf: 0 Tage** · Aufnahmen fehlen: alle 7 (`recordings/AUFNAHME.md`)
- Folge 1 liegt als Vorschau mit Ersatzstimmen vor (nicht zum Posten)
- So geht es: in Claude Code `/skripte` → einsprechen → Datei nach `recordings/epXX/voice.m4a` → `/fertig` → posten.
  Überblick jederzeit mit `/status`, neue Staffel mit `/staffel`, Werbevideo für die App mit `/appvideo`.
- Vor dem ersten fertigen Video: VOICEVOX starten und `npm run stimmen` (Nutzungsbedingungen der Stimmen prüfen)

## Nächste Schritte
0. Folge 1 einsprechen und mit `/fertig` das erste echte Video machen (auf dem Laptop)
1. VOICEVOX-Anfrage abschicken (`docs/anfragen/voicevox-anfrage.md`); bei Nein oder ohne Antwort Azure Speech
2. Stripe einmal von Hand im Browser durchklicken
3. E-Mail-Versand anschließen
4. Echte Story-Inhalte einpflegen
5. Echte KI anschließen
6. Rechtstexte ausfüllen und prüfen lassen

Vollständige Liste: `docs/HANDOFF.md` im Projekt.

## Wo liegt was
- GitHub: `TheTobf/kotoba-dojo`, Branch `ccr-deda4e3a-13riog` (neues Grundgerüst)
- Branch `main`: die private Lern-App (läuft über GitHub Pages) – nicht überschreiben
- Projektordner auf dem Rechner: [BITTE AUSFÜLLEN]
- Im Projekt: `CLAUDE.md` (Regeln), `docs/ARCHITECTURE.md` (Aufbau), `docs/HANDOFF.md` (Stand und TODO)
