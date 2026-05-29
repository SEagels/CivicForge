export const REVIEW_LOG_REPOSITORY_SQL = {
  listReviewLogs: `
SELECT
  rl.uuid,
  material.uuid AS material_uuid,
  rl.reviewed_at,
  rl.rating,
  rl.review_mode,
  rl.topic_slug,
  rl.question_type_slugs,
  rl.material_type,
  rl.previous_due_at,
  rl.next_due_at,
  rl.previous_interval_days,
  rl.next_interval_days,
  rl.previous_ease,
  rl.next_ease,
  rl.elapsed_ms,
  rl.answer_revealed_at,
  rl.note
FROM review_logs rl
JOIN materials material ON material.id = rl.material_id
ORDER BY rl.reviewed_at DESC;
`.trim(),

  upsertReviewLog: `
INSERT INTO review_logs (
  uuid,
  material_id,
  reviewed_at,
  rating,
  review_mode,
  topic_slug,
  question_type_slugs,
  material_type,
  previous_due_at,
  next_due_at,
  previous_interval_days,
  next_interval_days,
  previous_ease,
  next_ease,
  elapsed_ms,
  answer_revealed_at,
  note
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
  $9,
  $10,
  $11,
  $12,
  $13,
  $14,
  $15,
  $16,
  $17
)
ON CONFLICT(uuid) DO UPDATE SET
  material_id = excluded.material_id,
  reviewed_at = excluded.reviewed_at,
  rating = excluded.rating,
  review_mode = excluded.review_mode,
  topic_slug = excluded.topic_slug,
  question_type_slugs = excluded.question_type_slugs,
  material_type = excluded.material_type,
  previous_due_at = excluded.previous_due_at,
  next_due_at = excluded.next_due_at,
  previous_interval_days = excluded.previous_interval_days,
  next_interval_days = excluded.next_interval_days,
  previous_ease = excluded.previous_ease,
  next_ease = excluded.next_ease,
  elapsed_ms = excluded.elapsed_ms,
  answer_revealed_at = excluded.answer_revealed_at,
  note = excluded.note;
`.trim(),

  clearReviewLogs: "DELETE FROM review_logs;",
} as const;
