export const PRIMARY_ROUTE_IDS = ["today", "practice", "library", "review", "progress"] as const;
export const LEGACY_ROUTE_IDS = ["rewrite", "graph", "taxonomy", "importExport", "settings"] as const;

export type PrimaryRouteId = (typeof PRIMARY_ROUTE_IDS)[number];
export type LegacyRouteId = (typeof LEGACY_ROUTE_IDS)[number];
export type AppRouteId = PrimaryRouteId | LegacyRouteId;

export interface AppRoute {
  readonly id: AppRouteId;
  readonly entityId: string | null;
}

export const DEFAULT_APP_ROUTE: AppRoute = {
  id: "today",
  entityId: null,
};

export const APP_ROUTE_STORAGE_KEY = "civicforge.route.v2";

export function createAppRoute(id: AppRouteId, entityId: string | null = null): AppRoute {
  return { id, entityId };
}

export function parseAppRoute(value: unknown): AppRoute {
  if (!value || typeof value !== "object") {
    return DEFAULT_APP_ROUTE;
  }

  const candidate = value as Partial<AppRoute>;

  if (!isAppRouteId(candidate.id)) {
    return DEFAULT_APP_ROUTE;
  }

  return {
    id: candidate.id,
    entityId: typeof candidate.entityId === "string" ? candidate.entityId : null,
  };
}

export function loadStoredAppRoute(storage: Storage | null): AppRoute {
  if (!storage) {
    return DEFAULT_APP_ROUTE;
  }

  try {
    const raw = storage.getItem(APP_ROUTE_STORAGE_KEY);
    return raw ? parseAppRoute(JSON.parse(raw)) : DEFAULT_APP_ROUTE;
  } catch {
    return DEFAULT_APP_ROUTE;
  }
}

export function saveStoredAppRoute(storage: Storage | null, route: AppRoute): void {
  storage?.setItem(APP_ROUTE_STORAGE_KEY, JSON.stringify(route));
}

export function getRouteStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function isAppRouteId(value: unknown): value is AppRouteId {
  return (
    typeof value === "string" &&
    ([...PRIMARY_ROUTE_IDS, ...LEGACY_ROUTE_IDS] as readonly string[]).includes(value)
  );
}
