---
description: Wöchentliches App-Video (klar als Werbung erkennbar) erzeugen – du sprichst den Text selbst ein
argument-hint: "[optional: Thema, z. B. 'neue Funktion Automodus']"
---
Erzeuge das wöchentliche App-Video über Kotoba Dojo. Thema: $ARGUMENTS (leer = selbst wählen: Behind the Scenes, neue Funktion aus `git log` der App, mein Fortschritt aus der Serie).

1. Nächste freie ID `app-01`, `app-02` … in `serie/episodes/`.
2. Screenshots der echten App machen (eigene Inhalte, keine fremden Marken): im Repo-Wurzelordner `npm run dev` starten und mit Playwright (Handy-Größe 390×844, deviceScaleFactor 2) 2–4 passende Seiten fotografieren → `serie/episodes/app-XX/bilder/*.png`.
3. `serie/episodes/app-XX/episode.json` mit `"art": "app"`, `neu: []`, `wiederholung: []`, Szene `studio` mit `szeneProps: { "bild": "bilder/<datei>.png" }` (pro Shot ein anderes Bild), Knö zeigt/erklärt. Kein Quiz nötig. Hook in den ersten 2 s. 30–60 s. Ehrlich, kein Übertreiben. Das Video zeigt durchgehend „Werbung · meine eigene App“.
4. `npx tsx scripts/pruefe-folge.ts app-XX` → Skript `serie/recordings/app-XX/script.md` (ich spreche es selbst ein, gleicher Ablauf wie bei den Folgen). Vorschau-Kontrolle mit `npx tsx scripts/render.ts app-XX --vorschau --nur-kontrolle`, Bilder ansehen.
5. Final rendert `/fertig`, sobald `serie/recordings/app-XX/voice.m4a` da ist. caption.txt erinnert an „Offenlegung von Inhalten → Deine Marke“.
6. Kurz berichten, committen, pushen.
