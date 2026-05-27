import type { MaterialDraft } from "./materialModel";
import { getMaterialQualityReport } from "./materialQuality";

export type MaterialWorkbenchStage = "candidate" | "refining" | "ready" | "done";
export type MaterialWorkbenchStep = "rewrite" | "classify" | "intake" | "review" | "done";

export interface MaterialWorkbenchStatus {
  readonly stage: MaterialWorkbenchStage;
  readonly primaryStep: MaterialWorkbenchStep;
  readonly actionLabel: string;
  readonly reviewAllowed: boolean;
  readonly failedCheckLabels: readonly string[];
}

export interface MaterialWorkbenchStats {
  readonly total: number;
  readonly candidateCount: number;
  readonly classifyCount: number;
  readonly intakeReadyCount: number;
  readonly reviewReadyCount: number;
  readonly reviewEnabledCount: number;
}

export function isWorkbenchCandidate(material: MaterialDraft): boolean {
  if (material.status === "archived") {
    return false;
  }

  const quality = getMaterialQualityReport(material);
  return !quality.reviewAllowed || material.status === "draft" || !material.reviewEnabled;
}

export function getWorkbenchCandidates(materials: readonly MaterialDraft[]): readonly MaterialDraft[] {
  return materials.filter(isWorkbenchCandidate);
}

export function getMaterialWorkbenchStatus(material: MaterialDraft): MaterialWorkbenchStatus {
  const quality = getMaterialQualityReport(material);
  const failedChecks = quality.checks.filter((check) => !check.passed);
  const failedCheckLabels = failedChecks.map((check) => check.label);

  if (quality.reviewAllowed && material.status === "active" && material.reviewEnabled) {
    return {
      stage: "done",
      primaryStep: "done",
      actionLabel: "已入复习",
      reviewAllowed: true,
      failedCheckLabels,
    };
  }

  if (quality.reviewAllowed && material.status === "draft") {
    return {
      stage: "ready",
      primaryStep: "intake",
      actionLabel: "确认入库",
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

export function getWorkbenchStats(materials: readonly MaterialDraft[]): MaterialWorkbenchStats {
  const statuses = materials.map(getMaterialWorkbenchStatus);

  return {
    total: materials.filter(isWorkbenchCandidate).length,
    candidateCount: statuses.filter((status) => status.stage === "candidate").length,
    classifyCount: statuses.filter((status) => status.primaryStep === "classify").length,
    intakeReadyCount: statuses.filter((status) => status.primaryStep === "intake").length,
    reviewReadyCount: statuses.filter((status) => status.primaryStep === "review").length,
    reviewEnabledCount: statuses.filter((status) => status.primaryStep === "done").length,
  };
}
