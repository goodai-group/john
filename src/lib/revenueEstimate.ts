// 收入细节辅助估算：销量×单价 / 客流量×成交率×复购率 → 预估总流水；
// 以及 COGS 单件进价 / 阶梯采购价 → 按估算销量反推 COGS。
// 全部字段选填，仅用于估算与核对提示，不参与主计算引擎（评分/报告仍以用户手动填写的总流水与 COGS 为准）。
import { CogsUnitPricing, RevenueDetailEstimate } from '../types.js';

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

/** 按估算销量与单件进价/阶梯采购价反推 COGS；缺少销量或进价信息则返回 null */
export function estimateCogs(unitsSold: number | null, pricing: CogsUnitPricing | undefined): number | null {
  if (unitsSold == null || !pricing) return null;
  if (pricing.tiers && pricing.tiers.length > 0) {
    const sorted = [...pricing.tiers].sort((a, b) => a.minQuantity - b.minQuantity);
    const matched = [...sorted].reverse().find((tier) => unitsSold >= tier.minQuantity) || sorted[0];
    return unitsSold * matched.unitCost;
  }
  if (typeof pricing.unitCost === 'number' && pricing.unitCost > 0) {
    return unitsSold * pricing.unitCost;
  }
  return null;
}
