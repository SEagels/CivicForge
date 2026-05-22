export const MATERIAL_TYPE_IDS = [
  "problem",
  "cause",
  "solution",
  "case",
  "standard-expression",
  "golden-sentence",
  "title-sentence",
  "transition-sentence",
  "essay-framework",
  "argument",
  "opening",
  "ending",
] as const;

export type MaterialTypeId = (typeof MATERIAL_TYPE_IDS)[number];

export const REVIEW_RATINGS = ["again", "hard", "good", "easy"] as const;

export type ReviewRating = (typeof REVIEW_RATINGS)[number];

export const MATERIAL_STATUSES = ["draft", "active", "archived", "deleted"] as const;

export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];
