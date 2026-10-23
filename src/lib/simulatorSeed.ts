import { BusinessFormData, CurrencyCode } from '../types.js';
import { CUSTOM_CURRENCY_VALUE, SUPPORTED_CURRENCIES, convertToTargetCurrency } from './currencies.js';
import { aggregateMonthlyCosts } from './costAggregation.js';
import { normalizeToMonthly } from './ledgerCycle.js';
import { INDUSTRY_BENCHMARKS } from './industryBenchmarks.js';

/** 沙盒试算的输入参数（全部为月度金额，币种为 currency） */
export interface SimulatorInputs {
  currency: CurrencyCode;
  industry: string;
  monthlyRevenue: number;
  realRevenueRatio: number;
  cogsRatio: number;
  rent: number;
  labor: number;
  utilities: number;
  otherOpex: number;
  taxes: number;
  debtPayment: number;
  liquidCash: number;
  operatingMonths: number;
  employees: number;
}

/**
 * 把一个已有项目折算成沙盒的输入参数，让用户「从我的项目载入」后直接在自己的数字上试算，
 * 而不是从 0 开始重新输一遍。
 *
 * 成本复用 aggregateMonthlyCosts（与正式评分引擎同一份实现）：
 *   - 直接成本（物料 + 一线服务人工）折成占真实收入的比例；
 *   - 房租 / 管理人工 / 水电单列，其余固定开销（动态明细、注册签证折旧分摊、其他）并入「其他运营开销」，
 *     保证总额与正式报告一致，载入后的试算分数与报告分数可以对上。
 */
export function simulatorInputsFromProject(project: BusinessFormData): SimulatorInputs {
  const projectCurrency =
    project.baseCurrency === CUSTOM_CURRENCY_VALUE && project.customCurrencyCode
      ? project.customCurrencyCode
      : project.baseCurrency || 'USD';
  // 沙盒的币种下拉只有内置币种；自定义币种的项目按美元换算后载入
  const currency = SUPPORTED_CURRENCIES.some((c) => !c.isCustomOption && c.code === projectCurrency)
    ? projectCurrency
    : 'USD';
  const customRateValue = project.hasMultipleRates ? project.customExchangeRateValue : undefined;
  const customRateCode = project.hasMultipleRates ? projectCurrency : undefined;
  const conv = (f: BusinessFormData['monthlyRevenue'] | undefined) =>
    convertToTargetCurrency(f, currency, customRateValue, customRateCode);
  const convMonthly = (f: BusinessFormData['rentCost'] | undefined) =>
    normalizeToMonthly(conv(f), f?.cycle || 'monthly', f?.amortizationMonths);

  const gross = conv(project.monthlyRevenue);
  const grants = conv(project.monthlyExternalGrants);
  const real = conv(project.monthlyRealOperatingRevenue) || Math.max(0, gross - grants);
  const monthlyRevenue = Math.max(gross, real);

  const costs = aggregateMonthlyCosts(project, currency, customRateValue, customRateCode);
  const rent = convMonthly(project.rentCost);
  const labor = convMonthly(project.laborCost);
  const utilities = convMonthly(project.utilityCost);
  const otherOpex = Math.max(0, costs.totalOpex - rent - labor - utilities);

  // 比例不取整：取整后（如 41.67% → 42%）载入的分数会与报告差 1 分
  const clampPct = (n: number) => Math.min(100, Math.max(0, n));

  return {
    currency,
    industry: INDUSTRY_BENCHMARKS.some((b) => b.id === project.industry) ? project.industry : 'custom',
    monthlyRevenue: Math.round(monthlyRevenue),
    realRevenueRatio: monthlyRevenue > 0 ? clampPct((real / monthlyRevenue) * 100) : 100,
    cogsRatio: real > 0 ? clampPct((costs.cogs / real) * 100) : 0,
    rent: Math.round(rent),
    labor: Math.round(labor),
    utilities: Math.round(utilities),
    otherOpex: Math.round(otherOpex),
    taxes: Math.round(costs.tax),
    debtPayment: Math.round(costs.debtPayment),
    liquidCash: Math.round(conv(project.cashAndLiquidAssets)),
    operatingMonths: project.operatingMonthsCount || 0,
    employees: project.fullTimeEmployeesCount || 0
  };
}
