import type { RewriteLog } from "./rewriteWorkshop";

export const CIVICFORGE_REWRITE_STORAGE_KEY = "civicforge.rewrite.logs.v1";

const REWRITE_PERSISTENCE_VERSION = 1;

interface PersistedRewriteLogs {
  readonly version: typeof REWRITE_PERSISTENCE_VERSION;
  readonly logs: readonly RewriteLog[];
}

export function serializeRewriteLogs(logs: readonly RewriteLog[]): string {
  const payload: PersistedRewriteLogs = {
    version: REWRITE_PERSISTENCE_VERSION,
    logs,
  };

  return JSON.stringify(payload);
}

export function saveRewriteLogs(storage: Storage, logs: readonly RewriteLog[]): void {
  storage.setItem(CIVICFORGE_REWRITE_STORAGE_KEY, serializeRewriteLogs(logs));
}

export function loadRewriteLogs(storage: Storage): readonly RewriteLog[] {
  const raw = storage.getItem(CIVICFORGE_REWRITE_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const payload = JSON.parse(raw) as Partial<PersistedRewriteLogs>;

    if (payload.version !== REWRITE_PERSISTENCE_VERSION || !isRewriteLogs(payload.logs)) {
      return [];
    }

    return payload.logs;
  } catch {
    return [];
  }
}

export function clearRewriteLogs(storage: Storage): void {
  storage.removeItem(CIVICFORGE_REWRITE_STORAGE_KEY);
}

export function getBrowserRewriteStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function isRewriteLogs(value: unknown): value is readonly RewriteLog[] {
  return (
    Array.isArray(value) &&
    value.every(
      (log) =>
        log &&
        typeof log === "object" &&
        typeof (log as RewriteLog).id === "string" &&
        typeof (log as RewriteLog).originalText === "string" &&
        typeof (log as RewriteLog).promptTemplate === "string" &&
        typeof (log as RewriteLog).resultText === "string" &&
        typeof (log as RewriteLog).createdAt === "string",
    )
  );
}
