export const SETTINGS_REPOSITORY_SQL = {
  selectSetting: `
SELECT key, value, value_type, updated_at
FROM settings
WHERE key = $1;
`.trim(),

  upsertSetting: `
INSERT INTO settings (key, value, value_type, updated_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  value_type = excluded.value_type,
  updated_at = excluded.updated_at;
`.trim(),

  deleteSetting: "DELETE FROM settings WHERE key = $1;",

  clearSettings: "DELETE FROM settings;",
} as const;
