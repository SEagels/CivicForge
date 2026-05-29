export const REQUIRED_TABLES = [
  "schema_migrations",
  "topics",
  "tags",
  "question_types",
  "materials",
  "material_tags",
  "material_question_types",
  "review_logs",
  "rewrite_logs",
  "settings",
] as const;

// Keep SQL as a plain asset so migration tests can guard the local data contract.
export const INITIAL_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL DEFAULT '',
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_builtin INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topics_sort ON topics(sort_order, name);
CREATE INDEX IF NOT EXISTS idx_topics_builtin ON topics(is_builtin);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('custom', 'source', 'skill', 'expression')),
  is_builtin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_kind ON tags(kind);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

CREATE TABLE IF NOT EXISTS question_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_builtin INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_question_types_sort ON question_types(sort_order, name);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  content_md TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  material_type TEXT NOT NULL CHECK (
    material_type IN (
      'problem',
      'cause',
      'solution',
      'case',
      'standard-expression',
      'golden-sentence',
      'title-sentence',
      'transition-sentence',
      'essay-framework',
      'argument',
      'opening',
      'ending'
    )
  ),
  topic_id INTEGER NULL REFERENCES topics(id) ON UPDATE CASCADE ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT '',
  source_detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'deleted')),
  favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
  review_enabled INTEGER NOT NULL DEFAULT 1 CHECK (review_enabled IN (0, 1)),
  review_ease REAL NOT NULL DEFAULT 2.5,
  review_interval_days INTEGER NOT NULL DEFAULT 0,
  review_repetitions INTEGER NOT NULL DEFAULT 0,
  review_lapses INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT NULL,
  last_reviewed_at TEXT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  search_keywords TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_materials_topic_id ON materials(topic_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(material_type);
CREATE INDEX IF NOT EXISTS idx_materials_status_updated ON materials(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_review_due ON materials(review_enabled, next_review_at, status);
CREATE INDEX IF NOT EXISTS idx_materials_favorite ON materials(favorite, updated_at DESC);

CREATE TABLE IF NOT EXISTS material_tags (
  material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (material_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_material_tags_tag_id ON material_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_material_tags_material_id ON material_tags(material_id);

CREATE TABLE IF NOT EXISTS material_question_types (
  material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE CASCADE,
  question_type_id INTEGER NOT NULL REFERENCES question_types(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (material_id, question_type_id)
);

CREATE INDEX IF NOT EXISTS idx_material_question_types_question_type ON material_question_types(question_type_id);
CREATE INDEX IF NOT EXISTS idx_material_question_types_material ON material_question_types(material_id);

CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE CASCADE,
  reviewed_at TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
  previous_due_at TEXT NULL,
  next_due_at TEXT NOT NULL,
  previous_interval_days INTEGER NOT NULL DEFAULT 0,
  next_interval_days INTEGER NOT NULL DEFAULT 0,
  previous_ease REAL NOT NULL DEFAULT 2.5,
  next_ease REAL NOT NULL DEFAULT 2.5,
  elapsed_ms INTEGER NULL,
  note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_review_logs_material_time ON review_logs(material_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at ON review_logs(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_rating ON review_logs(rating);

CREATE TABLE IF NOT EXISTS rewrite_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_material_id INTEGER NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE SET NULL,
  target_material_id INTEGER NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE SET NULL,
  original_text TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (
    target_type IN (
      'compress',
      'expand_argument',
      'opening',
      'ending',
      'transition',
      'title',
      'free'
    )
  ),
  prompt_template TEXT NOT NULL DEFAULT '',
  result_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'saved', 'discarded')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rewrite_source_material ON rewrite_logs(source_material_id);
CREATE INDEX IF NOT EXISTS idx_rewrite_target_material ON rewrite_logs(target_material_id);
CREATE INDEX IF NOT EXISTS idx_rewrite_target_type ON rewrite_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_rewrite_created_at ON rewrite_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  updated_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS materials_fts USING fts5(
  title,
  content_md,
  excerpt,
  search_keywords,
  tokenize = 'trigram'
);

CREATE TRIGGER IF NOT EXISTS materials_ai AFTER INSERT ON materials BEGIN
  INSERT INTO materials_fts(rowid, title, content_md, excerpt, search_keywords)
  VALUES (new.id, new.title, new.content_md, new.excerpt, new.search_keywords);
END;

CREATE TRIGGER IF NOT EXISTS materials_au AFTER UPDATE ON materials BEGIN
  INSERT INTO materials_fts(materials_fts, rowid, title, content_md, excerpt, search_keywords)
  VALUES ('delete', old.id, old.title, old.content_md, old.excerpt, old.search_keywords);
  INSERT INTO materials_fts(rowid, title, content_md, excerpt, search_keywords)
  VALUES (new.id, new.title, new.content_md, new.excerpt, new.search_keywords);
END;

CREATE TRIGGER IF NOT EXISTS materials_ad AFTER DELETE ON materials BEGIN
  INSERT INTO materials_fts(materials_fts, rowid, title, content_md, excerpt, search_keywords)
  VALUES ('delete', old.id, old.title, old.content_md, old.excerpt, old.search_keywords);
END;
`.trim();
