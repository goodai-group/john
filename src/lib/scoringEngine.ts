import {
  AssessmentReport,
  BusinessFormData,
  GateCheckResult,
  MetricScore,
  ProofType
} from '../types.js';
import { convertToTargetCurrency, CUSTOM_CURRENCY_VALUE } from './currencies.js';
import { aggregateMonthlyCosts } from './costAggregation.js';

/** 与 AssessmentForm 中 CUSTOM_INDUSTRY_VALUE 保持一致的占位常量 */
const CUSTOM_INDUSTRY_VALUE = '__CUSTOM__';

// BUG-04 修复：加权综合得分只由这 6 项梯度指标构成（不含 DSCR ——
// DSCR 是下方 gates 里的第 5 项一票否决红线，不参与加权求和）。
// 权重/名称/健康基准区间在这里定义为唯一权威来源，"评分规则"展示页
// （PublicScoringStandards.tsx）直接导入渲染，不再自行硬编码一份可能与
// 这里跑偏的副本——避免规则页公布的口径与报告实际算法不一致。
export const SCORING_METRIC_DEFINITIONS: Record<
  string,
  { weight: number; name: string; category: string; benchmarkValue: string }
> = {
  real_revenue_strength: {
    weight: 15,
    name: 'Real Operating Revenue Ratio',
    category: '商业真实性与收入健康',
    benchmarkValue: '≥ 85%'
  },
  gross_margin_rate: {
    weight: 20,
    name: 'Gross Profit Margin (COGS Ratio)',
    category: '成本结构与毛利水平',
    benchmarkValue: '35% - 60%'
  },
  opex_efficiency: {
    weight: 15,
    name: 'OPEX Overhead Ratio',
    category: '成本结构与毛利水平',
    benchmarkValue: '≤ 45%'
  },
  net_margin_rate: {
    weight: 20,
    name: 'Net Profit Margin (PAT)',
    category: '盈利质量与回报',
    benchmarkValue: '≥ 15%'
  },
  cash_buffer_runway: {
    weight: 15,
    name: 'Cash Runway Safety Buffer',
    category: '资金安全与抗风险',
    benchmarkValue: '≥ 3.0 个月'
  },
  business_continuity: {
    weight: 15,
    name: 'Operational Continuity & Team Scale',
    category: '持续性与经营稳定性',
    benchmarkValue: '≥ 12 个月'
  }
};

export function runBusinessAssessment(formData: BusinessFormData): AssessmentReport {
  const baseCurrency = formData.baseCurrency === CUSTOM_CURRENCY_VALUE && formData.customCurrencyCode ? formData.customCurrencyCode : (formData.baseCurrency || 'USD');
  const customRateVal = formData.hasMultipleRates ? formData.customExchangeRateValue : undefined;
  // 修复：必须用解析后的真实币种代码（baseCurrency），而不是原始表单字段 formData.baseCurrency——
  // 当用户选择"自定义币种"时，formData.baseCurrency 仍是占位符 CUSTOM_CURRENCY_VALUE('__CUSTOM__')，
  // 永远不会等于任何真实金额字段的 currency 代码，导致自报汇率被 convertToTargetCurrency 静默忽略。
  const customRateCode = formData.hasMultipleRates ? baseCurrency : undefined;

  // 1. 统一折算所有金额字段至主报告币种
  const conv = (field: typeof formData.monthlyRevenue) =>
    convertToTargetCurrency(field, baseCurrency, customRateVal, customRateCode);

  const monthlyGrossRev = conv(formData.monthlyRevenue);
  const monthlyGrants = conv(formData.monthlyExternalGrants);
  // 修复：未填"真实主营收入"细项时，此前直接退回"经营月均总流水"(monthlyGrossRev)，
  // 但总流水本身可能已经包含外部捐赠款（见 monthlyRevenue = monthlyRealOperatingRevenue +
  // monthlyExternalGrants 这条前端维护的恒等式），会把 Gate-1"真实收入占比"算在被
  // 污染过的分子上，红线可能失效而不自知。改为退回"总流水扣除已知捐赠款"，
  // 即便真实收入细项没填，也不会让捐赠款被误算进"真实收入"。
  const monthlyRealRev =
    conv(formData.monthlyRealOperatingRevenue) || Math.max(0, monthlyGrossRev - monthlyGrants);
  const liquidCash = conv(formData.cashAndLiquidAssets);
  const inventory = conv(formData.inventoryValue);

  // 成本聚合（COGS/OPEX/税金/还贷/注册·签证·折旧的月度等效额）统一走 aggregateMonthlyCosts，
  // 避免与保本计算器、异常检测各自重复实现一遍、逐字段币种折算规则跑偏。
  const {
    cogs,
    otherOpex,
    tax,
    debtPayment,
    regulatoryCosts: monthlyRegulatoryCosts,
    totalOpex
  } = aggregateMonthlyCosts(formData, baseCurrency, customRateVal, customRateCode);

  // 毛利 (Gross Profit) = 真实主营收入 - COGS
  // 修复：此前用 Math.max(0, ...) 强制不低于0，导致进货成本倒挂（COGS > 真实收入）时
  // 真实的负毛利被静默拉平成0，再传导进 PBT/PAT 会让亏损被系统性低估。负毛利应如实
  // 传导到下游，毛利率允许为负数展示（真实反映"倒挂"这一风险状态）。
  const grossProfit = monthlyRealRev - cogs;
  const grossMarginPercent =
    monthlyRealRev > 0 ? Number(((grossProfit / monthlyRealRev) * 100).toFixed(1)) : 0;

  // 税前利润 (PBT / Operating Profit) = 毛利 - OPEX
  const operatingProfitPBT = grossProfit - totalOpex;

  // 税后纯利 (PAT / Net Profit) = PBT - 税费
  const netProfitPAT = operatingProfitPBT - tax;
  const netProfitMarginPercent =
    monthlyRealRev > 0 ? Number(((netProfitPAT / monthlyRealRev) * 100).toFixed(1)) : 0;

  // OPEX 占收入比例
  const opexRatioPercent =
    monthlyRealRev > 0 ? Number(((totalOpex / monthlyRealRev) * 100).toFixed(1)) : 0;

  // 现金储备月数 (Cash Runway) = 可用流动资金 / 每月必须支出 (COGS + OPEX + 还贷)
  const monthlyBurn = cogs + totalOpex + debtPayment;
  const _rawRunwayMonths =
    monthlyBurn > 0 ? Number((liquidCash / monthlyBurn).toFixed(1)) : liquidCash > 0 ? 12 : 0;
  // 出口封顶：超过 60 个月（约 5 年）即视为"充裕"，避免下游 UI 显示几亿天这类
  // 与现实脱节的数字（用户多半是多输入了几个 0，或极端小项目开销几近为零）。
  // 原始值仍可通过 _rawRunwayMonths 在内部获取；此处仅对展示/评分口径做合理化。
  const cashRunwayMonths = Math.min(_rawRunwayMonths, 60);

  // 债务保障倍数 (DSCR) = 经营性净现金 / 每月债务还款
  const debtServiceCoverageRatio =
    debtPayment > 0
      ? Number((Math.max(0, operatingProfitPBT) / debtPayment).toFixed(2))
      : 99.0; // 无债务则为充分安全

  // 真实收入占比 (排除外部捐款后的自生血比例)
  const totalInflow = monthlyRealRev + monthlyGrants;
  const realRevenueRatio =
    totalInflow > 0 ? Number(((monthlyRealRev / totalInflow) * 100).toFixed(1)) : 100;

  // BUG-15 修复：收入、成本全部为 0（用户还没开始填数字，如刚打开沙盘试算）时，
  // 多个比率因为除以 0 走了兜底分支，会显示"真实营业额占比100%""毛利润已全额覆盖"
  // "PAT≥0 正向盈利"这类自相矛盾的"健康"结论，而不是提示数据不足。
  const noFinancialDataEntered =
    monthlyRealRev === 0 && monthlyGrants === 0 && cogs === 0 && totalOpex === 0;

  // 2. Gate 底线红线判定 (必须全部通过才不被一票否决)
  const gates: GateCheckResult[] = [
    {
      code: 'GATE-1',
      name: '真实经营收入占比 (Real Revenue Ratio)',
      plainName: '真实生意收入占比（排除借款和捐赠）',
      status: noFinancialDataEntered ? 'FAIL' : realRevenueRatio >= 60 ? 'PASS' : 'FAIL',
      currentValue: noFinancialDataEntered ? '— (数据不足)' : `${realRevenueRatio}%`,
      threshold: '≥ 60%',
      plainDescription: noFinancialDataEntered
        ? '尚未填写任何收入数据，无法判定，请先填写月流水或月收入。'
        : realRevenueRatio >= 60
          ? '生意主要靠自身商品或服务赚钱，而不是靠外部救济或补贴。'
          : '外部捐助或补贴款占比过高，生意自身造血能力薄弱。',
      improvementTip: '降低对外部一次性补贴或借款依赖，专注提升核心主营商品或服务的销售复购。'
    },
    {
      code: 'GATE-2',
      name: '毛利率底线 (Gross Profit Margin)',
      plainName: '商品买卖毛利空间（扣除进货直接成本）',
      status: grossMarginPercent >= 20 ? 'PASS' : grossMarginPercent >= 10 ? 'WARNING' : 'FAIL',
      currentValue: `${grossMarginPercent}%`,
      threshold: '≥ 20%',
      plainDescription:
        grossMarginPercent >= 20
          ? '进货成本与售价空间充足，具备良性盈利基础。'
          : '毛利空间太薄，一旦进货涨价或商品损耗极易直接亏损。',
      improvementTip: '可尝试与上游供应商谈判降低批发采购价，或优化高毛利招牌商品的组合销售。'
    },
    {
      code: 'GATE-3',
      name: '运营开销覆盖能力 (OPEX Coverage)',
      plainName: '毛利能否包住每月租金人工等固定开销',
      status: noFinancialDataEntered ? 'FAIL' : grossProfit >= totalOpex ? 'PASS' : 'FAIL',
      currentValue: noFinancialDataEntered ? '— (数据不足)' : `${formatNum(grossProfit)} vs ${formatNum(totalOpex)}`,
      threshold: '毛利润 ≥ 每月固定开销',
      plainDescription: noFinancialDataEntered
        ? '尚未填写任何收入或成本数据，无法判定，请先填写月流水与开支。'
        : grossProfit >= totalOpex
          ? '赚取的毛利足够支付每月房租、工人工资与水电网络等基础开销。'
          : '每月毛利润不足以支付日常租金与工资，经营处于入不敷出状态。',
      improvementTip: 'OPEX 超标时，通常可以从精简人工冗余成本、转租分摊固定租金或削减杂费入手。'
    },
    {
      code: 'GATE-4',
      name: '净盈利与正向现金流 (PAT / Net Margin)',
      plainName: '每月到手是否真正有纯利润',
      status: noFinancialDataEntered ? 'FAIL' : netProfitPAT >= 0 ? 'PASS' : 'FAIL',
      currentValue: noFinancialDataEntered ? '— (数据不足)' : `${formatNum(netProfitPAT)} (${netProfitMarginPercent}%)`,
      threshold: '净利润 PAT ≥ 0',
      plainDescription: noFinancialDataEntered
        ? '尚未填写任何收入或成本数据，无法判定，请先填写月流水与开支。'
        : netProfitPAT >= 0
          ? '扣除全部直接进货、租金人工与税金后，每月经营产生正向净利润。'
          : '扣除全部必要开销后每月处于净亏损状态。',
      improvementTip: '审查非必要日常损耗，提高客单价或单次交易增值服务以拉正月度利润。'
    },
    {
      code: 'GATE-5',
      name: '债务偿付安全边际 (Debt Service Ratio)',
      plainName: '每月还债抗压能力',
      status: debtPayment === 0 || debtServiceCoverageRatio >= 1.25 ? 'PASS' : 'FAIL',
      currentValue: debtPayment === 0 ? '无债务' : `${debtServiceCoverageRatio}x`,
      threshold: '无负债 或 DSCR ≥ 1.25x',
      plainDescription:
        debtPayment === 0
          ? '当前无外部还贷压力，财务安全性极佳。'
          : debtServiceCoverageRatio >= 1.25
          ? '每月利润是还款额的 1.25 倍以上，偿债安全度充裕。'
          : '还债金额占用过高利润，一旦经营波动可能出现断供风险。',
      improvementTip: '尝试协商延长贷款还款周期以降低月供，或暂停非必要杠杆扩张。'
    }
  ];

  const gatePassed = gates.every((g) => g.status === 'PASS');
  const failedGates = gates.filter((g) => g.status !== 'PASS');

  // 3. 梯度指标打分 (MetricScores)
  const metrics: MetricScore[] = [
    {
      ...SCORING_METRIC_DEFINITIONS.real_revenue_strength,
      key: 'real_revenue_strength',
      plainName: '真实营业额占比（非借款非捐款）',
      score: Math.min(100, Math.round(realRevenueRatio)),
      actualValue: `${realRevenueRatio}%`,
      status: realRevenueRatio >= 85 ? 'excellent' : realRevenueRatio >= 60 ? 'good' : 'poor',
      plainExplanation: '反映该项目经营资金是否由真实的客户买单形成，自立生存能力强弱。',
      improvementTip: '逐步减少对外部赠款的依附，提高自身主打产品在本地市场的真实成交量。'
    },
    {
      ...SCORING_METRIC_DEFINITIONS.gross_margin_rate,
      key: 'gross_margin_rate',
      plainName: '毛利率（每做100元生意除去原料还能剩多少）',
      score: Math.min(100, Math.max(0, Math.round(grossMarginPercent * 1.8))),
      actualValue: `${grossMarginPercent}%`,
      status: grossMarginPercent >= 40 ? 'excellent' : grossMarginPercent >= 25 ? 'good' : 'poor',
      plainExplanation: '毛利率越高，抵御物价上涨和原料波动的缓冲垫越厚。',
      improvementTip: '寻找本地就近原材料替代品，减少中间批发商抽成，或对热销品做微调提价。'
    },
    {
      ...SCORING_METRIC_DEFINITIONS.opex_efficiency,
      key: 'opex_efficiency',
      plainName: '运营固定开销占比（房租+工资等）',
      score: Math.min(100, Math.max(0, Math.round(100 - opexRatioPercent * 1.1))),
      actualValue: `${opexRatioPercent}%`,
      status: opexRatioPercent <= 40 ? 'excellent' : opexRatioPercent <= 60 ? 'good' : 'poor',
      plainExplanation: '固定支出占收入比例越低，经营越轻便，淡季不容易被房租工资压垮。',
      improvementTip: 'OPEX 超标时，通常可以从工时弹性化排班、压缩水电杂费或分时租用场地入手。'
    },
    {
      ...SCORING_METRIC_DEFINITIONS.net_margin_rate,
      key: 'net_margin_rate',
      plainName: '到手纯利润率（净挣在手里的钱）',
      score: Math.min(100, Math.max(0, Math.round(netProfitMarginPercent * 3.5))),
      actualValue: `${netProfitMarginPercent}%`,
      status: netProfitMarginPercent >= 18 ? 'excellent' : netProfitMarginPercent >= 8 ? 'good' : 'poor',
      plainExplanation: '最终留在经营者手中的净利润比例，是扩大再生产与家庭生活的基石。',
      improvementTip: '严格控制零散非生产性杂费开支，将有限资金聚焦在能直接带来复购的业务上。'
    },
    {
      ...SCORING_METRIC_DEFINITIONS.cash_buffer_runway,
      key: 'cash_buffer_runway',
      plainName: '备用现金可支撑月数（即使不进账能撑多久）',
      score: Math.min(100, Math.round(cashRunwayMonths * 22)),
      actualValue: `${cashRunwayMonths} 个月`,
      status: cashRunwayMonths >= 3 ? 'excellent' : cashRunwayMonths >= 1.5 ? 'good' : 'poor',
      plainExplanation: '当遇到突发封控、疾病或供应链中断时，维持经营不倒闭的生命线。',
      improvementTip: '在旺季坚持每月留存至少 10%-15% 净利润存入不可动用的应急现金池。'
    },
    {
      ...SCORING_METRIC_DEFINITIONS.business_continuity,
      key: 'business_continuity',
      plainName: '持续经营月数与团队规模稳定性',
      score: Math.min(100, Math.round(formData.operatingMonthsCount * 5 + formData.fullTimeEmployeesCount * 8)),
      actualValue: `已运营 ${formData.operatingMonthsCount} 个月 / ${formData.fullTimeEmployeesCount} 名员工`,
      status: formData.operatingMonthsCount >= 12 ? 'excellent' : formData.operatingMonthsCount >= 6 ? 'good' : 'average',
      plainExplanation: '经营时间越久，客户信任与本地供应链越稳定，抗风险经验越丰富。',
      improvementTip: '建立清晰的老客户回访与记账习惯，保持业务按月平稳推进。'
    }
  ];

  // 4. 计算综合得分 (0-100)
  const weightedSum = metrics.reduce((acc, m) => acc + (m.score * m.weight) / 100, 0);
  let totalScore = Math.round(weightedSum);

  // 如果 Gate 未通过，最终评级设为 REJECT，分数上限压在 55 以下以示风险
  if (!gatePassed) {
    totalScore = Math.min(54, totalScore);
  }

  // 等级划分
  let tier: AssessmentReport['tier'] = 'B';
  let overallStatus: AssessmentReport['overallStatus'] = 'FAIL';

  if (!gatePassed) {
    tier = 'REJECT';
    overallStatus = 'FAIL';
  } else if (totalScore >= 88) {
    tier = 'AAA';
    overallStatus = 'PASS';
  } else if (totalScore >= 80) {
    tier = 'AA';
    overallStatus = 'PASS';
  } else if (totalScore >= 70) {
    tier = 'A';
    overallStatus = 'PASS';
  } else if (totalScore >= 60) {
    tier = 'BBB';
    overallStatus = 'REVIEW';
  } else {
    tier = 'BB';
    overallStatus = 'REVIEW';
  }

  // 5. 五大维度雷达数据
  const radarScores = [
    {
      dimension: 'Market & Profitability',
      dimensionPlain: '商业盈利能力',
      score: Math.min(100, Math.max(10, Math.round(netProfitMarginPercent * 3.5 + 20))),
      benchmark: 75
    },
    {
      dimension: 'Cost Control (COGS/OPEX)',
      dimensionPlain: '成本开销管控',
      score: Math.min(100, Math.max(10, Math.round(100 - opexRatioPercent + grossMarginPercent * 0.5))),
      benchmark: 70
    },
    {
      dimension: 'Cashflow Resilience',
      dimensionPlain: '现金流与抗风险',
      score: Math.min(100, Math.max(10, Math.round(cashRunwayMonths * 20))),
      benchmark: 65
    },
    {
      dimension: 'Solvency & Debt Buffer',
      dimensionPlain: '负债偿付安全性',
      score: debtPayment === 0 ? 95 : Math.min(100, Math.max(15, Math.round(debtServiceCoverageRatio * 35))),
      benchmark: 70
    },
    {
      dimension: 'Continuity & Transparency',
      dimensionPlain: '持续经营稳定性',
      score: Math.min(100, Math.max(20, Math.round(formData.operatingMonthsCount * 6 + 15))),
      benchmark: 65
    }
  ];

  // 统计断点流水估算月份数
  const estimatedMonthsCount = formData.monthlyBreakdowns
    ? formData.monthlyBreakdowns.filter((b) => b.isEstimated).length
    : 0;

  // AI 建议与总结
  const aiActionableAdvice: string[] = [];
  if (gatePassed) {
    aiActionableAdvice.push('恭喜！各项核心红线（Gate）全部达标，商业模型具备健康的自我造血与盈利能力。');
  } else {
    aiActionableAdvice.push('存在未通过的关键红线项，建议优先解决上述红线指标（如削减固定开销或提升真实主营收入）。');
  }

  if (grossMarginPercent < 30) {
    aiActionableAdvice.push('毛利率偏紧：建议评估采购批发批量或适度推出高附加值套餐，提高单笔订单利润。');
  }
  if (opexRatioPercent > 50) {
    aiActionableAdvice.push('每月固定支出占比超50%：重点核对租金与人工利用率，避免淡季资金链承压。');
  }
  if (cashRunwayMonths < 2) {
    aiActionableAdvice.push('应急现金储备少于2个月：建议暂停非必要设备购置，优先积攒至少3个月的流动现金缓冲垫。');
  }
  if (formData.proofType === 'none') {
    aiActionableAdvice.push('本项目采用无凭证纯手动填报模式：评分规则与逻辑完全透明公正，与上传凭证项目一致。');
  }

  const summaryPlainLanguage = gatePassed
    ? `该项目月度真实主营收入稳定在 ${formatNum(monthlyRealRev)} ${baseCurrency}，毛利率达到 ${grossMarginPercent}%，扣除所有租金人工后每月净挣 ${formatNum(netProfitPAT)} ${baseCurrency}，整体财务模型健康稳健。`
    : `该项目月度产生净利润 ${formatNum(netProfitPAT)} ${baseCurrency}，但在固定开销或毛利空间等红线指标上仍需调优，建议参考改进指南逐步优化。`;

  return {
    id: crypto.randomUUID(),
    projectId: formData.id,
    version: formData.version,
    createdAt: new Date().toISOString(),
    projectName: formData.projectName || '未命名商业自测项目',
    industry:
      (formData.industry === CUSTOM_INDUSTRY_VALUE ? formData.customIndustryName : formData.industry) ||
      '综合商业',
    baseCurrency,
    isSensitiveRegion: formData.isSensitiveRegion,
    dataMinimizationNotice: formData.isSensitiveRegion
      ? '该项目采用数据最小化模式，属地区安全考量下的自愿选择，不代表隐瞒或数据造假，也不影响评分结果。'
      : undefined,
    customRateNotice: formData.hasMultipleRates
      ? `用户自报汇率（${formData.customExchangeRateType || '民间/日常兑换价'}，1 USD ≈ ${formData.customExchangeRateValue || '自定义'} ${baseCurrency}），非官方汇率，已公开透明核对。`
      : undefined,
    estimatedMonthsCount,
    proofTypeUsed: formData.proofType,
    totalScore,
    tier,
    overallStatus,
    summaryPlainLanguage,
    radarScores,
    gates,
    gatePassed,
    failedGates,
    metrics,
    aiActionableAdvice,
    // 透传按行业细分的动态成本明细，供报告分项展示
    dynamicCogsItems: formData.dynamicCogsItems || [],
    dynamicOpexItems: formData.dynamicOpexItems || [],
    normalizedFinancials: {
      monthlyGrossRevenue: monthlyGrossRev,
      monthlyRealRevenue: monthlyRealRev,
      monthlyExternalGrants: monthlyGrants,
      monthlyCogs: cogs,
      monthlyOpex: totalOpex,
      monthlyRegulatoryCosts,
      monthlyBurn,
      grossProfit,
      grossMarginPercent,
      operatingProfit: operatingProfitPBT,
      netProfit: netProfitPAT,
      netProfitMarginPercent,
      opexRatioPercent,
      cashRunwayMonths,
      debtServiceCoverageRatio
    }
  };
}

export const calculateAssessmentReport = runBusinessAssessment;

function formatNum(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
}
