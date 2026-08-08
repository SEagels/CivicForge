export const SOURCE_AND_PRACTICE_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS source_documents (
  uuid TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'note' CHECK (
    source_type IN ('article', 'policy', 'exercise-material', 'model-answer', 'note')
  ),
  content_md TEXT NOT NULL DEFAULT '',
  source_uri TEXT NOT NULL DEFAULT '',
  publisher TEXT NOT NULL DEFAULT '',
  published_at TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_documents_status_updated
ON source_documents(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS source_excerpts (
  uuid TEXT PRIMARY KEY,
  document_uuid TEXT NOT NULL REFERENCES source_documents(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  content_md TEXT NOT NULL DEFAULT '',
  locator_json TEXT NOT NULL DEFAULT '',
  note_md TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_excerpts_document
ON source_excerpts(document_uuid, created_at DESC);

CREATE TABLE IF NOT EXISTS exercises (
  uuid TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  prompt_md TEXT NOT NULL DEFAULT '',
  question_type_slug TEXT NOT NULL DEFAULT 'general',
  word_limit INTEGER NULL,
  time_limit_minutes INTEGER NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  current_stage TEXT NOT NULL DEFAULT 'reading' CHECK (
    current_stage IN ('reading', 'outline', 'answer', 'reflection')
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exercises_status_updated
ON exercises(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_question_type
ON exercises(question_type_slug, updated_at DESC);

CREATE TABLE IF NOT EXISTS exercise_documents (
  exercise_uuid TEXT NOT NULL REFERENCES exercises(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  document_uuid TEXT NOT NULL REFERENCES source_documents(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (exercise_uuid, document_uuid)
);

CREATE TABLE IF NOT EXISTS attempts (
  uuid TEXT PRIMARY KEY,
  exercise_uuid TEXT NOT NULL REFERENCES exercises(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  outline_md TEXT NOT NULL DEFAULT '',
  answer_md TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'submitted', 'revised')),
  started_at TEXT NOT NULL,
  finished_at TEXT NULL,
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_exercise_updated
ON attempts(exercise_uuid, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_status_updated
ON attempts(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS attempt_revisions (
  uuid TEXT PRIMARY KEY,
  attempt_uuid TEXT NULL REFERENCES attempts(uuid) ON UPDATE CASCADE ON DELETE SET NULL,
  legacy_source_material_uuid TEXT NULL,
  original_md TEXT NOT NULL DEFAULT '',
  revised_md TEXT NOT NULL DEFAULT '',
  prompt_template TEXT NOT NULL DEFAULT '',
  revision_number INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempt_revisions_attempt
ON attempt_revisions(attempt_uuid, revision_number DESC);

CREATE TABLE IF NOT EXISTS feedback_records (
  uuid TEXT PRIMARY KEY,
  attempt_uuid TEXT NOT NULL REFERENCES attempts(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'rule', 'model')),
  dimensions_json TEXT NOT NULL DEFAULT '{}',
  summary_md TEXT NOT NULL DEFAULT '',
  suggestions_md TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_attempt_created
ON feedback_records(attempt_uuid, created_at DESC);
`.trim();

export const KNOWLEDGE_CARDS_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS knowledge_cards (
  uuid TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content_md TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  card_type TEXT NOT NULL,
  topic_slug TEXT NOT NULL DEFAULT '',
  lifecycle_status TEXT NOT NULL DEFAULT 'inbox' CHECK (
    lifecycle_status IN ('inbox', 'refining', 'usable', 'core', 'archived')
  ),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (
    verification_status IN ('unverified', 'user-verified', 'source-verified')
  ),
  is_core INTEGER NOT NULL DEFAULT 0 CHECK (is_core IN (0, 1)),
  review_enabled INTEGER NOT NULL DEFAULT 0 CHECK (review_enabled IN (0, 1)),
  source_label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_cards_lifecycle
ON knowledge_cards(lifecycle_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_topic
ON knowledge_cards(topic_slug, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_type
ON knowledge_cards(card_type, updated_at DESC);

INSERT OR IGNORE INTO knowledge_cards (
  uuid, title, content_md, summary, card_type, topic_slug, lifecycle_status,
  verification_status, is_core, review_enabled, source_label, created_at, updated_at
)
SELECT
  materials.uuid,
  materials.title,
  materials.content_md,
  materials.excerpt,
  materials.material_type,
  COALESCE(topics.slug, ''),
  CASE
    WHEN materials.status = 'draft' THEN 'refining'
    WHEN materials.status = 'active' AND materials.favorite = 1 THEN 'core'
    WHEN materials.status = 'active' THEN 'usable'
    ELSE 'archived'
  END,
  CASE WHEN materials.status = 'active' THEN 'user-verified' ELSE 'unverified' END,
  materials.favorite,
  materials.review_enabled,
  materials.source,
  materials.created_at,
  materials.updated_at
FROM materials
LEFT JOIN topics ON topics.id = materials.topic_id;

CREATE TABLE IF NOT EXISTS card_sources (
  card_uuid TEXT NOT NULL REFERENCES knowledge_cards(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  source_document_uuid TEXT NULL REFERENCES source_documents(uuid) ON UPDATE CASCADE ON DELETE SET NULL,
  source_excerpt_uuid TEXT NULL REFERENCES source_excerpts(uuid) ON UPDATE CASCADE ON DELETE SET NULL,
  attempt_uuid TEXT NULL REFERENCES attempts(uuid) ON UPDATE CASCADE ON DELETE SET NULL,
  relation_type TEXT NOT NULL DEFAULT 'manual' CHECK (
    relation_type IN ('evidence', 'extracted-from', 'revised-from', 'manual')
  ),
  created_at TEXT NOT NULL,
  PRIMARY KEY (card_uuid, source_document_uuid, source_excerpt_uuid, attempt_uuid, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_card_sources_document ON card_sources(source_document_uuid);
CREATE INDEX IF NOT EXISTS idx_card_sources_attempt ON card_sources(attempt_uuid);

CREATE TABLE IF NOT EXISTS card_tags (
  card_uuid TEXT NOT NULL REFERENCES knowledge_cards(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  PRIMARY KEY (card_uuid, tag_name)
);

INSERT OR IGNORE INTO card_tags (card_uuid, tag_name)
SELECT materials.uuid, tags.name
FROM materials
JOIN material_tags ON material_tags.material_id = materials.id
JOIN tags ON tags.id = material_tags.tag_id;

CREATE TABLE IF NOT EXISTS card_question_types (
  card_uuid TEXT NOT NULL REFERENCES knowledge_cards(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  question_type_slug TEXT NOT NULL,
  PRIMARY KEY (card_uuid, question_type_slug)
);

INSERT OR IGNORE INTO card_question_types (card_uuid, question_type_slug)
SELECT materials.uuid, question_types.slug
FROM materials
JOIN material_question_types ON material_question_types.material_id = materials.id
JOIN question_types ON question_types.id = material_question_types.question_type_id;

CREATE TABLE IF NOT EXISTS card_usages (
  uuid TEXT PRIMARY KEY,
  card_uuid TEXT NOT NULL REFERENCES knowledge_cards(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  attempt_uuid TEXT NOT NULL REFERENCES attempts(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  usage_kind TEXT NOT NULL DEFAULT 'content' CHECK (
    usage_kind IN ('title', 'excerpt', 'content', 'argument', 'evidence')
  ),
  slot_key TEXT NOT NULL DEFAULT '',
  used_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_card_usages_card_time
ON card_usages(card_uuid, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_usages_attempt
ON card_usages(attempt_uuid);

INSERT OR IGNORE INTO attempt_revisions (
  uuid, attempt_uuid, legacy_source_material_uuid, original_md, revised_md,
  prompt_template, revision_number, created_at
)
SELECT
  rewrite_logs.uuid,
  NULL,
  source_material.uuid,
  rewrite_logs.original_text,
  rewrite_logs.result_text,
  rewrite_logs.prompt_template,
  1,
  rewrite_logs.created_at
FROM rewrite_logs
LEFT JOIN materials AS source_material ON source_material.id = rewrite_logs.source_material_id;
`.trim();

export const REVIEW_CARDS_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS review_cards (
  uuid TEXT PRIMARY KEY,
  knowledge_card_uuid TEXT NOT NULL REFERENCES knowledge_cards(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'key-point-recall' CHECK (
    mode IN ('key-point-recall', 'expression-recall', 'case-application', 'placement-recall', 'micro-writing')
  ),
  prompt_md TEXT NOT NULL DEFAULT '',
  answer_md TEXT NOT NULL DEFAULT '',
  next_review_at TEXT NULL,
  last_reviewed_at TEXT NULL,
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_cards_due
ON review_cards(next_review_at, knowledge_card_uuid);
CREATE INDEX IF NOT EXISTS idx_review_cards_knowledge
ON review_cards(knowledge_card_uuid);

INSERT OR IGNORE INTO review_cards (
  uuid, knowledge_card_uuid, mode, prompt_md, answer_md, next_review_at,
  last_reviewed_at, ease, interval_days, repetitions, lapses, created_at, updated_at
)
SELECT
  'review-card-' || materials.uuid,
  materials.uuid,
  'key-point-recall',
  materials.title,
  materials.content_md,
  materials.next_review_at,
  materials.last_reviewed_at,
  materials.review_ease,
  materials.review_interval_days,
  materials.review_repetitions,
  materials.review_lapses,
  materials.created_at,
  materials.updated_at
FROM materials
WHERE materials.review_enabled = 1 AND materials.status = 'active';

ALTER TABLE review_logs ADD COLUMN review_card_uuid TEXT NULL;

UPDATE review_logs
SET review_card_uuid = (
  SELECT 'review-card-' || materials.uuid
  FROM materials
  WHERE materials.id = review_logs.material_id
)
WHERE review_card_uuid IS NULL;

CREATE INDEX IF NOT EXISTS idx_review_logs_review_card_time
ON review_logs(review_card_uuid, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS study_sessions (
  uuid TEXT PRIMARY KEY,
  planned_minutes INTEGER NOT NULL DEFAULT 30,
  started_at TEXT NOT NULL,
  finished_at TEXT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (
    status IN ('planned', 'active', 'completed', 'abandoned')
  )
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_started
ON study_sessions(started_at DESC);

CREATE TABLE IF NOT EXISTS study_session_items (
  session_uuid TEXT NOT NULL REFERENCES study_sessions(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
  task_uuid TEXT NOT NULL,
  task_kind TEXT NOT NULL CHECK (task_kind IN ('review', 'practice', 'reflection', 'intake')),
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  entity_uuid TEXT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'completed', 'skipped', 'snoozed')
  ),
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NULL,
  PRIMARY KEY (session_uuid, task_uuid)
);

CREATE INDEX IF NOT EXISTS idx_study_session_items_status
ON study_session_items(session_uuid, status, sort_order);
`.trim();

export const LEARNING_SEARCH_MIGRATION_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS source_documents_fts USING fts5(
  uuid UNINDEXED,
  title,
  content_md,
  publisher,
  tokenize = 'trigram'
);

CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_cards_fts USING fts5(
  uuid UNINDEXED,
  title,
  content_md,
  summary,
  source_label,
  tokenize = 'trigram'
);

CREATE VIRTUAL TABLE IF NOT EXISTS exercises_fts USING fts5(
  uuid UNINDEXED,
  title,
  prompt_md,
  tokenize = 'trigram'
);

CREATE TRIGGER IF NOT EXISTS source_documents_v2_ai AFTER INSERT ON source_documents BEGIN
  INSERT INTO source_documents_fts(uuid, title, content_md, publisher)
  VALUES (new.uuid, new.title, new.content_md, new.publisher);
END;

CREATE TRIGGER IF NOT EXISTS source_documents_v2_au AFTER UPDATE ON source_documents BEGIN
  DELETE FROM source_documents_fts WHERE uuid = old.uuid;
  INSERT INTO source_documents_fts(uuid, title, content_md, publisher)
  VALUES (new.uuid, new.title, new.content_md, new.publisher);
END;

CREATE TRIGGER IF NOT EXISTS source_documents_v2_ad AFTER DELETE ON source_documents BEGIN
  DELETE FROM source_documents_fts WHERE uuid = old.uuid;
END;

CREATE TRIGGER IF NOT EXISTS knowledge_cards_v2_ai AFTER INSERT ON knowledge_cards BEGIN
  INSERT INTO knowledge_cards_fts(uuid, title, content_md, summary, source_label)
  VALUES (new.uuid, new.title, new.content_md, new.summary, new.source_label);
END;

CREATE TRIGGER IF NOT EXISTS knowledge_cards_v2_au AFTER UPDATE ON knowledge_cards BEGIN
  DELETE FROM knowledge_cards_fts WHERE uuid = old.uuid;
  INSERT INTO knowledge_cards_fts(uuid, title, content_md, summary, source_label)
  VALUES (new.uuid, new.title, new.content_md, new.summary, new.source_label);
END;

CREATE TRIGGER IF NOT EXISTS knowledge_cards_v2_ad AFTER DELETE ON knowledge_cards BEGIN
  DELETE FROM knowledge_cards_fts WHERE uuid = old.uuid;
END;

CREATE TRIGGER IF NOT EXISTS exercises_v2_ai AFTER INSERT ON exercises BEGIN
  INSERT INTO exercises_fts(uuid, title, prompt_md)
  VALUES (new.uuid, new.title, new.prompt_md);
END;

CREATE TRIGGER IF NOT EXISTS exercises_v2_au AFTER UPDATE ON exercises BEGIN
  DELETE FROM exercises_fts WHERE uuid = old.uuid;
  INSERT INTO exercises_fts(uuid, title, prompt_md)
  VALUES (new.uuid, new.title, new.prompt_md);
END;

CREATE TRIGGER IF NOT EXISTS exercises_v2_ad AFTER DELETE ON exercises BEGIN
  DELETE FROM exercises_fts WHERE uuid = old.uuid;
END;

INSERT INTO source_documents_fts(uuid, title, content_md, publisher)
SELECT uuid, title, content_md, publisher FROM source_documents
WHERE NOT EXISTS (SELECT 1 FROM source_documents_fts LIMIT 1);

INSERT INTO knowledge_cards_fts(uuid, title, content_md, summary, source_label)
SELECT uuid, title, content_md, summary, source_label FROM knowledge_cards
WHERE NOT EXISTS (SELECT 1 FROM knowledge_cards_fts LIMIT 1);

INSERT INTO exercises_fts(uuid, title, prompt_md)
SELECT uuid, title, prompt_md FROM exercises
WHERE NOT EXISTS (SELECT 1 FROM exercises_fts LIMIT 1);
`.trim();

// The legacy FTS table stores its own content. Its update/delete triggers must
// use normal DELETE statements; the FTS5 'delete' command is for external or
// contentless tables and makes every material update fail with SQL logic error.
export const MATERIALS_FTS_TRIGGER_FIX_SQL = `
DROP TRIGGER IF EXISTS materials_ai;
DROP TRIGGER IF EXISTS materials_au;
DROP TRIGGER IF EXISTS materials_ad;

DELETE FROM materials_fts;
INSERT INTO materials_fts(rowid, title, content_md, excerpt, search_keywords)
SELECT id, title, content_md, excerpt, search_keywords FROM materials;

CREATE TRIGGER materials_ai AFTER INSERT ON materials BEGIN
  INSERT INTO materials_fts(rowid, title, content_md, excerpt, search_keywords)
  VALUES (new.id, new.title, new.content_md, new.excerpt, new.search_keywords);
END;

CREATE TRIGGER materials_au AFTER UPDATE ON materials BEGIN
  DELETE FROM materials_fts WHERE rowid = old.id;
  INSERT INTO materials_fts(rowid, title, content_md, excerpt, search_keywords)
  VALUES (new.id, new.title, new.content_md, new.excerpt, new.search_keywords);
END;

CREATE TRIGGER materials_ad AFTER DELETE ON materials BEGIN
  DELETE FROM materials_fts WHERE rowid = old.id;
END;
`.trim();
