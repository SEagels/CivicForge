import { describe, expect, it } from "vitest";
import { REWRITE_LOG_REPOSITORY_SQL } from "./rewriteLogRepositorySql";

describe("rewrite log repository SQL assets", () => {
  it("exports the complete rewrite log statement set", () => {
    expect(Object.keys(REWRITE_LOG_REPOSITORY_SQL).sort()).toEqual([
      "clearRewriteLogs",
      "deleteRewriteLog",
      "listRewriteLogs",
      "upsertRewriteLog",
    ]);
  });

  it("lists rewrite logs with material uuid references", () => {
    expect(REWRITE_LOG_REPOSITORY_SQL.listRewriteLogs).toContain("rl.uuid");
    expect(REWRITE_LOG_REPOSITORY_SQL.listRewriteLogs).toContain("source_material.uuid AS source_material_uuid");
    expect(REWRITE_LOG_REPOSITORY_SQL.listRewriteLogs).toContain("ORDER BY rl.created_at DESC");
  });

  it("upserts rewrite logs by uuid", () => {
    expect(REWRITE_LOG_REPOSITORY_SQL.upsertRewriteLog).toContain("INSERT INTO rewrite_logs");
    expect(REWRITE_LOG_REPOSITORY_SQL.upsertRewriteLog).toContain("uuid");
    expect(REWRITE_LOG_REPOSITORY_SQL.upsertRewriteLog).toContain("ON CONFLICT(uuid) DO UPDATE SET");
    expect(REWRITE_LOG_REPOSITORY_SQL.upsertRewriteLog).toContain(
      "(SELECT id FROM materials WHERE uuid = $2)",
    );
  });

  it("deletes and clears rewrite logs without touching materials", () => {
    expect(REWRITE_LOG_REPOSITORY_SQL.deleteRewriteLog).toBe("DELETE FROM rewrite_logs WHERE uuid = $1;");
    expect(REWRITE_LOG_REPOSITORY_SQL.clearRewriteLogs).toBe("DELETE FROM rewrite_logs;");
  });
});
