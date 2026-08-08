import type {
  Attempt,
  AttemptRevision,
  CardSource,
  CardUsage,
  Exercise,
  FeedbackRecord,
  KnowledgeCard,
  LearningWorkspaceState,
  ReviewCard,
  SourceDocument,
  SourceExcerpt,
  StudySession,
  StudySessionItem,
} from "../../domain/learning";
import type { CivicForgeDatabase } from "../../lib/db/databaseClient";
import { isTauriRuntimeAvailable } from "../../lib/db/databaseClient";

export interface LearningRepository {
  loadWorkspace(): Promise<LearningWorkspaceState>;
  replaceWorkspace(state: LearningWorkspaceState): Promise<void>;
  saveSource(source: SourceDocument): Promise<void>;
}

type Row = Record<string, unknown>;

export function createLearningRepository(db: CivicForgeDatabase): LearningRepository {
  return {
    async saveSource(source) {
      await db.execute(SOURCE_UPSERT_SQL, sourceParams(source));
    },

    async loadWorkspace() {
      const [
        sources,
        excerpts,
        exercises,
        attempts,
        revisions,
        feedback,
        cards,
        cardSources,
        cardUsages,
        reviewCards,
        sessions,
        sessionItems,
      ] = await Promise.all([
        db.select<Row[]>("SELECT * FROM source_documents ORDER BY updated_at DESC"),
        db.select<Row[]>("SELECT * FROM source_excerpts ORDER BY created_at DESC"),
        db.select<Row[]>("SELECT * FROM exercises ORDER BY updated_at DESC"),
        db.select<Row[]>("SELECT * FROM attempts ORDER BY updated_at DESC"),
        db.select<Row[]>("SELECT * FROM attempt_revisions ORDER BY created_at DESC"),
        db.select<Row[]>("SELECT * FROM feedback_records ORDER BY created_at DESC"),
        db.select<Row[]>(CARD_LIST_SQL),
        db.select<Row[]>("SELECT * FROM card_sources ORDER BY created_at DESC"),
        db.select<Row[]>("SELECT * FROM card_usages ORDER BY used_at DESC"),
        db.select<Row[]>("SELECT * FROM review_cards ORDER BY next_review_at"),
        db.select<Row[]>("SELECT * FROM study_sessions ORDER BY started_at DESC"),
        db.select<Row[]>("SELECT * FROM study_session_items ORDER BY session_uuid, sort_order"),
      ]);

      return {
        sources: sources.map(mapSource),
        excerpts: excerpts.map(mapExcerpt),
        exercises: exercises.map(mapExercise),
        attempts: attempts.map(mapAttempt),
        revisions: revisions.map(mapRevision),
        feedback: feedback.map(mapFeedback),
        cards: cards.map(mapCard),
        cardSources: cardSources.map(mapCardSource),
        cardUsages: cardUsages.map(mapCardUsage),
        reviewCards: reviewCards.map(mapReviewCard),
        sessions: sessions.map(mapSession),
        sessionItems: sessionItems.map(mapSessionItem),
      };
    },

    async replaceWorkspace(state) {
      if (isTauriRuntimeAvailable(globalThis)) {
        const operations: DatabaseOperation[] = [];
        const recorder = createOperationRecorder(operations);
        await clearWorkspace(recorder);
        await insertWorkspace(recorder, state);
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("execute_database_transaction", { operations });
        return;
      }

      await db.execute("BEGIN IMMEDIATE");
      try {
        await clearWorkspace(db);
        await insertWorkspace(db, state);
        await db.execute("COMMIT");
      } catch (error) {
        try {
          await db.execute("ROLLBACK");
        } catch {
          // Preserve the original write error.
        }
        throw error;
      }
    },
  };
}

const SOURCE_UPSERT_SQL = `
INSERT INTO source_documents (
  uuid, title, source_type, content_md, source_uri, publisher, published_at,
  status, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(uuid) DO UPDATE SET
  title = excluded.title,
  source_type = excluded.source_type,
  content_md = excluded.content_md,
  source_uri = excluded.source_uri,
  publisher = excluded.publisher,
  published_at = excluded.published_at,
  status = excluded.status,
  updated_at = excluded.updated_at
`;

function sourceParams(item: SourceDocument): unknown[] {
  return [item.id, item.title, item.sourceType, item.contentMd, item.sourceUri, item.publisher,
    item.publishedAt, item.status, item.createdAt, item.updatedAt];
}

interface DatabaseOperation {
  readonly sql: string;
  readonly bindValues: readonly unknown[];
}

function createOperationRecorder(operations: DatabaseOperation[]): CivicForgeDatabase {
  return {
    async execute(sql, bindValues = []) {
      operations.push({ sql, bindValues });
      return { rowsAffected: 0 };
    },
    async select() {
      throw new Error("The transaction recorder does not support SELECT statements.");
    },
    async close() {
      return true;
    },
  };
}

const CARD_LIST_SQL = `
SELECT knowledge_cards.*,
  COALESCE((SELECT group_concat(tag_name, ',') FROM card_tags WHERE card_uuid = knowledge_cards.uuid), '') AS tag_names,
  COALESCE((SELECT group_concat(question_type_slug, ',') FROM card_question_types WHERE card_uuid = knowledge_cards.uuid), '') AS question_type_slugs
FROM knowledge_cards
ORDER BY updated_at DESC
`;

async function clearWorkspace(db: CivicForgeDatabase): Promise<void> {
  for (const table of [
    "study_session_items",
    "study_sessions",
    "review_cards",
    "card_usages",
    "card_sources",
    "card_question_types",
    "card_tags",
    "knowledge_cards",
    "feedback_records",
    "attempt_revisions",
    "attempts",
    "exercise_documents",
    "exercises",
    "source_excerpts",
    "source_documents",
  ]) {
    await db.execute(`DELETE FROM ${table}`);
  }
}

async function insertWorkspace(db: CivicForgeDatabase, state: LearningWorkspaceState): Promise<void> {
  for (const item of state.sources) await insertSource(db, item);
  for (const item of state.excerpts) await insertExcerpt(db, item);
  for (const item of state.exercises) await insertExercise(db, item);
  for (const item of state.attempts) await insertAttempt(db, item);
  for (const item of state.revisions) await insertRevision(db, item);
  for (const item of state.feedback) await insertFeedback(db, item);
  for (const item of state.cards) await insertCard(db, item);
  for (const item of state.cardSources) await insertCardSource(db, item);
  for (const item of state.cardUsages) await insertCardUsage(db, item);
  for (const item of state.reviewCards) await insertReviewCard(db, item);
  for (const item of state.sessions) await insertSession(db, item);
  for (const item of state.sessionItems) await insertSessionItem(db, item);
}

function insertSource(db: CivicForgeDatabase, item: SourceDocument) {
  return db.execute("INSERT INTO source_documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", sourceParams(item));
}

function insertExcerpt(db: CivicForgeDatabase, item: SourceExcerpt) {
  return db.execute("INSERT INTO source_excerpts VALUES (?, ?, ?, ?, ?, ?)", [
    item.id, item.documentId, item.contentMd, item.locator, item.noteMd, item.createdAt,
  ]);
}

function insertExercise(db: CivicForgeDatabase, item: Exercise) {
  return db.execute("INSERT INTO exercises VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    item.id, item.title, item.promptMd, item.questionTypeSlug, item.wordLimit, item.timeLimitMinutes,
    item.status, item.currentStage, item.createdAt, item.updatedAt,
  ]);
}

function insertAttempt(db: CivicForgeDatabase, item: Attempt) {
  return db.execute("INSERT INTO attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    item.id, item.exerciseId, item.outlineMd, item.answerMd, item.status, item.startedAt,
    item.finishedAt, item.elapsedMs, item.updatedAt,
  ]);
}

function insertRevision(db: CivicForgeDatabase, item: AttemptRevision) {
  return db.execute("INSERT INTO attempt_revisions VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    item.id, item.attemptId, item.legacySourceMaterialId, item.originalMd, item.revisedMd,
    item.promptTemplate, item.revisionNumber, item.createdAt,
  ]);
}

function insertFeedback(db: CivicForgeDatabase, item: FeedbackRecord) {
  return db.execute("INSERT INTO feedback_records VALUES (?, ?, ?, ?, ?, ?, ?)", [
    item.id, item.attemptId, item.source, JSON.stringify(item.dimensions), item.summaryMd,
    item.suggestionsMd, item.createdAt,
  ]);
}

async function insertCard(db: CivicForgeDatabase, item: KnowledgeCard): Promise<void> {
  await db.execute("INSERT INTO knowledge_cards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    item.id, item.title, item.contentMd, item.summary, item.cardType, item.topicSlug,
    item.lifecycle, item.verificationStatus, item.core ? 1 : 0, item.reviewEnabled ? 1 : 0,
    item.sourceLabel, item.createdAt, item.updatedAt,
  ]);
  for (const tag of item.tagNames) {
    await db.execute("INSERT INTO card_tags(card_uuid, tag_name) VALUES (?, ?)", [item.id, tag]);
  }
  for (const slug of item.questionTypeSlugs) {
    await db.execute("INSERT INTO card_question_types(card_uuid, question_type_slug) VALUES (?, ?)", [item.id, slug]);
  }
}

function insertCardSource(db: CivicForgeDatabase, item: CardSource) {
  return db.execute("INSERT INTO card_sources VALUES (?, ?, ?, ?, ?, ?)", [
    item.cardId, item.sourceDocumentId, item.sourceExcerptId, item.attemptId, item.relationType, item.createdAt,
  ]);
}

function insertCardUsage(db: CivicForgeDatabase, item: CardUsage) {
  return db.execute("INSERT INTO card_usages VALUES (?, ?, ?, ?, ?, ?)", [
    item.id, item.cardId, item.attemptId, item.usageKind, item.slotKey, item.usedAt,
  ]);
}

function insertReviewCard(db: CivicForgeDatabase, item: ReviewCard) {
  const now = new Date().toISOString();
  return db.execute("INSERT INTO review_cards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    item.id, item.knowledgeCardId, item.mode, item.promptMd, item.answerMd, item.nextReviewAt,
    item.lastReviewedAt, item.ease, item.intervalDays, item.repetitions, item.lapses, now, now,
  ]);
}

function insertSession(db: CivicForgeDatabase, item: StudySession) {
  return db.execute("INSERT INTO study_sessions VALUES (?, ?, ?, ?, ?)", [
    item.id, item.plannedMinutes, item.startedAt, item.finishedAt, item.status,
  ]);
}

function insertSessionItem(db: CivicForgeDatabase, item: StudySessionItem) {
  return db.execute("INSERT INTO study_session_items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    item.sessionId, item.task.id, item.task.kind, item.task.title, item.task.description, item.task.entityId,
    item.task.estimatedMinutes, item.task.priority, item.task.status, item.order, item.completedAt,
  ]);
}

const string = (row: Row, key: string) => String(row[key] ?? "");
const nullableString = (row: Row, key: string) => row[key] == null ? null : String(row[key]);
const number = (row: Row, key: string) => Number(row[key] ?? 0);
const boolean = (row: Row, key: string) => number(row, key) === 1;
const list = (row: Row, key: string) => string(row, key).split(",").map((value) => value.trim()).filter(Boolean);

const mapSource = (row: Row): SourceDocument => ({
  id: string(row, "uuid"), title: string(row, "title"), sourceType: string(row, "source_type") as SourceDocument["sourceType"],
  contentMd: string(row, "content_md"), sourceUri: string(row, "source_uri"), publisher: string(row, "publisher"),
  publishedAt: nullableString(row, "published_at"), status: string(row, "status") as SourceDocument["status"],
  createdAt: string(row, "created_at"), updatedAt: string(row, "updated_at"),
});
const mapExcerpt = (row: Row): SourceExcerpt => ({ id: string(row, "uuid"), documentId: string(row, "document_uuid"), contentMd: string(row, "content_md"), locator: string(row, "locator_json"), noteMd: string(row, "note_md"), createdAt: string(row, "created_at") });
const mapExercise = (row: Row): Exercise => ({ id: string(row, "uuid"), title: string(row, "title"), promptMd: string(row, "prompt_md"), questionTypeSlug: string(row, "question_type_slug"), wordLimit: row.word_limit == null ? null : number(row, "word_limit"), timeLimitMinutes: row.time_limit_minutes == null ? null : number(row, "time_limit_minutes"), status: string(row, "status") as Exercise["status"], currentStage: string(row, "current_stage") as Exercise["currentStage"], createdAt: string(row, "created_at"), updatedAt: string(row, "updated_at") });
const mapAttempt = (row: Row): Attempt => ({ id: string(row, "uuid"), exerciseId: string(row, "exercise_uuid"), outlineMd: string(row, "outline_md"), answerMd: string(row, "answer_md"), status: string(row, "status") as Attempt["status"], startedAt: string(row, "started_at"), finishedAt: nullableString(row, "finished_at"), elapsedMs: number(row, "elapsed_ms"), updatedAt: string(row, "updated_at") });
const mapRevision = (row: Row): AttemptRevision => ({ id: string(row, "uuid"), attemptId: nullableString(row, "attempt_uuid"), legacySourceMaterialId: nullableString(row, "legacy_source_material_uuid"), originalMd: string(row, "original_md"), revisedMd: string(row, "revised_md"), promptTemplate: string(row, "prompt_template"), revisionNumber: number(row, "revision_number"), createdAt: string(row, "created_at") });
const mapFeedback = (row: Row): FeedbackRecord => ({ id: string(row, "uuid"), attemptId: string(row, "attempt_uuid"), source: string(row, "source") as FeedbackRecord["source"], dimensions: JSON.parse(string(row, "dimensions_json") || "{}") as FeedbackRecord["dimensions"], summaryMd: string(row, "summary_md"), suggestionsMd: string(row, "suggestions_md"), createdAt: string(row, "created_at") });
const mapCard = (row: Row): KnowledgeCard => ({ id: string(row, "uuid"), title: string(row, "title"), contentMd: string(row, "content_md"), summary: string(row, "summary"), cardType: string(row, "card_type") as KnowledgeCard["cardType"], topicSlug: string(row, "topic_slug"), lifecycle: string(row, "lifecycle_status") as KnowledgeCard["lifecycle"], verificationStatus: string(row, "verification_status") as KnowledgeCard["verificationStatus"], core: boolean(row, "is_core"), reviewEnabled: boolean(row, "review_enabled"), sourceLabel: string(row, "source_label"), tagNames: list(row, "tag_names"), questionTypeSlugs: list(row, "question_type_slugs"), createdAt: string(row, "created_at"), updatedAt: string(row, "updated_at") });
const mapCardSource = (row: Row): CardSource => ({ cardId: string(row, "card_uuid"), sourceDocumentId: nullableString(row, "source_document_uuid"), sourceExcerptId: nullableString(row, "source_excerpt_uuid"), attemptId: nullableString(row, "attempt_uuid"), relationType: string(row, "relation_type") as CardSource["relationType"], createdAt: string(row, "created_at") });
const mapCardUsage = (row: Row): CardUsage => ({ id: string(row, "uuid"), cardId: string(row, "card_uuid"), attemptId: string(row, "attempt_uuid"), usageKind: string(row, "usage_kind") as CardUsage["usageKind"], slotKey: string(row, "slot_key"), usedAt: string(row, "used_at") });
const mapReviewCard = (row: Row): ReviewCard => ({ id: string(row, "uuid"), knowledgeCardId: string(row, "knowledge_card_uuid"), mode: string(row, "mode") as ReviewCard["mode"], promptMd: string(row, "prompt_md"), answerMd: string(row, "answer_md"), nextReviewAt: nullableString(row, "next_review_at"), lastReviewedAt: nullableString(row, "last_reviewed_at"), ease: number(row, "ease"), intervalDays: number(row, "interval_days"), repetitions: number(row, "repetitions"), lapses: number(row, "lapses") });
const mapSession = (row: Row): StudySession => ({ id: string(row, "uuid"), plannedMinutes: number(row, "planned_minutes"), startedAt: string(row, "started_at"), finishedAt: nullableString(row, "finished_at"), status: string(row, "status") as StudySession["status"] });
const mapSessionItem = (row: Row): StudySessionItem => ({ sessionId: string(row, "session_uuid"), task: { id: string(row, "task_uuid"), kind: string(row, "task_kind") as StudySessionItem["task"]["kind"], title: string(row, "title"), description: string(row, "description"), entityId: nullableString(row, "entity_uuid"), estimatedMinutes: number(row, "estimated_minutes"), priority: number(row, "priority"), status: string(row, "status") as StudySessionItem["task"]["status"] }, order: number(row, "sort_order"), completedAt: nullableString(row, "completed_at") });
