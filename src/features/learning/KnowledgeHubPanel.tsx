import { useEffect, useState } from "react";
import type {
  KnowledgeCard,
  LearningWorkspaceState,
  ReviewCardMode,
  SourceDocument,
} from "../../domain/learning";
import {
  BUILTIN_MATERIAL_TYPES,
  BUILTIN_QUESTION_TYPES,
  BUILTIN_TOPICS,
} from "../../domain/seeds";
import {
  buildKnowledgeCardChecklist,
  enableKnowledgeCardReview,
  findRelatedKnowledgeCards,
  verifyKnowledgeCard,
} from "./knowledgeCardWorkflow";

export type LibrarySection = "sources" | "cards" | "outputs";

export function KnowledgeHubPanel({
  section,
  focusedId,
  workspace,
  onSectionChange,
  onChange,
}: {
  readonly section: Exclude<LibrarySection, "outputs">;
  readonly focusedId: string | null;
  readonly workspace: LearningWorkspaceState;
  readonly onSectionChange: (section: LibrarySection) => void;
  readonly onChange: (workspace: LearningWorkspaceState) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = section === "sources" ? workspace.sources : workspace.cards;
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  useEffect(() => {
    if (focusedId && items.some((item) => item.id === focusedId)) {
      setSelectedId(focusedId);
    }
  }, [focusedId, items]);

  return (
    <section className="feature-workspace knowledge-workspace">
      <header className="workspace-header">
        <div><p className="eyebrow">LIBRARY</p><h1>资料有出处，卡片可验证，成品能调用。</h1></div>
        <LibraryTabs value={section} onChange={onSectionChange} />
      </header>
      <div className="knowledge-layout">
        <aside className="feature-panel knowledge-list">
          <div className="panel-title-row">
            <h2>{section === "sources" ? "资料收件箱" : "知识卡片"}</h2>
            {section === "sources" ? <button type="button" className="primary-button" onClick={() => onChange(addBlankSource(workspace))}>新建</button> : null}
          </div>
          {items.map((item) => (
            <button type="button" key={item.id} className={selected?.id === item.id ? "knowledge-list-item active" : "knowledge-list-item"} onClick={() => setSelectedId(item.id)}>
              <strong>{item.title || "未命名"}</strong>
              <small>{"publisher" in item ? item.publisher || "待补来源" : cardStatus(item)}</small>
            </button>
          ))}
          {!items.length ? <div className="empty-list"><strong>这里还是空的</strong><span>{section === "sources" ? "从今天页快速记录，或新建一份资料。" : "从资料摘录或训练复盘中提取卡片。"}</span></div> : null}
        </aside>
        <section className="feature-panel knowledge-editor">
          {selected && section === "sources"
            ? <SourceEditor source={selected as SourceDocument} workspace={workspace} onChange={onChange} />
            : selected
              ? <CardEditor card={selected as KnowledgeCard} workspace={workspace} onChange={onChange} onSelectCard={setSelectedId} />
              : <div className="empty-stage"><p>选择一项开始整理。</p></div>}
        </section>
      </div>
    </section>
  );
}

export function LibraryTabs({ value, onChange }: { value: LibrarySection; onChange: (value: LibrarySection) => void }) {
  return <div className="library-tabs">{(["sources","cards","outputs"] as const).map((item) => <button type="button" key={item} className={value === item ? "active" : ""} onClick={() => onChange(item)}>{item === "sources" ? "资料收件箱" : item === "cards" ? "知识卡" : "成品"}</button>)}</div>;
}

function SourceEditor({ source, workspace, onChange }: { source: SourceDocument; workspace: LearningWorkspaceState; onChange: (value: LearningWorkspaceState) => void }) {
  const update = (patch: Partial<SourceDocument>) => onChange({ ...workspace, sources: workspace.sources.map((item) => item.id === source.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) });
  const extract = () => {
    if (!source.contentMd.trim()) return;
    const now = new Date();
    const card: KnowledgeCard = { id: `card-${now.getTime()}`, title: source.title || "资料摘录", contentMd: source.contentMd, summary: source.contentMd.replace(/\s+/g," ").slice(0,100), cardType: "standard-expression", topicSlug: "", lifecycle: "refining", verificationStatus: "unverified", core: false, reviewEnabled: false, sourceLabel: source.publisher || source.sourceUri || "资料收件箱", tagNames: [], questionTypeSlugs: [], createdAt: now.toISOString(), updatedAt: now.toISOString() };
    onChange({ ...workspace, cards: [card, ...workspace.cards], cardSources: [{ cardId: card.id, sourceDocumentId: source.id, sourceExcerptId: null, attemptId: null, relationType: "extracted-from", createdAt: now.toISOString() }, ...workspace.cardSources], sources: workspace.sources.map((item) => item.id === source.id ? { ...item, status: "active", updatedAt: now.toISOString() } : item) });
  };
  return <div className="knowledge-form"><input className="knowledge-title" value={source.title} onChange={(event) => update({ title: event.target.value })} placeholder="资料标题" /><div className="knowledge-meta-row"><input value={source.publisher} onChange={(event) => update({ publisher: event.target.value })} placeholder="发布机构 / 来源" /><input value={source.sourceUri} onChange={(event) => update({ sourceUri: event.target.value })} placeholder="来源网址或文件位置" /></div><textarea value={source.contentMd} onChange={(event) => update({ contentMd: event.target.value })} placeholder="粘贴资料正文…" /><div className="knowledge-actions"><span>状态：{source.status === "draft" ? "待整理" : "已整理"}</span><button type="button" className="primary-button" disabled={!source.contentMd.trim()} onClick={extract}>提取为待验证卡片</button></div></div>;
}

function CardEditor({ card, workspace, onChange, onSelectCard }: { card: KnowledgeCard; workspace: LearningWorkspaceState; onChange: (value: LearningWorkspaceState) => void; onSelectCard: (cardId: string) => void }) {
  const sources = workspace.cardSources.filter((item) => item.cardId === card.id);
  const usages = workspace.cardUsages.filter((item) => item.cardId === card.id);
  const checklist = buildKnowledgeCardChecklist(card, workspace);
  const readyToVerify = checklist.every((item) => item.passed);
  const relatedCards = findRelatedKnowledgeCards(card, workspace.cards);
  const [reviewMode, setReviewMode] = useState<ReviewCardMode>("key-point-recall");
  const update = (patch: Partial<KnowledgeCard>) => onChange({ ...workspace, cards: workspace.cards.map((item) => item.id === card.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) });
  const toggleQuestionType = (slug: string, checked: boolean) => update({
    questionTypeSlugs: checked
      ? [...new Set([...card.questionTypeSlugs, slug])]
      : card.questionTypeSlugs.filter((item) => item !== slug),
  });

  return <div className="knowledge-form">
    <input className="knowledge-title" value={card.title} onChange={(event) => update({ title: event.target.value })} />
    <div className="card-metadata-grid">
      <label>主题<select value={card.topicSlug} onChange={(event) => update({ topicSlug: event.target.value })}><option value="">待分类</option>{BUILTIN_TOPICS.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
      <label>素材类型<select value={card.cardType} onChange={(event) => update({ cardType: event.target.value as KnowledgeCard["cardType"] })}>{BUILTIN_MATERIAL_TYPES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="card-source-field">来源说明<input value={card.sourceLabel} onChange={(event) => update({ sourceLabel: event.target.value })} placeholder="发布机构、文件或训练名称" /></label>
    </div>
    <fieldset className="card-question-types"><legend>适用题型</legend>{BUILTIN_QUESTION_TYPES.map((item) => <label key={item.slug}><input type="checkbox" checked={card.questionTypeSlugs.includes(item.slug)} onChange={(event) => toggleQuestionType(item.slug, event.target.checked)} />{item.name}</label>)}</fieldset>
    <textarea value={card.contentMd} onChange={(event) => update({ contentMd: event.target.value, summary: event.target.value.replace(/\s+/g, " ").slice(0, 100) })} />
    <section className="card-quality-panel" aria-label="知识卡质量检查">
      <div className="panel-title-row"><strong>可使用检查</strong><span>{checklist.filter((item) => item.passed).length} / {checklist.length}</span></div>
      <div className="card-checklist">{checklist.map((item) => <div key={item.id} className={item.passed ? "passed" : "pending"}><span>{item.passed ? "通过" : "待补"}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div></div>)}</div>
    </section>
    <div className="trace-grid">
      <div className="trace-panel"><strong>来源追溯</strong>{sources.length ? sources.map((source,index) => <span key={`${source.cardId}-${index}`}>{describeCardSource(source, workspace)}</span>) : <span>{card.sourceLabel || "暂无结构化来源，请补充来源说明。"}</span>}</div>
      <div className="trace-panel"><strong>真实调用 · {usages.length}</strong>{usages.length ? usages.slice(0, 5).map((usage) => <span key={usage.id}>{describeCardUsage(usage.attemptId, workspace)} · {usageKindLabel(usage.usageKind)}</span>) : <span>尚未在训练作答中调用。</span>}</div>
    </div>
    <section className="related-knowledge-panel" aria-label="相关知识">
      <div className="panel-title-row"><strong>相关知识</strong><span>{relatedCards.length} 条</span></div>
      {relatedCards.length ? <div className="related-card-list">{relatedCards.map((item) => (
        <button type="button" key={item.card.id} onClick={() => onSelectCard(item.card.id)} title={item.reasons.join("、")}>
          <span><strong>{item.card.title}</strong><small>{item.reasons.join(" · ")}</small></span>
          <b>{item.score}</b>
        </button>
      ))}</div> : <div className="empty-list compact"><span>补齐主题、题型和标签后，这里会出现可共同调用的知识卡。</span></div>}
    </section>
    <div className="knowledge-actions"><span>{cardStatus(card)}</span><div className="review-action-group"><select aria-label="复习模式" value={reviewMode} onChange={(event) => setReviewMode(event.target.value as ReviewCardMode)}>{REVIEW_MODE_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button type="button" className="ghost-button" disabled={card.verificationStatus !== "unverified" || !readyToVerify} onClick={() => onChange(verifyKnowledgeCard(workspace, card.id))}>确认可使用</button><button type="button" className="primary-button" disabled={card.verificationStatus === "unverified"} onClick={() => onChange(enableKnowledgeCardReview(workspace, card.id, reviewMode))}>{card.reviewEnabled ? "增加复习卡" : "加入复习"}</button></div></div>
  </div>;
}

const REVIEW_MODE_OPTIONS: readonly { id: ReviewCardMode; label: string }[] = [
  { id: "key-point-recall", label: "要点回忆" },
  { id: "expression-recall", label: "表达复述" },
  { id: "case-application", label: "案例调用" },
  { id: "placement-recall", label: "位置调用" },
  { id: "micro-writing", label: "微型作答" },
];

function describeCardSource(source: LearningWorkspaceState["cardSources"][number], workspace: LearningWorkspaceState): string {
  if (source.attemptId) {
    const attempt = workspace.attempts.find((item) => item.id === source.attemptId);
    const exercise = workspace.exercises.find((item) => item.id === attempt?.exerciseId);
    return `训练：${exercise?.title || "历史作答"}`;
  }
  if (source.sourceDocumentId) {
    const document = workspace.sources.find((item) => item.id === source.sourceDocumentId);
    return `资料：${document?.title || "历史资料"}${document?.publisher ? ` · ${document.publisher}` : ""}`;
  }
  return "人工创建";
}

function describeCardUsage(attemptId: string, workspace: LearningWorkspaceState): string {
  const attempt = workspace.attempts.find((item) => item.id === attemptId);
  return workspace.exercises.find((item) => item.id === attempt?.exerciseId)?.title || "历史训练";
}

function usageKindLabel(kind: LearningWorkspaceState["cardUsages"][number]["usageKind"]): string {
  return { title: "标题", excerpt: "摘要", content: "正文", argument: "论点", evidence: "论据" }[kind];
}

function addBlankSource(workspace: LearningWorkspaceState): LearningWorkspaceState {
  const now = new Date();
  const source: SourceDocument = { id: `source-${now.getTime()}`, title: "", sourceType: "article", contentMd: "", sourceUri: "", publisher: "", publishedAt: null, status: "draft", createdAt: now.toISOString(), updatedAt: now.toISOString() };
  return { ...workspace, sources: [source, ...workspace.sources] };
}

function cardStatus(card: KnowledgeCard): string {
  if (card.lifecycle === "core") return "核心素材";
  if (card.verificationStatus === "unverified") return "待验证";
  if (card.reviewEnabled) return "可使用 · 已复习";
  return "可使用";
}
