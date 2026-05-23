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
  WHERE materials_fts MATCH :query
  UNION
  SELECT id AS material_id
  FROM materials
  WHERE title LIKE :like_query
     OR content_md LIKE :like_query
     OR excerpt LIKE :like_query
     OR search_keywords LIKE :like_query
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
  word_count,
  search_keywords,
  created_at,
  updated_at
) VALUES (
  :uuid,
  :title,
  :content_md,
  :excerpt,
  :material_type,
  (SELECT id FROM topics WHERE slug = :topic_slug),
  :source,
  :status,
  :favorite,
  :review_enabled,
  :word_count,
  :search_keywords,
  :created_at,
  :updated_at
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
  word_count = excluded.word_count,
  search_keywords = excluded.search_keywords,
  updated_at = excluded.updated_at;
`.trim(),

  archiveMaterial: `
UPDATE materials
SET
  status = 'archived',
  deleted_at = :deleted_at,
  updated_at = :updated_at
WHERE uuid = :uuid;
`.trim(),

  deleteMaterialTags: `
DELETE FROM material_tags
WHERE material_id = (
  SELECT id FROM materials WHERE uuid = :material_uuid
);
`.trim(),

  insertMaterialTagBySlug: `
INSERT OR IGNORE INTO material_tags (material_id, tag_id, created_at)
SELECT material.id, tag.id, :created_at
FROM materials AS material
JOIN tags AS tag ON tag.slug = :tag_slug
WHERE material.uuid = :material_uuid;
`.trim(),

  deleteMaterialQuestionTypes: `
DELETE FROM material_question_types
WHERE material_id = (
  SELECT id FROM materials WHERE uuid = :material_uuid
);
`.trim(),

  insertMaterialQuestionTypeBySlug: `
INSERT OR IGNORE INTO material_question_types (material_id, question_type_id, created_at)
SELECT material.id, question_type.id, :created_at
FROM materials AS material
JOIN question_types AS question_type ON question_type.slug = :question_type_slug
WHERE material.uuid = :material_uuid;
`.trim(),
} as const;

export const MATERIAL_REPOSITORY_STATEMENTS = [
  "listActiveMaterials",
  "searchMaterials",
  "upsertMaterial",
  "archiveMaterial",
  "deleteMaterialTags",
  "insertMaterialTagBySlug",
  "deleteMaterialQuestionTypes",
  "insertMaterialQuestionTypeBySlug",
] as const satisfies readonly (keyof typeof MATERIAL_REPOSITORY_SQL)[];
