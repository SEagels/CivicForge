import { describe, expect, it } from "vitest";
import {
  buildCandidateMaterialInputFromSource,
  createLocalFileSourceCard,
  createUrlSourceCard,
} from "./sourceImport";

describe("source import", () => {
  it("creates a source card from a manually provided official URL and text", () => {
    const card = createUrlSourceCard(
      {
        url: "https://www.gov.cn/zhengce/example.html",
        title: "推进基层治理现代化",
        sourceName: "",
        content: "推动治理资源下沉基层，提升服务群众能力。",
      },
      new Date("2026-05-26T08:00:00.000Z"),
      "source-fixed",
    );

    expect(card).toEqual({
      id: "source-fixed",
      sourceType: "url",
      title: "推进基层治理现代化",
      sourceName: "www.gov.cn",
      url: "https://www.gov.cn/zhengce/example.html",
      filename: "",
      content: "推动治理资源下沉基层，提升服务群众能力。",
      excerpt: "推动治理资源下沉基层，提升服务群众能力。",
      importedAt: "2026-05-26T08:00:00.000Z",
    });
  });

  it("creates a source card from a local Markdown or text file", () => {
    const card = createLocalFileSourceCard(
      {
        filename: "基层治理.md",
        content: "# 基层治理\n\n把服务触角延伸到群众身边。",
      },
      new Date("2026-05-26T08:00:00.000Z"),
      "file-fixed",
    );

    expect(card.title).toBe("基层治理");
    expect(card.sourceName).toBe("基层治理.md");
    expect(card.sourceType).toBe("local-file");
    expect(card.excerpt).toBe("基层治理 把服务触角延伸到群众身边。");
  });

  it("builds a non-review candidate material from a source card", () => {
    const card = createUrlSourceCard(
      {
        url: "https://www.gov.cn/zhengce/example.html",
        title: "推进基层治理现代化",
        sourceName: "国务院",
        content: "推动治理资源下沉基层，提升服务群众能力。",
      },
      new Date("2026-05-26T08:00:00.000Z"),
      "source-fixed",
    );

    expect(buildCandidateMaterialInputFromSource(card)).toEqual({
      title: "资料：推进基层治理现代化",
      contentMd: [
        "> 来源：国务院",
        "> 链接：https://www.gov.cn/zhengce/example.html",
        "",
        "推动治理资源下沉基层，提升服务群众能力。",
      ].join("\n"),
      excerpt: "推动治理资源下沉基层，提升服务群众能力。",
      materialType: "standard-expression",
      source: "国务院",
      tagNames: ["资料导入"],
    });
  });
});
