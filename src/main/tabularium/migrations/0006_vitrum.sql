-- @implements SPEC-ORBIS-VITRUM-PERSIST
CREATE TABLE IF NOT EXISTS vitrum (
  owner_kind TEXT NOT NULL CHECK(owner_kind IN ('page', 'habitus')),
  owner_id TEXT NOT NULL,
  spec TEXT NOT NULL,
  PRIMARY KEY (owner_kind, owner_id)
);
