export const REWRITE_LOG_REPOSITORY_SQL = {
  listRewriteLogs: `
SELECT
  rl.uuid,
  source_material.uuid AS source_material_uuid,
  rl.target_type,
  rl.original_text,
  rl.prompt_template,
  rl.result_text,
  rl.status,
  rl.created_at,
  rl.updated_at
FROM rewrite_logs rl
LEFT JOIN materials source_material ON source_material.id = rl.source_material_id
ORDER BY rl.created_at DESC;
`.trim(),

  upsertRewriteLog: `
INSERT INTO rewrite_logs (
  uuid,
  source_material_id,
  target_type,
  original_text,
  prompt_template,
  result_text,
  status,
  created_at,
  updated_at
)
VALUES (
  $1,
  (SELECT id FROM materials WHERE uuid = $2),
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  $9
)
ON CONFLICT(uuid) DO UPDATE SET
  source_material_id = excluded.source_material_id,
  target_type = excluded.target_type,
  original_text = excluded.original_text,
  prompt_template = excluded.prompt_template,
  result_text = excluded.result_text,
  status = excluded.status,
  updated_at = excluded.updated_at;
`.trim(),

  deleteRewriteLog: "DELETE FROM rewrite_logs WHERE uuid = $1;",

  clearRewriteLogs: "DELETE FROM rewrite_logs;",
} as const;
