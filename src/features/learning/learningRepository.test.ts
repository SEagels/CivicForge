import { describe, expect, it, vi } from "vitest";
import type { SourceDocument } from "../../domain/learning";
import type { CivicForgeDatabase } from "../../lib/db/databaseClient";
import { createLearningRepository } from "./learningRepository";

describe("learning repository", () => {
  it("upserts a single source without replacing the workspace", async () => {
    const execute = vi.fn(async (_query: string, _bindValues?: unknown[]) => ({ rowsAffected: 1 }));
    const db: CivicForgeDatabase = {
      execute,
      select: async <T,>() => [] as T,
      close: async () => true,
    };
    const source: SourceDocument = {
      id: "source-widget-1",
      title: "基层治理快速记录",
      sourceType: "note",
      contentMd: "推动资源下沉、服务前移。",
      sourceUri: "",
      publisher: "",
      publishedAt: null,
      status: "draft",
      createdAt: "2026-08-08T10:00:00.000Z",
      updatedAt: "2026-08-08T10:00:00.000Z",
    };

    await createLearningRepository(db).saveSource(source);

    expect(execute).toHaveBeenCalledOnce();
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain("ON CONFLICT(uuid) DO UPDATE");
    expect(params).toEqual([
      source.id,
      source.title,
      source.sourceType,
      source.contentMd,
      source.sourceUri,
      source.publisher,
      source.publishedAt,
      source.status,
      source.createdAt,
      source.updatedAt,
    ]);
  });
});
