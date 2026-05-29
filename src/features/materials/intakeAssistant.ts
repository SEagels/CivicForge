import type { MaterialTypeId } from "../../domain/enums";
import type { MaterialDraft, MaterialPatch } from "./materialModel";
import { getMaterialQualityReport, type MaterialQualityRequiredCheckId } from "./materialQuality";
import { getWorkbenchCandidates } from "./materialWorkbench";

export interface IntakeChecklistItem {
  readonly id: MaterialQualityRequiredCheckId;
  readonly label: string;
  readonly passed: boolean;
}

export interface IntakeSuggestion {
  readonly field: "topicSlug" | "materialType" | "questionTypeSlugs" | "tagNames";
  readonly label: string;
  readonly valueLabel: string;
  readonly reason: string;
}

export interface IntakeSuggestionSet {
  readonly topicSlug?: string;
  readonly materialType?: MaterialTypeId;
  readonly questionTypeSlugs?: readonly string[];
  readonly tagNames?: readonly string[];
  readonly suggestions: readonly IntakeSuggestion[];
}

interface KeywordRule<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly keywords: readonly string[];
}

const TOPIC_RULES: readonly KeywordRule<string>[] = [
  rule("grassroots-governance", "基层治理", ["基层", "社区", "网格", "街道", "群众身边", "治理资源"]),
  rule("rural-revitalization", "乡村振兴", ["乡村", "农村", "农民", "产业振兴", "农业", "村"]),
  rule("digital-government", "数字政府", ["数字", "数据", "一网通办", "跨域通办", "政务服务", "智慧治理"]),
  rule("public-services", "民生服务", ["民生", "养老", "医疗", "教育", "就业", "社保", "托育"]),
  rule("business-environment", "营商环境", ["营商", "市场主体", "放管服", "审批", "政务效率"]),
  rule("ecological-civilization", "生态文明", ["生态", "绿色", "环保", "污染", "双碳", "环境治理"]),
  rule("emergency-management", "应急管理", ["应急", "风险", "安全", "防灾", "韧性城市"]),
  rule("youth-development", "青年发展", ["青年", "就业创业", "基层奉献", "成长"]),
  rule("cultural-heritage", "文化传承", ["文化", "传承", "非遗", "文旅", "传统"]),
  rule("social-governance", "社会治理", ["社会治理", "矛盾", "多元共治", "法治", "德治", "自治"]),
  rule("high-quality-development", "高质量发展", ["高质量", "创新", "新质生产力", "产业升级", "区域协调"]),
  rule("common-prosperity", "共同富裕", ["共同富裕", "收入分配", "均等化", "城乡协调"]),
];

const MATERIAL_TYPE_RULES: readonly KeywordRule<MaterialTypeId>[] = [
  rule("problem", "问题", ["问题", "短板", "不足", "痛点", "难题"]),
  rule("cause", "原因", ["原因", "根源", "症结", "由于", "因为"]),
  rule("solution", "对策", ["对策", "建议", "路径", "推进", "完善", "加强", "提升"]),
  rule("case", "案例", ["案例", "例如", "某地", "经验", "实践"]),
  rule("golden-sentence", "金句", ["金句", "引用", "名言"]),
  rule("title-sentence", "标题句", ["标题", "小标题"]),
  rule("transition-sentence", "过渡句", ["一方面", "另一方面", "与此同时", "因此"]),
  rule("essay-framework", "文章框架", ["框架", "结构", "提纲"]),
  rule("argument", "分论点", ["分论点", "观点", "论点"]),
  rule("opening", "开头", ["开头", "开篇"]),
  rule("ending", "结尾", ["结尾", "收束", "升华"]),
  rule("standard-expression", "规范表达", ["规范表达", "机关文风", "表达"]),
];

const QUESTION_TYPE_RULES: readonly KeywordRule<string>[] = [
  rule("summary", "归纳概括", ["概括", "归纳", "表现", "特点", "要点"]),
  rule("countermeasure", "提出对策", ["对策", "建议", "路径", "推进", "完善", "加强", "提升"]),
  rule("analysis", "综合分析", ["分析", "原因", "影响", "启示", "理解", "关系"]),
  rule("implementation", "贯彻执行", ["贯彻", "执行", "落实", "方案", "通知", "倡议", "政务服务", "一网通办", "跨域通办"]),
  rule("essay", "申发论述", ["文章", "论证", "分论点", "开头", "结尾", "标题"]),
  rule("interview-analysis", "面试综合分析", ["面试"]),
];

const TAG_RULES: readonly KeywordRule<string>[] = [
  rule("网格化", "网格化", ["网格"]),
  rule("基层服务", "基层服务", ["基层", "群众身边"]),
  rule("数字政府", "数字政府", ["数字政府", "数字", "数据"]),
  rule("政务服务", "政务服务", ["政务服务", "一网通办", "跨域通办"]),
  rule("数据治理", "数据治理", ["数据"]),
  rule("产业振兴", "产业振兴", ["产业", "乡村振兴"]),
  rule("共同富裕", "共同富裕", ["共同富裕"]),
  rule("民生服务", "民生服务", ["民生", "养老", "医疗", "教育", "就业"]),
  rule("营商环境", "营商环境", ["营商", "市场主体"]),
  rule("生态文明", "生态文明", ["生态", "绿色", "环保"]),
  rule("应急管理", "应急管理", ["应急", "风险", "安全"]),
  rule("文化传承", "文化传承", ["文化", "传承", "非遗"]),
];

export function buildIntakeChecklist(material: MaterialDraft): readonly IntakeChecklistItem[] {
  return getMaterialQualityReport(material).checks.map((check) => ({
    id: check.id,
    label: check.label,
    passed: check.passed,
  }));
}

export function suggestIntakeMetadata(material: MaterialDraft): IntakeSuggestionSet {
  const text = getComparableText(material);
  const topic = findBestRule(TOPIC_RULES, text);
  const materialType = findBestRule(MATERIAL_TYPE_RULES, text);
  const questionTypeRules = QUESTION_TYPE_RULES.filter((item) => scoreRule(item, text) > 0);
  const questionTypes = questionTypeRules.map((item) => item.value);
  const tags = TAG_RULES.filter((item) => scoreRule(item, text) > 0)
    .map((item) => item.value)
    .slice(0, 6);
  const suggestions: IntakeSuggestion[] = [];

  if (topic) {
    suggestions.push({
      field: "topicSlug",
      label: "主题",
      valueLabel: topic.label,
      reason: "标题或正文包含相关主题词",
    });
  }

  if (materialType) {
    suggestions.push({
      field: "materialType",
      label: "素材类型",
      valueLabel: materialType.label,
      reason: "正文语气接近该素材类型",
    });
  }

  if (questionTypes.length > 0) {
    suggestions.push({
      field: "questionTypeSlugs",
      label: "适用题型",
      valueLabel: questionTypeRules.map((item) => item.label).join(" / "),
      reason: "按作答动词和题型关键词匹配",
    });
  }

  if (tags.length > 0) {
    suggestions.push({
      field: "tagNames",
      label: "标签",
      valueLabel: tags.join(" / "),
      reason: "从高频申论关键词提取",
    });
  }

  return {
    topicSlug: topic?.value,
    materialType: materialType?.value,
    questionTypeSlugs: questionTypes.length > 0 ? questionTypes : undefined,
    tagNames: tags.length > 0 ? tags : undefined,
    suggestions,
  };
}

export function buildPatchFromIntakeSuggestion(
  material: MaterialDraft,
  suggestionSet: IntakeSuggestionSet,
): MaterialPatch {
  const patch: {
    topicSlug?: string;
    materialType?: MaterialTypeId;
    questionTypeSlugs?: readonly string[];
    tagNames?: readonly string[];
  } = {};

  if (
    suggestionSet.topicSlug &&
    suggestionSet.topicSlug !== material.topicSlug &&
    material.topicSlug === "grassroots-governance" &&
    !matchesRuleValue(TOPIC_RULES, material.topicSlug, getComparableText(material))
  ) {
    patch.topicSlug = suggestionSet.topicSlug;
  }

  if (
    suggestionSet.materialType &&
    suggestionSet.materialType !== material.materialType &&
    material.materialType === "standard-expression"
  ) {
    patch.materialType = suggestionSet.materialType;
  }

  if (suggestionSet.questionTypeSlugs?.length) {
    const currentSpecific = material.questionTypeSlugs.filter((slug) => slug !== "general");
    const merged = uniqueValues([...currentSpecific, ...suggestionSet.questionTypeSlugs.filter((slug) => slug !== "general")]);

    if (!sameValues(merged, material.questionTypeSlugs)) {
      patch.questionTypeSlugs = merged.length > 0 ? merged : ["general"];
    }
  }

  if (suggestionSet.tagNames?.length) {
    const merged = uniqueValues([...material.tagNames, ...suggestionSet.tagNames]);

    if (!sameValues(merged, material.tagNames)) {
      patch.tagNames = merged;
    }
  }

  return patch;
}

export function getNextIntakeMaterialId(materials: readonly MaterialDraft[], currentId: string | null): string | null {
  const candidates = getWorkbenchCandidates(materials);

  if (candidates.length <= 1) {
    return null;
  }

  const currentIndex = candidates.findIndex((material) => material.id === currentId);

  if (currentIndex < 0) {
    return candidates[0]?.id ?? null;
  }

  return candidates[(currentIndex + 1) % candidates.length]?.id ?? null;
}

function rule<T extends string>(value: T, label: string, keywords: readonly string[]): KeywordRule<T> {
  return { value, label, keywords };
}

function findBestRule<T extends string>(rules: readonly KeywordRule<T>[], text: string): KeywordRule<T> | null {
  let bestRule: KeywordRule<T> | null = null;
  let bestScore = 0;

  for (const item of rules) {
    const score = scoreRule(item, text);

    if (score > bestScore) {
      bestScore = score;
      bestRule = item;
    }
  }

  return bestRule;
}

function scoreRule<T extends string>(ruleItem: KeywordRule<T>, text: string): number {
  return ruleItem.keywords.reduce((score, keyword) => (text.includes(keyword.toLowerCase()) ? score + 1 : score), 0);
}

function matchesRuleValue<T extends string>(
  rules: readonly KeywordRule<T>[],
  value: T,
  text: string,
): boolean {
  const ruleItem = rules.find((item) => item.value === value);
  return ruleItem ? scoreRule(ruleItem, text) > 0 : false;
}

function getComparableText(material: MaterialDraft): string {
  return `${material.title} ${material.contentMd} ${material.excerpt} ${material.source}`.toLowerCase();
}

function uniqueValues<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values.filter(Boolean))];
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}
