import type { MaterialStatus, MaterialTypeId, ReviewRating } from "../../domain/enums";
import {
  applyReviewRating,
  createDefaultReviewSchedule,
  type ReviewSchedule,
} from "../review/reviewScheduler";

export interface MaterialDraft extends ReviewSchedule {
  readonly id: string;
  readonly title: string;
  readonly contentMd: string;
  readonly excerpt: string;
  readonly materialType: MaterialTypeId;
  readonly topicSlug: string;
  readonly tagNames: readonly string[];
  readonly questionTypeSlugs: readonly string[];
  readonly source: string;
  readonly status: MaterialStatus;
  readonly favorite: boolean;
  readonly reviewEnabled: boolean;
  readonly updatedAt: string;
}

export interface MaterialState {
  readonly materials: readonly MaterialDraft[];
  readonly selectedId: string | null;
}

export type MaterialPatch = Partial<
  Pick<
    MaterialDraft,
    | "title"
    | "contentMd"
    | "excerpt"
    | "materialType"
    | "topicSlug"
    | "tagNames"
    | "questionTypeSlugs"
    | "source"
    | "favorite"
    | "reviewEnabled"
  >
>;

const nowIso = () => new Date().toISOString();

export function createInitialMaterialState(): MaterialState {
  const materials: readonly MaterialDraft[] = [
    {
      id: "mat-grid-governance",
      title: "基层治理：小事不出网格",
      contentMd:
        "把治理资源下沉到网格，把服务触角延伸到群众身边，推动小事不出网格、大事不出街道、矛盾不上交。",
      excerpt: "治理资源下沉，服务触角前移。",
      materialType: "standard-expression",
      topicSlug: "grassroots-governance",
      tagNames: ["网格化", "基层服务"],
      questionTypeSlugs: ["implementation", "essay"],
      source: "日常积累",
      status: "active",
      favorite: true,
      reviewEnabled: true,
      ...createDefaultReviewSchedule(),
      updatedAt: "2026-05-22T00:00:00.000Z",
    },
    {
      id: "mat-rural-case",
      title: "乡村振兴：产业兴旺带动共同富裕",
      contentMd:
        "以特色产业为牵引，把资源优势转化为发展优势，让农民更多分享产业增值收益。",
      excerpt: "特色产业连接农民增收。",
      materialType: "case",
      topicSlug: "rural-revitalization",
      tagNames: ["产业振兴", "共同富裕"],
      questionTypeSlugs: ["analysis", "essay"],
      source: "政策材料",
      status: "active",
      favorite: false,
      reviewEnabled: true,
      ...createDefaultReviewSchedule(),
      updatedAt: "2026-05-22T00:00:00.000Z",
    },
    {
      id: "mat-digital-gov",
      title: "数字政府：数据多跑路",
      contentMd:
        "推进政务服务一网通办、跨域通办，以数据流转压缩办事链条，以流程再造提升治理效能。",
      excerpt: "数据流转压缩办事链条。",
      materialType: "solution",
      topicSlug: "digital-government",
      tagNames: ["政务服务", "流程再造"],
      questionTypeSlugs: ["countermeasure", "implementation"],
      source: "申论范文",
      status: "active",
      favorite: false,
      reviewEnabled: true,
      ...createDefaultReviewSchedule(),
      updatedAt: "2026-05-22T00:00:00.000Z",
    },
  ];

  return {
    materials,
    selectedId: materials[0].id,
  };
}

export function getActiveMaterials(state: MaterialState): readonly MaterialDraft[] {
  return state.materials.filter((material) => material.status === "active" || material.status === "draft");
}

export function getSelectedMaterial(state: MaterialState): MaterialDraft | null {
  return state.materials.find((material) => material.id === state.selectedId) ?? null;
}

export function createMaterial(state: MaterialState): MaterialState {
  const id = `mat-${Date.now().toString(36)}`;
  const material: MaterialDraft = {
    id,
    title: "未命名素材",
    contentMd: "",
    excerpt: "",
    materialType: "standard-expression",
    topicSlug: "grassroots-governance",
    tagNames: [],
    questionTypeSlugs: ["general"],
    source: "",
    status: "draft",
    favorite: false,
    reviewEnabled: true,
    ...createDefaultReviewSchedule(),
    updatedAt: nowIso(),
  };

  return {
    materials: [material, ...state.materials],
    selectedId: id,
  };
}

export function selectMaterial(state: MaterialState, selectedId: string): MaterialState {
  if (!state.materials.some((material) => material.id === selectedId)) {
    return state;
  }

  return {
    ...state,
    selectedId,
  };
}

export function updateSelectedMaterial(state: MaterialState, patch: MaterialPatch): MaterialState {
  if (!state.selectedId) {
    return state;
  }

  return {
    ...state,
    materials: state.materials.map((material) =>
      material.id === state.selectedId
        ? {
            ...material,
            ...patch,
            status: material.status === "draft" && hasMeaningfulContent(patch) ? "active" : material.status,
            updatedAt: nowIso(),
          }
        : material,
    ),
  };
}

export function archiveSelectedMaterial(state: MaterialState): MaterialState {
  if (!state.selectedId) {
    return state;
  }

  const materials = state.materials.map((material) =>
    material.id === state.selectedId
      ? {
          ...material,
          status: "archived" as const,
          updatedAt: nowIso(),
        }
      : material,
  );
  const nextSelected = materials.find((material) => material.status === "active" || material.status === "draft");

  return {
    materials,
    selectedId: nextSelected?.id ?? null,
  };
}

export function reviewMaterial(
  state: MaterialState,
  materialId: string,
  rating: ReviewRating,
  reviewedAt: Date = new Date(),
): MaterialState {
  return {
    ...state,
    materials: state.materials.map((material) =>
      material.id === materialId ? applyReviewRating(material, rating, reviewedAt) : material,
    ),
  };
}

export function normalizeMaterialState(state: MaterialState): MaterialState {
  const materials = state.materials.map(normalizeMaterialDraft);
  const selectedExists = materials.some((material) => material.id === state.selectedId);

  return {
    materials,
    selectedId: selectedExists ? state.selectedId : materials[0]?.id ?? null,
  };
}

function normalizeMaterialDraft(material: MaterialDraft): MaterialDraft {
  return {
    ...createDefaultReviewSchedule(),
    ...material,
  };
}

function hasMeaningfulContent(patch: MaterialPatch): boolean {
  return Boolean(patch.title?.trim() || patch.contentMd?.trim());
}
