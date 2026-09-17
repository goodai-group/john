import { BusinessFormData, CurrencyCode, MoneyField } from '../types.js';
import { convertToTargetCurrency } from './currencies.js';

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
    | 'dynamicTaxItems'
    | 'existingDebtMonthlyPayment'
    | 'companyRegistrationCost'
    | 'companyRegistrationAmortizationMonths'
    | 'dynamicRegistrationCostItems'
    | 'visaFeeCost'
    | 'visaFeeAmortizationMonths'
    | 'equipmentDepreciationCost'
    | 'dynamicEquipmentItems'
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
  // 固定开销的白色栏目（房租/人工/水电）对各行业都通用，予以保留；
  // 动态明细项是"在此基础上按行业补充"的额外条目（如设备清洁、排烟维护等），二者相加而非互相覆盖——
  // 否则用户改了白色栏目里的数字却发现 AI 分析结果毫无变化。
  const dynamicOpexTotal = (formData.dynamicOpexItems || []).reduce(
    (sum, it) => sum + (Number(it.value) || 0),
    0
  );
  const fixedOpex = rent + labor + utility + dynamicOpexTotal;

  const otherOpex = conv(formData.otherOpex);
  // 税金明细（增值税/附加税/所得税预估/年度规费按月摊等）填了的话，用明细合计替代单一税费数字，
  // 与 COGS 明细同一口径：明细存在即为权威数据源，避免用户改了明细、总数却纹丝不动。
  const dynamicTaxTotal = (formData.dynamicTaxItems || []).reduce(
    (sum, it) => sum + (Number(it.value) || 0),
    0
  );
  const tax = dynamicTaxTotal > 0 ? dynamicTaxTotal : conv(formData.taxCost);
  const debtPayment = conv(formData.existingDebtMonthlyPayment);

  // 逐项注册/执照费用：一次性按用户自定月数分摊，年度费用固定按 12 个月分摊
  // （年度性质的费用每年都要再付一次，不应套用用户为其他一次性项目设的分摊月数）。
  const dynamicRegistrationMonthly = (formData.dynamicRegistrationCostItems || []).reduce((sum, it) => {
    const months = it.feeType === 'annual' ? 12 : Math.max(1, Math.round(Number(it.amortizationMonths) || 12));
    return sum + (Number(it.amount) || 0) / months;
  }, 0);
  const registrationMonthly =
    amortizeMonthly(conv(formData.companyRegistrationCost), formData.companyRegistrationAmortizationMonths) +
    dynamicRegistrationMonthly;
  const visaMonthly = amortizeMonthly(conv(formData.visaFeeCost), formData.visaFeeAmortizationMonths);
  // 设备月度折旧 = 逐台填报的「设备值 ÷ 预计使用月数」求和，再加上未逐台拆分的补充折旧金额，
  // 避免用户自己心算"总设备值"再手填一个数字。
  const dynamicEquipmentMonthly = (formData.dynamicEquipmentItems || []).reduce(
    (sum, it) => sum + (Number(it.value) || 0) / Math.max(1, Math.round(Number(it.usefulLifeMonths) || 12)),
    0
  );
  const depreciationMonthly = conv(formData.equipmentDepreciationCost) + dynamicEquipmentMonthly;
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
