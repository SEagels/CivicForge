import { describe, expect, it, vi } from "vitest";
import { readSourceTextFile } from "./sourceFileAdapter";

describe("source file adapter", () => {
  it("reads a local Markdown or text file through Tauri dialog and fs dependencies", async () => {
    const openDialog = vi.fn(async () => "D:\\sources\\基层治理.md");
    const readTextFile = vi.fn(async () => "# 基层治理\n\n把服务触角延伸到群众身边。");

    await expect(
      readSourceTextFile({
        runtimeAvailable: true,
        openDialog,
        readTextFile,
      }),
    ).resolves.toEqual({
      ok: true,
      mode: "tauri",
      path: "D:\\sources\\基层治理.md",
      filename: "基层治理.md",
      content: "# 基层治理\n\n把服务触角延伸到群众身边。",
    });

    expect(openDialog).toHaveBeenCalledWith({
      multiple: false,
      filters: [{ name: "Text or Markdown", extensions: ["txt", "md", "markdown"] }],
    });
  });

  it("returns unavailable or cancelled results without reading files", async () => {
    const readTextFile = vi.fn(async () => "");

    await expect(readSourceTextFile({ runtimeAvailable: false })).resolves.toEqual({
      ok: false,
      mode: "browser",
      reason: "unavailable",
    });

    await expect(
      readSourceTextFile({
        runtimeAvailable: true,
        openDialog: async () => null,
        readTextFile,
      }),
    ).resolves.toEqual({
      ok: false,
      mode: "tauri",
      reason: "cancelled",
    });
    expect(readTextFile).not.toHaveBeenCalled();
  });
});
