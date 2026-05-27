import type { MaterialTypeId } from "../../domain/enums";
import { getMaterialQualityReport } from "../materials/materialQuality";
import type { MaterialDraft } from "../materials/materialModel";
import type { RewriteTargetId } from "../rewrite/rewriteWorkshop";

export const ANSWER_GOAL_IDS = ["call-materials", "build-answer", "polish-expression", "draft-paragraph"] as const;

export type AnswerGoalId = (typeof ANSWER_GOAL_IDS)[number];

export interface AnswerWorkbenchFilters {
  readonly topicSlug: string;
  readonly questionTypeSlug: string;
  readonly goalId: AnswerGoalId;
  readonly keyword: string;
}

export interface AnswerTemplateSection {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly placeholders: readonly string[];
}

export interface AnswerTemplate {
  readonly questionTypeSlug: string;
  readonly title: string;
  readonly sections: readonly AnswerTemplateSection[];
}

export interface CallableMaterialScore {
  readonly material: MaterialDraft;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface CallableMaterialGroup {
  readonly materialType: MaterialTypeId;
  readonly label: string;
  readonly materials: readonly MaterialDraft[];
}

export interface AnswerWorkbenchDraft {
  readonly topicSlug: string;
  readonly questionTypeSlug: string;
  readonly goalId: AnswerGoalId;
  readonly keyword: string;
  readonly contentMd: string;
}

export interface AnswerSlot {
  readonly id: string;
  readonly title: string;
  readonly hint: string;
  readonly contentMd: string;
}

export interface AnswerWorkbenchStructuredDraft {
  readonly topicSlug: string;
  readonly questionTypeSlug: string;
  readonly goalId: AnswerGoalId;
  readonly keyword: string;
  readonly activeSlotId: string;
  readonly slots: readonly AnswerSlot[];
}

export type AnswerDraftInsertMode = "title" | "excerpt" | "content";

export interface AnswerRewriteDraft {
  readonly sourceMaterialId: string;
  readonly targetId: RewriteTargetId;
  readonly originalText: string;
  readonly resultText: string;
  readonly extraInstruction: string;
}

export interface AnswerMaterialInput {
  readonly title: string;
  readonly contentMd: string;
  readonly excerpt: string;
  readonly materialType: MaterialTypeId;
  readonly topicSlug: string;
  readonly questionTypeSlugs: readonly string[];
  readonly source: string;
  readonly tagNames: readonly string[];
}

const TOPIC_LABELS: Record<string, string> = {
  "grassroots-governance": "基层治理",
  "rural-revitalization": "乡村振兴",
  "digital-government": "数字政府",
  "public-services": "民生服务",
  "business-environment": "营商环境",
  "ecological-civilization": "生态文明",
  "emergency-management": "应急管理",
  "youth-development": "青年发展",
  "cultural-heritage": "文化传承",
  "social-governance": "社会治理",
  "high-quality-development": "高质量发展",
  "common-prosperity": "共同富裕",
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  summary: "归纳概括",
  countermeasure: "提出对策",
  analysis: "综合分析",
  implementation: "贯彻执行",
  essay: "申发论述",
  "interview-analysis": "面试综合分析",
  general: "通用素材",
};

const MATERIAL_TYPE_LABELS: Record<MaterialTypeId, string> = {
  problem: "问题",
  cause: "原因",
  solution: "对策",
  case: "案例",
  "standard-expression": "规范表达",
  "golden-sentence": "金句",
  "title-sentence": "标题句",
  "transition-sentence": "过渡句",
  "essay-framework": "文章框架",
  argument: "分论点",
  opening: "开头",
  ending: "结尾",
};

const MATERIAL_GROUP_ORDER: readonly MaterialTypeId[] = [
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
];

const QUESTION_TYPE_MATERIAL_WEIGHTS: Record<string, Partial<Record<MaterialTypeId, number>>> = {
  summary: {
    problem: 18,
    cause: 14,
    "standard-expression": 12,
  },
  countermeasure: {
    solution: 22,
    problem: 14,
    case: 12,
    "standard-expression": 10,
  },
  analysis: {
    cause: 18,
    case: 16,
    argument: 16,
    solution: 10,
    "standard-expression": 10,
  },
  implementation: {
    "standard-expression": 18,
    "transition-sentence": 14,
    "title-sentence": 14,
    solution: 12,
  },
  essay: {
    "essay-framework": 22,
    argument: 20,
    opening: 16,
    ending: 16,
    case: 14,
    "golden-sentence": 12,
  },
};

const ANSWER_TEMPLATES: Record<string, AnswerTemplate> = {
  summary: {
    questionTypeSlug: "summary",
    title: "归纳概括结构",
    sections: [
      {
        id: "overview",
        title: "总括句",
        description: "先用一句话概括对象、范围和核心问题。",
        placeholders: ["围绕题干对象，指出材料主要反映了……"],
      },
      {
        id: "points",
        title: "分点概括",
        description: "按主体、领域、表现或原因分层列点。",
        placeholders: ["一是……；二是……；三是……"],
      },
      {
        id: "closing",
        title: "规范收束",
        description: "用简短表达收住材料共性，不额外拔高。",
        placeholders: ["总体看，问题集中在……"],
      },
    ],
  },
  countermeasure: {
    questionTypeSlug: "countermeasure",
    title: "提出对策结构",
    sections: [
      {
        id: "problem",
        title: "问题定位",
        description: "明确要解决的主要问题和约束条件。",
        placeholders: ["针对……问题，应坚持问题导向、结果导向。"],
      },
      {
        id: "measures",
        title: "对策分条",
        description: "从机制、资源、执行、监督等角度提出可操作措施。",
        placeholders: ["一要……；二要……；三要……"],
      },
      {
        id: "owner",
        title: "执行主体",
        description: "交代谁来做、怎么协同、如何落地。",
        placeholders: ["由……牵头，推动……形成闭环。"],
      },
    ],
  },
  analysis: {
    questionTypeSlug: "analysis",
    title: "综合分析结构",
    sections: [
      {
        id: "stance",
        title: "表态",
        description: "先明确判断和基本态度。",
        placeholders: ["这一现象本质上反映了……，应辩证看待。"],
      },
      {
        id: "analysis",
        title: "分析",
        description: "从原因、影响、矛盾关系展开。",
        placeholders: ["其积极意义在于……，但也暴露出……"],
      },
      {
        id: "action",
        title: "对策/启示",
        description: "回到治理或实践落点。",
        placeholders: ["下一步，应从……入手。"],
      },
    ],
  },
  implementation: {
    questionTypeSlug: "implementation",
    title: "贯彻执行结构",
    sections: [
      {
        id: "format",
        title: "文种结构",
        description: "明确标题、称谓、正文层级和落款要求。",
        placeholders: ["标题：关于……的……"],
      },
      {
        id: "audience",
        title: "对象",
        description: "根据受众调整语气、材料取舍和行动号召。",
        placeholders: ["面向……，重点说明……"],
      },
      {
        id: "matter",
        title: "事项",
        description: "围绕背景、问题、做法、要求组织正文。",
        placeholders: ["现将有关事项说明如下：……"],
      },
    ],
  },
  essay: {
    questionTypeSlug: "essay",
    title: "申发论述结构",
    sections: [
      {
        id: "title",
        title: "标题",
        description: "概括主题，形成鲜明论点。",
        placeholders: ["以……激活……"],
      },
      {
        id: "opening",
        title: "开头",
        description: "背景引入、点明主题、提出中心论点。",
        placeholders: ["时代之变……，关键在于……"],
      },
      {
        id: "arguments",
        title: "分论点",
        description: "围绕 2-3 个层次展开。",
        placeholders: ["一、……；二、……；三、……"],
      },
      {
        id: "evidence",
        title: "论证素材",
        description: "为分论点匹配案例、规范表达和金句。",
        placeholders: ["以……为例，说明……"],
      },
      {
        id: "ending",
        title: "结尾",
        description: "总结升华，回扣主题和行动方向。",
        placeholders: ["惟有……，方能……"],
      },
    ],
  },
};

const ANSWER_SLOT_TEMPLATES: Record<string, readonly Omit<AnswerSlot, "contentMd">[]> = {
  summary: [
    { id: "overview", title: "总括句", hint: "一句话概括材料对象、范围和核心表现。" },
    { id: "point-1", title: "要点一", hint: "按主体、领域或表现拆出第一层要点。" },
    { id: "point-2", title: "要点二", hint: "补充第二层要点，保持概括而不展开论证。" },
    { id: "closing", title: "规范收束", hint: "用一句规范表达收住共性。" },
  ],
  countermeasure: [
    { id: "problem", title: "问题定位", hint: "先点明要解决的问题和约束。" },
    { id: "measure-1", title: "对策一", hint: "写第一条可执行措施。" },
    { id: "measure-2", title: "对策二", hint: "写第二条可执行措施。" },
    { id: "owner", title: "执行主体", hint: "说明牵头主体、协同主体和落地方式。" },
    { id: "closing", title: "收束句", hint: "用一句话形成闭环。" },
  ],
  analysis: [
    { id: "stance", title: "表态", hint: "先明确判断和基本态度。" },
    { id: "reason", title: "原因分析", hint: "分析现象背后的机制和矛盾。" },
    { id: "impact", title: "影响分析", hint: "说明积极意义、风险或现实影响。" },
    { id: "action", title: "对策启示", hint: "回到治理或实践落点。" },
  ],
  implementation: [
    { id: "title", title: "标题", hint: "明确文种标题。" },
    { id: "background", title: "背景目的", hint: "交代背景、对象和目的。" },
    { id: "matter", title: "主要事项", hint: "按事项组织正文。" },
    { id: "requirement", title: "工作要求", hint: "提出执行要求或号召。" },
  ],
  essay: [
    { id: "title", title: "标题", hint: "形成文章标题或中心论点。" },
    { id: "opening", title: "开头", hint: "背景引入并点明主题。" },
    { id: "argument-1", title: "分论点一", hint: "第一层论证观点。" },
    { id: "argument-2", title: "分论点二", hint: "第二层论证观点。" },
    { id: "evidence", title: "论证素材", hint: "放入案例、规范表达或金句。" },
    { id: "ending", title: "结尾", hint: "总结升华并回扣主题。" },
  ],
  "interview-analysis": [
    { id: "stance", title: "表态", hint: "先给出明确态度。" },
    { id: "analysis", title: "分析", hint: "从原因、影响或价值展开。" },
    { id: "action", title: "做法", hint: "说清自己或组织层面的行动。" },
    { id: "closing", title: "收束", hint: "自然收束，避免空喊口号。" },
  ],
  general: [
    { id: "point", title: "核心表达", hint: "沉淀可直接调用的规范表达。" },
    { id: "support", title: "支撑素材", hint: "补充案例、数据或政策表述。" },
    { id: "closing", title: "收束句", hint: "形成一句完整落点。" },
  ],
};

export function rankCallableMaterials(
  materials: readonly MaterialDraft[],
  filters: AnswerWorkbenchFilters,
): readonly CallableMaterialScore[] {
  const keyword = normalizeKeyword(filters.keyword);

  return materials
    .filter((material) => material.status === "active" || material.status === "draft")
    .map((material) => scoreMaterial(material, filters, keyword))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.material.updatedAt.localeCompare(left.material.updatedAt);
    });
}

export function groupCallableMaterials(materials: readonly MaterialDraft[]): readonly CallableMaterialGroup[] {
  return MATERIAL_GROUP_ORDER.flatMap((materialType) => {
    const groupMaterials = materials.filter((material) => material.materialType === materialType);

    return groupMaterials.length > 0
      ? [
          {
            materialType,
            label: MATERIAL_TYPE_LABELS[materialType],
            materials: groupMaterials,
          },
        ]
      : [];
  });
}

export function getAnswerTemplate(questionTypeSlug: string): AnswerTemplate {
  return ANSWER_TEMPLATES[questionTypeSlug] ?? ANSWER_TEMPLATES.summary;
}

export function getAnswerSlots(questionTypeSlug: string): readonly AnswerSlot[] {
  const slotTemplates = ANSWER_SLOT_TEMPLATES[questionTypeSlug] ?? ANSWER_SLOT_TEMPLATES.general;
  return slotTemplates.map((slot) => ({ ...slot, contentMd: "" }));
}

export function createStructuredAnswerDraft(input: AnswerWorkbenchFilters): AnswerWorkbenchStructuredDraft {
  const slots = getAnswerSlots(input.questionTypeSlug);

  return {
    ...input,
    activeSlotId: slots[0]?.id ?? "",
    slots,
  };
}

export function insertMaterialIntoDraft(
  draft: AnswerWorkbenchDraft,
  material: MaterialDraft,
  mode: AnswerDraftInsertMode,
): AnswerWorkbenchDraft {
  const snippet = buildMaterialSnippet(material, mode);
  const separator = draft.contentMd.trim().length > 0 ? "\n\n" : "";

  return {
    ...draft,
    contentMd: `${draft.contentMd.trimEnd()}${separator}${snippet}`,
  };
}

export function insertMaterialIntoSlot(
  draft: AnswerWorkbenchStructuredDraft,
  slotId: string,
  material: MaterialDraft,
  mode: AnswerDraftInsertMode,
): AnswerWorkbenchStructuredDraft {
  const snippet = buildMaterialSnippet(material, mode);
  let foundSlot = false;
  const slots = draft.slots.map((slot) => {
    if (slot.id !== slotId) {
      return slot;
    }

    foundSlot = true;
    const separator = slot.contentMd.trim().length > 0 ? "\n\n" : "";
    return {
      ...slot,
      contentMd: `${slot.contentMd.trimEnd()}${separator}${snippet}`,
    };
  });

  return foundSlot
    ? {
        ...draft,
        activeSlotId: slotId,
        slots,
      }
    : draft;
}

export function updateStructuredDraftSlot(
  draft: AnswerWorkbenchStructuredDraft,
  slotId: string,
  contentMd: string,
): AnswerWorkbenchStructuredDraft {
  return {
    ...draft,
    activeSlotId: slotId,
    slots: draft.slots.map((slot) => (slot.id === slotId ? { ...slot, contentMd } : slot)),
  };
}

export function renderStructuredDraftToMarkdown(draft: AnswerWorkbenchStructuredDraft): string {
  return draft.slots
    .map((slot) => {
      const content = slot.contentMd.trim();
      return content ? `## ${slot.title}\n${content}` : "";
    })
    .filter((section) => section.length > 0)
    .join("\n\n");
}

export function buildMaterialInputFromAnswerDraft(
  draft: AnswerWorkbenchDraft | AnswerWorkbenchStructuredDraft,
  now: Date = new Date(),
): AnswerMaterialInput {
  const topicName = getTopicLabel(draft.topicSlug);
  const questionTypeName = getQuestionTypeLabel(draft.questionTypeSlug);
  const contentMd = getDraftMarkdown(draft);

  return {
    title: `调用练习：${topicName} + ${questionTypeName} + ${formatDate(now)}`,
    contentMd,
    excerpt: buildExcerpt(contentMd),
    materialType: getDraftMaterialType(draft.questionTypeSlug),
    topicSlug: draft.topicSlug,
    questionTypeSlugs: [draft.questionTypeSlug],
    source: "调用工作台",
    tagNames: ["调用工作台", topicName, questionTypeName],
  };
}

export function buildRewriteDraftFromAnswerDraft(draft: AnswerWorkbenchStructuredDraft): AnswerRewriteDraft {
  return {
    sourceMaterialId: "",
    targetId: draft.questionTypeSlug === "essay" ? "expand_argument" : "compress",
    originalText: renderStructuredDraftToMarkdown(draft),
    resultText: "",
    extraInstruction: "来自调用工作台草稿，请保持申论表达规范、准确、可直接调用。",
  };
}

export function getTopicLabel(topicSlug: string): string {
  return TOPIC_LABELS[topicSlug] ?? topicSlug;
}

export function getQuestionTypeLabel(questionTypeSlug: string): string {
  return QUESTION_TYPE_LABELS[questionTypeSlug] ?? questionTypeSlug;
}

export function getMaterialTypeLabel(materialType: MaterialTypeId): string {
  return MATERIAL_TYPE_LABELS[materialType];
}

function getDraftMarkdown(draft: AnswerWorkbenchDraft | AnswerWorkbenchStructuredDraft): string {
  return "slots" in draft ? renderStructuredDraftToMarkdown(draft) : draft.contentMd.trim();
}

function scoreMaterial(
  material: MaterialDraft,
  filters: AnswerWorkbenchFilters,
  keyword: string,
): CallableMaterialScore {
  const reasons: string[] = [];
  let score = Math.round(getMaterialQualityReport(material).score / 2);

  if (material.status === "active") {
    score += 30;
    reasons.push("已入库");
  }

  if (material.topicSlug === filters.topicSlug) {
    score += 50;
    reasons.push("主题匹配");
  }

  if (material.questionTypeSlugs.includes(filters.questionTypeSlug)) {
    score += 45;
    reasons.push("题型匹配");
  } else if (material.questionTypeSlugs.includes("general")) {
    score += 10;
    reasons.push("通用素材");
  }

  const typeWeight = QUESTION_TYPE_MATERIAL_WEIGHTS[filters.questionTypeSlug]?.[material.materialType] ?? 0;
  if (typeWeight > 0) {
    score += typeWeight;
    reasons.push(`${MATERIAL_TYPE_LABELS[material.materialType]}可调用`);
  }

  if (material.favorite) {
    score += 12;
    reasons.push("收藏优先");
  }

  if (material.reviewEnabled) {
    score += 6;
    reasons.push("复习池");
  }

  if (hasCredibleSource(material.source)) {
    score += 8;
    reasons.push("来源明确");
  }

  const keywordScore = scoreKeyword(material, keyword);
  if (keywordScore > 0) {
    score += keywordScore;
    reasons.push("关键词命中");
  }

  return {
    material,
    score,
    reasons,
  };
}

function buildMaterialSnippet(material: MaterialDraft, mode: AnswerDraftInsertMode): string {
  if (mode === "title") {
    return `- [[${material.title}]]`;
  }

  const text = mode === "excerpt" ? material.excerpt || material.contentMd : material.contentMd;
  return [`### ${material.title}`, `> ${text.trim()}`].join("\n");
}

function getDraftMaterialType(questionTypeSlug: string): MaterialTypeId {
  if (questionTypeSlug === "essay") {
    return "essay-framework";
  }

  if (questionTypeSlug === "countermeasure") {
    return "solution";
  }

  if (questionTypeSlug === "analysis" || questionTypeSlug === "interview-analysis") {
    return "argument";
  }

  return "standard-expression";
}

function buildExcerpt(contentMd: string): string {
  const nonHeadingLines = contentMd
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^#{1,6}\s+/.test(line));
  const plainText = (nonHeadingLines[0] ?? contentMd)
    .replace(/[*_`>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return plainText.slice(0, 80);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

function scoreKeyword(material: MaterialDraft, keyword: string): number {
  if (!keyword) {
    return 0;
  }

  const title = material.title.toLowerCase();
  const content = `${material.excerpt}\n${material.contentMd}\n${material.tagNames.join("\n")}`.toLowerCase();

  if (title.includes(keyword)) {
    return 18;
  }

  return content.includes(keyword) ? 10 : 0;
}

function hasCredibleSource(source: string): boolean {
  const trimmed = source.trim().toLowerCase();
  return trimmed.length > 0 && !trimmed.includes("rewrite") && !trimmed.includes("ai") && !trimmed.includes("模型");
}
