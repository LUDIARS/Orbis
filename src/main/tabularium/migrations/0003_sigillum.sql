CREATE TABLE IF NOT EXISTS sigillum (
  sigillum TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  cura_id TEXT NOT NULL,
  page_id TEXT,
  issued_at TEXT NOT NULL,
  attached_to TEXT
);
CREATE TABLE IF NOT EXISTS sigillum_log (
  id INTEGER PRIMARY KEY,
  sigillum TEXT NOT NULL REFERENCES sigillum(sigillum),
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sigillum_log_by_sigillum_at ON sigillum_log(sigillum, at);
CREATE TABLE IF NOT EXISTS vinculum_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE page ADD COLUMN umbra INTEGER NOT NULL DEFAULT 0;
