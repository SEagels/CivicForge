export const CIVICFORGE_SETTINGS_STORAGE_KEY = "civicforge.settings.v1";

const APP_SETTINGS_VERSION = 1;

export const THEME_MODES = ["system", "light", "dark"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export interface AppSettings {
  readonly themeMode: ThemeMode;
  readonly backupReminderEnabled: boolean;
}

interface PersistedAppSettings {
  readonly version: typeof APP_SETTINGS_VERSION;
  readonly settings: AppSettings;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  themeMode: "system",
  backupReminderEnabled: true,
};

export function serializeAppSettings(settings: AppSettings): string {
  const payload: PersistedAppSettings = {
    version: APP_SETTINGS_VERSION,
    settings,
  };

  return JSON.stringify(payload);
}

export function saveAppSettings(storage: Storage, settings: AppSettings): void {
  storage.setItem(CIVICFORGE_SETTINGS_STORAGE_KEY, serializeAppSettings(settings));
}

export function loadAppSettings(storage: Storage): AppSettings {
  const raw = storage.getItem(CIVICFORGE_SETTINGS_STORAGE_KEY);

  if (!raw) {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const payload = JSON.parse(raw) as Partial<PersistedAppSettings>;

    if (payload.version !== APP_SETTINGS_VERSION || !isAppSettings(payload.settings)) {
      return DEFAULT_APP_SETTINGS;
    }

    return payload.settings;
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function clearAppSettings(storage: Storage): void {
  storage.removeItem(CIVICFORGE_SETTINGS_STORAGE_KEY);
}

export function getBrowserSettingsStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function applyThemeMode(settings: AppSettings, root: HTMLElement | null = getDocumentRoot()): void {
  if (!root) {
    return;
  }

  if (settings.themeMode === "system") {
    delete root.dataset.theme;
    return;
  }

  root.dataset.theme = settings.themeMode;
}

function getDocumentRoot(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  return document.documentElement;
}

function isAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as AppSettings;

  return THEME_MODES.includes(candidate.themeMode) && typeof candidate.backupReminderEnabled === "boolean";
}
