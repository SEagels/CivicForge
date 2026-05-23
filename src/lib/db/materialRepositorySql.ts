export const MATERIAL_REPOSITORY_SQL = {
  listActiveMaterials: `
SELECT
  m.uuid,
  m.title,
  m.content_md,
  m.excerpt,
  m.material_type,
  topic.slug AS topic_slug,
  m.source,
  m.status,
  m.favorite,
  m.review_enabled,
  m.review_ease,
  m.review_interval_days,
  m.review_repetitions,
  m.review_lapses,
  m.next_review_at,
  m.last_reviewed_at,
  m.updated_at,
  COALESCE(group_concat(DISTINCT tag.name), '') AS tag_names,
  COALESCE(group_concat(DISTINCT question_type.slug), '') AS question_type_slugs
FROM materials AS m
LEFT JOIN topics AS topic ON topic.id = m.topic_id
LEFT JOIN material_tags AS mt ON mt.material_id = m.id
LEFT JOIN tags AS tag ON tag.id = mt.tag_id
LEFT JOIN material_question_types AS mqt ON mqt.material_id = m.id
LEFT JOIN question_types AS question_type ON question_type.id = mqt.question_type_id
WHERE m.status IN ('active', 'draft')
GROUP BY m.id
ORDER BY m.updated_at DESC;
`.trim(),

  searchMaterials: `
WITH matched_materials AS (
  SELECT rowid AS material_id
  FROM materials_fts
  WHERE materials_fts MATCH $1
  UNION
  SELECT id AS material_id
  FROM materials
  WHERE title LIKE $2
     OR content_md LIKE $2
     OR excerpt LIKE $2
     OR search_keywords LIKE $2
)
SELECT
  m.uuid,
  m.title,
  m.content_md,
  m.excerpt,
  m.material_type,
  topic.slug AS topic_slug,
  m.source,
  m.status,
  m.favorite,
  m.review_enabled,
  m.review_ease,
  m.review_interval_days,
  m.review_repetitions,
  m.review_lapses,
  m.next_review_at,
  m.last_reviewed_at,
  m.updated_at,
  COALESCE(group_concat(DISTINCT tag.name), '') AS tag_names,
  COALESCE(group_concat(DISTINCT question_type.slug), '') AS question_type_slugs
FROM materials AS m
JOIN matched_materials AS matched ON matched.material_id = m.id
LEFT JOIN topics AS topic ON topic.id = m.topic_id
LEFT JOIN material_tags AS mt ON mt.material_id = m.id
LEFT JOIN tags AS tag ON tag.id = mt.tag_id
LEFT JOIN material_question_types AS mqt ON mqt.material_id = m.id
LEFT JOIN question_types AS question_type ON question_type.id = mqt.question_type_id
WHERE m.status IN ('active', 'draft')
GROUP BY m.id
ORDER BY m.updated_at DESC;
`.trim(),

  upsertMaterial: `
INSERT INTO materials (
  uuid,
  title,
  content_md,
  excerpt,
  material_type,
  topic_id,
  source,
  status,
  favorite,
  review_enabled,
  review_ease,
  review_interval_days,
  review_repetitions,
  review_lapses,
  next_review_at,
  last_reviewed_at,
  word_count,
  search_keywords,
  created_at,
  updated_at
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  (SELECT id FROM topics WHERE slug = $6),
  $7,
  $8,
  $9,
  $10,
  $11,
  $12,
  $13,
  $14,
  $15,
  $16,
  $17,
  $18,
  $19,
  $20
)
ON CONFLICT(uuid) DO UPDATE SET
  title = excluded.title,
  content_md = excluded.content_md,
  excerpt = excluded.excerpt,
  material_type = excluded.material_type,
  topic_id = excluded.topic_id,
  source = excluded.source,
  status = excluded.status,
  favorite = excluded.favorite,
  review_enabled = excluded.review_enabled,
  review_ease = excluded.review_ease,
  review_interval_days = excluded.review_interval_days,
  review_repetitions = excluded.review_repetitions,
  review_lapses = excluded.review_lapses,
  next_review_at = excluded.next_review_at,
  last_reviewed_at = excluded.last_reviewed_at,
  word_count = excluded.word_count,
  search_keywords = excluded.search_keywords,
  updated_at = excluded.updated_at;
`.trim(),

  archiveMaterial: `
UPDATE materials
SET
  status = 'archived',
  deleted_at = $1,
  updated_at = $2
WHERE uuid = $3;
`.trim(),

  upsertTagByName: `
INSERT INTO tags (slug, name, kind, created_at, updated_at)
VALUES ($1, $2, 'custom', $3, $4)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  updated_at = excluded.updated_at;
`.trim(),

  deleteMaterialTags: `
DELETE FROM material_tags
WHERE material_id = (
  SELECT id FROM materials WHERE uuid = $1
);
`.trim(),

  insertMaterialTagBySlug: `
INSERT OR IGNORE INTO material_tags (material_id, tag_id, created_at)
SELECT material.id, tag.id, $3
FROM materials AS material
JOIN tags AS tag ON tag.slug = $2
WHERE material.uuid = $1;
`.trim(),

  deleteMaterialQuestionTypes: `
DELETE FROM material_question_types
WHERE material_id = (
  SELECT id FROM materials WHERE uuid = $1
);
`.trim(),

  insertMaterialQuestionTypeBySlug: `
INSERT OR IGNORE INTO material_question_types (material_id, question_type_id, created_at)
SELECT material.id, question_type.id, $3
FROM materials AS material
JOIN question_types AS question_type ON question_type.slug = $2
WHERE material.uuid = $1;
`.trim(),
} as const;

export const MATERIAL_REPOSITORY_STATEMENTS = [
  "listActiveMaterials",
  "searchMaterials",
  "upsertMaterial",
  "archiveMaterial",
  "upsertTagByName",
  "deleteMaterialTags",
  "insertMaterialTagBySlug",
  "deleteMaterialQuestionTypes",
  "insertMaterialQuestionTypeBySlug",
] as const satisfies readonly (keyof typeof MATERIAL_REPOSITORY_SQL)[];
