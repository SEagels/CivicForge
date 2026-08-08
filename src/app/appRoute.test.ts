import { describe, expect, it } from "vitest";
import {
  APP_ROUTE_STORAGE_KEY,
  DEFAULT_APP_ROUTE,
  createAppRoute,
  loadStoredAppRoute,
  parseAppRoute,
  saveStoredAppRoute,
} from "./appRoute";

describe("app route", () => {
  it("parses active routes and redirects retired legacy routes", () => {
    expect(parseAppRoute({ id: "practice", entityId: "exercise-1" })).toEqual({
      id: "practice",
      entityId: "exercise-1",
    });
    expect(parseAppRoute({ id: "rewrite", entityId: null })).toEqual({ id: "practice", entityId: null });
    expect(parseAppRoute({ id: "graph", entityId: null })).toEqual({ id: "library", entityId: null });
    expect(parseAppRoute({ id: "taxonomy", entityId: null })).toEqual({ id: "progress", entityId: null });
  });

  it("falls back to today for malformed or unsupported routes", () => {
    expect(parseAppRoute(null)).toEqual(DEFAULT_APP_ROUTE);
    expect(parseAppRoute({ id: "dashboard" })).toEqual(DEFAULT_APP_ROUTE);
  });

  it("persists and restores the last route", () => {
    const storage = createMemoryStorage();
    const route = createAppRoute("library", "material-1");

    saveStoredAppRoute(storage, route);

    expect(storage.getItem(APP_ROUTE_STORAGE_KEY)).toContain("material-1");
    expect(loadStoredAppRoute(storage)).toEqual(route);
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
