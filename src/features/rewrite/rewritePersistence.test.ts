import { describe, expect, it } from "vitest";
import { createRewriteLog } from "./rewriteWorkshop";
import {
  CIVICFORGE_REWRITE_STORAGE_KEY,
  clearRewriteLogs,
  loadRewriteLogs,
  saveRewriteLogs,
  serializeRewriteLogs,
} from "./rewritePersistence";

describe("rewrite persistence", () => {
  it("serializes rewrite logs with a stable version", () => {
    const logs = [makeLog("rewrite-1")];
    const payload = JSON.parse(serializeRewriteLogs(logs));

    expect(payload.version).toBe(1);
    expect(payload.logs[0].id).toBe("rewrite-1");
  });

  it("saves and loads rewrite history", () => {
    const storage = createMemoryStorage();
    const logs = [makeLog("rewrite-1"), makeLog("rewrite-2")];

    saveRewriteLogs(storage, logs);
    const loaded = loadRewriteLogs(storage);

    expect(storage.getItem(CIVICFORGE_REWRITE_STORAGE_KEY)).toContain("rewrite-2");
    expect(loaded.map((log) => log.id)).toEqual(["rewrite-1", "rewrite-2"]);
  });

  it("returns an empty list for missing, malformed, or incompatible payloads", () => {
    const storage = createMemoryStorage();

    expect(loadRewriteLogs(storage)).toEqual([]);

    storage.setItem(CIVICFORGE_REWRITE_STORAGE_KEY, "{bad json");
    expect(loadRewriteLogs(storage)).toEqual([]);

    storage.setItem(CIVICFORGE_REWRITE_STORAGE_KEY, JSON.stringify({ version: 999, logs: [] }));
    expect(loadRewriteLogs(storage)).toEqual([]);

    storage.setItem(CIVICFORGE_REWRITE_STORAGE_KEY, JSON.stringify({ version: 1, logs: [{ id: 1 }] }));
    expect(loadRewriteLogs(storage)).toEqual([]);
  });

  it("clears persisted rewrite history", () => {
    const storage = createMemoryStorage();

    saveRewriteLogs(storage, [makeLog("rewrite-1")]);
    clearRewriteLogs(storage);

    expect(storage.getItem(CIVICFORGE_REWRITE_STORAGE_KEY)).toBeNull();
  });
});

function makeLog(id: string) {
  return createRewriteLog(
    {
      sourceMaterialId: null,
      targetId: "compress",
      originalText: "原文",
      promptTemplate: "提示",
      resultText: "结果",
    },
    new Date("2026-05-23T08:00:00.000Z"),
    id,
  );
}

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
