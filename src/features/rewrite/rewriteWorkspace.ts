import type { MaterialDraft } from "../materials/materialModel";
import type { RewriteLog, RewriteTargetId } from "./rewriteWorkshop";

export type RewriteHistoryFilter = RewriteTargetId | "all";
export type RewriteMetricDirection = "compressed" | "expanded" | "unchanged";
export type RewritePromptCopyState = "idle" | "copied" | "failed";

export interface RewriteMetrics {
  readonly originalCount: number;
  readonly resultCount: number;
  readonly deltaCount: number;
  readonly ratio: number;
  readonly direction: RewriteMetricDirection;
}

export interface RewriteDraft {
  readonly sourceMaterialId: string;
  readonly targetId: RewriteTargetId;
  readonly originalText: string;
  readonly resultText: string;
  readonly extraInstruction: string;
}

export interface RewriteModelProviderInput {
  readonly promptTemplate: string;
}

export type RewriteModelProviderResult =
  | { readonly ok: true; readonly resultText: string }
  | { readonly ok: false; readonly reason: "manual-template" | "external-placeholder"; readonly message: string };

export interface RewriteModelProvider {
  readonly id: "manual-template" | "external-placeholder";
  readonly label: string;
  rewrite(input: RewriteModelProviderInput): Promise<RewriteModelProviderResult>;
}

export function getRewriteMetrics(originalText: string, resultText: string): RewriteMetrics {
  const originalCount = countMeaningfulCharacters(originalText);
  const resultCount = countMeaningfulCharacters(resultText);
  const deltaCount = resultCount - originalCount;

  return {
    originalCount,
    resultCount,
    deltaCount,
    ratio: originalCount === 0 ? 0 : roundToTwoDecimals(resultCount / originalCount),
    direction: getMetricDirection(deltaCount),
  };
}

export function filterRewriteLogs(
  logs: readonly RewriteLog[],
  filter: RewriteHistoryFilter,
): readonly RewriteLog[] {
  if (filter === "all") {
    return logs;
  }

  return logs.filter((log) => log.targetId === filter);
}

export function getRewriteDraftFromLog(log: RewriteLog): RewriteDraft {
  return {
    sourceMaterialId: log.sourceMaterialId ?? "",
    targetId: log.targetId,
    originalText: log.originalText,
    resultText: log.resultText,
    extraInstruction: "",
  };
}

export function getRewriteDraftFromMaterial(material: MaterialDraft): RewriteDraft {
  return {
    sourceMaterialId: material.id,
    targetId: "compress",
    originalText: material.contentMd || material.excerpt,
    resultText: "",
    extraInstruction: "请保留来源信息，先提炼为可复用申论表达。",
  };
}

export function getRewritePromptCopyStatus(state: RewritePromptCopyState): string {
  if (state === "copied") {
    return "已复制";
  }

  if (state === "failed") {
    return "复制失败";
  }

  return "复制提示词";
}

export function createManualTemplateProvider(): RewriteModelProvider {
  return {
    id: "manual-template",
    label: "本地模板模式",
    async rewrite() {
      return {
        ok: false,
        reason: "manual-template",
        message: "当前为本地模板模式：请复制提示词到外部模型，或手动填写改写结果。",
      };
    },
  };
}

function countMeaningfulCharacters(text: string): number {
  return Array.from(text.replace(/\s+/g, "")).length;
}

function getMetricDirection(deltaCount: number): RewriteMetricDirection {
  if (deltaCount > 0) {
    return "expanded";
  }

  if (deltaCount < 0) {
    return "compressed";
  }

  return "unchanged";
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
