import type { CivicForgeDatabase } from "../../lib/db/databaseClient";
import { SETTINGS_REPOSITORY_SQL } from "../../lib/db/settingsRepositorySql";
import { DEFAULT_APP_SETTINGS, THEME_MODES, type AppSettings } from "./appSettings";

export const APP_SETTINGS_KEY = "app.settings";

export interface SettingRepositoryRow {
  readonly key: string;
  readonly value: string;
  readonly value_type: "string" | "number" | "boolean" | "json";
  readonly updated_at: string;
}

export interface SettingsRepository {
  loadSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings, nowIso?: string): Promise<void>;
  clearSettings(): Promise<void>;
}

export function createSettingsRepository(db: CivicForgeDatabase): SettingsRepository {
  return {
    async loadSettings() {
      const rows = await db.select<SettingRepositoryRow[]>(SETTINGS_REPOSITORY_SQL.selectSetting, [APP_SETTINGS_KEY]);
      return mapSettingRowToSettings(rows[0]);
    },

    async saveSettings(settings, nowIso = new Date().toISOString()) {
      await db.execute(SETTINGS_REPOSITORY_SQL.upsertSetting, buildSettingUpsertParams(settings, nowIso));
    },

    async clearSettings() {
      await db.execute(SETTINGS_REPOSITORY_SQL.clearSettings);
    },
  };
}

export function mapSettingRowToSettings(row: SettingRepositoryRow | undefined): AppSettings {
  if (!row || row.key !== APP_SETTINGS_KEY || row.value_type !== "json") {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const value = JSON.parse(row.value) as Partial<AppSettings>;

    if (!isAppSettings(value)) {
      return DEFAULT_APP_SETTINGS;
    }

    return value;
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function buildSettingUpsertParams(settings: AppSettings, nowIso: string): unknown[] {
  return [APP_SETTINGS_KEY, JSON.stringify(settings), "json", nowIso];
}

function isAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as AppSettings;

  return THEME_MODES.includes(candidate.themeMode) && typeof candidate.backupReminderEnabled === "boolean";
}
