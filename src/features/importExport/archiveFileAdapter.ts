import { isTauriRuntimeAvailable } from "../../lib/db/databaseClient";

type DialogPath = string | string[] | null;

interface ArchiveFileAdapterDeps {
  readonly runtimeAvailable?: boolean;
  readonly saveDialog?: (options?: SaveDialogOptions) => Promise<string | null>;
  readonly openDialog?: (options?: OpenDialogOptions) => Promise<DialogPath>;
  readonly writeTextFile?: (path: string, contents: string) => Promise<void>;
  readonly readTextFile?: (path: string) => Promise<string>;
  readonly browserDownload?: (archiveJson: string, filename: string) => void;
}

interface SaveDialogOptions {
  readonly defaultPath: string;
  readonly filters: FileDialogFilter[];
}

interface OpenDialogOptions {
  readonly multiple: boolean;
  readonly filters: FileDialogFilter[];
}

interface FileDialogFilter {
  readonly name: string;
  readonly extensions: string[];
}

export type SaveArchiveResult =
  | { readonly ok: true; readonly mode: "tauri"; readonly path: string }
  | { readonly ok: true; readonly mode: "browser" }
  | { readonly ok: false; readonly mode: "tauri" | "browser"; readonly reason: "cancelled" | "unavailable" };

export type ReadArchiveResult =
  | { readonly ok: true; readonly mode: "tauri"; readonly content: string; readonly path: string }
  | { readonly ok: false; readonly mode: "tauri" | "browser"; readonly reason: "cancelled" | "unavailable" };

const JSON_FILTERS: FileDialogFilter[] = [{ name: "CivicForge JSON", extensions: ["json"] }];

export async function saveArchiveFile(
  archiveJson: string,
  filename: string,
  deps: ArchiveFileAdapterDeps = {},
): Promise<SaveArchiveResult> {
  const runtimeAvailable = deps.runtimeAvailable ?? isTauriRuntimeAvailable();

  if (runtimeAvailable) {
    const tauriDeps = await resolveTauriDeps(deps);

    if (tauriDeps.saveDialog && tauriDeps.writeTextFile) {
      const path = await tauriDeps.saveDialog({
        defaultPath: filename,
        filters: JSON_FILTERS,
      });

      if (!path) {
        return { ok: false, mode: "tauri", reason: "cancelled" };
      }

      await tauriDeps.writeTextFile(path, archiveJson);
      return { ok: true, mode: "tauri", path };
    }
  }

  const browserDownload = deps.browserDownload ?? downloadArchiveInBrowser;
  browserDownload(archiveJson, filename);
  return { ok: true, mode: "browser" };
}

export async function readArchiveFile(deps: ArchiveFileAdapterDeps = {}): Promise<ReadArchiveResult> {
  const runtimeAvailable = deps.runtimeAvailable ?? isTauriRuntimeAvailable();

  if (!runtimeAvailable) {
    return { ok: false, mode: "browser", reason: "unavailable" };
  }

  const tauriDeps = await resolveTauriDeps(deps);

  if (!tauriDeps.openDialog || !tauriDeps.readTextFile) {
    return { ok: false, mode: "tauri", reason: "unavailable" };
  }

  const selectedPath = normalizeDialogPath(
    await tauriDeps.openDialog({
      multiple: false,
      filters: JSON_FILTERS,
    }),
  );

  if (!selectedPath) {
    return { ok: false, mode: "tauri", reason: "cancelled" };
  }

  return {
    ok: true,
    mode: "tauri",
    path: selectedPath,
    content: await tauriDeps.readTextFile(selectedPath),
  };
}

export function downloadArchiveInBrowser(archiveJson: string, filename: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof Blob === "undefined") {
    return;
  }

  const blob = new Blob([archiveJson], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function resolveTauriDeps(deps: ArchiveFileAdapterDeps): Promise<ArchiveFileAdapterDeps> {
  if (deps.saveDialog || deps.openDialog || deps.writeTextFile || deps.readTextFile) {
    return deps;
  }

  try {
    const [dialog, fs] = await Promise.all([import("@tauri-apps/plugin-dialog"), import("@tauri-apps/plugin-fs")]);

    return {
      saveDialog: dialog.save,
      openDialog: dialog.open,
      writeTextFile: fs.writeTextFile,
      readTextFile: fs.readTextFile,
    };
  } catch {
    return deps;
  }
}

function normalizeDialogPath(value: DialogPath): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
