export interface LinkableMaterial {
  readonly id: string;
  readonly title: string;
}

export interface WikiLinkTrigger {
  readonly start: number;
  readonly end: number;
  readonly query: string;
}

export interface MarkdownEditResult {
  readonly value: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

export type MarkdownCommand = "bold" | "italic" | "wiki" | "heading2" | "quote";

export interface MarkdownCommandInput {
  readonly command: MarkdownCommand;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

export function getWikiLinkTrigger(value: string, cursor: number): WikiLinkTrigger | null {
  const safeCursor = clamp(cursor, 0, value.length);
  const beforeCursor = value.slice(0, safeCursor);
  const start = beforeCursor.lastIndexOf("[[");

  if (start < 0) {
    return null;
  }

  const closedAfterStart = beforeCursor.lastIndexOf("]]") > start;

  if (closedAfterStart) {
    return null;
  }

  return {
    start,
    end: safeCursor,
    query: value.slice(start + 2, safeCursor),
  };
}

export function getWikiLinkSuggestions(
  materials: readonly LinkableMaterial[],
  currentMaterialId: string,
  query: string,
): LinkableMaterial[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const seenTitles = new Set<string>();
  const suggestions: LinkableMaterial[] = [];

  for (const material of materials) {
    const title = material.title.trim();
    const normalizedTitle = title.toLocaleLowerCase("zh-CN");

    if (!title || material.id === currentMaterialId || seenTitles.has(normalizedTitle)) {
      continue;
    }

    if (normalizedQuery && !normalizedTitle.includes(normalizedQuery)) {
      continue;
    }

    seenTitles.add(normalizedTitle);
    suggestions.push({ id: material.id, title });
  }

  return suggestions.sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
}

export function insertWikiLinkSuggestion(
  value: string,
  input: { readonly title: string; readonly trigger: WikiLinkTrigger },
): MarkdownEditResult {
  const insertion = `[[${input.title}]]`;
  const nextValue = `${value.slice(0, input.trigger.start)}${insertion}${value.slice(input.trigger.end)}`;
  const nextCursor = input.trigger.start + insertion.length;

  return {
    value: nextValue,
    selectionStart: nextCursor,
    selectionEnd: nextCursor,
  };
}

export function applyMarkdownCommand(value: string, input: MarkdownCommandInput): MarkdownEditResult {
  if (input.command === "heading2") {
    return prefixCurrentLine(value, input.selectionStart, "## ");
  }

  if (input.command === "quote") {
    return prefixCurrentLine(value, input.selectionStart, "> ");
  }

  if (input.command === "bold") {
    return toggleInlineWrap(value, input.selectionStart, input.selectionEnd, "**", "**");
  }

  if (input.command === "italic") {
    return toggleInlineWrap(value, input.selectionStart, input.selectionEnd, "_", "_");
  }

  return toggleInlineWrap(value, input.selectionStart, input.selectionEnd, "[[", "]]");
}

function toggleInlineWrap(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix: string,
): MarkdownEditResult {
  const start = clamp(Math.min(selectionStart, selectionEnd), 0, value.length);
  const end = clamp(Math.max(selectionStart, selectionEnd), 0, value.length);
  const beforePrefixStart = start - prefix.length;
  const afterSuffixEnd = end + suffix.length;
  const alreadyWrapped =
    beforePrefixStart >= 0 &&
    value.slice(beforePrefixStart, start) === prefix &&
    value.slice(end, afterSuffixEnd) === suffix;

  if (alreadyWrapped) {
    const nextValue = `${value.slice(0, beforePrefixStart)}${value.slice(start, end)}${value.slice(afterSuffixEnd)}`;
    return {
      value: nextValue,
      selectionStart: beforePrefixStart,
      selectionEnd: beforePrefixStart + (end - start),
    };
  }

  const selected = value.slice(start, end);
  const nextValue = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
  const nextCursor = start + prefix.length + selected.length;

  return {
    value: nextValue,
    selectionStart: nextCursor,
    selectionEnd: nextCursor,
  };
}

function prefixCurrentLine(value: string, cursor: number, prefix: string): MarkdownEditResult {
  const safeCursor = clamp(cursor, 0, value.length);
  const lineStart = value.lastIndexOf("\n", safeCursor - 1) + 1;
  const alreadyPrefixed = value.slice(lineStart, lineStart + prefix.length) === prefix;

  if (alreadyPrefixed) {
    const nextValue = `${value.slice(0, lineStart)}${value.slice(lineStart + prefix.length)}`;
    const nextCursor = Math.max(lineStart, safeCursor - prefix.length);
    return {
      value: nextValue,
      selectionStart: nextCursor,
      selectionEnd: nextCursor,
    };
  }

  const nextValue = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
  const nextCursor = safeCursor + prefix.length;

  return {
    value: nextValue,
    selectionStart: nextCursor,
    selectionEnd: nextCursor,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
