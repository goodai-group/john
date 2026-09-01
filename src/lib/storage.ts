import {
  AssessmentReport,
  BusinessFormData,
  EscalatedQuestion,
  AppUser
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
} from './firebase';

const STORAGE_KEY_PROJECTS = 'bam_projects_v14';
const STORAGE_KEY_REPORTS = 'bam_reports_v14';
const STORAGE_KEY_DRAFT = 'bam_active_draft_v14';
const STORAGE_KEY_RULES_REPO = 'bam_escalated_rules_v14';
const STORAGE_KEY_INITIAL_SEEDED = 'bam_cloud_seeded_v14';

export const INITIAL_PRESET_PROJECTS: BusinessFormData[] = [
  {
    id: 'proj-demo-1',
    version: 1,
    createdAt: '2026-08-10T08:30:00Z',
    updatedAt: '2026-08-10T09:15:00Z',
    projectName: '阳光工坊社区烘焙店 (Sunny Bakehouse)',
    industry: 'food_beverage',
    businessType: '社区烘焙与熟食',
    isSensitiveRegion: false,
    regionCountry: '肯尼亚 (Kenya)',
    regionDetail: '内罗毕东区 (Nairobi East)',
    contactChannel: '+254 712 345 678',
    anonymousOwnerName: 'Grace M.',
    baseCurrency: 'KES',
    hasMultipleRates: false,
    proofType: 'mobile_payment',
    proofFiles: [
      {
        id: 'file-1',
        name: 'M-Pesa_2026_Till_Statement.pdf',
        type: 'application/pdf',
        size: 1420000,
        uploadTime: '2026-08-10T08:45:00Z',
        retainedAfterOcr: true
      }
    ],
    monthlyBreakdowns: [
      { month: '2026-01', revenue: { amount: 320000, currency: 'KES' }, isEstimated: false },
      { month: '2026-02', revenue: { amount: 310000, currency: 'KES' }, isEstimated: false },
      { month: '2026-03', revenue: { amount: 345000, currency: 'KES' }, isEstimated: false },
      { month: '2026-04', revenue: { amount: 330000, currency: 'KES' }, isEstimated: false },
      { month: '2026-05', revenue: { amount: 325000, currency: 'KES' }, isEstimated: true, note: 'AI依据前后月均值自动估算补充' },
      { month: '2026-06', revenue: { amount: 350000, currency: 'KES' }, isEstimated: false }
    ],
    monthlyRevenue: { amount: 330000, currency: 'KES' },
    monthlyRealOperatingRevenue: { amount: 330000, currency: 'KES' },
    monthlyExternalGrants: { amount: 0, currency: 'KES' },
    cogsCost: { amount: 132000, currency: 'KES' }, // 40%
    rentCost: { amount: 35000, currency: 'KES' },
    laborCost: { amount: 48000, currency: 'KES' },
    utilityCost: { amount: 18000, currency: 'KES' },
    taxCost: { amount: 9000, currency: 'KES' },
    otherOpex: { amount: 12000, currency: 'KES' },
    existingDebtMonthlyPayment: { amount: 15000, currency: 'KES' },
    cashAndLiquidAssets: { amount: 450000, currency: 'KES' },
    inventoryValue: { amount: 200000, currency: 'KES' },
    operatingMonthsCount: 18,
    fullTimeEmployeesCount: 3,
    ownerEmail: 'grace@sunnybake.africa',
    collaborators: [
      {
        email: 'john.accountant@sunnybake.africa',
        role: 'editor',
        invitedAt: '2026-08-10T08:35:00Z',
        sectionAccess: ['costs', 'revenues']
      }
    ],
    isSubmitted: true,
    submittedAt: '2026-08-10T09:15:00Z',
    isDraft: false
  },
  {
    id: 'proj-demo-2',
    version: 1,
    createdAt: '2026-08-18T14:20:00Z',
    updatedAt: '2026-08-18T15:00:00Z',
    projectName: '高原传统手工编织合作社 (Highland Artisan)',
    industry: 'artisan_handicraft',
    businessType: '特色民族手工艺出口与内销',
    // 敏感地区模式
    isSensitiveRegion: true,
    regionCountry: '中东/北非地区 (MENA Region)',
    regionDetail: '（已脱敏：仅保留大区）',
    contactChannel: 'Telegram ID: @highland_craft',
    anonymousOwnerName: '合作社联络代表 #A09',
    baseCurrency: 'EGP',
    hasMultipleRates: true,
    customExchangeRateType: '当地民间商会日常兑换价',
    customExchangeRateValue: 52.5,
    customExchangeRateSource: '开罗商会手工业者联盟周报',
    // 替代凭证与手写账本
    proofType: 'handwritten_book',
    proofFiles: [
      {
        id: 'file-2',
        name: 'handwritten_ledger_2026_spring.jpg',
        type: 'image/jpeg',
        size: 890000,
        uploadTime: '2026-08-18T14:30:00Z',
        retainedAfterOcr: false // 敏感地区脱敏后不保留原图
      }
    ],
    monthlyBreakdowns: [
      { month: '2026-01', revenue: { amount: 48000, currency: 'EGP' }, isEstimated: false },
      { month: '2026-02', revenue: { amount: 52000, currency: 'EGP' }, isEstimated: false },
      { month: '2026-03', revenue: { amount: 49000, currency: 'EGP' }, isEstimated: false },
      { month: '2026-04', revenue: { amount: 55000, currency: 'EGP' }, isEstimated: false }
    ],
    monthlyRevenue: { amount: 52000, currency: 'EGP' },
    monthlyRealOperatingRevenue: { amount: 46000, currency: 'EGP' },
    monthlyExternalGrants: { amount: 6000, currency: 'EGP', isExternalSupport: true },
    cogsCost: { amount: 15000, currency: 'EGP' },
    rentCost: { amount: 4000, currency: 'EGP' },
    laborCost: { amount: 14000, currency: 'EGP' },
    utilityCost: { amount: 2500, currency: 'EGP' },
    taxCost: { amount: 1500, currency: 'EGP' },
    otherOpex: { amount: 2000, currency: 'EGP' },
    existingDebtMonthlyPayment: { amount: 0, currency: 'EGP' },
    cashAndLiquidAssets: { amount: 95000, currency: 'EGP' },
    inventoryValue: { amount: 60000, currency: 'EGP' },
    operatingMonthsCount: 24,
    fullTimeEmployeesCount: 4,
    ownerEmail: 'secure-box-9912@protonmail.com',
    collaborators: [],
    isSubmitted: true,
    submittedAt: '2026-08-18T15:00:00Z',
    isDraft: false
  },
  {
    id: 'proj-demo-3',
    version: 1,
    createdAt: '2026-08-22T10:00:00Z',
    updatedAt: '2026-08-22T10:30:00Z',
    projectName: '诚信微型快修与换胎服务 (Quick Auto Service)',
    industry: 'personal_services',
    businessType: '社区摩托与汽车快修',
    isSensitiveRegion: false,
    regionCountry: '尼日利亚 (Nigeria)',
    regionDetail: '拉各斯市 (Lagos)',
    contactChannel: '+234 802 112 3344',
    anonymousOwnerName: 'Tunde O.',
    baseCurrency: 'NGN',
    hasMultipleRates: true,
    customExchangeRateType: '拉各斯街区日常现金兑换参考价',
    customExchangeRateValue: 1580.0,
    customExchangeRateSource: '本地商户联合会公告',
    // 纯手动无凭证填写
    proofType: 'none',
    proofFiles: [],
    monthlyBreakdowns: [],
    monthlyRevenue: { amount: 1850000, currency: 'NGN' },
    monthlyRealOperatingRevenue: { amount: 1850000, currency: 'NGN' },
    monthlyExternalGrants: { amount: 0, currency: 'NGN' },
    cogsCost: { amount: 550000, currency: 'NGN' },
    rentCost: { amount: 180000, currency: 'NGN' },
    laborCost: { amount: 350000, currency: 'NGN' },
    utilityCost: { amount: 90000, currency: 'NGN' },
    taxCost: { amount: 45000, currency: 'NGN' },
    otherOpex: { amount: 80000, currency: 'NGN' },
    existingDebtMonthlyPayment: { amount: 120000, currency: 'NGN' },
    cashAndLiquidAssets: { amount: 2400000, currency: 'NGN' },
    inventoryValue: { amount: 1500000, currency: 'NGN' },
    operatingMonthsCount: 14,
    fullTimeEmployeesCount: 2,
    ownerEmail: 'tunde.auto@gmail.com',
    collaborators: [],
    isSubmitted: true,
    submittedAt: '2026-08-22T10:30:00Z',
    isDraft: false
  }
];

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
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(INITIAL_PRESET_PROJECTS));
      return INITIAL_PRESET_PROJECTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load projects from storage', e);
    return INITIAL_PRESET_PROJECTS;
  }
}

export function saveProject(project: BusinessFormData): void {
  const current = getStoredProjects();
  const index = current.findIndex((p) => p.id === project.id && p.version === project.version);
  if (index >= 0) {
    current[index] = project;
  } else {
    current.unshift(project);
  }
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(current));

  // Sync to Cloud Firestore Table /assessments
  if (isCloudDatabaseAvailable()) {
    saveAssessmentToCloud(project).catch((err) =>
      console.warn('Background cloud save assessment failed:', err)
    );
  }
}

export function deleteProjectAndReports(projectId: string): void {
  // 彻底撤回/删除项目及其所有版本与报告
  const projects = getStoredProjects().filter((p) => p.id !== projectId);
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));

  const targetReports = getAllReports().filter((r) => r.projectId === projectId);
  const remainingReports = getAllReports().filter((r) => r.projectId !== projectId);
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(remainingReports));

  // Remove from Cloud Firestore Tables
  if (isCloudDatabaseAvailable()) {
    deleteAssessmentFromCloud(projectId).catch((err) =>
      console.warn('Cloud delete assessment failed:', err)
    );
    targetReports.forEach((r) => {
      deleteReportFromCloud(r.id).catch((err) =>
        console.warn('Cloud delete report failed:', err)
      );
    });
  }
}

export function getAllReports(): AssessmentReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!raw) {
      // 为初始项目生成初始评估报告
      const initialReports = INITIAL_PRESET_PROJECTS.map((p) => runBusinessAssessment(p));
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(initialReports));
      return initialReports;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load reports from storage', e);
    return [];
  }
}

export function saveReport(report: AssessmentReport): void {
  const current = getAllReports();
  const index = current.findIndex((r) => r.id === report.id);
  if (index >= 0) {
    current[index] = report;
  } else {
    current.unshift(report);
  }
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(current));

  // Sync to Cloud Firestore Table /reports
  if (isCloudDatabaseAvailable()) {
    saveReportToCloud(report).catch((err) =>
      console.warn('Background cloud save report failed:', err)
    );
  }
}

export function getProjectReports(projectId: string): AssessmentReport[] {
  const all = getAllReports();
  return all.filter((r) => r.projectId === projectId).sort((a, b) => b.version - a.version);
}

export function getActiveDraft(): BusinessFormData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveDraft(draft: BusinessFormData): void {
  localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draft));
}

export function clearActiveDraft(): void {
  localStorage.removeItem(STORAGE_KEY_DRAFT);
}

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

  // Sync to Cloud Firestore Table /escalated_questions
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
export async function syncWithCloudDatabase(currentUser?: AppUser | null): Promise<void> {
  if (!isCloudDatabaseAvailable()) return;

  try {
    const [cloudProjects, cloudReports, cloudQuestions] = await Promise.all([
      fetchAssessmentsFromCloud(currentUser),
      fetchReportsFromCloud(currentUser),
      fetchQuestionsFromCloud()
    ]);

    // If cloud has projects, merge them with local
    if (cloudProjects.length > 0) {
      const localProjects = getStoredProjects();
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
      cloudProjects.forEach(putLatest);
      const mergedList = Array.from(mergedProjectsMap.values());
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(mergedList));
    } else {
      // If cloud is completely empty, seed initial local projects
      const localProjects = getStoredProjects();
      for (const p of localProjects) {
        await saveAssessmentToCloud(p, currentUser);
      }
    }

    if (cloudReports.length > 0) {
      const localReports = getAllReports();
      const mergedReportsMap = new Map<string, AssessmentReport>();
      localReports.forEach((r) => mergedReportsMap.set(r.id, r));
      cloudReports.forEach((r) => mergedReportsMap.set(r.id, r));
      const mergedList = Array.from(mergedReportsMap.values());
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(mergedList));
    } else {
      const localReports = getAllReports();
      for (const r of localReports) {
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

    console.log('✅ Cloud Firestore tables synced with user state.');
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
