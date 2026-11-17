-- Abgleich zwischen Geräten (kostenloses Konto).
-- Pro Konto genau ein Lernstand: Karten-Zustände, erledigte Missionen, Punkte/Serie/Erfolge.
-- Gespeichert als gzip-komprimiertes JSON (Base64), damit auch viele tausend Karten in eine Zeile passen.
-- Der Server liest den Inhalt nicht aus – er bewahrt ihn nur auf. Zusammengeführt wird auf dem Gerät.
CREATE TABLE progress_sync (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data        TEXT NOT NULL,
  version     INTEGER NOT NULL,   -- zählt bei jedem Speichern hoch (Schutz vor gleichzeitigem Überschreiben)
  size        INTEGER NOT NULL,   -- Größe des unkomprimierten JSON in Bytes
  updated_at  INTEGER NOT NULL
);
