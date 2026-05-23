import type { ReviewRating } from "../../domain/enums";
import type { MaterialDraft } from "../materials/materialModel";

export interface ReviewSchedule {
  readonly reviewEase: number;
  readonly reviewIntervalDays: number;
  readonly reviewRepetitions: number;
  readonly reviewLapses: number;
  readonly nextReviewAt: string | null;
  readonly lastReviewedAt: string | null;
}

const MIN_EASE = 1.3;

export function createDefaultReviewSchedule(): ReviewSchedule {
  return {
    reviewEase: 2.5,
    reviewIntervalDays: 0,
    reviewRepetitions: 0,
    reviewLapses: 0,
    nextReviewAt: null,
    lastReviewedAt: null,
  };
}

export function getDueReviewMaterials(
  materials: readonly MaterialDraft[],
  now: Date = new Date(),
): readonly MaterialDraft[] {
  return materials
    .filter((material) => isReviewable(material) && isDueAt(material, now))
    .sort((left, right) => compareDueMaterials(left, right));
}

export function getTodayReviewCount(materials: readonly MaterialDraft[], now: Date = new Date()): number {
  const todayEnd = getLocalEndOfDay(now);
  return materials.filter((material) => isReviewable(material) && isDueAt(material, todayEnd)).length;
}

export function applyReviewRating(
  material: MaterialDraft,
  rating: ReviewRating,
  now: Date = new Date(),
): MaterialDraft {
  const baseSchedule = readReviewSchedule(material);
  const nextSchedule = scheduleByRating(baseSchedule, rating, now);

  return {
    ...material,
    ...nextSchedule,
    updatedAt: now.toISOString(),
  };
}

export function readReviewSchedule(material: Partial<ReviewSchedule>): ReviewSchedule {
  return {
    ...createDefaultReviewSchedule(),
    ...material,
  };
}

function isReviewable(material: MaterialDraft): boolean {
  return material.reviewEnabled && (material.status === "active" || material.status === "draft");
}

function isDueAt(material: MaterialDraft, deadline: Date): boolean {
  if (!material.nextReviewAt) {
    return true;
  }

  return Date.parse(material.nextReviewAt) <= deadline.getTime();
}

function scheduleByRating(schedule: ReviewSchedule, rating: ReviewRating, now: Date): ReviewSchedule {
  if (rating === "again") {
    return {
      reviewEase: lowerEase(schedule.reviewEase, 0.2),
      reviewIntervalDays: 0,
      reviewRepetitions: 0,
      reviewLapses: schedule.reviewLapses + 1,
      nextReviewAt: addMinutes(now, 10).toISOString(),
      lastReviewedAt: now.toISOString(),
    };
  }

  const nextRepetitions = schedule.reviewRepetitions + 1;

  if (rating === "hard") {
    const intervalDays = Math.max(1, Math.ceil(Math.max(schedule.reviewIntervalDays, 1) * 1.2));
    return {
      reviewEase: lowerEase(schedule.reviewEase, 0.15),
      reviewIntervalDays: intervalDays,
      reviewRepetitions: nextRepetitions,
      reviewLapses: schedule.reviewLapses,
      nextReviewAt: addDays(now, intervalDays).toISOString(),
      lastReviewedAt: now.toISOString(),
    };
  }

  if (rating === "easy") {
    const intervalDays =
      schedule.reviewRepetitions === 0
        ? 3
        : Math.max(3, Math.ceil(Math.max(schedule.reviewIntervalDays, 1) * (schedule.reviewEase + 0.3) * 1.3));
    return {
      reviewEase: roundEase(schedule.reviewEase + 0.15),
      reviewIntervalDays: intervalDays,
      reviewRepetitions: nextRepetitions,
      reviewLapses: schedule.reviewLapses,
      nextReviewAt: addDays(now, intervalDays).toISOString(),
      lastReviewedAt: now.toISOString(),
    };
  }

  const intervalDays =
    schedule.reviewRepetitions === 0
      ? 1
      : schedule.reviewRepetitions === 1
        ? 3
        : Math.max(1, Math.ceil(Math.max(schedule.reviewIntervalDays, 1) * schedule.reviewEase));

  return {
    reviewEase: roundEase(schedule.reviewEase),
    reviewIntervalDays: intervalDays,
    reviewRepetitions: nextRepetitions,
    reviewLapses: schedule.reviewLapses,
    nextReviewAt: addDays(now, intervalDays).toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

function compareDueMaterials(left: MaterialDraft, right: MaterialDraft): number {
  if (!left.nextReviewAt && right.nextReviewAt) {
    return -1;
  }

  if (left.nextReviewAt && !right.nextReviewAt) {
    return 1;
  }

  if (left.nextReviewAt && right.nextReviewAt && left.nextReviewAt !== right.nextReviewAt) {
    return Date.parse(left.nextReviewAt) - Date.parse(right.nextReviewAt);
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function lowerEase(value: number, amount: number): number {
  return Math.max(MIN_EASE, roundEase(value - amount));
}

function roundEase(value: number): number {
  return Math.round(value * 100) / 100;
}

function addMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60 * 1000);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function getLocalEndOfDay(value: Date): Date {
  const endOfDay = new Date(value);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}
