import { useEffect, useState } from "react";
import type {
  KnowledgeCard,
  LearningWorkspaceState,
  SourceDocument,
} from "../../domain/learning";

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
              ? <CardEditor card={selected as KnowledgeCard} workspace={workspace} onChange={onChange} />
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

function CardEditor({ card, workspace, onChange }: { card: KnowledgeCard; workspace: LearningWorkspaceState; onChange: (value: LearningWorkspaceState) => void }) {
  const sources = workspace.cardSources.filter((item) => item.cardId === card.id);
  const update = (patch: Partial<KnowledgeCard>) => onChange({ ...workspace, cards: workspace.cards.map((item) => item.id === card.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) });
  const verify = () => update({ lifecycle: "usable", verificationStatus: sources.length ? "source-verified" : "user-verified" });
  const addReview = () => {
    const review = workspace.reviewCards.find((item) => item.knowledgeCardId === card.id) ?? { id: `review-card-${card.id}`, knowledgeCardId: card.id, mode: "key-point-recall" as const, promptMd: card.title, answerMd: card.contentMd, nextReviewAt: null, lastReviewedAt: null, ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 };
    onChange({ ...workspace, cards: workspace.cards.map((item) => item.id === card.id ? { ...item, reviewEnabled: true, updatedAt: new Date().toISOString() } : item), reviewCards: [review, ...workspace.reviewCards.filter((item) => item.id !== review.id)] });
  };
  return <div className="knowledge-form"><input className="knowledge-title" value={card.title} onChange={(event) => update({ title: event.target.value })} /><textarea value={card.contentMd} onChange={(event) => update({ contentMd: event.target.value })} /><div className="trace-panel"><strong>来源追溯</strong>{sources.length ? sources.map((source,index) => <span key={`${source.cardId}-${index}`}>{source.attemptId ? "来自训练作答" : source.sourceDocumentId ? "来自资料摘录" : "手动创建"}</span>) : <span>暂无结构化来源，请人工核验后再使用。</span>}</div><div className="knowledge-actions"><span>{cardStatus(card)}</span><div><button type="button" className="ghost-button" disabled={card.verificationStatus !== "unverified"} onClick={verify}>确认可使用</button><button type="button" className="primary-button" disabled={card.verificationStatus === "unverified" || card.reviewEnabled} onClick={addReview}>{card.reviewEnabled ? "已加入复习" : "加入复习"}</button></div></div></div>;
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
