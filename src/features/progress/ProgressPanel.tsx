import type { LearningWorkspaceState } from "../../domain/learning";
import type { MaterialDraft } from "../materials/materialModel";
import type { ReviewLog } from "../review/reviewSession";

export function ProgressPanel({ materials, workspace, reviewLogs, onOpenPractice, onOpenReview }: {
  materials: readonly MaterialDraft[]; workspace: LearningWorkspaceState; reviewLogs: readonly ReviewLog[];
  onOpenPractice: () => void; onOpenReview: () => void;
}) {
  const completed = workspace.exercises.filter((item) => item.status === "completed").length;
  const usableCards = workspace.cards.filter((item) => item.lifecycle === "usable" || item.lifecycle === "core").length;
  const usedCards = new Set(workspace.cardUsages.map((item) => item.cardId)).size;
  const difficult = reviewLogs.filter((item) => item.rating === "again" || item.rating === "hard").length;
  const topicCounts = new Map<string, number>();
  for (const card of workspace.cards) topicCounts.set(card.topicSlug, (topicCounts.get(card.topicSlug) ?? 0) + 1);
  const weakest = [...topicCounts.entries()].sort((a, b) => a[1] - b[1]).slice(0, 5);

  return <section className="feature-workspace progress-workspace"><header className="workspace-header"><div><p className="eyebrow">PROGRESS</p><h1>看见能力变化，也看见下一步。</h1></div></header><div className="progress-metrics"><Metric label="完成练习" value={completed} hint={`共 ${workspace.exercises.length} 题`} /><Metric label="可用卡片" value={usableCards} hint={`总卡片 ${workspace.cards.length}`} /><Metric label="真实调用" value={usedCards} hint="在作答中使用过" /><Metric label="困难复习" value={difficult} hint={`日志 ${reviewLogs.length}`} /></div><div className="progress-grid"><section className="feature-panel"><div className="panel-title-row"><h2>主题覆盖薄弱项</h2><button type="button" className="ghost-button" onClick={onOpenPractice}>创建训练</button></div>{weakest.length ? weakest.map(([slug,count]) => <button type="button" className="progress-row" key={slug} onClick={onOpenPractice}><span>{slug || "未分类"}</span><strong>{count} 张</strong></button>) : <div className="empty-list"><strong>还没有知识卡数据</strong><span>完成一次练习并提取卡片后，这里会生成建议。</span></div>}</section><section className="feature-panel"><div className="panel-title-row"><h2>训练闭环</h2><button type="button" className="ghost-button" onClick={onOpenReview}>去复习</button></div><div className="funnel-list"><span>素材 {materials.filter((item) => item.status !== "archived").length}</span><span>知识卡 {workspace.cards.length}</span><span>已验证 {workspace.cards.filter((item) => item.verificationStatus !== "unverified").length}</span><span>已调用 {workspace.cardUsages.length}</span></div></section></div></section>;
}

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>; }
