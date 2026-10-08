/**
 * 毛利口径（会计口径）与分行业毛利率红线。
 *
 * 会计上 毛利 = 营业收入 − 营业成本，营业成本是"为取得这笔收入直接发生的成本"：
 *   - 卖货型生意（零售/餐饮/农业）：营业成本基本就是进货/原材料成本；
 *   - 服务型生意（教育培训/职业实训/托育/美业/诊所）："产品"本身就是人提供的服务，
 *     授课老师、技师、护理员等一线人员的工资属于直接人工，应计入营业成本；
 *     前台、行政、招生、店长等管理人员工资仍属期间费用（OPEX），在毛利之后扣除。
 *
 * 因此服务型行业的会计毛利率天然低于"只扣物料"的口径，毛利率红线与评分档位
 * 也必须按行业区分，不能沿用卖货生意的同一条 20% 红线。
 */

/** 一线服务人员工资构成主要营业成本的行业（表单默认展示"直接服务人工"一栏） */
export const DIRECT_SERVICE_LABOR_INDUSTRIES = [
  'education_training',
  'vocational_training',
  'child_care',
  'community_service',
  'medical_health'
] as const;

export function usesDirectServiceLabor(industry: string | undefined): boolean {
  return (DIRECT_SERVICE_LABOR_INDUSTRIES as readonly string[]).includes(industry || '');
}

export interface GrossMarginPolicy {
  /** GATE-2 通过线（%） */
  passAt: number;
  /** GATE-2 警告线（%），低于该值直接 FAIL */
  warnAt: number;
  /** 毛利率评分 excellent 档（%） */
  excellentAt: number;
  /** 毛利率评分 good 档（%） */
  goodAt: number;
  /** 毛利率达到该值即得满分 100（%），评分 = 毛利率 / fullScoreAt × 100 */
  fullScoreAt: number;
}

// 卖货型及未知行业：沿用原有口径（20%/10% 红线、40%/25% 档位、毛利率×1.8 计分）。
const DEFAULT_POLICY: GrossMarginPolicy = {
  passAt: 20,
  warnAt: 10,
  excellentAt: 40,
  goodAt: 25,
  fullScoreAt: 100 / 1.8
};

// 服务型行业：营业成本含直接服务人工后的会计毛利率区间，与 industryBenchmarks.ts 的
// typicalGrossMargin 对应——红线取在典型区间下沿以下，留出小微项目的爬坡空间。
const SERVICE_POLICIES: Record<string, GrossMarginPolicy> = {
  education_training: { passAt: 30, warnAt: 20, excellentAt: 45, goodAt: 30, fullScoreAt: 60 },
  vocational_training: { passAt: 30, warnAt: 20, excellentAt: 45, goodAt: 30, fullScoreAt: 55 },
  child_care: { passAt: 25, warnAt: 15, excellentAt: 40, goodAt: 25, fullScoreAt: 50 },
  community_service: { passAt: 30, warnAt: 20, excellentAt: 50, goodAt: 35, fullScoreAt: 60 },
  medical_health: { passAt: 25, warnAt: 15, excellentAt: 45, goodAt: 30, fullScoreAt: 55 }
};

export function getGrossMarginPolicy(industry: string | undefined): GrossMarginPolicy {
  return SERVICE_POLICIES[industry || ''] || DEFAULT_POLICY;
}
