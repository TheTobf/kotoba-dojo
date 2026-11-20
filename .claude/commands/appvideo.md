---
description: Das wöchentliche App-Video erzeugen (klar als Werbung gekennzeichnet)
argument-hint: "[optional: Thema, z. B. neue Funktion Kanji nachzeichnen]"
---

Erzeuge das **App-Video der Woche** über Tobias' App Kotoba Dojo. Thema: $ARGUMENTS
(leer = etwas Passendes vorschlagen: Behind the Scenes, eine neue Funktion, Tobias' Lernfortschritt, „alle Sätze aus der Serie üben“).

Regeln:
- Das Video ist **Werbung** und klar erkennbar: Die Einblendung „Werbung · meine eigene App“ kommt automatisch.
  `caption.txt` erinnert daran, beim Posten „Offenlegung von Inhalten → Deine Marke“ einzuschalten.
- Nur Wahres über die App sagen: nur Funktionen, die es wirklich gibt (siehe `docs/HANDOFF.md`, `src/router.tsx`).
  Keine Preise oder Versprechen, die nicht stimmen. Ist die App noch nicht öffentlich online, Tobias vorher fragen,
  ob das Video schon geplant werden soll.
- Länge 20–60 s, Hook in den ersten 2 s, kurze Sätze. Tobias spricht alles selbst ein (gleicher Ablauf wie bei Folgen).
- Ein App-Video pro Woche, als zusätzlicher Post (meist sonntags). Post-Tag in `appvideo.json`.

Ablauf:
1. Nächste freie Nummer: `app-videos/app-XX/appvideo.json` (Aufbau: `studio/src/episode/appvideo.ts`).
   Szenen: `app-handy` (Ole hält das Handy mit einem Bildschirmfoto, Feld `screen: "screens/….png"`) und gern Szenen der Serie.
   In `screens` stehen die Bildschirmfotos mit App-Pfad (z. B. `{ "datei": "01-lernen.png", "pfad": "/lernen" }`).
2. Bildschirmfotos holen: App starten (Repo-Ordner: `npm run dev`), dann `cd studio && npm run app:bilder -- app-XX`.
   Bilder ansehen. Keine echten Kontodaten oder E-Mail-Adressen im Bild.
3. `npm run pruefen -- app-XX` und `npm run skripte` (Skript: `recordings/app-XX/script.md`).
4. Vorschau: `npm run vorschau -- app-XX`. Standbilder in `out/app-XX/kontrolle/` ansehen.
5. Wenn Tobias' Aufnahme da ist: wie bei `/fertig` (`npm run kontrolle -- app-XX`, ansehen, `npm run final -- app-XX`).
6. `out/POSTPLAN.md` (über `npm run status`), `docs/HANDOFF.md` aktualisieren, committen.
7. Tobias: Titel, Thema, Post-Tag, Skript-Pfad und der Hinweis zur Werbe-Kennzeichnung.
