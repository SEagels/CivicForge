import type { MaterialDraft } from "../materials/materialModel";
import type { RewriteLog } from "../rewrite/rewriteWorkshop";
import { getDashboardStats } from "../taxonomy/taxonomyStats";

export interface DashboardPanelProps {
  readonly materials: readonly MaterialDraft[];
  readonly rewriteLogs: readonly RewriteLog[];
  readonly storageMode: string;
  readonly onOpenLibrary: () => void;
  readonly onOpenReview: () => void;
  readonly onOpenRewrite: () => void;
  readonly onOpenImportExport: () => void;
}

export function DashboardPanel({
  materials,
  rewriteLogs,
  storageMode,
  onOpenLibrary,
  onOpenReview,
  onOpenRewrite,
  onOpenImportExport,
}: DashboardPanelProps) {
  const stats = getDashboardStats(materials, rewriteLogs.length);
  const recentMaterials = [...materials]
    .filter((material) => material.status === "active" || material.status === "draft")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 5);

  return (
    <section className="dashboard-workspace" aria-label="Dashboard">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">本地申论素材工作台</p>
          <h1>今晚先把素材取出来，再把表达磨利。</h1>
        </div>
        <div className="storage-chip">
          <span>存储</span>
          <strong>{storageMode}</strong>
        </div>
      </header>

      <div className="dashboard-stats">
        <StatCard label="素材" value={stats.activeCount} hint={`归档 ${stats.archivedCount}`} />
        <StatCard label="今日复习" value={stats.dueReviewCount} hint={`已启用 ${stats.reviewEnabledCount}`} />
        <StatCard label="收藏" value={stats.favoriteCount} hint="高频调用" />
        <StatCard label="Rewrite" value={stats.rewriteLogCount} hint={`标签 ${stats.tagCount}`} />
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <div className="panel-title-row">
            <h2>快速进入</h2>
          </div>
          <div className="quick-actions">
            <button type="button" className="primary-button" onClick={onOpenLibrary}>
              新建或整理素材
            </button>
            <button type="button" className="ghost-button" onClick={onOpenReview}>
              开始到期复习
            </button>
            <button type="button" className="ghost-button" onClick={onOpenRewrite}>
              打开 Rewrite 工坊
            </button>
            <button type="button" className="ghost-button" onClick={onOpenImportExport}>
              导入 / 导出
            </button>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-title-row">
            <h2>最近更新</h2>
          </div>
          {recentMaterials.length > 0 ? (
            <div className="recent-list">
              {recentMaterials.map((material) => (
                <article key={material.id} className="recent-item">
                  <strong>{material.title}</strong>
                  <span>{formatDate(material.updatedAt)}</span>
                  <p>{material.excerpt || "暂无摘要"}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-list">
              <strong>还没有素材</strong>
              <span>从素材库新建一条规范表达，Dashboard 就会开始记录。</span>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function StatCard({ label, value, hint }: { readonly label: string; readonly value: number; readonly hint: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
