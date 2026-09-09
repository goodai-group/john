import { BusinessFormData } from '../types';

/**
 * 第3点：用户先填成本，系统根据已填成本自动算出「每天至少要赚多少才不亏钱」，
 * 帮助没有财务经验的用户在填收入之前先有一个参照锚点。
 *
 * 口径与正式评分引擎的 Gate-4（税后净利润 ≥ 0）保持一致：
 * 保本月收入 = 全部已知月度成本合计（COGS + 固定运营开销 + 动态明细 + 税金 + 还贷 +
 *              公司注册/签证/设备折旧月度等效额）
 * 保本日收入 = 保本月收入 ÷ 每月经营天数（默认 30 天，可传入实际营业天数）
 *
 * 注意：这里的成本全部取用户已填写的"绝对金额"（而非占收入比例的 COGS 率），
 * 因此计算出的是"覆盖当前已知成本"所需的最低收入，而不是考虑 COGS 随收入变动的边际保本点——
 * 对没有财务基础的用户而言，这是一个更直观、更容易在填收入前就能对照的锚点。
 */
export interface BreakEvenResult {
  monthlyCostTotal: number;
  dailyBreakEvenRevenue: number;
  monthlyBreakEvenRevenue: number;
  operatingDaysPerMonth: number;
  costBreakdown: {
    cogs: number;
    fixedOpex: number;
    tax: number;
    debtPayment: number;
    regulatoryCosts: number;
  };
  hasEnoughData: boolean;
}

const amortizeMonthly = (totalAmount: number, months: number | undefined): number => {
  const safeMonths = Math.max(1, Math.round(Number(months) || 12));
  return totalAmount / safeMonths;
};

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
  >,
  operatingDaysPerMonth: number = 30
): BreakEvenResult {
  const dynamicCogsTotal = (formData.dynamicCogsItems || []).reduce(
    (sum, it) => sum + (Number(it.value) || 0),
    0
  );
  const cogs = dynamicCogsTotal > 0 ? dynamicCogsTotal : formData.cogsCost?.amount || 0;

  const dynamicOpexTotal = (formData.dynamicOpexItems || []).reduce(
    (sum, it) => sum + (Number(it.value) || 0),
    0
  );
  const fixedOpexFields =
    (formData.rentCost?.amount || 0) + (formData.laborCost?.amount || 0) + (formData.utilityCost?.amount || 0);
  const fixedOpex = dynamicOpexTotal > 0 ? dynamicOpexTotal : fixedOpexFields;
  const otherOpex = formData.otherOpex?.amount || 0;

  const tax = formData.taxCost?.amount || 0;
  const debtPayment = formData.existingDebtMonthlyPayment?.amount || 0;

  const registrationMonthly = amortizeMonthly(
    formData.companyRegistrationCost?.amount || 0,
    formData.companyRegistrationAmortizationMonths
  );
  const visaMonthly = amortizeMonthly(formData.visaFeeCost?.amount || 0, formData.visaFeeAmortizationMonths);
  const depreciationMonthly = formData.equipmentDepreciationCost?.amount || 0;
  const regulatoryCosts = registrationMonthly + visaMonthly + depreciationMonthly;

  const monthlyCostTotal = cogs + fixedOpex + otherOpex + tax + debtPayment + regulatoryCosts;
  const safeDays = Math.max(1, Math.round(operatingDaysPerMonth) || 30);

  return {
    monthlyCostTotal,
    dailyBreakEvenRevenue: monthlyCostTotal / safeDays,
    monthlyBreakEvenRevenue: monthlyCostTotal,
    operatingDaysPerMonth: safeDays,
    costBreakdown: {
      cogs,
      fixedOpex: fixedOpex + otherOpex,
      tax,
      debtPayment,
      regulatoryCosts
    },
    hasEnoughData: monthlyCostTotal > 0
  };
}
