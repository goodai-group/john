// 收入细节估算：销量×单价 / 客流量×成交率 → 月成单数 → 预估总流水。
// 「月客流量×成交率」本身就是月成单数，不再叠加复购率（复购已经体现在客流量里）。
// 两条路径至少填完一条（含客单价）才算完整；两条都填且结果不一致时，由
// anomalyDetection.ts 里的规则提醒用户核对，这里只负责算数值。
import { RevenueDetailEstimate } from '../types.js';

/** 路径A：直接填月销售总量 */
export function unitsFromDirectSales(detail: RevenueDetailEstimate | undefined): number | null {
  return typeof detail?.unitsSold === 'number' && detail.unitsSold > 0 ? detail.unitsSold : null;
}

/** 路径B：月客流量 × 成交率，即月成单数；两者必须都填才算数 */
export function unitsFromFootfall(detail: RevenueDetailEstimate | undefined): number | null {
  if (!detail?.monthlyFootfall || !detail?.conversionRatePercent) return null;
  return detail.monthlyFootfall * (detail.conversionRatePercent / 100);
}

/** 月客流量、成交率只填了其中一个（另一个空着，无法算出路径B） */
export function footfallPathIsPartial(detail: RevenueDetailEstimate | undefined): boolean {
  const hasFootfall = !!detail?.monthlyFootfall;
  const hasConversion = !!detail?.conversionRatePercent;
  return hasFootfall !== hasConversion;
}

/** 两条路径是否都已算出结果、且相差超过容差（视为数据矛盾，需要用户核对） */
export function pathsConflict(detail: RevenueDetailEstimate | undefined, toleranceRatio = 0.02): boolean {
  const a = unitsFromDirectSales(detail);
  const b = unitsFromFootfall(detail);
  if (a == null || b == null) return false;
  const base = Math.max(a, b);
  if (base === 0) return false;
  return Math.abs(a - b) / base > toleranceRatio;
}

/** 最终用于计算收入的月销量：两条路径都填了以客流量路径（更细）为准，否则用先填好的那条 */
export function resolvedUnitsSold(detail: RevenueDetailEstimate | undefined): number | null {
  return unitsFromFootfall(detail) ?? unitsFromDirectSales(detail);
}

/** 估算月总流水（真实经营收入）：客单价缺失，或两条路径都未完整填写时返回 null */
export function estimateMonthlyRevenue(detail: RevenueDetailEstimate | undefined): number | null {
  if (!detail?.avgUnitPrice) return null;
  const units = resolvedUnitsSold(detail);
  if (units == null) return null;
  return units * detail.avgUnitPrice;
}

/** 是否已经填完整（客单价 + 至少一条销量路径），达到「赚多少」板块的必填要求 */
export function hasCompleteRevenueEstimate(detail: RevenueDetailEstimate | undefined): boolean {
  return estimateMonthlyRevenue(detail) != null;
}
