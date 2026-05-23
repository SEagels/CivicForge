import { describe, expect, it } from "vitest";
import {
  CIVICFORGE_DB_PATH,
  isTauriRuntimeAvailable,
  loadCivicForgeDatabase,
  type CivicForgeDatabase,
} from "./databaseClient";

describe("database client", () => {
  it("uses the CivicForge SQLite app database path", () => {
    expect(CIVICFORGE_DB_PATH).toBe("sqlite:civicforge.db");
  });

  it("detects whether the Tauri runtime is available", () => {
    expect(isTauriRuntimeAvailable({})).toBe(false);
    expect(isTauriRuntimeAvailable({ __TAURI_INTERNALS__: {} })).toBe(true);
  });

  it("returns null in the browser preview when Tauri is unavailable", async () => {
    const loaded = await loadCivicForgeDatabase({
      runtimeAvailable: false,
      loadDatabase: async () => {
        throw new Error("should not load");
      },
    });

    expect(loaded).toBeNull();
  });

  it("loads the configured SQLite database when Tauri is available", async () => {
    const paths: string[] = [];
    const fakeDb: CivicForgeDatabase = {
      execute: async () => ({ rowsAffected: 0 }),
      select: async <T,>() => [] as T,
      close: async () => true,
    };

    const loaded = await loadCivicForgeDatabase({
      runtimeAvailable: true,
      loadDatabase: async (path) => {
        paths.push(path);
        return fakeDb;
      },
    });

    expect(paths).toEqual([CIVICFORGE_DB_PATH]);
    expect(loaded).toBe(fakeDb);
  });
});
