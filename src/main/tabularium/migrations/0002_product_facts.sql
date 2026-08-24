CREATE TABLE IF NOT EXISTS product_facts (
  id TEXT PRIMARY KEY, cura_id TEXT NOT NULL REFERENCES cura(id), title TEXT NOT NULL,
  price TEXT, rating TEXT, review_count TEXT, delivery TEXT, url TEXT NOT NULL,
  added_at TEXT NOT NULL, UNIQUE(cura_id, url)
);
