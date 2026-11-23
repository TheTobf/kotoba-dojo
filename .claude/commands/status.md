---
description: Stand der Serie – fertige Folgen, Vorlauf in Tagen, fehlende Aufnahmen
---
`cd serie && npx tsx scripts/status.ts` ausführen und das Ergebnis kurz wiedergeben: fertige Folgen, Vorlauf in Tagen (⚠️ deutlich warnen, wenn unter 7 Tagen), welche Aufnahmen fehlen, nächster Posttermin. Wenn der Vorlauf knapp wird: konkret vorschlagen, welche Skripte als Nächstes eingesprochen werden sollten (und ob `/staffel` nötig ist, weil keine geplanten Folgen mehr übrig sind).
