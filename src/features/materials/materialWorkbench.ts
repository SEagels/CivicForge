import type { MaterialDraft } from "./materialModel";
import { getMaterialQualityReport } from "./materialQuality";

export type MaterialWorkbenchStage = "candidate" | "refining" | "ready" | "done";
export type MaterialWorkbenchStep = "rewrite" | "classify" | "review" | "done";

export interface MaterialWorkbenchStatus {
  readonly stage: MaterialWorkbenchStage;
  readonly primaryStep: MaterialWorkbenchStep;
  readonly actionLabel: string;
  readonly reviewAllowed: boolean;
  readonly failedCheckLabels: readonly string[];
}

export function isWorkbenchCandidate(material: MaterialDraft): boolean {
  if (material.status === "archived") {
    return false;
  }

  const quality = getMaterialQualityReport(material);
  return !quality.reviewAllowed || !material.reviewEnabled;
}

export function getWorkbenchCandidates(materials: readonly MaterialDraft[]): readonly MaterialDraft[] {
  return materials.filter(isWorkbenchCandidate);
}

export function getMaterialWorkbenchStatus(material: MaterialDraft): MaterialWorkbenchStatus {
  const quality = getMaterialQualityReport(material);
  const failedChecks = quality.checks.filter((check) => !check.passed);
  const failedCheckLabels = failedChecks.map((check) => check.label);

  if (quality.reviewAllowed && material.reviewEnabled) {
    return {
      stage: "done",
      primaryStep: "done",
      actionLabel: "已入复习",
      reviewAllowed: true,
      failedCheckLabels,
    };
  }

  if (quality.reviewAllowed) {
    return {
      stage: "ready",
      primaryStep: "review",
      actionLabel: "加入复习",
      reviewAllowed: true,
      failedCheckLabels,
    };
  }

  if (failedChecks.some((check) => check.id === "title" || check.id === "content")) {
    return {
      stage: quality.level === "candidate" ? "candidate" : "refining",
      primaryStep: "rewrite",
      actionLabel: "打磨正文",
      reviewAllowed: false,
      failedCheckLabels,
    };
  }

  return {
    stage: quality.level === "candidate" ? "candidate" : "refining",
    primaryStep: "classify",
    actionLabel: "补齐分类",
    reviewAllowed: false,
    failedCheckLabels,
  };
}
