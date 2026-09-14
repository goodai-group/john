// 可模拟杠杆目录 —— Strategist 的弹药库
//
// 【这是整套架构可信度的第二根支柱】
//
// 处方师不被允许「想出」一条建议。它只能从这份目录里挑杠杆，每条杠杆都是一个
// 对表单字段的具体改动，能被确定性引擎真实回验：
//
//     复制一份表单 → 施加改动 → 重跑 runBusinessAssessment → 得到真实分数增益
//
// 增益不达阈值的杠杆直接丢弃。LLM 的角色因此被压缩成「把已验算的杠杆翻译成人话」，
// 而不是「发明建议并顺便编一个收益数字」。
//
// 对应《方案》第 05 章 Strategist 的禁令：
//   ✕ 输出任何未经 ScoringSimulator 回验的建议
import type { AssessmentReport, BusinessFormData } from '../types.js';
import { runBusinessAssessment } from '../lib/scoringEngine.js';
import { aggregateMonthlyCosts } from '../lib/costAggregation.js';
import { CUSTOM_CURRENCY_VALUE } from '../lib/currencies.js';

export interface Lever {
  id: string;
  titleZh: string;
  titleEn: string;
  /** 30 / 60 / 90 天行动窗口 */
  horizonDays: 30 | 60 | 90;
  /** 该杠杆在当前财务状况下是否值得考虑（不相关的直接不进模拟，省算力也省噪音） */
  appliesTo(report: AssessmentReport, form: BusinessFormData): boolean;
  /** 在表单副本上施加改动。**只改副本，永不碰原始表单** */
  apply(form: BusinessFormData): void;
  /** 该杠杆的落地说明模板（云端不可用时直接用它，保证降级后依然有可读建议） */
  detailZh: string;
  detailEn: string;
}

/** 取主报告币种（与评分引擎口径一致） */
function baseCurrencyOf(form: BusinessFormData): string {
  return form.baseCurrency === CUSTOM_CURRENCY_VALUE && form.customCurrencyCode
    ? form.customCurrencyCode
    : form.baseCurrency || 'USD';
}

/** 按比例缩放一个金额字段 */
function scale(form: BusinessFormData, key: keyof BusinessFormData, factor: number): void {
  const field = (form as any)[key];
  if (field && typeof field === 'object' && typeof field.amount === 'number') {
    field.amount = Math.round(field.amount * factor);
  }
}

export const LEVER_CATALOG: Lever[] = [
  {
    id: 'cogs_down_5',
    titleZh: '与供应商谈批量采购，把进货成本压降 5%',
    titleEn: 'Negotiate bulk purchasing to cut procurement cost by 5%',
    horizonDays: 30,
    appliesTo: (r) => r.normalizedFinancials.grossMarginPercent < 55,
    apply: (f) => {
      scale(f, 'cogsCost', 0.95);
      (f.dynamicCogsItems || []).forEach((it) => {
        it.value = Math.round((Number(it.value) || 0) * 0.95);
      });
    },
    detailZh:
      '先把进货量最大的 2-3 项单独拎出来比价，用「整月一次性下单」换单价折扣；同时清点每月的损耗与过期报废，这部分通常能立刻省下 2%-3%。',
    detailEn:
      'Pick your 2-3 largest purchase lines and re-quote them, trading a single monthly bulk order for a unit discount; then count monthly spoilage and expiry write-offs, which usually frees up another 2-3% immediately.'
  },
  {
    id: 'cogs_down_10',
    titleZh: '重整供应链，把进货成本压降 10%',
    titleEn: 'Restructure sourcing to cut procurement cost by 10%',
    horizonDays: 90,
    appliesTo: (r) => r.normalizedFinancials.grossMarginPercent < 35,
    apply: (f) => {
      scale(f, 'cogsCost', 0.9);
      (f.dynamicCogsItems || []).forEach((it) => {
        it.value = Math.round((Number(it.value) || 0) * 0.9);
      });
    },
    detailZh:
      '毛利偏低通常不是单点问题：同时做三件事——更换或增加一家备选供应商形成议价、砍掉毛利最低的滞销品类、把高毛利单品摆到最显眼的位置。',
    detailEn:
      'A thin gross margin is rarely a single-point problem: do three things at once — add or switch to a second supplier to create bargaining room, drop the lowest-margin slow-moving lines, and move your high-margin items to the most visible spot.'
  },
  {
    id: 'rent_down_10',
    titleZh: '与房东重谈租金或缩减场地，把租金降 10%',
    titleEn: 'Renegotiate rent or downsize the space by 10%',
    horizonDays: 90,
    appliesTo: (r) => r.normalizedFinancials.opexRatioPercent > 35,
    apply: (f) => scale(f, 'rentCost', 0.9),
    detailZh:
      '带上近 6 个月的真实流水去谈——房东最怕空租。可谈的方向有三个：续约换降价、押金转抵租金、把用不到的区域退租或分租出去。',
    detailEn:
      'Bring six months of real revenue records to the negotiation — landlords fear vacancy most. Three angles work: a longer renewal for a lower rate, converting the deposit into rent credit, or returning/subletting space you do not use.'
  },
  {
    id: 'labor_flex',
    titleZh: '按客流排班，把人工支出降 8%',
    titleEn: 'Shift to demand-based scheduling to cut labor cost by 8%',
    horizonDays: 60,
    appliesTo: (r) => r.normalizedFinancials.opexRatioPercent > 30,
    apply: (f) => scale(f, 'laborCost', 0.92),
    detailZh:
      '先记录一周内每个时段的真实客流，把人手集中到高峰段，低峰段只留必要岗位。不裁人也能省——把固定全天班改成分段班即可。',
    detailEn:
      'Log real foot traffic by time slot for one week, concentrate staff in peak hours and keep only essential cover off-peak. No layoffs needed — splitting full-day shifts into segments is usually enough.'
  },
  {
    id: 'utility_down',
    titleZh: '核查水电与网络杂费，压降 15%',
    titleEn: 'Audit utilities and connectivity fees, cut 15%',
    horizonDays: 30,
    appliesTo: (r, f) =>
      f.utilityCost.amount > 0 && r.normalizedFinancials.opexRatioPercent > 25,
    apply: (f) => scale(f, 'utilityCost', 0.85),
    detailZh:
      '最常见的三处浪费：闲置设备整夜通电、套餐档位买高了、以及早已不用却仍在扣费的订阅。逐条核对上月账单即可。',
    detailEn:
      'Three most common leaks: idle equipment left powered overnight, an over-sized tariff plan, and subscriptions still being billed long after you stopped using them. Line-by-line review of last month\'s bill is enough.'
  },
  {
    id: 'cash_to_3_months',
    titleZh: '把应急备用金补足到 3 个月固定开销',
    titleEn: 'Build the emergency reserve up to 3 months of fixed costs',
    horizonDays: 90,
    appliesTo: (r) => r.normalizedFinancials.cashRunwayMonths < 3,
    apply: (f) => {
      const base = baseCurrencyOf(f);
      const rate = f.hasMultipleRates ? f.customExchangeRateValue : undefined;
      const { cogs, totalOpex, tax, debtPayment } = aggregateMonthlyCosts(f, base, rate, base);
      const monthlyBurn = cogs + totalOpex + tax + debtPayment;
      f.cashAndLiquidAssets = {
        ...f.cashAndLiquidAssets,
        amount: Math.round(monthlyBurn * 3),
        currency: base
      };
    },
    detailZh:
      '开一个单独的账户专门放备用金，和日常收款账户分开——放在一起必然会被花掉。每月固定先划走一笔，哪怕金额不大，关键是不再动它。',
    detailEn:
      'Open a separate account for the reserve, apart from your day-to-day receipts account — kept together, it will be spent. Move a fixed amount across first thing each month; the size matters less than never touching it.'
  },
  {
    id: 'reduce_grant_dependency',
    titleZh: '提高真实客户收入占比，降低对外部赠款的依赖',
    titleEn: 'Raise the share of real customer revenue, reduce grant dependency',
    horizonDays: 90,
    appliesTo: (_r, f) =>
      f.monthlyExternalGrants.amount > 0 &&
      f.monthlyRevenue.amount > 0 &&
      f.monthlyExternalGrants.amount / f.monthlyRevenue.amount > 0.15,
    apply: (f) => {
      // 把 15% 的赠款依赖转化为真实经营收入（总流水不变，结构改善）
      const shift = Math.round(f.monthlyExternalGrants.amount * 0.3);
      f.monthlyExternalGrants = {
        ...f.monthlyExternalGrants,
        amount: f.monthlyExternalGrants.amount - shift
      };
      f.monthlyRealOperatingRevenue = {
        ...f.monthlyRealOperatingRevenue,
        amount: f.monthlyRealOperatingRevenue.amount + shift
      };
    },
    detailZh:
      '赠款占比过高会直接压低评分里的「真实营业额占比」，也意味着资金链系于他人。可从两处入手：把免费服务改为象征性收费，以及为老客户设计一个小额复购或会员方案。',
    detailEn:
      'A high grant share directly drags down the "real revenue ratio" metric and means your cash line depends on someone else. Two starting points: convert free services to a nominal fee, and design a small repeat-purchase or membership offer for existing customers.'
  },
  {
    id: 'debt_restructure',
    titleZh: '与债权人重谈还款计划，把月还款额降 20%',
    titleEn: 'Renegotiate the repayment plan to cut monthly debt service by 20%',
    horizonDays: 60,
    appliesTo: (_r, f) => f.existingDebtMonthlyPayment.amount > 0,
    apply: (f) => scale(f, 'existingDebtMonthlyPayment', 0.8),
    detailZh:
      '拉长还款期限往往比降利率更容易谈成，对每月现金流的缓解也更直接。谈之前先算清楚：每月最多能拿出多少还款而不影响进货。',
    detailEn:
      'Extending the term is usually easier to agree than a rate cut, and it relieves monthly cash flow more directly. Before negotiating, work out the maximum monthly repayment that still leaves procurement intact.'
  }
];

export interface SimulatedLever {
  lever: Lever;
  baseScore: number;
  simulatedScore: number;
  /** 真实分数增益 —— 由确定性引擎算出，不是模型估的 */
  scoreGain: number;
}

/**
 * 对每条适用的杠杆做一次确定性回验。
 *
 * @param minGain 增益阈值，低于此值的杠杆直接丢弃（默认 1 分）
 */
export function simulateLevers(
  form: BusinessFormData,
  baseReport: AssessmentReport,
  minGain = 1
): SimulatedLever[] {
  const baseScore = baseReport.totalScore;
  const results: SimulatedLever[] = [];

  for (const lever of LEVER_CATALOG) {
    let applicable = false;
    try {
      applicable = lever.appliesTo(baseReport, form);
    } catch {
      applicable = false;
    }
    if (!applicable) continue;

    try {
      const clone: BusinessFormData = JSON.parse(JSON.stringify(form));
      lever.apply(clone);
      const simulated = runBusinessAssessment(clone);
      const scoreGain = Number((simulated.totalScore - baseScore).toFixed(1));
      if (scoreGain >= minGain) {
        results.push({ lever, baseScore, simulatedScore: simulated.totalScore, scoreGain });
      }
    } catch {
      // 单条杠杆模拟失败不应影响其余杠杆：跳过即可
      continue;
    }
  }

  return results.sort((a, b) => b.scoreGain - a.scoreGain);
}
