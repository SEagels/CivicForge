import type {
  KnowledgeCard,
  LearningWorkspaceState,
  ReviewCard,
  ReviewCardMode,
} from "../../domain/learning";

export interface KnowledgeCardChecklistItem {
  readonly id: "title" | "content" | "topic" | "question-type" | "source";
  readonly label: string;
  readonly passed: boolean;
  readonly detail: string;
}

export function buildKnowledgeCardChecklist(
  card: KnowledgeCard,
  workspace: LearningWorkspaceState,
): readonly KnowledgeCardChecklistItem[] {
  const compactContent = card.contentMd.replace(/\s+/g, "");
  const source = resolveCardSource(card, workspace);

  return [
    {
      id: "title",
      label: "标题明确",
      passed: card.title.trim().length >= 4,
      detail: "标题至少 4 个字符，便于搜索和回忆。",
    },
    {
      id: "content",
      label: "正文可调用",
      passed: compactContent.length >= 20,
      detail: "正文至少 20 字，形成完整表达或案例要点。",
    },
    {
      id: "topic",
      label: "主题已分类",
      passed: Boolean(card.topicSlug.trim()),
      detail: "选择一个具体申论主题。",
    },
    {
      id: "question-type",
      label: "题型已适配",
      passed: card.questionTypeSlugs.length > 0,
      detail: "至少选择一个可调用题型。",
    },
    {
      id: "source",
      label: "来源可追溯",
      passed: source.available,
      detail: source.detail,
    },
  ];
}

export function canVerifyKnowledgeCard(
  card: KnowledgeCard,
  workspace: LearningWorkspaceState,
): boolean {
  return buildKnowledgeCardChecklist(card, workspace).every((item) => item.passed);
}

export function verifyKnowledgeCard(
  workspace: LearningWorkspaceState,
  cardId: string,
  now: Date = new Date(),
): LearningWorkspaceState {
  const card = workspace.cards.find((item) => item.id === cardId);
  if (!card || !canVerifyKnowledgeCard(card, workspace)) return workspace;

  const hasStructuredSource = workspace.cardSources.some(
    (item) => item.cardId === cardId && Boolean(item.sourceDocumentId || item.sourceExcerptId || item.attemptId),
  );

  return {
    ...workspace,
    cards: workspace.cards.map((item) => item.id === cardId
      ? {
          ...item,
          lifecycle: item.core ? "core" : "usable",
          verificationStatus: hasStructuredSource ? "source-verified" : "user-verified",
          updatedAt: now.toISOString(),
        }
      : item),
  };
}

export function createReviewCardFromKnowledgeCard(
  card: KnowledgeCard,
  mode: ReviewCardMode = "key-point-recall",
): ReviewCard {
  return {
    id: `review-card-${card.id}-${mode}`,
    knowledgeCardId: card.id,
    mode,
    promptMd: buildReviewPrompt(card, mode),
    answerMd: card.contentMd,
    nextReviewAt: null,
    lastReviewedAt: null,
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
  };
}

export function enableKnowledgeCardReview(
  workspace: LearningWorkspaceState,
  cardId: string,
  mode: ReviewCardMode = "key-point-recall",
  now: Date = new Date(),
): LearningWorkspaceState {
  const card = workspace.cards.find((item) => item.id === cardId);
  if (!card || card.verificationStatus === "unverified") return workspace;

  const review = workspace.reviewCards.find(
    (item) => item.knowledgeCardId === cardId && item.mode === mode,
  ) ?? createReviewCardFromKnowledgeCard(card, mode);

  return {
    ...workspace,
    cards: workspace.cards.map((item) => item.id === cardId
      ? { ...item, reviewEnabled: true, updatedAt: now.toISOString() }
      : item),
    reviewCards: [
      review,
      ...workspace.reviewCards.filter((item) => item.id !== review.id),
    ],
  };
}

export function insertKnowledgeCardIntoAttempt(
  workspace: LearningWorkspaceState,
  cardId: string,
  attemptId: string,
  usageKind: "content" | "argument" | "evidence" = "content",
  now: Date = new Date(),
): LearningWorkspaceState {
  const card = workspace.cards.find((item) => item.id === cardId);
  const attempt = workspace.attempts.find((item) => item.id === attemptId);
  if (!card || !attempt || card.verificationStatus === "unverified" || card.lifecycle === "archived") {
    return workspace;
  }

  const separator = attempt.answerMd.trim() ? "\n\n" : "";
  const usage = {
    id: `usage-${now.getTime()}-${workspace.cardUsages.length}`,
    cardId,
    attemptId,
    usageKind,
    slotKey: "answer",
    usedAt: now.toISOString(),
  } as const;

  return {
    ...workspace,
    attempts: workspace.attempts.map((item) => item.id === attemptId
      ? {
          ...item,
          answerMd: `${item.answerMd}${separator}${card.contentMd}`,
          status: "in-progress",
          updatedAt: now.toISOString(),
        }
      : item),
    cardUsages: [usage, ...workspace.cardUsages],
  };
}

function resolveCardSource(
  card: KnowledgeCard,
  workspace: LearningWorkspaceState,
): { readonly available: boolean; readonly detail: string } {
  const relations = workspace.cardSources.filter((item) => item.cardId === card.id);
  const sourceDocumentIds = new Set(relations.map((item) => item.sourceDocumentId).filter(Boolean));
  const hasCredibleDocument = workspace.sources.some(
    (item) => sourceDocumentIds.has(item.id) && Boolean(item.publisher.trim() || item.sourceUri.trim()),
  );
  const hasAttempt = relations.some((item) => Boolean(item.attemptId));

  if (hasCredibleDocument) return { available: true, detail: "已关联带发布机构或位置的资料。" };
  if (hasAttempt) return { available: true, detail: "已关联具体训练作答。" };
  if (card.sourceLabel.trim()) return { available: true, detail: "已填写人工来源说明。" };
  return { available: false, detail: "关联资料、训练作答，或填写来源说明。" };
}

function buildReviewPrompt(card: KnowledgeCard, mode: ReviewCardMode): string {
  const prompts: Record<ReviewCardMode, string> = {
    "key-point-recall": `回忆「${card.title}」的核心要点。`,
    "expression-recall": `用规范申论语言复述「${card.title}」。`,
    "case-application": `说明「${card.title}」可用于论证什么观点。`,
    "placement-recall": `判断「${card.title}」适合放在答案的什么位置。`,
    "micro-writing": `围绕「${card.title}」写一个简短论证段。`,
  };
  return prompts[mode];
}
