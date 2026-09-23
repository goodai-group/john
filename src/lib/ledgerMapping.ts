import {
  BusinessFormData,
  CurrencyCode,
  DynamicCostItem,
  DynamicEquipmentItem,
  DynamicOpexItem,
  LedgerCategory,
  LedgerClassification,
  LedgerItem,
  MoneyField
} from '../types.js';
import { convertToTargetCurrency } from './currencies.js';
import { normalizeToMonthly } from './ledgerCycle.js';

export interface LedgerClassificationDetail {
  id: string;
  name: string;
  category: LedgerCategory;
  /** 已折算为主币种的月度等效额；未摊销的一次性条目为 0（见 rawAmount） */
  monthlyNormalizedAmount: number;
  /** 折算为主币种后的原始金额，未做周期折算 */
  rawAmount: number;
  confidence: number;
  reasoning: string;
  needsUserConfirmation: boolean;
}

export interface LedgerMappingResult {
  formPatch: Partial<BusinessFormData>;
  details: LedgerClassificationDetail[];
}

function money(amount: number, currency: CurrencyCode): MoneyField {
  return { amount, currency };
}

/**
 * 把 CPA 分类 Agent 的判断结果，翻译成既有 BusinessFormData 字段——
 * costAggregation.ts / scoringEngine.ts 完全不用改，只需要把这份 patch 合并进
 * 表单数据。纯函数，不含任何 AI 判断，只做币种折算 + 周期折算 + 按科目归并求和，
 * 与全系统「评分零 AI 参与」的原则一致。
 *
 * 未摊销的一次性条目（cycle='one_time' 且没有给出摊销月数）一律落进
 * oneTimeStartupItems，无论分类到了哪个科目——避免因为没判断摊销月数就让一笔
 * 真实花费从月度指标里悄悄消失。
 */
export function mapClassifiedLedgerToForm(
  items: LedgerItem[],
  classifications: LedgerClassification[],
  baseCurrency: CurrencyCode,
  customRateValue?: number,
  customRateCode?: CurrencyCode
): LedgerMappingResult {
  const classificationById = new Map(classifications.map((c) => [c.id, c]));

  const dynamicCogsItems: DynamicCostItem[] = [];
  const dynamicOpexItems: DynamicOpexItem[] = [];
  const dynamicTaxItems: DynamicCostItem[] = [];
  const dynamicEquipmentItems: DynamicEquipmentItem[] = [];
  const oneTimeStartupItems: DynamicCostItem[] = [];
  const details: LedgerClassificationDetail[] = [];

  let debtServiceMonthly = 0;
  let realRevenueMonthly = 0;
  let externalGrantsMonthly = 0;

  for (const item of items) {
    const classification = classificationById.get(item.id);
    if (!classification) continue; // 分类缺失的条目跳过，不静默编造分类

    const rawAmountConverted = convertToTargetCurrency(
      money(item.amount, item.currency),
      baseCurrency,
      customRateValue,
      customRateCode
    );

    const amortizationMonths = classification.suggestedAmortizationMonths ?? item.amortizationMonths;
    const isUnamortizedOneTime = item.cycle === 'one_time' && !amortizationMonths;
    const monthlyAmount = isUnamortizedOneTime
      ? 0
      : normalizeToMonthly(rawAmountConverted, item.cycle, amortizationMonths);

    details.push({
      id: item.id,
      name: item.name,
      category: classification.category,
      monthlyNormalizedAmount: monthlyAmount,
      rawAmount: rawAmountConverted,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      needsUserConfirmation: classification.needsUserConfirmation
    });

    const isRevenueCategory =
      classification.category === 'REAL_REVENUE' || classification.category === 'EXTERNAL_GRANT';

    if (isUnamortizedOneTime && !isRevenueCategory) {
      oneTimeStartupItems.push({ id: item.id, label: item.name, value: rawAmountConverted });
      continue;
    }

    switch (classification.category) {
      case 'COGS':
        dynamicCogsItems.push({ id: item.id, label: item.name, value: monthlyAmount });
        break;
      case 'OPEX_FIXED_RENT':
      case 'OPEX_FIXED_LABOR':
      case 'OPEX_FIXED_UTILITY':
      case 'OPEX_VARIABLE':
        dynamicOpexItems.push({ id: item.id, label: item.name, value: monthlyAmount });
        break;
      case 'TAX':
        dynamicTaxItems.push({ id: item.id, label: item.name, value: monthlyAmount });
        break;
      case 'DEBT_SERVICE':
        debtServiceMonthly += monthlyAmount;
        break;
      case 'CAPEX_DEPRECIATION':
        // usefulLifeMonths 固定填 1：monthlyAmount 已经是折算好的月度等效额
        // （一次性走摊销除法，其余周期走 normalizeToMonthly），value/1 原样透传即可，
        // 不需要在这里重复做一次除法。
        dynamicEquipmentItems.push({ id: item.id, label: item.name, value: monthlyAmount, usefulLifeMonths: 1 });
        break;
      case 'ONE_TIME_STARTUP':
        oneTimeStartupItems.push({ id: item.id, label: item.name, value: rawAmountConverted });
        break;
      case 'REAL_REVENUE':
        realRevenueMonthly += monthlyAmount;
        break;
      case 'EXTERNAL_GRANT':
        externalGrantsMonthly += monthlyAmount;
        break;
    }
  }

  const formPatch: Partial<BusinessFormData> = {
    dynamicCogsItems,
    dynamicOpexItems,
    dynamicTaxItems,
    dynamicEquipmentItems,
    oneTimeStartupItems,
    existingDebtMonthlyPayment: money(debtServiceMonthly, baseCurrency),
    monthlyRealOperatingRevenue: money(realRevenueMonthly, baseCurrency),
    monthlyExternalGrants: money(externalGrantsMonthly, baseCurrency),
    monthlyRevenue: money(realRevenueMonthly + externalGrantsMonthly, baseCurrency)
  };

  return { formPatch, details };
}
