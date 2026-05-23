import { describe, expect, it } from "vitest";
import type { CivicForgeDatabase } from "../../lib/db/databaseClient";
import { SETTINGS_REPOSITORY_SQL } from "../../lib/db/settingsRepositorySql";
import { DEFAULT_APP_SETTINGS } from "./appSettings";
import {
  APP_SETTINGS_KEY,
  buildSettingUpsertParams,
  createSettingsRepository,
  mapSettingRowToSettings,
  type SettingRepositoryRow,
} from "./settingsRepository";

describe("settings repository", () => {
  it("loads defaults when the settings row is missing", async () => {
    const db = createFakeDb([]);
    const repository = createSettingsRepository(db);

    await expect(repository.loadSettings()).resolves.toEqual(DEFAULT_APP_SETTINGS);
    expect(db.selectedSql).toEqual([SETTINGS_REPOSITORY_SQL.selectSetting]);
  });

  it("maps a valid app settings row", () => {
    const row: SettingRepositoryRow = {
      key: APP_SETTINGS_KEY,
      value: JSON.stringify({ themeMode: "dark", backupReminderEnabled: false }),
      value_type: "json",
      updated_at: "2026-05-23T10:00:00.000Z",
    };

    expect(mapSettingRowToSettings(row)).toEqual({
      themeMode: "dark",
      backupReminderEnabled: false,
    });
  });

  it("falls back to defaults for malformed settings rows", () => {
    expect(
      mapSettingRowToSettings({
        key: APP_SETTINGS_KEY,
        value: "{bad json",
        value_type: "json",
        updated_at: "2026-05-23T10:00:00.000Z",
      }),
    ).toEqual(DEFAULT_APP_SETTINGS);
  });

  it("builds app settings upsert params", () => {
    expect(
      buildSettingUpsertParams(
        {
          themeMode: "light",
          backupReminderEnabled: false,
        },
        "2026-05-23T10:00:00.000Z",
      ),
    ).toEqual([
      APP_SETTINGS_KEY,
      JSON.stringify({ themeMode: "light", backupReminderEnabled: false }),
      "json",
      "2026-05-23T10:00:00.000Z",
    ]);
  });

  it("saves and clears app settings through SQL statements", async () => {
    const db = createFakeDb([]);
    const repository = createSettingsRepository(db);

    await repository.saveSettings(DEFAULT_APP_SETTINGS, "2026-05-23T10:00:00.000Z");
    await repository.clearSettings();

    expect(db.executedSql).toEqual([SETTINGS_REPOSITORY_SQL.upsertSetting, SETTINGS_REPOSITORY_SQL.clearSettings]);
  });
});

function createFakeDb(rows: readonly SettingRepositoryRow[]) {
  const executedSql: string[] = [];
  const selectedSql: string[] = [];
  const db: CivicForgeDatabase & { executedSql: string[]; selectedSql: string[] } = {
    executedSql,
    selectedSql,
    execute: async (query) => {
      executedSql.push(query);
      return { rowsAffected: 1 };
    },
    select: async <T,>(query: string): Promise<T> => {
      selectedSql.push(query);
      return rows as T;
    },
    close: async () => true,
  };

  return db;
}
