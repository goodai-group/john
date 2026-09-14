// Tracker 随访员 —— 只说变了什么
//
// 【Phase 3】版本对比功能（产品文档 5.10）此前已存在，但它是被动的：
// 用户点「对比」才展示三个数字的涨跌。Tracker 把它升级为主动归因：
// 「掉 3 分是因为房租涨了 8%」。
//
// 这是《方案》里 ROI 最高的新增角色 —— 它把一次性工具变成持续关系。
//
// 禁止：
//   ✕ 产生任何新数字（只做两版之间的确定性 diff）
//   ✕ 开新处方（要开，交回 Strategist）
//
// 【特殊性】纯确定性，无云端路径。归因是算出来的，不是模型说的。
import type { AgentDefinition } from './types.js';
import { AgentInputError } from './types.js';
import type { AssessmentReport, BusinessFormData } from '../types.js';

export interface TrackerInput {
  current: { form: BusinessFormData; report: AssessmentReport };
  previous: { form: BusinessFormData; report: AssessmentReport } | null;
  language: string;
}

export interface FieldChange {
  field: string;
  labelZh: string;
  labelEn: string;
  from: number;
  to: number;
  deltaPercent: number;
}

export interface TrackerOutput {
  success: true;
  hasPrevious: boolean;
  scoreDelta: number;
  tierChanged: boolean;
  previousTier: string | null;
  currentTier: string;
  /** 驱动本次分数变化的字段改动，按影响幅度排序 */
  drivers: FieldChange[];
  /** 大白话归因，由上面的确定性 diff 生成 */
  attribution: string;
}

/** 参与归因的字段：这些字段的变动会直接影响评分 */
const TRACKED_FIELDS: Array<{ key: keyof BusinessFormData; zh: string; en: string }> = [
  { key: 'monthlyRevenue', zh: '月总流水', en: 'monthly gross revenue' },
  { key: 'monthlyRealOperatingRevenue', zh: '真实经营收入', en: 'real operating revenue' },
  { key: 'monthlyExternalGrants', zh: '外部赠款', en: 'external grants' },
  { key: 'cogsCost', zh: '进货成本', en: 'procurement cost' },
  { key: 'rentCost', zh: '场地租金', en: 'rent' },
  { key: 'laborCost', zh: '人工支出', en: 'labor cost' },
  { key: 'utilityCost', zh: '水电杂费', en: 'utilities' },
  { key: 'taxCost', zh: '税金规费', en: 'taxes and fees' },
  { key: 'existingDebtMonthlyPayment', zh: '每月还款', en: 'monthly debt service' },
  { key: 'cashAndLiquidAssets', zh: '现金备用金', en: 'cash reserve' }
];

function amountOf(form: BusinessFormData, key: keyof BusinessFormData): number {
  const f = (form as any)[key];
  return f && typeof f === 'object' && typeof f.amount === 'number' ? f.amount : 0;
}

function diffFields(prev: BusinessFormData, curr: BusinessFormData): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const t of TRACKED_FIELDS) {
    const from = amountOf(prev, t.key);
    const to = amountOf(curr, t.key);
    if (from === to) continue;
    const deltaPercent = from === 0 ? 100 : Number((((to - from) / from) * 100).toFixed(1));
    changes.push({ field: String(t.key), labelZh: t.zh, labelEn: t.en, from, to, deltaPercent });
  }
  // 按变动幅度绝对值排序 —— 幅度最大的最可能是分数变化的主因
  return changes.sort((a, b) => Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent));
}

function buildAttribution(
  scoreDelta: number,
  drivers: FieldChange[],
  language: string
): string {
  const isEn = language === 'en';

  if (drivers.length === 0) {
    return isEn
      ? scoreDelta === 0
        ? 'Nothing changed since the last assessment.'
        : `The score moved by ${scoreDelta} points, but none of the tracked figures changed — check whether operating months or headcount were updated.`
      : scoreDelta === 0
        ? '与上一版相比没有任何变化。'
        : `分数变化了 ${scoreDelta} 分，但被追踪的金额字段都没动 —— 请检查是不是改了经营月数或雇员人数。`;
  }

  const top = drivers.slice(0, 2);
  const parts = top.map((d) => {
    const dir = d.deltaPercent > 0 ? (isEn ? 'up' : '涨了') : isEn ? 'down' : '降了';
    const pct = Math.abs(d.deltaPercent);
    return isEn ? `${d.labelEn} went ${dir} ${pct}%` : `${d.labelZh}${dir} ${pct}%`;
  });

  if (isEn) {
    const verb = scoreDelta > 0 ? `gained ${scoreDelta}` : scoreDelta < 0 ? `lost ${Math.abs(scoreDelta)}` : 'held steady at 0';
    return `The score ${verb} points, mainly because ${parts.join(' and ')}.`;
  }
  const verb = scoreDelta > 0 ? `涨了 ${scoreDelta} 分` : scoreDelta < 0 ? `掉了 ${Math.abs(scoreDelta)} 分` : '没有变化';
  return `分数${verb}，主要是因为${parts.join('、')}。`;
}

function computeChange(input: TrackerInput): TrackerOutput {
  const { current, previous, language } = input;

  if (!previous) {
    return {
      success: true,
      hasPrevious: false,
      scoreDelta: 0,
      tierChanged: false,
      previousTier: null,
      currentTier: current.report.tier,
      drivers: [],
      attribution:
        language === 'en'
          ? 'This is the first assessment — there is nothing to compare against yet.'
          : '这是第一版体检，还没有可对比的历史版本。'
    };
  }

  const scoreDelta = Number((current.report.totalScore - previous.report.totalScore).toFixed(1));
  const drivers = diffFields(previous.form, current.form);

  return {
    success: true,
    hasPrevious: true,
    scoreDelta,
    tierChanged: previous.report.tier !== current.report.tier,
    previousTier: previous.report.tier,
    currentTier: current.report.tier,
    drivers,
    attribution: buildAttribution(scoreDelta, drivers, language)
  };
}

export const trackerAgent: AgentDefinition<TrackerInput, TrackerOutput> = {
  name: 'tracker',
  claimType: 'change',
  futureRole: 'Tracker 随访员',
  tools: [],
  timeoutMs: 5000,
  deterministic: true,

  parseInput(raw) {
    const body: any = (raw && typeof raw === 'object' ? raw : {}) || {};
    if (!body.current?.form || !body.current?.report) {
      throw new AgentInputError('Current form and report are required');
    }
    return {
      current: body.current,
      previous: body.previous ?? null,
      language: body.language ?? 'zh'
    };
  },

  async run(input) {
    return computeChange(input);
  },

  fallback(input) {
    return computeChange(input);
  }
};
