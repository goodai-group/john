import { BusinessFormData, CurrencyCode, MoneyField } from '../types';
import { convertToTargetCurrency } from './currencies';

/**
 * 成本聚合的单一实现来源。此前 scoringEngine.ts / breakEvenCalculator.ts / anomalyDetection.ts
 * 三处各自独立重写了一遍"动态明细优先于固定字段"的合计逻辑与折旧/注册/签证费的月度分摊算法，
 * 代码评审发现其中 breakEvenCalculator/anomalyDetection 两处还遗漏了逐字段币种折算——
 * 当用户给某个成本字段单独选了与主币种不同的货币时，会把不同币种的数字直接相加。
 * 统一收口到这里，三处全部改为调用同一份实现，既消除重复也修复该币种混算问题。
 */

export function amortizeMonthly(totalAmount: number, months: number | undefined): number {
  const safeMonths = Math.max(1, Math.round(Number(months) || 12));
  return totalAmount / safeMonths;
}

export interface AggregatedMonthlyCosts {
  cogs: number;
  fixedOpex: number; // 房租+人工+水电（或动态明细合计）
  otherOpex: number;
  tax: number;
  debtPayment: number;
  registrationMonthly: number;
  visaMonthly: number;
  depreciationMonthly: number;
  regulatoryCosts: number; // 注册+签证(已折月)+设备折旧 合计
  totalOpex: number; // fixedOpex + otherOpex + regulatoryCosts
  monthlyBurn: number; // cogs + totalOpex + debtPayment，用于"每月烧钱额"/保本口径
}

export function aggregateMonthlyCosts(
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
  baseCurrency: CurrencyCode,
  customRateValue?: number,
  customRateCode?: CurrencyCode
): AggregatedMonthlyCosts {
  const conv = (field: MoneyField | undefined) =>
    convertToTargetCurrency(field, baseCurrency, customRateValue, customRateCode);

  // 动态明细项目前没有独立币种选择器，始终按主币种录入，故不参与折算，与 scoringEngine 原有口径一致。
  const dynamicCogsTotal = (formData.dynamicCogsItems || []).reduce(
    (sum, it) => sum + (Number(it.value) || 0),
    0
  );
  const cogs = dynamicCogsTotal > 0 ? dynamicCogsTotal : conv(formData.cogsCost);

  const rent = conv(formData.rentCost);
  const labor = conv(formData.laborCost);
  const utility = conv(formData.utilityCost);
  const dynamicOpexTotal = (formData.dynamicOpexItems || []).reduce(
    (sum, it) => sum + (Number(it.value) || 0),
    0
  );
  const fixedOpex = dynamicOpexTotal > 0 ? dynamicOpexTotal : rent + labor + utility;

  const otherOpex = conv(formData.otherOpex);
  const tax = conv(formData.taxCost);
  const debtPayment = conv(formData.existingDebtMonthlyPayment);

  const registrationMonthly = amortizeMonthly(
    conv(formData.companyRegistrationCost),
    formData.companyRegistrationAmortizationMonths
  );
  const visaMonthly = amortizeMonthly(conv(formData.visaFeeCost), formData.visaFeeAmortizationMonths);
  const depreciationMonthly = conv(formData.equipmentDepreciationCost);
  const regulatoryCosts = registrationMonthly + visaMonthly + depreciationMonthly;

  const totalOpex = fixedOpex + otherOpex + regulatoryCosts;
  const monthlyBurn = cogs + totalOpex + debtPayment;

  return {
    cogs,
    fixedOpex,
    otherOpex,
    tax,
    debtPayment,
    registrationMonthly,
    visaMonthly,
    depreciationMonthly,
    regulatoryCosts,
    totalOpex,
    monthlyBurn
  };
}
