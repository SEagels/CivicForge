import { useMemo, useState } from "react";
import { BUILTIN_QUESTION_TYPES } from "../../domain/seeds";
import type { CardUsage, FeedbackDimensions, KnowledgeCard, LearningWorkspaceState, PracticeStage } from "../../domain/learning";
import { insertKnowledgeCardIntoAttempt } from "../learning/knowledgeCardWorkflow";
import { createManualFeedback, nextPracticeStage } from "./practiceModel";

interface PracticePanelProps {
  readonly workspace: LearningWorkspaceState;
  readonly focusedExerciseId: string | null;
  readonly onChange: (state: LearningWorkspaceState) => void;
  readonly onCreate: () => void;
  readonly onExtractCard: (attemptId: string, content: string) => void;
}

const STAGES: readonly { id: PracticeStage; label: string }[] = [
  { id: "reading", label: "1 阅读材料" },
  { id: "outline", label: "2 提纲" },
  { id: "answer", label: "3 作答" },
  { id: "reflection", label: "4 复盘修改" },
];

export function PracticePanel({ workspace, focusedExerciseId, onChange, onCreate, onExtractCard }: PracticePanelProps) {
  const selected = workspace.exercises.find((item) => item.id === focusedExerciseId) ?? workspace.exercises[0] ?? null;
  const attempt = selected ? workspace.attempts.find((item) => item.exerciseId === selected.id) ?? null : null;
  const feedback = attempt ? workspace.feedback.find((item) => item.attemptId === attempt.id) : null;
  const [summary, setSummary] = useState(feedback?.summaryMd ?? "");
  const [suggestions, setSuggestions] = useState(feedback?.suggestionsMd ?? "");
  const [scores, setScores] = useState<FeedbackDimensions>(feedback?.dimensions ?? emptyScores());
  const [usageKind, setUsageKind] = useState<Extract<CardUsage["usageKind"], "content" | "argument" | "evidence">>("content");
  const wordCount = useMemo(() => (attempt?.answerMd ?? "").replace(/\s+/g, "").length, [attempt?.answerMd]);
  const callableCards = useMemo(
    () => workspace.cards
      .filter((item) => item.verificationStatus !== "unverified" && item.lifecycle !== "archived")
      .sort((left, right) => Number(right.core) - Number(left.core) || left.title.localeCompare(right.title, "zh-CN")),
    [workspace.cards],
  );

  if (!selected || !attempt) {
    return (
      <section className="feature-workspace practice-workspace">
        <header className="workspace-header"><div><p className="eyebrow">PRACTICE</p><h1>从一道题开始完整训练。</h1></div></header>
        <div className="empty-stage"><h2>还没有练习</h2><p>导入题目与材料，CivicForge 会保存阅读、提纲、作答和复盘全过程。</p><button type="button" className="primary-button" onClick={onCreate}>新建练习</button></div>
      </section>
    );
  }

  const updateExercise = (patch: Partial<typeof selected>) => onChange({
    ...workspace,
    exercises: workspace.exercises.map((item) => item.id === selected.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item),
  });
  const updateAttempt = (patch: Partial<typeof attempt>) => onChange({
    ...workspace,
    attempts: workspace.attempts.map((item) => item.id === attempt.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item),
  });
  const advance = () => updateExercise({ currentStage: nextPracticeStage(selected.currentStage), status: "active" });
  const saveFeedback = () => {
    const record = createManualFeedback(attempt.id, scores, summary, suggestions);
    onChange({
      ...workspace,
      exercises: workspace.exercises.map((item) => item.id === selected.id ? { ...item, status: "completed", updatedAt: record.createdAt } : item),
      attempts: workspace.attempts.map((item) => item.id === attempt.id ? { ...item, status: "revised", finishedAt: record.createdAt, updatedAt: record.createdAt } : item),
      feedback: [record, ...workspace.feedback.filter((item) => item.attemptId !== attempt.id)],
    });
  };

  return (
    <section className="feature-workspace practice-workspace">
      <header className="workspace-header practice-header">
        <input className="practice-title-input" value={selected.title} onChange={(event) => updateExercise({ title: event.target.value })} aria-label="练习标题" />
        <button type="button" className="ghost-button" onClick={onCreate}>新建练习</button>
      </header>
      <div className="practice-stage-tabs">
        {STAGES.map((stage) => <button type="button" key={stage.id} className={selected.currentStage === stage.id ? "active" : ""} onClick={() => updateExercise({ currentStage: stage.id })}>{stage.label}</button>)}
      </div>
      <div className="practice-layout">
        <aside className="practice-meta feature-panel">
          <label>题型<select value={selected.questionTypeSlug} onChange={(event) => updateExercise({ questionTypeSlug: event.target.value })}>{BUILTIN_QUESTION_TYPES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
          <label>字数限制<input type="number" value={selected.wordLimit ?? ""} onChange={(event) => updateExercise({ wordLimit: Number(event.target.value) || null })} /></label>
          <label>时间限制<input type="number" value={selected.timeLimitMinutes ?? ""} onChange={(event) => updateExercise({ timeLimitMinutes: Number(event.target.value) || null })} /></label>
          <small>内容会自动保存到本地。</small>
        </aside>
        <section className="practice-editor feature-panel">
          {selected.currentStage === "reading" ? <><h2>题目与给定资料</h2><textarea className="practice-writing-area" value={selected.promptMd} onChange={(event) => updateExercise({ promptMd: event.target.value })} placeholder="粘贴题目要求与给定资料…" /></> : null}
          {selected.currentStage === "outline" ? <><h2>作答提纲</h2><textarea className="practice-writing-area" value={attempt.outlineMd} onChange={(event) => updateAttempt({ outlineMd: event.target.value })} placeholder="先列总括句、要点和结构…" /></> : null}
          {selected.currentStage === "answer" ? <><div className="panel-title-row"><h2>正式作答</h2><span>{wordCount} / {selected.wordLimit ?? "不限"} 字</span></div><div className="answer-writing-layout"><textarea className="practice-writing-area" value={attempt.answerMd} onChange={(event) => updateAttempt({ answerMd: event.target.value, status: "in-progress" })} placeholder="在这里完成作答…" /><CallableCardShelf cards={callableCards} usageKind={usageKind} onUsageKind={setUsageKind} onInsert={(cardId) => onChange(insertKnowledgeCardIntoAttempt(workspace, cardId, attempt.id, usageKind))} /></div></> : null}
          {selected.currentStage === "reflection" ? <ReflectionEditor answer={attempt.answerMd} scores={scores} summary={summary} suggestions={suggestions} onScores={setScores} onSummary={setSummary} onSuggestions={setSuggestions} onSave={saveFeedback} onExtract={() => onExtractCard(attempt.id, attempt.answerMd)} /> : null}
          {selected.currentStage !== "reflection" ? <div className="practice-footer"><button type="button" className="primary-button" onClick={advance}>进入下一阶段</button></div> : null}
        </section>
      </div>
    </section>
  );
}

function CallableCardShelf({ cards, usageKind, onUsageKind, onInsert }: {
  readonly cards: readonly KnowledgeCard[];
  readonly usageKind: Extract<CardUsage["usageKind"], "content" | "argument" | "evidence">;
  readonly onUsageKind: (value: Extract<CardUsage["usageKind"], "content" | "argument" | "evidence">) => void;
  readonly onInsert: (cardId: string) => void;
}) {
  return <aside className="callable-card-shelf" aria-label="可调用知识卡">
    <div className="callable-card-header"><div><strong>可调用知识卡</strong><small>插入会记录本次调用</small></div><select aria-label="调用用途" value={usageKind} onChange={(event) => onUsageKind(event.target.value as typeof usageKind)}><option value="content">正文</option><option value="argument">论点</option><option value="evidence">论据</option></select></div>
    <div className="callable-card-list">{cards.map((card) => <div className="callable-card-item" key={card.id}><div><strong>{card.title}</strong><small>{card.sourceLabel || "人工验证"}</small></div><button type="button" className="ghost-button" onClick={() => onInsert(card.id)}>插入</button></div>)}</div>
    {!cards.length ? <div className="callable-card-empty">暂无已验证知识卡。先到素材页完成卡片检查。</div> : null}
  </aside>;
}

function ReflectionEditor({ answer, scores, summary, suggestions, onScores, onSummary, onSuggestions, onSave, onExtract }: {
  answer: string; scores: FeedbackDimensions; summary: string; suggestions: string;
  onScores: (value: FeedbackDimensions) => void; onSummary: (value: string) => void; onSuggestions: (value: string) => void;
  onSave: () => void; onExtract: () => void;
}) {
  return <div className="reflection-editor"><h2>复盘与修改</h2><div className="answer-preview">{answer || "尚未填写作答。"}</div><div className="score-grid">{(["keyPoints","structure","logic","expression","compliance"] as const).map((key) => <label key={key}>{scoreLabel(key)}<input type="range" min="1" max="5" value={scores[key] ?? 3} onChange={(event) => onScores({ ...scores, [key]: Number(event.target.value) })} /><span>{scores[key] ?? 3}</span></label>)}</div><label>复盘结论<textarea value={summary} onChange={(event) => onSummary(event.target.value)} /></label><label>下一次改进<textarea value={suggestions} onChange={(event) => onSuggestions(event.target.value)} /></label><div className="practice-footer"><button type="button" className="ghost-button" disabled={!answer.trim()} onClick={onExtract}>提取为知识卡</button><button type="button" className="primary-button" onClick={onSave}>完成复盘</button></div></div>;
}

function emptyScores(): FeedbackDimensions { return { keyPoints: 3, structure: 3, logic: 3, expression: 3, compliance: 3 }; }
function scoreLabel(key: keyof FeedbackDimensions): string { return { keyPoints: "要点", structure: "结构", logic: "逻辑", expression: "表达", compliance: "规范" }[key]; }
