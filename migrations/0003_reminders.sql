-- Tägliche Lern-Erinnerung per Push-Benachrichtigung. Funktioniert auch ohne Konto – deshalb ohne Bezug zu users.
-- Gespeichert wird nur, wohin und wann die (leere) Benachrichtigung geht. Keine Schlüssel zum Verschlüsseln von
-- Inhalten, weil die Benachrichtigung keinen Inhalt hat: Der Text steht in der App (public/push-sw.js).
CREATE TABLE reminders (
  id              TEXT PRIMARY KEY,         -- zufällig, nur das Gerät kennt sie
  endpoint        TEXT NOT NULL UNIQUE,     -- Adresse beim Push-Dienst des Browsers (Google, Mozilla, Apple, Microsoft)
  minute_of_day   INTEGER NOT NULL,         -- gewünschte Uhrzeit in Minuten nach Mitternacht (Ortszeit)
  time_zone       TEXT NOT NULL,            -- z. B. Europe/Berlin
  last_sent_day   TEXT,                     -- JJJJ-MM-TT (Ortszeit), an dem zuletzt erinnert wurde
  last_seen_day   TEXT,                     -- JJJJ-MM-TT (Ortszeit), an dem schon gelernt wurde → keine Erinnerung nötig
  created_at      INTEGER NOT NULL
);
