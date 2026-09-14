// Tool Registry —— 确定性内核的声明式封装
//
// 【设计红线 · 见《方案》第 02 章】
// 产品最强的护城河是「评分规则 100% 公开、评分零 AI 参与」。因此 src/lib/ 下的
// 确定性引擎全部以 Tool 形式暴露：**Agent 只能调用它们，不能替代其中任何一个数字。**
//
// 声明式注册的两个理由：
//   1. Agent 在 definition 里声明 tools: string[]，Guardian（Phase 3）据此审计
//      「这个 Agent 是否调用了它没声明的能力」；
//   2. Phase 2 的 Strategist 需要在**服务端**跑模拟验算（每条建议先算出分数增益，
//      不达标就丢弃）。这些引擎此前只在浏览器里跑，注册到这里即打通服务端路径。
//
// 注意：这些函数全是纯函数，无 DOM / 无 import.meta 依赖，可安全进入服务端 ESM 图。
import { runBusinessAssessment } from '../lib/scoringEngine.js';
import { calculateBreakEvenRevenue } from '../lib/breakEvenCalculator.js';
import { calculatePaybackPeriod, calculateRequiredRevenueForTarget } from '../lib/paybackCalculator.js';
import { detectFormAnomalies } from '../lib/anomalyDetection.js';
import { aggregateMonthlyCosts } from '../lib/costAggregation.js';
import { convertToTargetCurrency, SUPPORTED_CURRENCIES } from '../lib/currencies.js';
import { INDUSTRY_BENCHMARKS } from '../lib/industryBenchmarks.js';
import { inferBusinessStructureLocally } from '../lib/inferBusinessStructure.js';

/** Tool 元信息：名称 + 一句话职责 + 是否确定性 */
export interface ToolMeta {
  name: string;
  description: string;
  /** true = 纯数学，同样输入必得同样输出，可作为 Agent 输出的校验依据 */
  deterministic: boolean;
}

/**
 * 已注册的 Tool 清单。
 *
 * 所有 deterministic: true 的 Tool 构成「确定性内核」——
 * Agent 的产物可以被它们回验，这是 Strategist 模拟验算机制的基础。
 */
export const TOOL_REGISTRY = {
  runBusinessAssessment: {
    meta: {
      name: 'runBusinessAssessment',
      description: '正式评分引擎：5 道 Gate + 6 项加权指标，输出完整体检报告',
      deterministic: true
    } as ToolMeta,
    fn: runBusinessAssessment
  },
  calculateBreakEvenRevenue: {
    meta: {
      name: 'calculateBreakEvenRevenue',
      description: '盈亏平衡点：回答「什么时候不再亏钱」',
      deterministic: true
    } as ToolMeta,
    fn: calculateBreakEvenRevenue
  },
  calculatePaybackPeriod: {
    meta: {
      name: 'calculatePaybackPeriod',
      description: '回本周期：回答「投进去的本金什么时候收回来」',
      deterministic: true
    } as ToolMeta,
    fn: calculatePaybackPeriod
  },
  calculateRequiredRevenueForTarget: {
    meta: {
      name: 'calculateRequiredRevenueForTarget',
      description: '按目标回本时间反推所需月/日收入',
      deterministic: true
    } as ToolMeta,
    fn: calculateRequiredRevenueForTarget
  },
  detectFormAnomalies: {
    meta: {
      name: 'detectFormAnomalies',
      description: '填报异常检测：单位填反、类目填反、数量级错误',
      deterministic: true
    } as ToolMeta,
    fn: detectFormAnomalies
  },
  aggregateMonthlyCosts: {
    meta: {
      name: 'aggregateMonthlyCosts',
      description: '成本聚合的单一实现来源（COGS/OPEX/税/还贷/摊销）',
      deterministic: true
    } as ToolMeta,
    fn: aggregateMonthlyCosts
  },
  convertToTargetCurrency: {
    meta: {
      name: 'convertToTargetCurrency',
      description: '多币种归一折算（112 种货币 + 自报平行汇率）',
      deterministic: true
    } as ToolMeta,
    fn: convertToTargetCurrency
  },
  inferBusinessStructureLocally: {
    meta: {
      name: 'inferBusinessStructureLocally',
      description: '本地关键词规则库推断行业/币种/成本骨架（云端不可用时的降级路径）',
      deterministic: true
    } as ToolMeta,
    fn: inferBusinessStructureLocally
  }
} as const;

export type ToolName = keyof typeof TOOL_REGISTRY;

/** 静态数据集（非函数），同样供 Agent 只读引用 */
export const TOOL_DATASETS = {
  SUPPORTED_CURRENCIES,
  INDUSTRY_BENCHMARKS
} as const;

/** 取出一个 Tool 的实现 */
export function getTool<K extends ToolName>(name: K): (typeof TOOL_REGISTRY)[K]['fn'] {
  return TOOL_REGISTRY[name].fn;
}

/** 列出全部 Tool 元信息（Guardian 审计与 /api/health 自检用） */
export function listTools(): ToolMeta[] {
  return Object.values(TOOL_REGISTRY).map((t) => t.meta);
}
