import { BUILTIN_MATERIAL_TYPES, BUILTIN_QUESTION_TYPES, BUILTIN_TOPICS } from "../../domain/seeds";
import type { MaterialDraft } from "../materials/materialModel";
import type { ReviewLog } from "./reviewSession";

export interface ReviewStatsSummary {
  readonly todayCompletedCount: number;
  readonly todayAgainCount: number;
  readonly sevenDayCompletedCount: number;
  readonly sevenDayRetentionRate: number | null;
  readonly averageElapsedMs: number | null;
  readonly weakAreas: readonly WeakReviewArea[];
}

export type WeakReviewAreaKind = "topic" | "questionType" | "materialType";

export interface WeakReviewArea {
  readonly kind: WeakReviewAreaKind;
  readonly key: string;
  readonly label: string;
  readonly weakCount: number;
  readonly totalCount: number;
  readonly weakRate: number;
}

const topicLabels: ReadonlyMap<string, string> = new Map(BUILTIN_TOPICS.map((topic) => [topic.slug, topic.name]));
const questionTypeLabels: ReadonlyMap<string, string> = new Map(
  BUILTIN_QUESTION_TYPES.map((questionType) => [questionType.slug, questionType.name]),
);
const materialTypeLabels: ReadonlyMap<string, string> = new Map(
  BUILTIN_MATERIAL_TYPES.map((materialType) => [materialType.slug, materialType.name]),
);

export function summarizeReviewLogs(
  logs: readonly ReviewLog[],
  _materials: readonly MaterialDraft[],
  now: Date = new Date(),
): ReviewStatsSummary {
  const todayLogs = logs.filter((log) => isSameLocalDay(new Date(log.reviewedAt), now));
  const sevenDayStart = getLocalStartOfDay(addDays(now, -6));
  const sevenDayLogs = logs.filter((log) => Date.parse(log.reviewedAt) >= sevenDayStart.getTime());
  const elapsedValues = sevenDayLogs
    .map((log) => log.elapsedMs)
    .filter((elapsedMs): elapsedMs is number => typeof elapsedMs === "number" && elapsedMs >= 0);

  return {
    todayCompletedCount: todayLogs.length,
    todayAgainCount: todayLogs.filter((log) => log.rating === "again").length,
    sevenDayCompletedCount: sevenDayLogs.length,
    sevenDayRetentionRate:
      sevenDayLogs.length > 0
        ? roundRatio(sevenDayLogs.filter((log) => log.rating !== "again").length / sevenDayLogs.length)
        : null,
    averageElapsedMs:
      elapsedValues.length > 0
        ? Math.round(elapsedValues.reduce((total, elapsedMs) => total + elapsedMs, 0) / elapsedValues.length)
        : null,
    weakAreas: buildWeakAreas(sevenDayLogs),
  };
}

function buildWeakAreas(logs: readonly ReviewLog[]): readonly WeakReviewArea[] {
  const groups = new Map<string, { kind: WeakReviewAreaKind; key: string; label: string; total: number; weak: number }>();

  for (const log of logs) {
    addGroup(groups, "topic", log.topicSlug, topicLabels.get(log.topicSlug) ?? log.topicSlug, log);
    addGroup(groups, "materialType", log.materialType, materialTypeLabels.get(log.materialType) ?? log.materialType, log);

    for (const questionTypeSlug of log.questionTypeSlugs) {
      addGroup(
        groups,
        "questionType",
        questionTypeSlug,
        questionTypeLabels.get(questionTypeSlug) ?? questionTypeSlug,
        log,
      );
    }
  }

  return [...groups.values()]
    .filter((group) => group.weak > 0)
    .map((group) => ({
      kind: group.kind,
      key: group.key,
      label: group.label,
      weakCount: group.weak,
      totalCount: group.total,
      weakRate: roundRatio(group.weak / group.total),
    }))
    .sort((left, right) => {
      const kindDelta = getWeakAreaKindPriority(left.kind) - getWeakAreaKindPriority(right.kind);
      if (kindDelta !== 0) {
        return kindDelta;
      }
      if (right.weakCount !== left.weakCount) {
        return right.weakCount - left.weakCount;
      }
      if (right.totalCount !== left.totalCount) {
        return right.totalCount - left.totalCount;
      }
      if (right.weakRate !== left.weakRate) {
        return right.weakRate - left.weakRate;
      }
      return left.label.localeCompare(right.label, "zh-CN");
    })
    .slice(0, 6);
}

function getWeakAreaKindPriority(kind: WeakReviewAreaKind): number {
  if (kind === "topic") {
    return 0;
  }

  if (kind === "questionType") {
    return 1;
  }

  return 2;
}

function addGroup(
  groups: Map<string, { kind: WeakReviewAreaKind; key: string; label: string; total: number; weak: number }>,
  kind: WeakReviewAreaKind,
  key: string,
  label: string,
  log: ReviewLog,
): void {
  const id = `${kind}:${key}`;
  const current = groups.get(id) ?? { kind, key, label, total: 0, weak: 0 };
  groups.set(id, {
    ...current,
    total: current.total + 1,
    weak: current.weak + (isWeakRating(log) ? 1 : 0),
  });
}

function isWeakRating(log: ReviewLog): boolean {
  return log.rating === "again" || log.rating === "hard";
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getLocalStartOfDay(value: Date): Date {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}
