import { isTauriRuntimeAvailable } from "../../lib/db/databaseClient";

type DialogPath = string | string[] | null;

interface SourceFileAdapterDeps {
  readonly runtimeAvailable?: boolean;
  readonly openDialog?: (options?: OpenDialogOptions) => Promise<DialogPath>;
  readonly readTextFile?: (path: string) => Promise<string>;
}

interface OpenDialogOptions {
  readonly multiple: boolean;
  readonly filters: FileDialogFilter[];
}

interface FileDialogFilter {
  readonly name: string;
  readonly extensions: string[];
}

export type ReadSourceTextFileResult =
  | { readonly ok: true; readonly mode: "tauri"; readonly content: string; readonly path: string; readonly filename: string }
  | { readonly ok: false; readonly mode: "tauri" | "browser"; readonly reason: "cancelled" | "unavailable" };

const SOURCE_TEXT_FILTERS: FileDialogFilter[] = [{ name: "Text or Markdown", extensions: ["txt", "md", "markdown"] }];

export async function readSourceTextFile(deps: SourceFileAdapterDeps = {}): Promise<ReadSourceTextFileResult> {
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
      filters: SOURCE_TEXT_FILTERS,
    }),
  );

  if (!selectedPath) {
    return { ok: false, mode: "tauri", reason: "cancelled" };
  }

  return {
    ok: true,
    mode: "tauri",
    path: selectedPath,
    filename: getFilename(selectedPath),
    content: await tauriDeps.readTextFile(selectedPath),
  };
}

async function resolveTauriDeps(deps: SourceFileAdapterDeps): Promise<SourceFileAdapterDeps> {
  if (deps.openDialog || deps.readTextFile) {
    return deps;
  }

  try {
    const [dialog, fs] = await Promise.all([import("@tauri-apps/plugin-dialog"), import("@tauri-apps/plugin-fs")]);

    return {
      openDialog: dialog.open,
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

function getFilename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}
