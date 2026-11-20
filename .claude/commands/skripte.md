---
description: Alle Skripte, die noch auf eine Aufnahme warten, in recordings/AUFNAHME.md sammeln
---

1. `cd studio && npm run skripte`. Das erzeugt alle `recordings/epXX/script.md` neu aus den `episode.json`, dazu das
   Sammelblatt `recordings/AUFNAHME.md` (nur Folgen ohne Aufnahme, in Post-Reihenfolge) und `curriculum/progress.json`.
2. Gibt es Fehler, behebe sie in der jeweiligen `episode.json` und wiederhole Schritt 1.
3. Sag Tobias kurz und einfach:
   - welche Folgen warten (Nummer, Titel, Post-Tag),
   - dass er `recordings/AUFNAHME.md` öffnen und **pro Folge eine eigene Sprachmemo** aufnehmen soll,
   - wohin die Dateien kommen: `recordings/epXX/voice.m4a` (mp3/wav gehen auch),
   - Tipp: Versprecher einfach den ganzen Satz wiederholen lassen, die Pipeline nimmt die letzte gute Fassung.
