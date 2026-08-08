import type { WidgetPreferences } from "../../domain/learning";

export const DEFAULT_WIDGET_PREFERENCES: WidgetPreferences = {
  enabled: true,
  compact: false,
  alwaysOnTop: true,
  alwaysOnBottom: false,
  privacyMode: false,
  launchAtStartup: false,
  x: null,
  y: null,
  width: 340,
  height: 220,
};

const KEY = "civicforge.widget-preferences.v1";

export function loadWidgetPreferences(storage: Storage | null): WidgetPreferences {
  if (!storage) return DEFAULT_WIDGET_PREFERENCES;
  try {
    return { ...DEFAULT_WIDGET_PREFERENCES, ...JSON.parse(storage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULT_WIDGET_PREFERENCES;
  }
}

export function saveWidgetPreferences(storage: Storage | null, value: WidgetPreferences): void {
  storage?.setItem(KEY, JSON.stringify(value));
}
