# Lernzettel 📚

Handy-App für deine Lernzettel – nach Fach und Übung sortiert, mit Klausur-Lernzettel und Wochen-Check.
Funktioniert offline und lässt sich wie eine App auf den Startbildschirm legen.

**Adresse:** <https://thetobf.github.io/kotoba-dojo/lernzettel/>

## Fächer

📐 Mathe · 📊 Externes Rechnungswesen · 🌍 Internationales Management · 💻 Wirtschaftsinformatik (ab 1. Dezember)

## Was die App kann

- **Pro Fach:** Klausur-Lernzettel oben, darunter alle Übungen – pro Übung ein oder mehrere Lernzettel (Teil 1, Teil 2, …).
- **Lernzettel lesen:** Formeln, farbige Kästen (Merke, Definition, Formel, Beispiel, Achtung, Klausurtipp),
  Selbsttest mit zugeklappten Lösungen, Inhaltsverzeichnis, Schrift größer/kleiner, hell/dunkel.
- **Checkliste „Das kann ich“:** zum Abhaken – fängt jede Woche neu an. Alles abgehakt = Lernzettel für diese Woche erledigt.
- **Test nach jedem Lernzettel:** Multiple Choice mit 4 Antworten, sofortiges Feedback mit Erklärung, Auswertung,
  „Falsche nochmal üben“, bestes Ergebnis wird gespeichert.
- **Abschlusstest pro Fach** (ganz unten auf der Fach-Seite): mischt die Fragen aller Lernzettel – 10, 20 oder alle;
  Fragen, die du zuletzt falsch hattest, kommen zuerst.
- **Wochen-Check:** Was du diese Woche durchgehen solltest. Solange es noch keinen Klausur-Lernzettel gibt, sind das
  alle Übungs-Lernzettel eines Fachs; sobald der Klausur-Lernzettel da ist, nur noch dieser.
- **Klausurtermine** eintragen → Countdown auf der Startseite.
- **Suche** über alle Lernzettel.
- **Einfügen:** Lernzettel aus einem Claude-Projekt oder Chat hineinkopieren – auch mehrere auf einmal; eine neue
  Version ersetzt die alte (bleibt nur auf diesem Gerät).
- **Claude-Projekte verbinden:** Unter „Mehr“ pro Fach die Projektanweisung kopieren und im claude.ai-Projekt einfügen –
  dann schreibt Claude dort bei jedem Upload Lernzettel mit Test im App-Format.
- **Sicherung** speichern/laden, um Wochen-Check und eigene Lernzettel aufs nächste Handy mitzunehmen.

## Aufs Handy holen

- **iPhone:** Adresse in Safari öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.
- **Android:** Adresse in Chrome öffnen → Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.

Falls beim allerersten Öffnen Kotoba Dojo statt der Lernzettel erscheint: einmal neu laden.

## Neue Lernzettel

1. **In Claude Code (dauerhaft, auf allen Geräten):** Übungsblatt, Lösungen und Folien schicken und z. B. sagen:
   „Mach mir Lernzettel für Mathe Übung 4.“ Claude legt sie mit Test in `inhalte/<fach>/` ab und pusht sie.
   Sobald der Stand auf `main` ist, baut GitHub die App neu – in der App erscheint „Neue Lernzettel sind da“.
2. **In deinen Claude-Projekten (Mathematik, Externes Rechnungswesen, Internationales Management):** einmalig die
   Projektanweisung aus der App (Mehr → Claude-Projekte verbinden) ins Projekt kopieren. Danach Unterlagen hochladen,
   Claudes Antwort kopieren und in der App unter ➕ Einfügen einsetzen.
3. **Vor der Klausur:** „Mach mir den Klausur-Lernzettel für Mathe.“

Format und Regeln für die Lernzettel stehen in [`FORMAT.md`](FORMAT.md), die Arbeitsanleitung für Claude in
[`CLAUDE.md`](CLAUDE.md).

## Entwickeln

```bash
cd lernzettel
npm install
npm run dev     # http://localhost:5173
npm test        # prüft auch alle Lernzettel in inhalte/
npm run build
```

Deployment: `.github/workflows/deploy.yml` baut Kotoba Dojo und die Lernzettel-App bei jedem Push auf `main`
und veröffentlicht die Lernzettel unter `/kotoba-dojo/lernzettel/`.
