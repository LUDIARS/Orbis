-- 0003 を当てた既存 DB にも行き渡るよう、capability の失効フラグと
-- pageId 単位の本文表は別 migration で足す。
ALTER TABLE sigillum ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS sigillum_page_identity ON sigillum(cura_id, page_id) WHERE kind = 'page' AND active = 1;
CREATE TABLE IF NOT EXISTS page_content (
  page_id TEXT PRIMARY KEY REFERENCES page(id),
  content TEXT NOT NULL
);
