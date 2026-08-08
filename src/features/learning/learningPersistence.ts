import {
  EMPTY_LEARNING_WORKSPACE,
  type LearningWorkspaceState,
} from "../../domain/learning";

export const LEARNING_WORKSPACE_STORAGE_KEY = "civicforge.learning-workspace.v3";

export function getBrowserLearningStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function loadLearningWorkspace(storage: Storage): LearningWorkspaceState {
  try {
    const raw = storage.getItem(LEARNING_WORKSPACE_STORAGE_KEY);
    if (!raw) {
      return EMPTY_LEARNING_WORKSPACE;
    }

    const value = JSON.parse(raw) as Partial<LearningWorkspaceState>;
    return normalizeLearningWorkspace(value);
  } catch {
    return EMPTY_LEARNING_WORKSPACE;
  }
}

export function saveLearningWorkspace(storage: Storage, state: LearningWorkspaceState): void {
  storage.setItem(LEARNING_WORKSPACE_STORAGE_KEY, JSON.stringify(state));
}

export function normalizeLearningWorkspace(value: Partial<LearningWorkspaceState>): LearningWorkspaceState {
  return {
    sources: arrayOrEmpty(value.sources),
    excerpts: arrayOrEmpty(value.excerpts),
    exercises: arrayOrEmpty(value.exercises),
    attempts: arrayOrEmpty(value.attempts),
    revisions: arrayOrEmpty(value.revisions),
    feedback: arrayOrEmpty(value.feedback),
    cards: arrayOrEmpty(value.cards),
    cardSources: arrayOrEmpty(value.cardSources),
    cardUsages: arrayOrEmpty(value.cardUsages),
    reviewCards: arrayOrEmpty(value.reviewCards),
    sessions: arrayOrEmpty(value.sessions),
    sessionItems: arrayOrEmpty(value.sessionItems),
  };
}

function arrayOrEmpty<T>(value: readonly T[] | undefined): readonly T[] {
  return Array.isArray(value) ? value : [];
}
