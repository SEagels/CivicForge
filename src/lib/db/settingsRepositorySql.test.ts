import { describe, expect, it } from "vitest";
import { SETTINGS_REPOSITORY_SQL } from "./settingsRepositorySql";

describe("settings repository SQL assets", () => {
  it("exports the complete settings statement set", () => {
    expect(Object.keys(SETTINGS_REPOSITORY_SQL).sort()).toEqual([
      "clearSettings",
      "deleteSetting",
      "selectSetting",
      "upsertSetting",
    ]);
  });

  it("selects one setting value by key", () => {
    expect(SETTINGS_REPOSITORY_SQL.selectSetting).toContain("SELECT key, value, value_type, updated_at");
    expect(SETTINGS_REPOSITORY_SQL.selectSetting).toContain("FROM settings");
    expect(SETTINGS_REPOSITORY_SQL.selectSetting).toContain("WHERE key = $1");
  });

  it("upserts setting values by key", () => {
    expect(SETTINGS_REPOSITORY_SQL.upsertSetting).toContain("INSERT INTO settings");
    expect(SETTINGS_REPOSITORY_SQL.upsertSetting).toContain("ON CONFLICT(key) DO UPDATE SET");
    expect(SETTINGS_REPOSITORY_SQL.upsertSetting).toContain("value_type = excluded.value_type");
  });

  it("deletes one setting or clears all app settings", () => {
    expect(SETTINGS_REPOSITORY_SQL.deleteSetting).toBe("DELETE FROM settings WHERE key = $1;");
    expect(SETTINGS_REPOSITORY_SQL.clearSettings).toBe("DELETE FROM settings;");
  });
});
