import type { LearningWorkspaceState, ReviewCardMode } from "../../domain/learning";
import type { MaterialDraft } from "../materials/materialModel";
import { REVIEW_MODE_LABELS } from "../review/knowledgeReview";
import type { ReviewLog } from "../review/reviewSession";
import type { RewriteLog } from "../rewrite/rewriteWorkshop";

interface ProgressPanelProps {
  readonly materials: readonly MaterialDraft[];
  readonly workspace: LearningWorkspaceState;
  readonly reviewLogs: readonly ReviewLog[];
  readonly onOpenPractice: () => void;
  readonly onOpenReview: () => void;
  readonly onOpenKnowledgeCard: (cardId: string) => void;
  readonly rewriteLogs: readonly RewriteLog[];
}

export function ProgressPanel({ materials, workspace, reviewLogs, rewriteLogs, onOpenPractice, onOpenReview, onOpenKnowledgeCard }: ProgressPanelProps) {
  const completed = workspace.exercises.filter((item) => item.status === "completed").length;
  const usableCards = workspace.cards.filter((item) => item.lifecycle === "usable" || item.lifecycle === "core").length;
  const usedCards = new Set(workspace.cardUsages.map((item) => item.cardId)).size;
  const weakReviewCards = workspace.reviewCards
    .filter((item) => item.lapses > 0 || item.ease < 2.3)
    .sort((left, right) => right.lapses - left.lapses || left.ease - right.ease);
  const legacyDifficult = reviewLogs.filter((item) => item.rating === "again" || item.rating === "hard").length;
  const topicCounts = new Map<string, number>();
  for (const card of workspace.cards) topicCounts.set(card.topicSlug, (topicCounts.get(card.topicSlug) ?? 0) + 1);
  const weakestTopics = [...topicCounts.entries()].sort((a, b) => a[1] - b[1]).slice(0, 5);
  const modeCounts = countReviewModes(workspace);

  return <section className="feature-workspace progress-workspace">
    <header className="workspace-header"><div><p className="eyebrow">PROGRESS</p><h1>看见能力变化，也看见下一步。</h1></div></header>
    <div className="progress-metrics">
      <Metric label="完成训练" value={completed} hint={`共 ${workspace.exercises.length} 题`} />
      <Metric label="可用卡片" value={usableCards} hint={`总卡片 ${workspace.cards.length}`} />
      <Metric label="真实调用" value={usedCards} hint={`调用记录 ${workspace.cardUsages.length}`} />
      <Metric label="待加强复习" value={weakReviewCards.length || legacyDifficult} hint={`复习卡 ${workspace.reviewCards.length}`} />
    </div>
    <div className="progress-grid">
      <section className="feature-panel">
        <div className="panel-title-row"><h2>当前弱项</h2><button type="button" className="ghost-button" onClick={onOpenReview}>去复习</button></div>
        {weakReviewCards.length ? weakReviewCards.slice(0, 6).map((review) => {
          const card = workspace.cards.find((item) => item.id === review.knowledgeCardId);
          return card ? <button type="button" className="progress-row" key={review.id} onClick={() => onOpenKnowledgeCard(card.id)}>
            <span>{card.title}<small>{REVIEW_MODE_LABELS[review.mode]}</small></span><strong>Again {review.lapses}</strong>
          </button> : null;
        }) : <Empty title="还没有明显弱项" detail="完成知识卡复习后，Again 和低熟练度项目会出现在这里。" />}
      </section>
      <section className="feature-panel">
        <div className="panel-title-row"><h2>主题覆盖薄弱项</h2><button type="button" className="ghost-button" onClick={onOpenPractice}>创建训练</button></div>
        {weakestTopics.length ? weakestTopics.map(([slug, count]) => <button type="button" className="progress-row" key={slug} onClick={onOpenPractice}><span>{slug || "未分类"}</span><strong>{count} 张</strong></button>) : <Empty title="还没有知识卡数据" detail="完成一次训练并提取卡片后，这里会生成建议。" />}
      </section>
      <section className="feature-panel">
        <div className="panel-title-row"><h2>复习模式覆盖</h2><button type="button" className="ghost-button" onClick={onOpenReview}>开始回忆</button></div>
        {modeCounts.length ? modeCounts.map(([mode, count]) => <button type="button" className="progress-row" key={mode} onClick={onOpenReview}><span>{REVIEW_MODE_LABELS[mode]}</span><strong>{count} 张</strong></button>) : <Empty title="还没有复习卡" detail="验证知识卡后，把它加入任一种主动回忆模式。" />}
      </section>
      <section className="feature-panel">
        <div className="panel-title-row"><h2>学习闭环</h2></div>
        <div className="funnel-list"><span>素材 {materials.filter((item) => item.status !== "archived").length}</span><span>知识卡 {workspace.cards.length}</span><span>已验证 {workspace.cards.filter((item) => item.verificationStatus !== "unverified").length}</span><span>已调用 {workspace.cardUsages.length}</span></div>
      </section>
      <section className="feature-panel legacy-history-panel">
        <div className="panel-title-row"><h2>历史改写记录</h2><span>{rewriteLogs.length} 条</span></div>
        {rewriteLogs.length ? <div className="legacy-history-list">{rewriteLogs.map((log) => (
          <details key={log.id}>
            <summary><span>{log.targetId}</span><strong>{new Date(log.createdAt).toLocaleDateString("zh-CN")}</strong></summary>
            <div><small>原文</small><p>{log.originalText}</p><small>修改稿</small><p>{log.resultText || "未保存修改结果"}</p></div>
          </details>
        ))}</div> : <Empty title="没有旧版改写记录" detail="新版表达修改统一在训练的复盘阶段完成，并保留初稿与修改稿。" />}
      </section>
    </div>
  </section>;
}

function countReviewModes(workspace: LearningWorkspaceState): readonly [ReviewCardMode, number][] {
  const counts = new Map<ReviewCardMode, number>();
  for (const card of workspace.reviewCards) counts.set(card.mode, (counts.get(card.mode) ?? 0) + 1);
  return [...counts.entries()];
}

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>; }
function Empty({ title, detail }: { title: string; detail: string }) { return <div className="empty-list"><strong>{title}</strong><span>{detail}</span></div>; }
