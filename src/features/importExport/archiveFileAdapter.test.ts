import { describe, expect, it, vi } from "vitest";
import { readArchiveFile, saveArchiveFile } from "./archiveFileAdapter";

describe("archive file adapter", () => {
  it("saves archive JSON through Tauri dialog and fs dependencies", async () => {
    const saveDialog = vi.fn(async () => "D:\\backups\\civicforge.json");
    const writeTextFile = vi.fn(async () => undefined);
    const browserDownload = vi.fn();

    await expect(
      saveArchiveFile("{}", "civicforge.json", {
        runtimeAvailable: true,
        saveDialog,
        writeTextFile,
        browserDownload,
      }),
    ).resolves.toEqual({
      ok: true,
      mode: "tauri",
      path: "D:\\backups\\civicforge.json",
    });

    expect(saveDialog).toHaveBeenCalledWith({
      defaultPath: "civicforge.json",
      filters: [{ name: "CivicForge JSON", extensions: ["json"] }],
    });
    expect(writeTextFile).toHaveBeenCalledWith("D:\\backups\\civicforge.json", "{}");
    expect(browserDownload).not.toHaveBeenCalled();
  });

  it("handles Tauri save cancellation", async () => {
    const writeTextFile = vi.fn(async () => undefined);

    await expect(
      saveArchiveFile("{}", "civicforge.json", {
        runtimeAvailable: true,
        saveDialog: async () => null,
        writeTextFile,
      }),
    ).resolves.toEqual({
      ok: false,
      mode: "tauri",
      reason: "cancelled",
    });

    expect(writeTextFile).not.toHaveBeenCalled();
  });

  it("falls back to browser download when Tauri is unavailable", async () => {
    const browserDownload = vi.fn();

    await expect(
      saveArchiveFile("{}", "civicforge.json", {
        runtimeAvailable: false,
        browserDownload,
      }),
    ).resolves.toEqual({
      ok: true,
      mode: "browser",
    });

    expect(browserDownload).toHaveBeenCalledWith("{}", "civicforge.json");
  });

  it("reads archive JSON through Tauri dialog and fs dependencies", async () => {
    const openDialog = vi.fn(async () => "D:\\backups\\civicforge.json");
    const readTextFile = vi.fn(async () => "{\"appName\":\"CivicForge\"}");

    await expect(
      readArchiveFile({
        runtimeAvailable: true,
        openDialog,
        readTextFile,
      }),
    ).resolves.toEqual({
      ok: true,
      mode: "tauri",
      content: "{\"appName\":\"CivicForge\"}",
      path: "D:\\backups\\civicforge.json",
    });

    expect(openDialog).toHaveBeenCalledWith({
      multiple: false,
      filters: [{ name: "CivicForge JSON", extensions: ["json"] }],
    });
    expect(readTextFile).toHaveBeenCalledWith("D:\\backups\\civicforge.json");
  });

  it("returns null content when file open is cancelled or unavailable", async () => {
    await expect(
      readArchiveFile({
        runtimeAvailable: true,
        openDialog: async () => null,
        readTextFile: async () => "{}",
      }),
    ).resolves.toEqual({
      ok: false,
      mode: "tauri",
      reason: "cancelled",
    });

    await expect(readArchiveFile({ runtimeAvailable: false })).resolves.toEqual({
      ok: false,
      mode: "browser",
      reason: "unavailable",
    });
  });
});
