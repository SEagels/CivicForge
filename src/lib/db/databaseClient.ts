export const CIVICFORGE_DB_PATH = "sqlite:civicforge.db";

export interface QueryResult {
  readonly rowsAffected: number;
  readonly lastInsertId?: number;
}

export interface CivicForgeDatabase {
  execute(query: string, bindValues?: unknown[]): Promise<QueryResult>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
  close(db?: string): Promise<boolean>;
}

export type LoadDatabase = (path: string) => Promise<CivicForgeDatabase>;

interface LoadDatabaseOptions {
  readonly path?: string;
  readonly runtimeAvailable?: boolean;
  readonly loadDatabase?: LoadDatabase;
}

export function isTauriRuntimeAvailable(scope: unknown = globalThis): boolean {
  return Boolean(scope && typeof scope === "object" && "__TAURI_INTERNALS__" in scope);
}

export async function loadCivicForgeDatabase(
  options: LoadDatabaseOptions = {},
): Promise<CivicForgeDatabase | null> {
  const runtimeAvailable = options.runtimeAvailable ?? isTauriRuntimeAvailable(globalThis);

  if (!runtimeAvailable) {
    return null;
  }

  const loadDatabase = options.loadDatabase ?? loadTauriSqlDatabase;
  return loadDatabase(options.path ?? CIVICFORGE_DB_PATH);
}

async function loadTauriSqlDatabase(path: string): Promise<CivicForgeDatabase> {
  const module = await import("@tauri-apps/plugin-sql");
  return module.default.load(path);
}
