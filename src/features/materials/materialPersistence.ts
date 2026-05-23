import { normalizeMaterialState, type MaterialState } from "./materialModel";

export const CIVICFORGE_MATERIAL_STORAGE_KEY = "civicforge.materials.v1";

const MATERIAL_PERSISTENCE_VERSION = 1;

interface PersistedMaterialState {
  readonly version: typeof MATERIAL_PERSISTENCE_VERSION;
  readonly state: MaterialState;
}

export function serializeMaterialState(state: MaterialState): string {
  const payload: PersistedMaterialState = {
    version: MATERIAL_PERSISTENCE_VERSION,
    state,
  };

  return JSON.stringify(payload);
}

export function saveMaterialState(storage: Storage, state: MaterialState): void {
  storage.setItem(CIVICFORGE_MATERIAL_STORAGE_KEY, serializeMaterialState(state));
}

export function loadMaterialState(storage: Storage): MaterialState | null {
  const raw = storage.getItem(CIVICFORGE_MATERIAL_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as Partial<PersistedMaterialState>;

    if (payload.version !== MATERIAL_PERSISTENCE_VERSION || !isMaterialState(payload.state)) {
      return null;
    }

    return normalizeMaterialState(payload.state);
  } catch {
    return null;
  }
}

export function clearMaterialState(storage: Storage): void {
  storage.removeItem(CIVICFORGE_MATERIAL_STORAGE_KEY);
}

export function getBrowserMaterialStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function isMaterialState(value: unknown): value is MaterialState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as MaterialState;

  return (
    Array.isArray(candidate.materials) &&
    candidate.materials.length > 0 &&
    candidate.materials.every((material) => typeof material.id === "string" && typeof material.title === "string") &&
    (typeof candidate.selectedId === "string" || candidate.selectedId === null)
  );
}
