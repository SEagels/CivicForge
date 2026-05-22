import type { BuiltinMaterialType, BuiltinQuestionType, BuiltinTopic } from "./types";

export const BUILTIN_TOPICS = [
  { slug: "grassroots-governance", name: "基层治理", description: "基层组织、社区治理、网格化服务等素材。", sortOrder: 10 },
  { slug: "rural-revitalization", name: "乡村振兴", description: "产业、人才、文化、生态、组织振兴相关素材。", sortOrder: 20 },
  { slug: "digital-government", name: "数字政府", description: "政务服务数字化、数据治理、智慧治理相关素材。", sortOrder: 30 },
  { slug: "public-services", name: "民生服务", description: "教育、医疗、养老、就业、社保等民生议题。", sortOrder: 40 },
  { slug: "business-environment", name: "营商环境", description: "放管服、市场主体、政务效率、法治化营商环境。", sortOrder: 50 },
  { slug: "ecological-civilization", name: "生态文明", description: "绿色发展、环境治理、双碳、生态保护。", sortOrder: 60 },
  { slug: "emergency-management", name: "应急管理", description: "风险防范、基层应急、公共安全、韧性城市。", sortOrder: 70 },
  { slug: "youth-development", name: "青年发展", description: "青年成长、就业创业、基层奉献、责任担当。", sortOrder: 80 },
  { slug: "cultural-heritage", name: "文化传承", description: "传统文化、文化创新、公共文化服务。", sortOrder: 90 },
  { slug: "social-governance", name: "社会治理", description: "多元共治、法治德治自治、社会矛盾化解。", sortOrder: 100 },
  { slug: "high-quality-development", name: "高质量发展", description: "创新驱动、产业升级、新质生产力、区域协调。", sortOrder: 110 },
  { slug: "common-prosperity", name: "共同富裕", description: "收入分配、公共服务均等化、区域城乡协调。", sortOrder: 120 },
] as const satisfies readonly BuiltinTopic[];

export const BUILTIN_MATERIAL_TYPES = [
  { id: "problem", slug: "problem", name: "问题", description: "用于描述现象、短板、痛点。", sortOrder: 10 },
  { id: "cause", slug: "cause", name: "原因", description: "用于分析问题成因。", sortOrder: 20 },
  { id: "solution", slug: "solution", name: "对策", description: "用于沉淀政策建议和行动路径。", sortOrder: 30 },
  { id: "case", slug: "case", name: "案例", description: "用于保存典型地区、人物、政策实践。", sortOrder: 40 },
  { id: "standard-expression", slug: "standard-expression", name: "规范表达", description: "用于积累机关文风表达。", sortOrder: 50 },
  { id: "golden-sentence", slug: "golden-sentence", name: "金句", description: "用于积累高质量引用句。", sortOrder: 60 },
  { id: "title-sentence", slug: "title-sentence", name: "标题句", description: "用于文章标题或小标题。", sortOrder: 70 },
  { id: "transition-sentence", slug: "transition-sentence", name: "过渡句", description: "用于段落衔接和结构推进。", sortOrder: 80 },
  { id: "essay-framework", slug: "essay-framework", name: "文章框架", description: "用于申发论述结构模板。", sortOrder: 90 },
  { id: "argument", slug: "argument", name: "分论点", description: "用于保存可展开论证的观点。", sortOrder: 100 },
  { id: "opening", slug: "opening", name: "开头", description: "用于文章开篇表达。", sortOrder: 110 },
  { id: "ending", slug: "ending", name: "结尾", description: "用于文章收束升华。", sortOrder: 120 },
] as const satisfies readonly BuiltinMaterialType[];

export const BUILTIN_QUESTION_TYPES = [
  { slug: "summary", name: "归纳概括", description: "用于概括材料要点、问题、表现。", sortOrder: 10 },
  { slug: "countermeasure", name: "提出对策", description: "用于提出解决路径和操作性建议。", sortOrder: 20 },
  { slug: "analysis", name: "综合分析", description: "用于解释观点、现象、关系和启示。", sortOrder: 30 },
  { slug: "implementation", name: "贯彻执行", description: "用于公文、应用文和执行类表达。", sortOrder: 40 },
  { slug: "essay", name: "申发论述", description: "用于大作文论点、结构和论证素材。", sortOrder: 50 },
  { slug: "interview-analysis", name: "面试综合分析", description: "用于面试观点分析和表达。", sortOrder: 60 },
  { slug: "general", name: "通用素材", description: "适用于多个题型的基础素材。", sortOrder: 70 },
] as const satisfies readonly BuiltinQuestionType[];
