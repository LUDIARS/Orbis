CREATE TABLE IF NOT EXISTS window_state (
  owner_kind TEXT NOT NULL CHECK (owner_kind IN ('anulus', 'speculum', 'page')),
  owner_id TEXT NOT NULL,
  display_id TEXT,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  visible INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (owner_kind, owner_id)
);
