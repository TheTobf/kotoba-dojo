---
tags: [projekt, kotoba-dojo]
aktualisiert: 2026-11-16
---
# Kotoba Dojo – Übersicht

> Diese Notiz zeigt immer den aktuellen Stand. Veraltetes wird ersetzt, nicht ergänzt.
> Keine Schlüssel oder Passwörter hier eintragen.

## Ziel
Japanisch-Lern-App zur eigenen TikTok-Story. Lernen ist gratis, Sprechen und Missionen sind das bezahlte Pro-Abo.
0 € Fixkosten, so wenig Nutzerdaten wie möglich.

## Produkt
**Gratis:** Sätze und Vokabeln mit Spaced Repetition (deutsche Oberfläche, Kana, Romaji, Vorlesen), Lektionen zu den
Story-Folgen, 2 Probe-Missionen im Sprechmodus. Kein Konto nötig, Fortschritt bleibt auf dem Gerät.

**Pro (4,99 €/Monat oder 39 €/Jahr):** Story-Missionen, Gespräche mit KI-Figuren (Hilfe auf Deutsch),
Korrekturen auf Deutsch, Fehler werden automatisch zu Karteikarten.

## Technik
- Oberfläche: React, TypeScript, Tailwind, als PWA (Handy und PC)
- Server: Cloudflare Worker (API) + Cloudflare D1 (Datenbank, EU)
- Bezahlung: Stripe Checkout und Kundenportal, nur Testmodus
- KI: nur über den eigenen Server, mit Tageskontingent und Monatsbudget; derzeit Platzhalter-Antworten
- Start lokal: `npm run dev`, Tests: `npm test`

## Aktueller Stand (16.11.2026)
- Grundgerüst fertig: alle Hauptseiten mit Design, Paywall, Kündigungsbutton, KI-Endpunkt, Rechtsseiten als Entwurf
- 96 Tests grün; ganzer Ablauf (Kauf → Pro → Kündigung → Pro endet) lokal im Browser durchgeklickt
- Bezahlung läuft lokal über einen Stripe-Simulator; **echtes Stripe im Testmodus ist noch nicht geprüft**
- Noch nichts veröffentlicht; es werden noch keine E-Mails verschickt
- Story-Folgen, Missionen und Figuren sind Platzhalter
- Alte Stimmen entfernt (Lizenz), Vorlesen über die Gerätestimme

## Nächste Schritte
1. Stimmen durch eigene, lizenzierte Aufnahmen ersetzen
2. Echten Stripe-Testlauf machen (Testschlüssel nötig)
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
