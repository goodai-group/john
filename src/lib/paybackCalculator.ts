import { BusinessFormData } from '../types';
import { CUSTOM_CURRENCY_VALUE, convertToTargetCurrency } from './currencies';
import { aggregateMonthlyCosts } from './costAggregation';

/**
 * 第5点：回本时间（收回初始投资所需的时间），与盈亏平衡点（breakEvenCalculator）是两条不同的时间线：
 * 盈亏平衡点回答"什么时候不再亏钱"，回本时间回答"投进去的本金什么时候能收回来"——
 * 两者不能混为一谈，因此单独建模，不复用同一个函数。
 *
 * 月度净结余 = 月收入（优先取"真实经营收入"，未填则退回"经营月均总流水"） − 全部已知月度成本
 *              （COGS + 固定/动态运营开销 + 税金 + 还贷 + 注册/签证/折旧月度等效额）
 * 回本月数 = 初始投资估算 ÷ 月度净结余（净结余 ≤ 0 时无法算出回本时间，只会一直亏钱）
 *
 * 第6点：按用户设定的目标回本时间反推所需月收入/日收入：
 * 所需月度净结余 = 初始投资估算 ÷ 目标回本月数
 * 所需月收入 = 所需月度净结余 + 全部已知月度成本（口径与上面一致）
 */
export interface PaybackResult {
  monthlyNetSurplus: number;
  initialInvestment: number;
  paybackMonths: number | null; // null 表示净结余不为正，算不出回本时间
  hasEnoughData: boolean; // 是否已填初始投资估算
}

export interface ReverseTargetResult {
  targetMonths: number;
  requiredMonthlySurplus: number;
  requiredMonthlyRevenue: number;
  requiredDailyRevenue: number;
  operatingDaysPerMonth: number;
}

type PaybackFormFields = Pick<
  BusinessFormData,
  | 'monthlyRevenue'
  | 'monthlyRealOperatingRevenue'
  | 'cogsCost'
  | 'dynamicCogsItems'
  | 'rentCost'
  | 'laborCost'
  | 'utilityCost'
  | 'otherOpex'
  | 'dynamicOpexItems'
  | 'taxCost'
  | 'existingDebtMonthlyPayment'
  | 'companyRegistrationCost'
  | 'companyRegistrationAmortizationMonths'
  | 'visaFeeCost'
  | 'visaFeeAmortizationMonths'
  | 'equipmentDepreciationCost'
  | 'initialInvestmentEstimate'
  | 'baseCurrency'
  | 'customCurrencyCode'
  | 'hasMultipleRates'
  | 'customExchangeRateValue'
>;

function resolveBaseCurrency(formData: PaybackFormFields) {
  const baseCurrency =
    formData.baseCurrency === CUSTOM_CURRENCY_VALUE && formData.customCurrencyCode
      ? formData.customCurrencyCode
      : formData.baseCurrency || 'USD';
  const customRateValue = formData.hasMultipleRates ? formData.customExchangeRateValue : undefined;
  const customRateCode = formData.hasMultipleRates ? baseCurrency : undefined;
  return { baseCurrency, customRateValue, customRateCode };
}

function monthlyCostTotalIncludingTax(formData: PaybackFormFields): number {
  const { baseCurrency, customRateValue, customRateCode } = resolveBaseCurrency(formData);
  const { monthlyBurn, tax } = aggregateMonthlyCosts(formData, baseCurrency, customRateValue, customRateCode);
  return monthlyBurn + tax;
}

export function calculatePaybackPeriod(formData: PaybackFormFields): PaybackResult {
  const { baseCurrency, customRateValue, customRateCode } = resolveBaseCurrency(formData);
  const conv = (field: typeof formData.monthlyRevenue) =>
    convertToTargetCurrency(field, baseCurrency, customRateValue, customRateCode);

  const realRevenue = conv(formData.monthlyRealOperatingRevenue);
  const grossRevenue = conv(formData.monthlyRevenue);
  const monthlyRevenue = realRevenue > 0 ? realRevenue : grossRevenue;

  const monthlyCostTotal = monthlyCostTotalIncludingTax(formData);
  const monthlyNetSurplus = monthlyRevenue - monthlyCostTotal;
  const initialInvestment = conv(formData.initialInvestmentEstimate);

  return {
    monthlyNetSurplus,
    initialInvestment,
    paybackMonths: initialInvestment > 0 && monthlyNetSurplus > 0 ? initialInvestment / monthlyNetSurplus : null,
    hasEnoughData: initialInvestment > 0
  };
}

export function calculateRequiredRevenueForTarget(
  formData: PaybackFormFields,
  targetMonths: number,
  operatingDaysPerMonth: number = 30
): ReverseTargetResult | null {
  const { baseCurrency, customRateValue, customRateCode } = resolveBaseCurrency(formData);
  const initialInvestment = convertToTargetCurrency(
    formData.initialInvestmentEstimate,
    baseCurrency,
    customRateValue,
    customRateCode
  );
  const safeMonths = Math.max(1, Math.round(Number(targetMonths) || 0));
  if (initialInvestment <= 0 || safeMonths <= 0) return null;

  const requiredMonthlySurplus = initialInvestment / safeMonths;
  const monthlyCostTotal = monthlyCostTotalIncludingTax(formData);
  const requiredMonthlyRevenue = requiredMonthlySurplus + monthlyCostTotal;
  const safeDays = Math.max(1, Math.round(operatingDaysPerMonth) || 30);

  return {
    targetMonths: safeMonths,
    requiredMonthlySurplus,
    requiredMonthlyRevenue,
    requiredDailyRevenue: requiredMonthlyRevenue / safeDays,
    operatingDaysPerMonth: safeDays
  };
}
