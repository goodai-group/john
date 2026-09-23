import { BillingCycle } from '../types.js';

/**
 * 把任意计费周期的金额折算为月度等效额。纯算术，不做任何判断——
 * 'one_time' 是否应该摊销（资本性支出）还是压根不该进月度指标（真正一次性支出），
 * 这个判断由 CPA 分类 Agent 做出（见 ledgerClassifier.ts），这里只负责按摊销月数
 * 做除法；未提供 amortizationMonths 时按 0 处理——调用方应把原始金额计入
 * 「一次性启动支出」（oneTimeStartupItems），而不是月度经营指标。
 */
export function normalizeToMonthly(
  amount: number,
  cycle: BillingCycle,
  amortizationMonths?: number
): number {
  const safeAmount = Number(amount) || 0;
  switch (cycle) {
    case 'monthly':
      return safeAmount;
    case 'quarterly':
      return safeAmount / 3;
    case 'annual':
      return safeAmount / 12;
    case 'one_time':
      return amortizationMonths && amortizationMonths > 0 ? safeAmount / amortizationMonths : 0;
    default:
      return safeAmount;
  }
}
