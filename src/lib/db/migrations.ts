import { INITIAL_SCHEMA_SQL } from "./schema";

export interface DatabaseMigration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

export const DATABASE_MIGRATIONS = [
  {
    version: 1,
    name: "initial_schema",
    sql: INITIAL_SCHEMA_SQL,
  },
] as const satisfies readonly DatabaseMigration[];
