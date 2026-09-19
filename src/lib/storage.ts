import {
  AssessmentReport,
  BusinessFormData,
  EscalatedQuestion,
  AppUser,
  LearningProgressEntry
} from '../types';
import { runBusinessAssessment } from './scoringEngine';
import {
  saveAssessmentToCloud,
  saveReportToCloud,
  deleteAssessmentFromCloud,
  deleteReportFromCloud,
  saveQuestionToCloud,
  fetchAssessmentsFromCloud,
  fetchReportsFromCloud,
  fetchQuestionsFromCloud,
  isCloudDatabaseAvailable
} from './supabaseClient';

const STORAGE_KEY_PROJECTS = 'bam_projects_v14';
const STORAGE_KEY_REPORTS = 'bam_reports_v14';
const STORAGE_KEY_DRAFT = 'bam_active_draft_v14';
const STORAGE_KEY_RULES_REPO = 'bam_escalated_rules_v14';
const STORAGE_KEY_INITIAL_SEEDED = 'bam_cloud_seeded_v14';
// 删除墓碑：记录用户已删除的云端数据 id，防止同步合并时被云端旧数据"复活"
const STORAGE_KEY_DELETED_PROJECTS = 'bam_deleted_projects_v1';
const STORAGE_KEY_DELETED_REPORTS = 'bam_deleted_reports_v1';
// 待云端删除队列：与上面的墓碑分工不同。墓碑永久保留，只负责过滤云端回流数据；
// 这里只保留"云端尚未确认删除"的 id，负责重试，删除成功即出队。
// 两者若合用一份列表，每次同步都会把历史上删过的所有 id 全量重放一遍 DELETE，
// 请求量随使用时间单调增长且永不收敛（删成功的也照样年复一年重发）。
const STORAGE_KEY_PENDING_CLOUD_DELETE_PROJECTS = 'bam_pending_cloud_delete_projects_v1';
const STORAGE_KEY_PENDING_CLOUD_DELETE_REPORTS = 'bam_pending_cloud_delete_reports_v1';
// 商业知识学习中心：本地记录每个视频的观看进度（第4点）
const STORAGE_KEY_LEARNING_PROGRESS = 'bam_learning_progress_v1';

// ========================
// 删除墓碑（Tombstone）工具
// 核心思路：用户删除某条数据时，先把 id 同步写入本地墓碑列表（同步操作），
// 再异步删除云端。之后每次云端同步合并时都会先过滤掉墓碑 id，
// 即使云端删除失败/未完成，刷新页面也不会再把已删除的数据合并回来。
// ========================
function readDeletedIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
function writeDeletedIds(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch (e) {
    console.warn('Failed to persist deleted ids:', e);
  }
}
export const getDeletedProjectIds = (): string[] => readDeletedIds(STORAGE_KEY_DELETED_PROJECTS);
export const getDeletedReportIds = (): string[] => readDeletedIds(STORAGE_KEY_DELETED_REPORTS);
const getPendingCloudDeleteProjectIds = (): string[] =>
  readDeletedIds(STORAGE_KEY_PENDING_CLOUD_DELETE_PROJECTS);
const getPendingCloudDeleteReportIds = (): string[] =>
  readDeletedIds(STORAGE_KEY_PENDING_CLOUD_DELETE_REPORTS);
function markDeleted(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}
function unmarkDeleted(list: string[], id: string): string[] {
  return list.filter((x) => x !== id);
}

// 重放待删除队列，并把云端已确认删除的 id 出队，使队列最终收敛为空。
// 失败的 id 留在队列里，下次同步继续重试。
async function flushPendingCloudDeletes(): Promise<boolean> {
  const projectIds = getPendingCloudDeleteProjectIds();
  const reportIds = getPendingCloudDeleteReportIds();
  if (projectIds.length === 0 && reportIds.length === 0) return true;

  const [projectResults, reportResults] = await Promise.all([
    Promise.all(projectIds.map((id) => deleteAssessmentFromCloud(id))),
    Promise.all(reportIds.map((id) => deleteReportFromCloud(id)))
  ]);

  writeDeletedIds(
    STORAGE_KEY_PENDING_CLOUD_DELETE_PROJECTS,
    projectIds.filter((_, i) => !projectResults[i])
  );
  writeDeletedIds(
    STORAGE_KEY_PENDING_CLOUD_DELETE_REPORTS,
    reportIds.filter((_, i) => !reportResults[i])
  );

  return projectResults.every(Boolean) && reportResults.every(Boolean);
}

export const INITIAL_PRESET_PROJECTS: BusinessFormData[] = [];

export const INITIAL_ESCALATED_QUESTIONS: EscalatedQuestion[] = [
  {
    id: 'esc-1',
    question: '我们做的是按季节捕鱼的水产摊，每年有3个月休渔期完全没有收入，剩下9个月收入很高，年化算下来该怎么填报？',
    category: '行业特殊周期与季节性波动',
    confidence: 'LOW_EDGE_CASE',
    conservativePaths: [
      {
        pathName: '路径 A (推荐：12个月平均年化法)',
        assumption: '将全年总捕捞收入除以 12 个月平摊为月均收入，同时将休渔期固定租金计入月均 OPEX。',
        estimatedScore: '约 78 分 (GRADE A)',
        consequence: '最符合实际抗风险能力，报告中将自动附注季节性平摊说明。'
      },
      {
        pathName: '路径 B (保守：仅按旺季9个月填报并折算留存)',
        assumption: '按旺季单月真实数据填写，但需把现金储备调高至至少覆盖3个月休渔期开销。',
        estimatedScore: '约 74 分 (GRADE BBB)',
        consequence: '现金储备月数若不足会被 Gate-3/Gate-4 标记。'
      }
    ],
    aiResponse:
      '针对季节性较强的水产生意，官方标准库已启动规则完善排期。当前建议采用【路径 A 12个月年化平均法】，将淡季与旺季总体收支拉平填报，并在备注中勾选说明。',
    isEdgeCase: true,
    suggestedAction: '已归档进待完善规则库，平台将于 V1.4.2 版本更新专门的【季节性平摊试算模板】',
    archivedAt: '2026-08-20T11:00:00Z',
    relatedCaseId: 'CASE-SEASONAL-2026-09',
    relatedCaseResult: 'PASS (已按年化平摊判定通过)'
  },
  {
    id: 'esc-2',
    question: '我和妻子共同经营一个小杂货铺，店里收款主要是现金和移动支付混着来，但记账本上只记了每天卖货毛利，没有细分到每种商品，能过审核吗？',
    category: '小微记账粗放与混合凭证',
    confidence: 'HIGH',
    aiResponse:
      '完全可以！根据 V1.4 规则，本平台 100% 由 AI 自动评分且无凭证门槛。您只需按月度汇总的总营业额与总进货成本填写即可。手写账本照片可作为辅助凭证（选填），哪怕纯手动填写 14 项数字，评分与通过率完全一致！',
    isEdgeCase: false,
    suggestedAction: '规则库已完全覆盖，可放心填写。',
    archivedAt: '2026-08-23T09:20:00Z',
    userFeedback: 'helpful',
    relatedCaseId: 'CASE-RETAIL-2026-114',
    relatedCaseResult: 'PASS (得分 82 / AA)'
  }
];

export function getStoredProjects(): BusinessFormData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load projects from storage', e);
    return [];
  }
}

// assessment_reports.project_id 有外键约束指向 projects.id：project 与其 report 的云端
// upsert 若并发发出，report 的写入可能在 project 那一行提交前先到达数据库，触发外键
// 校验失败（400）。这里记录每个 projectId 最近一次云端 upsert 的 Promise，
// 供 saveReport 在写 report 前等待，从而保证同一 project 的云端行一定先落地。
const pendingProjectCloudSync = new Map<string, Promise<boolean>>();

export function saveProject(project: BusinessFormData): void {
  // 重新保存即视为"存活"，从删除墓碑中移除（避免同 id 数据被墓碑误拦）；
  // 同时撤销排队中的云端删除，否则下次同步会把刚保存的这条记录从云端删掉
  writeDeletedIds(STORAGE_KEY_DELETED_PROJECTS, unmarkDeleted(getDeletedProjectIds(), project.id));
  writeDeletedIds(
    STORAGE_KEY_PENDING_CLOUD_DELETE_PROJECTS,
    unmarkDeleted(getPendingCloudDeleteProjectIds(), project.id)
  );
  const current = getStoredProjects();
  const index = current.findIndex((p) => p.id === project.id && p.version === project.version);
  if (index >= 0) {
    current[index] = project;
  } else {
    current.unshift(project);
  }
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(current));

  // Sync to Supabase Cloud Table /projects
  if (isCloudDatabaseAvailable()) {
    const syncPromise = saveAssessmentToCloud(project).catch((err) => {
      console.warn('Background cloud save assessment failed:', err);
      return false;
    });
    pendingProjectCloudSync.set(project.id, syncPromise);
  }
}

export function deleteProjectAndReports(projectId: string, explicitReportIds?: string[]): Promise<boolean> {
  // 彻底撤回/删除项目及其所有版本与报告（本地 + 云端同步删除，防止刷新后被云端数据"复活"）
  // 注意：调用方（App.tsx）可能已先清空本地报告，此时 getAllReports() 读不到目标报告，
  // 因此需支持显式传入 reportIds，确保报告墓碑也能准确记录，杜绝残留报告回流"复活"。
  const allReports = getAllReports();
  const targetReports = allReports.filter((r) => r.projectId === projectId);
  const targetReportIds = targetReports.map((r) => r.id);
  // 修复：云端删除必须覆盖 explicitReportIds——调用方可能已提前清空本地报告存储，
  // 此时 getAllReports() 读不到任何该项目的报告，targetReportIds 会是空数组，
  // 若只用 targetReportIds 去删云端，会导致云端报告一条都没被真正删除。
  const reportIdsToDelete = Array.from(new Set([...targetReportIds, ...(explicitReportIds || [])]));
  const allDeletedReportIds = Array.from(new Set([...getDeletedReportIds(), ...reportIdsToDelete]));

  const projects = getStoredProjects().filter((p) => p.id !== projectId);
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));

  const remainingReports = allReports.filter((r) => r.projectId !== projectId);
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(remainingReports));

  // 同步写入"删除墓碑"（同步操作，立即生效）：
  // 即使云端删除失败或被中断，刷新时同步合并也会把这些 id 过滤掉，杜绝"复活"
  writeDeletedIds(STORAGE_KEY_DELETED_PROJECTS, markDeleted(getDeletedProjectIds(), projectId));
  writeDeletedIds(STORAGE_KEY_DELETED_REPORTS, allDeletedReportIds);

  // 入队等待云端删除；删除成功后由 flushPendingCloudDeletes 出队
  writeDeletedIds(
    STORAGE_KEY_PENDING_CLOUD_DELETE_PROJECTS,
    markDeleted(getPendingCloudDeleteProjectIds(), projectId)
  );
  writeDeletedIds(
    STORAGE_KEY_PENDING_CLOUD_DELETE_REPORTS,
    Array.from(new Set([...getPendingCloudDeleteReportIds(), ...reportIdsToDelete]))
  );

  // Remove from Cloud (Supabase) Tables
  if (!isCloudDatabaseAvailable()) {
    return Promise.resolve(true);
  }
  return flushPendingCloudDeletes().catch((err) => {
    console.warn('Cloud delete failed (本地已删除，墓碑会拦截云端旧数据回流):', err);
    return false;
  });
}

export function getAllReports(): AssessmentReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load reports from storage', e);
    return [];
  }
}

export function saveReport(report: AssessmentReport): void {
  // 重新保存即视为"存活"，从删除墓碑与待删除队列中移除
  writeDeletedIds(STORAGE_KEY_DELETED_REPORTS, unmarkDeleted(getDeletedReportIds(), report.id));
  writeDeletedIds(
    STORAGE_KEY_PENDING_CLOUD_DELETE_REPORTS,
    unmarkDeleted(getPendingCloudDeleteReportIds(), report.id)
  );
  const current = getAllReports();
  const index = current.findIndex((r) => r.id === report.id);
  if (index >= 0) {
    current[index] = report;
  } else {
    current.unshift(report);
  }
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(current));

  // Sync to Supabase Cloud Table /assessment_reports
  if (isCloudDatabaseAvailable()) {
    // 等待同一 project 的云端 upsert 先落地，避免 project_id 外键约束校验失败
    const waitForProject = pendingProjectCloudSync.get(report.projectId) || Promise.resolve(true);
    waitForProject
      .then(() => saveReportToCloud(report))
      .catch((err) => console.warn('Background cloud save report failed:', err));
  }
}

export function getProjectReports(projectId: string): AssessmentReport[] {
  const all = getAllReports();
  return all.filter((r) => r.projectId === projectId).sort((a, b) => b.version - a.version);
}

// 草稿按项目 id 分组保存：切换项目再切回时，各自的未提交内容都能恢复
const DRAFT_MAX_ENTRIES = 12;
const STORAGE_KEY_TAB = 'bam_active_tab_v1';

type DraftMap = Record<string, BusinessFormData>;

function readDraftMap(): DraftMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    // 兼容旧版本：单条草稿对象（含 id 字段）
    if (typeof (parsed as any).id === 'string') {
      return { [(parsed as any).id]: parsed as BusinessFormData };
    }
    return parsed as DraftMap;
  } catch {
    return {};
  }
}

function writeDraftMap(map: DraftMap): void {
  try {
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to persist draft:', e);
  }
}

export function getActiveDraft(id?: string): BusinessFormData | null {
  const map = readDraftMap();
  if (id) return map[id] || null;
  const keys = Object.keys(map);
  return keys.length > 0 ? map[keys[keys.length - 1]] : null;
}

export function saveActiveDraft(draft: BusinessFormData): void {
  if (!draft?.id) return;
  const map = readDraftMap();
  map[draft.id] = draft;
  // 只保留最近若干条，避免 localStorage 无限膨胀
  const keys = Object.keys(map);
  if (keys.length > DRAFT_MAX_ENTRIES) {
    keys.slice(0, keys.length - DRAFT_MAX_ENTRIES).forEach((k) => delete map[k]);
  }
  writeDraftMap(map);
}

export function clearActiveDraft(id?: string): void {
  if (!id) {
    localStorage.removeItem(STORAGE_KEY_DRAFT);
    return;
  }
  const map = readDraftMap();
  if (!(id in map)) return;
  delete map[id];
  writeDraftMap(map);
}

// 退出登录时清空本机所有用户数据（项目/报告/草稿/删除墓碑）：
// 云端同步是"合并"逻辑，若退出登录后不清本地存储，共享设备上下一位使用者
// 打开浏览器仍能直接看到上一个已登录用户的项目与财务数据，属于数据泄露风险。
export function clearAllLocalUserData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PROJECTS);
    localStorage.removeItem(STORAGE_KEY_REPORTS);
    localStorage.removeItem(STORAGE_KEY_DRAFT);
    localStorage.removeItem(STORAGE_KEY_DELETED_PROJECTS);
    localStorage.removeItem(STORAGE_KEY_DELETED_REPORTS);
    localStorage.removeItem(STORAGE_KEY_PENDING_CLOUD_DELETE_PROJECTS);
    localStorage.removeItem(STORAGE_KEY_PENDING_CLOUD_DELETE_REPORTS);
    localStorage.removeItem(STORAGE_KEY_INITIAL_SEEDED);
  } catch (e) {
    console.warn('Failed to clear local user data on logout:', e);
  }
}

// 当前所在页面（tab）：刷新后仍能停在原页面，不再被强制拉回首页
export const loadStoredTab = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY_TAB);
  } catch {
    return null;
  }
};

export const saveStoredTab = (tab: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY_TAB, tab);
  } catch {
    /* 隐私模式下忽略 */
  }
};

export function getEscalatedQuestions(): EscalatedQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RULES_REPO);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RULES_REPO, JSON.stringify(INITIAL_ESCALATED_QUESTIONS));
      return INITIAL_ESCALATED_QUESTIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ESCALATED_QUESTIONS;
  }
}

export function addEscalatedQuestion(q: EscalatedQuestion): void {
  const list = getEscalatedQuestions();
  list.unshift(q);
  localStorage.setItem(STORAGE_KEY_RULES_REPO, JSON.stringify(list));

  // Sync to Supabase Cloud Table /escalated_questions
  if (isCloudDatabaseAvailable()) {
    saveQuestionToCloud(q).catch((err) =>
      console.warn('Background cloud save question failed:', err)
    );
  }
}

export function updateEscalatedQuestionFeedback(
  id: string,
  feedback: 'helpful' | 'not_helpful'
): void {
  const list = getEscalatedQuestions();
  const item = list.find((i) => i.id === id);
  if (item) {
    item.userFeedback = feedback;
    localStorage.setItem(STORAGE_KEY_RULES_REPO, JSON.stringify(list));
    if (isCloudDatabaseAvailable()) {
      saveQuestionToCloud(item).catch((err) =>
        console.warn('Background cloud update question feedback failed:', err)
      );
    }
  }
}

// Initial Sync & Cloud Seeder
// 串行化同步：StrictMode 双挂载 / 多处并发调用时排队执行，避免合并结果互相覆盖
let syncChain: Promise<void> = Promise.resolve();
export function syncWithCloudDatabase(currentUser?: AppUser | null): Promise<void> {
  syncChain = syncChain.then(() => performCloudSync(currentUser));
  return syncChain;
}

async function performCloudSync(currentUser?: AppUser | null): Promise<void> {
  if (!isCloudDatabaseAvailable()) return;

  const deletedProjectIds = getDeletedProjectIds();
  const deletedReportIds = getDeletedReportIds();

  try {
    // 0. 先重试把"尚未确认删除"的云端记录彻底删干净
    //    （上次删除失败/未完成时，这里补删，从根上消灭刷新"复活"）
    //    注意只重放待删除队列，不是整份墓碑：墓碑只增不减，拿它重放会让每次同步
    //    都把历史上删过的所有 id 重发一遍 DELETE，请求量无限增长。
    await flushPendingCloudDeletes();

    const [cloudProjects, cloudReports, cloudQuestions] = await Promise.all([
      fetchAssessmentsFromCloud(currentUser),
      fetchReportsFromCloud(currentUser),
      fetchQuestionsFromCloud()
    ]);

    // 过滤掉"用户已删除"的云端记录（墓碑），其余才允许合并回本地
    const liveCloudProjects = cloudProjects.filter((p) => !deletedProjectIds.includes(p.id));
    const liveCloudReports = cloudReports.filter((r) => !deletedReportIds.includes(r.id));

    // 合并云端与本地 projects（云端优先取最新版本）
    const localProjects = getStoredProjects();
    if (liveCloudProjects.length > 0) {
      // 以项目 id 为键合并（保留最新版本），避免同一项目多版本同时进入列表导致 React 重复 key
      const mergedProjectsMap = new Map<string, BusinessFormData>();
      const putLatest = (p: BusinessFormData) => {
        const existing = mergedProjectsMap.get(p.id);
        if (!existing || (p.version || 0) >= (existing.version || 0)) {
          mergedProjectsMap.set(p.id, p);
        }
      };
      localProjects.forEach(putLatest);
      // Cloud projects take precedence
      liveCloudProjects.forEach(putLatest);
      const mergedList = Array.from(mergedProjectsMap.values());
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(mergedList));
    }

    // 仅登录用户：把云端还没有的本地 project 补推上去（未登录的匿名访问不向公共表写入数据，避免数据串扰/泄漏）。
    // 注意：不能只在 liveCloudProjects 为空时才推送——云端已有其它 project 时，
    // 本地新建但尚未同步的 project 同样需要补推，否则它的 report 会在 project 行缺失的情况下
    // 因外键约束（assessment_reports.project_id → projects.id）被拒绝写入。
    if (currentUser?.uid) {
      const cloudProjectIds = new Set(liveCloudProjects.map((p) => p.id));
      const localOnlyProjects = localProjects.filter((p) => !cloudProjectIds.has(p.id));
      for (const p of localOnlyProjects) {
        await saveAssessmentToCloud(p, currentUser);
      }
    }

    // 合并云端与本地 reports
    const localReports = getAllReports();
    if (liveCloudReports.length > 0) {
      const mergedReportsMap = new Map<string, AssessmentReport>();
      localReports.forEach((r) => mergedReportsMap.set(r.id, r));
      liveCloudReports.forEach((r) => mergedReportsMap.set(r.id, r));
      const mergedList = Array.from(mergedReportsMap.values());
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(mergedList));
    }

    // 同理：补推云端还没有的本地 report。放在 project 补推之后执行，
    // 保证同一 project 的云端行先落地，避免外键校验失败。
    if (currentUser?.uid) {
      const cloudReportIds = new Set(liveCloudReports.map((r) => r.id));
      const localOnlyReports = localReports.filter((r) => !cloudReportIds.has(r.id));
      for (const r of localOnlyReports) {
        await saveReportToCloud(r, currentUser);
      }
    }

    if (cloudQuestions.length > 0) {
      const localQuestions = getEscalatedQuestions();
      const mergedQMap = new Map<string, EscalatedQuestion>();
      localQuestions.forEach((q) => mergedQMap.set(q.id, q));
      cloudQuestions.forEach((q) => mergedQMap.set(q.id, q));
      const mergedList = Array.from(mergedQMap.values());
      localStorage.setItem(STORAGE_KEY_RULES_REPO, JSON.stringify(mergedList));
    } else {
      const localQuestions = getEscalatedQuestions();
      for (const q of localQuestions) {
        await saveQuestionToCloud(q);
      }
    }

    console.log('✅ Supabase cloud tables synced with user state.');
  } catch (err) {
    console.warn('Cloud sync encountered non-fatal issue:', err);
  }
}

export const loadStoredProjects = getStoredProjects;
export const saveStoredProjects = (projects: BusinessFormData[]): void => {
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
};
export const loadStoredReports = getAllReports;
export const saveStoredReports = (reports: AssessmentReport[]): void => {
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
};
// 判断是否为"全新安装"（对应存储键完全不存在），用于避免用户删除全部数据后刷新又被示例数据"复活"
export const hasAnyStoredProjects = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY_PROJECTS) !== null;
  } catch {
    return false;
  }
};
export const hasAnyStoredReports = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY_REPORTS) !== null;
  } catch {
    return false;
  }
};

// ========================
// 商业知识学习中心：观看进度（第4点，纯本地浏览器记录，不上传云端）
// ========================
export function getLearningProgress(): Record<string, LearningProgressEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEARNING_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setVideoWatched(videoId: string, watched: boolean): Record<string, LearningProgressEntry> {
  const current = getLearningProgress();
  const updated: Record<string, LearningProgressEntry> = {
    ...current,
    [videoId]: { videoId, watched, lastWatchedAt: new Date().toISOString() }
  };
  try {
    localStorage.setItem(STORAGE_KEY_LEARNING_PROGRESS, JSON.stringify(updated));
  } catch {
    /* 存储空间不可用时静默忽略，不影响页面正常浏览 */
  }
  return updated;
}
