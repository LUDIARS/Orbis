-- Vinculum の接続可否そのものを残す監査ログ。
-- sigillum_log は sigillum への外部キーを持つので、まだ sigillum を持たない
-- 「接続を拒否した」記録は入れられない。 拒否の記録が入らないと、照合が
-- 効いているのか誰も接続していないだけなのかを後から区別できない。
CREATE TABLE IF NOT EXISTS vinculum_access_log (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL,
  allowed INTEGER NOT NULL,
  enforced INTEGER NOT NULL,
  reason TEXT NOT NULL,
  client_id TEXT
);
CREATE INDEX IF NOT EXISTS vinculum_access_log_by_at ON vinculum_access_log(at);
