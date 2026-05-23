import { describe, expect, it } from "vitest";
import {
  CIVICFORGE_SETTINGS_STORAGE_KEY,
  DEFAULT_APP_SETTINGS,
  applyThemeMode,
  clearAppSettings,
  loadAppSettings,
  saveAppSettings,
  serializeAppSettings,
} from "./appSettings";

describe("app settings", () => {
  it("serializes settings with a stable version", () => {
    const payload = JSON.parse(
      serializeAppSettings({
        themeMode: "dark",
        backupReminderEnabled: false,
      }),
    );

    expect(payload).toEqual({
      version: 1,
      settings: {
        themeMode: "dark",
        backupReminderEnabled: false,
      },
    });
  });

  it("saves and loads settings from storage", () => {
    const storage = createMemoryStorage();

    saveAppSettings(storage, {
      themeMode: "light",
      backupReminderEnabled: false,
    });

    expect(storage.getItem(CIVICFORGE_SETTINGS_STORAGE_KEY)).toContain("\"themeMode\":\"light\"");
    expect(loadAppSettings(storage)).toEqual({
      themeMode: "light",
      backupReminderEnabled: false,
    });
  });

  it("falls back to defaults for missing, malformed, incompatible, or invalid payloads", () => {
    const storage = createMemoryStorage();

    expect(loadAppSettings(storage)).toEqual(DEFAULT_APP_SETTINGS);

    storage.setItem(CIVICFORGE_SETTINGS_STORAGE_KEY, "{bad json");
    expect(loadAppSettings(storage)).toEqual(DEFAULT_APP_SETTINGS);

    storage.setItem(CIVICFORGE_SETTINGS_STORAGE_KEY, JSON.stringify({ version: 999, settings: {} }));
    expect(loadAppSettings(storage)).toEqual(DEFAULT_APP_SETTINGS);

    storage.setItem(
      CIVICFORGE_SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 1, settings: { themeMode: "sepia", backupReminderEnabled: "yes" } }),
    );
    expect(loadAppSettings(storage)).toEqual(DEFAULT_APP_SETTINGS);
  });

  it("clears persisted settings", () => {
    const storage = createMemoryStorage();

    saveAppSettings(storage, DEFAULT_APP_SETTINGS);
    clearAppSettings(storage);

    expect(storage.getItem(CIVICFORGE_SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it("applies light and dark theme modes to a document root", () => {
    const root = { dataset: {} } as HTMLElement;

    applyThemeMode({ themeMode: "dark", backupReminderEnabled: true }, root);
    expect(root.dataset.theme).toBe("dark");

    applyThemeMode({ themeMode: "light", backupReminderEnabled: true }, root);
    expect(root.dataset.theme).toBe("light");

    applyThemeMode({ themeMode: "system", backupReminderEnabled: true }, root);
    expect(root.dataset.theme).toBeUndefined();
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
