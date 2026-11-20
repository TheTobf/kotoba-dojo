---
description: Übersicht – fertige Folgen, Vorlauf in Tagen, fehlende Aufnahmen (warnt unter 7 Tagen)
---

1. `cd studio && npm run status`. Das aktualisiert `out/POSTPLAN.md`, `recordings/AUFNAHME.md` und `curriculum/progress.json`.
2. Sag Tobias kurz und einfach:
   - wie viele Folgen fertig sind und wie viele Tage **Vorlauf** er hat (Tage ab heute mit fertigem Video),
   - welche Aufnahmen fehlen (Nummer, Titel, Post-Tag), am besten in der Reihenfolge, in der sie gebraucht werden,
   - ob eine Aufnahme schon da ist, aber noch nicht verarbeitet (→ `/fertig`),
   - **wenn der Vorlauf unter 7 Tagen liegt: deutlich warnen** und den nächsten Schritt nennen
     (einsprechen laut `recordings/AUFNAHME.md` oder `/staffel`, wenn keine Folgen mehr geplant sind),
   - ob diese Woche schon ein App-Video geplant ist (sonst `/appvideo` vorschlagen).
