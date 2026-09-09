import { BusinessFormData } from '../types';
import { CUSTOM_CURRENCY_VALUE } from './currencies';
import { aggregateMonthlyCosts } from './costAggregation';

/**
 * 第3点：用户先填成本，系统根据已填成本自动算出「每天至少要赚多少才不亏钱」，
 * 帮助没有财务经验的用户在填收入之前先有一个参照锚点。
 *
 * 成本聚合复用 aggregateMonthlyCosts（与正式评分引擎同一份实现），确保每个成本字段先按
 * 自身选择的币种折算到主报告币种再相加——若各字段分别选了不同币种却直接相加数字，
 * 会得出脱离实际的错误金额。
 *
 * 保本月收入 = 全部已知月度成本合计（COGS + 固定运营开销 + 动态明细 + 税金 + 还贷 +
 *              公司注册/签证/设备折旧月度等效额）
 * 保本日收入 = 保本月收入 ÷ 每月经营天数（默认 30 天，可传入实际营业天数）
 *
 * 注意 1：这里的成本全部取用户已填写的"绝对金额"（而非占收入比例的 COGS 率），
 * 因此计算出的是"覆盖当前已知成本"所需的最低收入，而不是考虑 COGS 随收入变动的边际保本点——
 * 对没有财务基础的用户而言，这是一个更直观、更容易在填收入前就能对照的锚点。
 *
 * 注意 2：这里特意把「每月还贷」也计入保本成本，口径比正式评分引擎的 Gate-4（税后净利润 ≥ 0，
 * 并不扣除还贷）更保守——还得起贷款、不违约同样是"不亏钱"的一部分。因此保本收入达标不等价于
 * Gate-4 一定通过，两者是两个不同但都合理的安全线，不要求两者数值恒等。
 */
export interface BreakEvenResult {
  monthlyCostTotal: number;
  dailyBreakEvenRevenue: number;
  monthlyBreakEvenRevenue: number;
  operatingDaysPerMonth: number;
  costBreakdown: {
    cogs: number;
    opexTotal: number; // 固定开销 + 其他开销（不含税/还贷/注册签证折旧，避免与"fixedOpex"概念混淆）
    tax: number;
    debtPayment: number;
    regulatoryCosts: number;
  };
  hasEnoughData: boolean;
}

export function calculateBreakEvenRevenue(
  formData: Pick<
    BusinessFormData,
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
    | 'baseCurrency'
    | 'customCurrencyCode'
    | 'hasMultipleRates'
    | 'customExchangeRateValue'
  >,
  operatingDaysPerMonth: number = 30
): BreakEvenResult {
  const baseCurrency =
    formData.baseCurrency === CUSTOM_CURRENCY_VALUE && formData.customCurrencyCode
      ? formData.customCurrencyCode
      : formData.baseCurrency || 'USD';
  const customRateValue = formData.hasMultipleRates ? formData.customExchangeRateValue : undefined;
  const customRateCode = formData.hasMultipleRates ? baseCurrency : undefined;

  const { cogs, fixedOpex, otherOpex, tax, debtPayment, regulatoryCosts, monthlyBurn } =
    aggregateMonthlyCosts(formData, baseCurrency, customRateValue, customRateCode);

  const monthlyCostTotal = monthlyBurn;
  const safeDays = Math.max(1, Math.round(operatingDaysPerMonth) || 30);

  return {
    monthlyCostTotal,
    dailyBreakEvenRevenue: monthlyCostTotal / safeDays,
    monthlyBreakEvenRevenue: monthlyCostTotal,
    operatingDaysPerMonth: safeDays,
    costBreakdown: {
      cogs,
      opexTotal: fixedOpex + otherOpex,
      tax,
      debtPayment,
      regulatoryCosts
    },
    hasEnoughData: monthlyCostTotal > 0
  };
}
