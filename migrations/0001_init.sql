-- Kotoba Dojo – Datenbank (Cloudflare D1, Speicherort EU).
-- Grundsatz: so wenig Nutzerdaten wie möglich. Lernfortschritt liegt NICHT hier, sondern auf dem Gerät.
-- Alle Zeitangaben sind Unix-Sekunden (UTC).

-- Konto: nur die E-Mail-Adresse.
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL
);

-- Einmalcodes für die Anmeldung (ohne Passwort). Gespeichert wird nur ein Fingerabdruck (HMAC), nie der Code.
CREATE TABLE login_codes (
  email         TEXT PRIMARY KEY,
  code_hash     TEXT NOT NULL,
  expires_at    INTEGER NOT NULL,
  attempts      INTEGER NOT NULL DEFAULT 0,
  window_start  INTEGER NOT NULL,          -- Beginn des Zeitfensters für die Versand-Begrenzung
  sent_count    INTEGER NOT NULL DEFAULT 1 -- verschickte Codes in diesem Fenster
);

-- Sitzungen (Anmelde-Cookie). Gespeichert wird nur der Fingerabdruck des Tokens.
CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

-- Abo-Stand. Wird AUSSCHLIESSLICH vom verifizierten Stripe-Webhook geschrieben.
-- Ob jemand Pro hat, berechnet shared/entitlement.ts aus dieser Zeile.
CREATE TABLE subscriptions (
  user_id                 TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT NOT NULL,
  stripe_subscription_id  TEXT NOT NULL,
  status                  TEXT NOT NULL,     -- Stripe-Status: active, past_due, canceled, …
  plan                    TEXT,              -- monthly | yearly
  period_start            INTEGER NOT NULL,
  period_end              INTEGER NOT NULL,
  cancel_at               INTEGER,           -- gesetzt, wenn gekündigt wurde und das Abo noch läuft
  last_event_at           INTEGER NOT NULL,  -- Zeitstempel der zuletzt verarbeiteten Stripe-Meldung
  updated_at              INTEGER NOT NULL
);
CREATE INDEX subscriptions_customer ON subscriptions(stripe_customer_id);

-- Bereits verarbeitete Stripe-Meldungen (damit doppelt zugestellte Meldungen nichts doppelt auslösen).
CREATE TABLE stripe_events (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  received_at  INTEGER NOT NULL
);

-- Nachweis der Zustimmungen vor dem Kauf (sofortiger Beginn, Erlöschen des Widerrufsrechts).
CREATE TABLE checkout_consents (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                TEXT NOT NULL,
  text_version        TEXT NOT NULL,   -- Version des angezeigten Zustimmungstextes (shared/legal.ts)
  created_at          INTEGER NOT NULL
);

-- Kündigungen über den Kündigungsbutton (§ 312k BGB), auch ohne Anmeldung möglich.
CREATE TABLE cancellations (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  user_id     TEXT,
  kind        TEXT NOT NULL,   -- ordentlich | ausserordentlich
  reason      TEXT,
  status      TEXT NOT NULL,   -- umgesetzt | offen | kein_vertrag
  created_at  INTEGER NOT NULL
);

-- KI-Kontingent pro Nutzer und Tag.
CREATE TABLE ai_usage (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day      TEXT NOT NULL,      -- JJJJ-MM-TT (UTC)
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- Globales KI-Ausgabenlimit pro Monat (Millionstel Euro, damit auch Bruchteile von Cent zählen).
CREATE TABLE ai_budget (
  month        TEXT PRIMARY KEY,  -- JJJJ-MM (UTC)
  spent_micro  INTEGER NOT NULL DEFAULT 0
);

-- Fehler aus KI-Gesprächen als Karteikarten (nur Pro). Das Gerät holt sie ab und lernt sie lokal.
CREATE TABLE mistake_cards (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ja          TEXT NOT NULL,
  kana        TEXT NOT NULL,
  romaji      TEXT NOT NULL,
  de          TEXT NOT NULL,
  note        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX mistake_cards_user ON mistake_cards(user_id, created_at);

-- Warteliste der Landingpage (Double-Opt-in: erst nach Bestätigung gilt die Anmeldung).
CREATE TABLE waitlist (
  email         TEXT PRIMARY KEY,
  token_hash    TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  confirmed_at  INTEGER
);
