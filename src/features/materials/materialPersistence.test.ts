import { describe, expect, it } from "vitest";
import { createInitialMaterialState, updateSelectedMaterial } from "./materialModel";
import {
  CIVICFORGE_MATERIAL_STORAGE_KEY,
  clearMaterialState,
  loadMaterialState,
  saveMaterialState,
  serializeMaterialState,
} from "./materialPersistence";

describe("material persistence", () => {
  it("serializes material state with a stable version", () => {
    const state = createInitialMaterialState();
    const payload = JSON.parse(serializeMaterialState(state));

    expect(payload.version).toBe(1);
    expect(payload.state.selectedId).toBe(state.selectedId);
    expect(payload.state.materials).toHaveLength(3);
  });

  it("saves and loads material state from a storage adapter", () => {
    const storage = createMemoryStorage();
    const state = updateSelectedMaterial(createInitialMaterialState(), {
      title: "持久化标题",
      contentMd: "刷新以后仍然存在。",
    });

    saveMaterialState(storage, state);
    const loaded = loadMaterialState(storage);

    expect(storage.getItem(CIVICFORGE_MATERIAL_STORAGE_KEY)).toContain("持久化标题");
    expect(loaded?.materials[0].title).toBe("持久化标题");
    expect(loaded?.materials[0].contentMd).toBe("刷新以后仍然存在。");
  });

  it("returns null for missing, malformed, or incompatible payloads", () => {
    const storage = createMemoryStorage();

    expect(loadMaterialState(storage)).toBeNull();

    storage.setItem(CIVICFORGE_MATERIAL_STORAGE_KEY, "{bad json");
    expect(loadMaterialState(storage)).toBeNull();

    storage.setItem(CIVICFORGE_MATERIAL_STORAGE_KEY, JSON.stringify({ version: 999, state: {} }));
    expect(loadMaterialState(storage)).toBeNull();

    storage.setItem(CIVICFORGE_MATERIAL_STORAGE_KEY, JSON.stringify({ version: 1, state: { materials: [] } }));
    expect(loadMaterialState(storage)).toBeNull();
  });

  it("clears persisted material state", () => {
    const storage = createMemoryStorage();

    saveMaterialState(storage, createInitialMaterialState());
    clearMaterialState(storage);

    expect(storage.getItem(CIVICFORGE_MATERIAL_STORAGE_KEY)).toBeNull();
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
