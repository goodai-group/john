// 收入细节辅助估算：销量×单价 / 客流量×成交率×复购率 → 预估总流水。
// 全部字段选填；填写后估算结果直接作为「真实经营收入」与「总流水」写入表单，
// 不需要用户再手动重复填一遍总额（参见 AssessmentForm.tsx 里的 applyEstimatedRevenue）。
import { RevenueDetailEstimate } from '../types.js';

/** 按销量×单价，或客流量×成交率（叠加复购贡献）估算月销售件数；两者都未填则返回 null */
export function estimateUnitsSold(detail: RevenueDetailEstimate | undefined): number | null {
  if (!detail) return null;
  if (detail.monthlyFootfall && detail.conversionRatePercent) {
    const repeatMultiplier = 1 + (detail.repeatPurchaseRatePercent || 0) / 100;
    return detail.monthlyFootfall * (detail.conversionRatePercent / 100) * repeatMultiplier;
  }
  if (typeof detail.unitsSold === 'number' && detail.unitsSold > 0) {
    return detail.unitsSold;
  }
  return null;
}

/** 估算月总流水：优先用客流量链路（更细），否则退回销量×单价；单价缺失则无法估算 */
export function estimateMonthlyRevenue(detail: RevenueDetailEstimate | undefined): number | null {
  if (!detail || !detail.avgUnitPrice) return null;
  const units = estimateUnitsSold(detail);
  if (units == null) return null;
  return units * detail.avgUnitPrice;
}
