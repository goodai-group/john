// Revenue Gap Agent —— 月度流水断点插值补全
//
// 【Phase 0】原 server.ts 第 1208-1268 行（/api/ai/ocr-estimate）。算法一字未改。
//
// 【命名说明】原接口名为 ocr-estimate，但它**完全不含 AI、也完全不做 OCR** ——
// 纯线性插值。这个误导性命名在《方案》第 01 章已点名。Phase 0 只改内部命名
// （revenueGap），对外 URL 保持 /api/ai/ocr-estimate 不变以保证前端零改动。
//
// 【未来归属】Registrar 建档员（project_fact）。产物必须标记 isEstimated，
// 属于「待确认」状态，绝不可直接进入评分引擎 —— 只有 confirmed 字段才进引擎。
//
// 【特殊性】这是唯一一个没有云端路径的 Agent：run() 本身就是确定性计算，
// 因此 run 与 fallback 指向同一实现，永远不会降级。
import { AgentDefinition } from './types.js';

export interface RevenueGapInput {
  rawRecords: Array<{ month?: string; amount?: number }>;
  currency: string;
}

export interface RevenueGapOutput {
  success: true;
  data: Array<{
    month: string;
    revenue: { amount: number; currency: string };
    isEstimated: boolean;
    note?: string;
  }>;
  estimatedCount: number;
  notice: string;
}

/**
 * 按「最近的真实月份数据」插值补全缺失/为 0 的月份。
 *
 * 修复历史：原实现把月份数组写死为 ['2026-01'..'2026-06']，任何不落在这个固定窗口内的
 * 真实月份（如 2025 年数据、或超出 6 月的月份）都会被当成"完全缺失"，
 * 并且相邻月份也只会在这个写死数组里查找，实际上永远查不到匹配、只会用兜底值 30000 估算。
 * 现在月份列表直接取自用户传入 rawRecords 自身携带的月份（按字符串排序）。
 */
export function estimateRevenueGaps(input: RevenueGapInput): RevenueGapOutput {
  const { rawRecords, currency } = input;

  const months = Array.from(
    new Set(
      rawRecords
        .map((r) => r?.month)
        .filter((m): m is string => typeof m === 'string' && m.length > 0)
    )
  ).sort();

  if (months.length === 0) {
    return {
      success: true,
      data: [],
      estimatedCount: 0,
      notice: '未提供任何月份数据，无法进行断点估算。'
    };
  }

  const amounts = months.map((m) => {
    const rec = rawRecords.find((r) => r.month === m);
    return typeof rec?.amount === 'number' && rec.amount > 0 ? rec.amount : 0;
  });

  const findNearestKnown = (fromIdx: number, step: 1 | -1): number | null => {
    for (let i = fromIdx; i >= 0 && i < amounts.length; i += step) {
      if (amounts[i] > 0) return amounts[i];
    }
    return null;
  };

  const result = months.map((m, idx) => {
    if (amounts[idx] > 0) {
      return { month: m, revenue: { amount: amounts[idx], currency }, isEstimated: false };
    }
    const prevKnown = findNearestKnown(idx - 1, -1);
    const nextKnown = findNearestKnown(idx + 1, 1);
    const estimatedVal =
      prevKnown !== null && nextKnown !== null
        ? Math.round((prevKnown + nextKnown) / 2)
        : Math.round(prevKnown ?? nextKnown ?? 30000);
    return {
      month: m,
      revenue: { amount: estimatedVal, currency },
      isEstimated: true,
      note: 'AI识别流水断点，按最近的真实月份数据自动估算，请核对确认'
    };
  });

  return {
    success: true,
    data: result,
    estimatedCount: result.filter((r) => r.isEstimated).length,
    notice:
      '部分月份数据不完整，已由系统自动根据前后月份均值生成参考估算值，用户可直接采纳或手动修改。'
  };
}

export const revenueGapAgent: AgentDefinition<RevenueGapInput, RevenueGapOutput> = {
  name: 'revenueGap',
  claimType: 'project_fact',
  futureRole: 'Registrar 建档员',
  tools: [],
  timeoutMs: 5000,
  deterministic: true,

  parseInput(raw) {
    const body: any = (raw && typeof raw === 'object' ? raw : {}) || {};
    return {
      rawRecords: Array.isArray(body.rawRecords) ? body.rawRecords : [],
      currency: body.currency || 'USD'
    };
  },

  async run(input) {
    return estimateRevenueGaps(input);
  },

  // 无云端路径，降级即本体
  fallback(input) {
    return estimateRevenueGaps(input);
  }
};
