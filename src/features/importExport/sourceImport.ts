import type { MaterialTypeId } from "../../domain/enums";
import type { RewriteMaterialInput } from "../rewrite/rewriteWorkshop";

export type SourceType = "url" | "local-file";

export interface UrlSourceInput {
  readonly url: string;
  readonly title: string;
  readonly sourceName: string;
  readonly content: string;
}

export interface LocalFileSourceInput {
  readonly filename: string;
  readonly content: string;
}

export interface SourceCard {
  readonly id: string;
  readonly sourceType: SourceType;
  readonly title: string;
  readonly sourceName: string;
  readonly url: string;
  readonly filename: string;
  readonly content: string;
  readonly excerpt: string;
  readonly importedAt: string;
}

export function createUrlSourceCard(input: UrlSourceInput, importedAt: Date = new Date(), id?: string): SourceCard {
  const title = input.title.trim() || getHostname(input.url) || "未命名来源";
  const sourceName = input.sourceName.trim() || getHostname(input.url) || "手动 URL";
  const content = input.content.trim();

  return {
    id: id ?? `source-url-${importedAt.getTime().toString(36)}`,
    sourceType: "url",
    title,
    sourceName,
    url: input.url.trim(),
    filename: "",
    content,
    excerpt: createExcerpt(content),
    importedAt: importedAt.toISOString(),
  };
}

export function createLocalFileSourceCard(
  input: LocalFileSourceInput,
  importedAt: Date = new Date(),
  id?: string,
): SourceCard {
  const content = input.content.trim();
  const title = readMarkdownHeading(content) || stripFileExtension(input.filename) || "本地资料";

  return {
    id: id ?? `source-file-${importedAt.getTime().toString(36)}`,
    sourceType: "local-file",
    title,
    sourceName: input.filename.trim() || "本地文件",
    url: "",
    filename: input.filename.trim(),
    content,
    excerpt: createExcerpt(content),
    importedAt: importedAt.toISOString(),
  };
}

export function buildCandidateMaterialInputFromSource(
  source: SourceCard,
  materialType: MaterialTypeId = "standard-expression",
): RewriteMaterialInput {
  const sourceLine = `> 来源：${source.sourceName}`;
  const urlLine = source.url ? `> 链接：${source.url}` : "";

  const headerLines = source.url ? [sourceLine, urlLine] : [sourceLine];

  return {
    title: `资料：${source.title}`,
    contentMd: [...headerLines, "", source.content].join("\n"),
    excerpt: source.excerpt,
    materialType,
    source: source.sourceName,
    tagNames: ["资料导入"],
  };
}

function createExcerpt(value: string): string {
  return normalizeWhitespace(stripMarkdownSyntax(value)).slice(0, 80);
}

function readMarkdownHeading(value: string): string {
  const heading = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));

  return heading ? heading.replace(/^#+\s*/, "").trim() : "";
}

function stripFileExtension(filename: string): string {
  return filename.trim().replace(/\.(markdown|md|txt)$/i, "");
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function stripMarkdownSyntax(value: string): string {
  return value.replace(/^#+\s*/gm, "").replace(/[*_`>[\]()]/g, " ");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
