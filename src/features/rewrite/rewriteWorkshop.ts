import type { MaterialTypeId } from "../../domain/enums";

export const REWRITE_TARGET_IDS = [
  "compress",
  "expand_argument",
  "opening",
  "ending",
  "transition",
  "title",
  "free",
] as const;

export type RewriteTargetId = (typeof REWRITE_TARGET_IDS)[number];

export type RewriteLogStatus = "saved" | "discarded";

export interface RewriteTarget {
  readonly id: RewriteTargetId;
  readonly label: string;
  readonly instruction: string;
  readonly resultMaterialType: MaterialTypeId;
}

export interface RewritePromptInput {
  readonly targetId: RewriteTargetId;
  readonly originalText: string;
  readonly extraInstruction?: string;
}

export interface RewriteLogInput extends RewritePromptInput {
  readonly sourceMaterialId: string | null;
  readonly promptTemplate: string;
  readonly resultText: string;
}

export interface RewriteLog {
  readonly id: string;
  readonly sourceMaterialId: string | null;
  readonly targetId: RewriteTargetId;
  readonly originalText: string;
  readonly promptTemplate: string;
  readonly resultText: string;
  readonly status: RewriteLogStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RewriteMaterialInput {
  readonly title: string;
  readonly contentMd: string;
  readonly excerpt: string;
  readonly materialType: MaterialTypeId;
  readonly source: string;
  readonly tagNames: readonly string[];
}

export const REWRITE_TARGETS: readonly RewriteTarget[] = [
  {
    id: "compress",
    label: "压缩成规范表达",
    instruction: "语言要规范、凝练、适合申论作答直接调用，避免口语化和空泛表述。",
    resultMaterialType: "standard-expression",
  },
  {
    id: "expand_argument",
    label: "扩写成论证段",
    instruction: "扩写为有观点、有解释、有落点的论证段，逻辑清楚，适合分论点展开。",
    resultMaterialType: "argument",
  },
  {
    id: "opening",
    label: "改成开头",
    instruction: "改写为申论文章开头，先引出背景，再点明主题，语气稳健克制。",
    resultMaterialType: "opening",
  },
  {
    id: "ending",
    label: "改成结尾",
    instruction: "改写为申论文章结尾，形成总结升华，避免喊口号，保留行动指向。",
    resultMaterialType: "ending",
  },
  {
    id: "transition",
    label: "改成过渡句",
    instruction: "改写为承上启下的过渡句，连接问题、原因、对策或案例分析。",
    resultMaterialType: "transition-sentence",
  },
  {
    id: "title",
    label: "改成标题句",
    instruction: "改写为标题句，要求简洁、有概括力，适合文章标题或分论点标题。",
    resultMaterialType: "title-sentence",
  },
  {
    id: "free",
    label: "自由改写",
    instruction: "根据补充要求改写，保持申论表达的准确性、层次感和可调用性。",
    resultMaterialType: "standard-expression",
  },
] as const;

export function getRewriteTarget(targetId: RewriteTargetId): RewriteTarget | undefined {
  return REWRITE_TARGETS.find((target) => target.id === targetId);
}

export function generateRewritePrompt(input: RewritePromptInput): string {
  const target = requireRewriteTarget(input.targetId);
  const extraInstruction = input.extraInstruction?.trim();

  return [
    `请将以下申论素材${target.label}。`,
    "",
    `改写要求：${target.instruction}`,
    extraInstruction ? `补充要求：${extraInstruction}` : "",
    "",
    "原文：",
    input.originalText.trim(),
    "",
    "请直接输出改写结果，不要解释过程。",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

export function createRewriteLog(input: RewriteLogInput, now: Date = new Date(), id?: string): RewriteLog {
  const timestamp = now.toISOString();

  return {
    id: id ?? `rewrite-${now.getTime().toString(36)}`,
    sourceMaterialId: input.sourceMaterialId,
    targetId: input.targetId,
    originalText: input.originalText.trim(),
    promptTemplate: input.promptTemplate.trim(),
    resultText: input.resultText.trim(),
    status: "saved",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildMaterialInputFromRewrite(log: RewriteLog): RewriteMaterialInput {
  const target = requireRewriteTarget(log.targetId);
  const content = log.resultText.trim();

  return {
    title: `Rewrite：${target.label}`,
    contentMd: content,
    excerpt: content.slice(0, 80),
    materialType: target.resultMaterialType,
    source: "Rewrite 工坊",
    tagNames: ["Rewrite"],
  };
}

function requireRewriteTarget(targetId: RewriteTargetId): RewriteTarget {
  const target = getRewriteTarget(targetId);

  if (!target) {
    throw new Error(`Unknown rewrite target: ${targetId}`);
  }

  return target;
}
