import { BusinessFormData, CurrencyCode, MoneyField } from '../types.js';
import { convertToTargetCurrency } from './currencies.js';
import { normalizeToMonthly } from './ledgerCycle.js';

/** 动态明细项的月度等效额：cycle 缺省按 'monthly' 处理，与历史数据（没有 cycle 字段）完全兼容 */
function monthlyValueOf(it: { value: number; cycle?: import('../types.js').BillingCycle; amortizationMonths?: number }): number {
  return normalizeToMonthly(Number(it.value) || 0, it.cycle || 'monthly', it.amortizationMonths);
}

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
    | 'existingDebtMonthlyPrincipal'
    | 'existingDebtMonthlyInterest'
  >,
  baseCurrency: CurrencyCode,
  customRateValue?: number,
  customRateCode?: CurrencyCode
): AggregatedMonthlyCosts {
  const conv = (field: MoneyField | undefined) =>
    convertToTargetCurrency(field, baseCurrency, customRateValue, customRateCode);
  // 固定字段（房租/人工/水电/税金/折旧/债务）现在也可以逐字段选周期——
  // 先按自身币种折算到主币种，再按 cycle/amortizationMonths 折算到月度等效额；
  // cycle 缺省按 'monthly' 处理，与历史数据（没有 cycle 字段）完全兼容。
  const convMonthly = (field: MoneyField | undefined) =>
    normalizeToMonthly(conv(field), field?.cycle || 'monthly', field?.amortizationMonths);

  // 动态明细项目前没有独立币种选择器，始终按主币种录入，故不参与折算，与 scoringEngine 原有口径一致。
  const dynamicCogsTotal = (formData.dynamicCogsItems || []).reduce(
    (sum, it) => sum + monthlyValueOf(it),
    0
  );
  // 当 formData 包含 dynamicCogsItems 数组时（如花费清单界面），以明细合计为准，
  // 避免使用界面隐藏的 cogsCost 盲目推高花费清单合计；只有未提供 dynamicCogsItems 时才退回 cogsCost。
  const cogs = formData.dynamicCogsItems ? dynamicCogsTotal : conv(formData.cogsCost);

  const rent = convMonthly(formData.rentCost);
  const labor = convMonthly(formData.laborCost);
  const utility = convMonthly(formData.utilityCost);
  // 固定开销的白色栏目（房租/人工/水电）对各行业都通用，予以保留；
  // 动态明细项是"在此基础上按行业补充"的额外条目（如设备清洁、排烟维护等），二者相加而非互相覆盖——
  // 否则用户改了白色栏目里的数字却发现 AI 分析结果毫无变化。
  const dynamicOpexTotal = (formData.dynamicOpexItems || []).reduce(
    (sum, it) => sum + monthlyValueOf(it),
    0
  );
  const fixedOpex = rent + labor + utility + dynamicOpexTotal;

  // otherOpex 现在和房租/人工/水电一样在表单里有可见的周期选择器，折算逻辑同步改用
  // convMonthly（按 cycle/amortizationMonths 折算到月度等效额），与 UI 上新增的周期选择器保持一致；
  // 历史数据没有 cycle 字段时仍按 'monthly' 处理，折算结果与之前的 conv() 完全相同，不影响存量项目。
  const otherOpex = convMonthly(formData.otherOpex);
  // 当用户在花费清单界面录入了 taxCost 时，以界面展示的 taxCost 为准，确保清单所见即所得；
  // 只有在 taxCost 额度为 0 且存在 dynamicTaxItems 时才使用明细合计。
  const dynamicTaxTotal = (formData.dynamicTaxItems || []).reduce(
    (sum, it) => sum + monthlyValueOf(it),
    0
  );
  const tax =
    formData.taxCost && (formData.taxCost.amount || 0) > 0
      ? convMonthly(formData.taxCost)
      : dynamicTaxTotal > 0
      ? dynamicTaxTotal
      : convMonthly(formData.taxCost);
  // 本金/利息拆分为新字段：只要填了本金，就以「本金+利息」为准（利息缺省按0）；
  // 未拆分过的历史数据（两个新字段都不存在）退回原来的单一合计字段，总额不变，
  // 避免存量项目一夜之间"丢失"债务数据。
  const debtPayment = formData.existingDebtMonthlyPrincipal
    ? convMonthly(formData.existingDebtMonthlyPrincipal) +
      (formData.existingDebtMonthlyInterest ? convMonthly(formData.existingDebtMonthlyInterest) : 0)
    : convMonthly(formData.existingDebtMonthlyPayment);

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
  const depreciationMonthly = convMonthly(formData.equipmentDepreciationCost) + dynamicEquipmentMonthly;
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
