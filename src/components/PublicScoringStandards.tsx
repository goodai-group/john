import React, { useState } from 'react';
import {
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Building2,
  TrendingUp,
  Percent,
  DollarSign
} from 'lucide-react';
import { Language } from '../types';
import { INDUSTRY_BENCHMARKS } from '../lib/industryBenchmarks';

interface StandardsProps {
  language: Language;
}

// "≥ 3.0 个月" -> "≥ 3.0 months" for English display; the underlying data only stores the Chinese phrasing.
const formatCashRunway = (text: string, language: Language) =>
  language === 'zh' ? text : text.replace('个月', 'months');

export const PublicScoringStandards: React.FC<StandardsProps> = ({ language }) => {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('food_beverage');

  const activeBenchmark =
    INDUSTRY_BENCHMARKS.find((b) => b.id === selectedIndustry) || INDUSTRY_BENCHMARKS[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header Bento Card */}
      <div className="bg-neutral-900 text-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-800 shadow-xl">
        <div className="flex items-center space-x-3.5 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 border border-teal-400/40 flex items-center justify-center text-white shadow-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-tight text-white">
                {language === 'zh' ? '公开评分标准与行业基准库' : 'Public Scoring Standards & Industry Benchmarks'}
              </h2>
              <span className="text-[12px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 rounded-full">
                STANDARDS HUB
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              {language === 'zh'
                ? '公式公开 · 规则透明 · 大白话双行对照 · 凭证有无绝不影响打分'
                : 'Open formulas · Transparent rules · Plain-language dual rows · Proof availability never affects scoring'}
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-neutral-800/80 border border-neutral-700/80 text-xs text-neutral-300 leading-relaxed flex items-start space-x-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">
              {language === 'zh' ? '核心公平性承诺：' : 'Core Fairness Commitment: '}
            </span>
            <span>
              {language === 'zh'
                ? '凭证类型不作为任何评分输入。无论您上传正规银行流水、手写记账本照片、移动支付截图，还是纯手动填写 14 项数字，梯度评分与 Gate 底线判定均执行完全相同的计算逻辑，用户可核实、可追责。'
                : 'Proof type is never used as a scoring input. Whether you upload formal bank statements, a handwritten ledger photo, mobile payment screenshots, or simply enter 14 numbers manually, the tiered scoring and Gate threshold checks run the exact same calculation logic — fully verifiable and auditable.'}
            </span>
          </div>
        </div>
      </div>

      {/* 5 Gate Bottom Checks Bento */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-base font-black text-neutral-900 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>
                {language === 'zh'
                  ? '5 项 Gate 底线红线判定规则（一票否决项）'
                  : '5 Gate Threshold Rules (Automatic Disqualifiers)'}
              </span>
            </h3>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              {language === 'zh'
                ? '底线指标必须全部达标，否则触发预警或一票否决，确保商业模式具备真实造血能力。'
                : 'All threshold metrics must be met, or a warning or automatic disqualification is triggered — ensuring the business model has genuine self-sustaining capacity.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm">
                {language === 'zh' ? 'Gate-1: 真实经营收入占比' : 'Gate-1: Real Operating Revenue Ratio'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold">
                ≥ 60%
              </span>
            </div>
            <p className="text-neutral-600 font-medium">
              {language === 'zh'
                ? '大白话：排除借款和外部赠款后，客户买单付给你的钱要占总进账的 60% 以上。'
                : 'Plain language: After excluding loans and external grants, money customers actually pay you must be at least 60% of total receipts.'}
            </p>
            <p className="text-teal-900 bg-teal-50/80 p-2.5 rounded-xl border border-teal-100 font-medium">
              {language === 'zh'
                ? '改善方向提示：专注提升核心主营商品或服务的销售复购，逐步降低对一次性救济款的依赖。'
                : 'Improvement tip: Focus on boosting repeat sales of your core products or services, and gradually reduce reliance on one-off relief funds.'}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm">
                {language === 'zh' ? 'Gate-2: 毛利率底线 (Gross Margin)' : 'Gate-2: Gross Margin Floor'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold">
                ≥ 20%
              </span>
            </div>
            <p className="text-neutral-600 font-medium">
              {language === 'zh'
                ? '大白话：每卖出 100 块钱东西，扣除直接进货和原材料成本后，至少要剩下 20 块钱毛利。'
                : 'Plain language: For every 100 you sell, after subtracting direct sourcing and material costs, at least 20 must remain as gross profit.'}
            </p>
            <p className="text-teal-900 bg-teal-50/80 p-2.5 rounded-xl border border-teal-100 font-medium">
              {language === 'zh'
                ? '改善方向提示：与上游批发商谈判争取批量折扣，或精简损耗严重的低毛利进货品种。'
                : 'Improvement tip: Negotiate bulk discounts with upstream suppliers, or trim low-margin, high-waste product lines.'}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm">
                {language === 'zh' ? 'Gate-3: OPEX 运营固定开销覆盖' : 'Gate-3: OPEX Fixed Cost Coverage'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold">
                {language === 'zh' ? '毛利 ≥ OPEX' : 'Gross Profit ≥ OPEX'}
              </span>
            </div>
            <p className="text-neutral-600 font-medium">
              {language === 'zh'
                ? '大白话：每月赚出来的毛利润，必须能够全额包住房租、工人工资与水电网络等固定支出。'
                : 'Plain language: Your monthly gross profit must fully cover fixed costs such as rent, wages, and utilities.'}
            </p>
            <p className="text-teal-900 bg-teal-50/80 p-2.5 rounded-xl border border-teal-100 font-medium">
              {language === 'zh'
                ? '改善方向提示：OPEX 超标时，通常可以从工时弹性排班、转租分摊部分场地或削减杂费入手。'
                : 'Improvement tip: When OPEX runs high, try flexible staff scheduling, subletting part of the space, or cutting miscellaneous fees.'}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm">
                {language === 'zh' ? 'Gate-4: 最终税后净利润 (PAT)' : 'Gate-4: Net Profit After Tax (PAT)'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold">
                PAT ≥ 0
              </span>
            </div>
            <p className="text-neutral-600 font-medium">
              {language === 'zh'
                ? '大白话：扣掉所有成本、开销和税金后，每月到手必须是正数，不能处于持续倒贴亏损状态。'
                : 'Plain language: After all costs, expenses, and taxes, what you take home each month must be positive — not a persistent loss.'}
            </p>
            <p className="text-teal-900 bg-teal-50/80 p-2.5 rounded-xl border border-teal-100 font-medium">
              {language === 'zh'
                ? '改善方向提示：梳理非生产性杂费支出，提升单客消费客单价以拉正月度利润。'
                : 'Improvement tip: Review non-productive miscellaneous spending and raise average spend per customer to turn monthly profit positive.'}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm">
                {language === 'zh' ? 'Gate-5: 债务偿付安全边际 (Debt Service Ratio)' : 'Gate-5: Debt Service Safety Margin'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold">
                {language === 'zh' ? '无负债 或 DSCR ≥ 1.25x' : 'No Debt or DSCR ≥ 1.25x'}
              </span>
            </div>
            <p className="text-neutral-600 font-medium">
              {language === 'zh'
                ? '大白话：如果有外部还贷，每月利润至少要是还款额的 1.25 倍以上，否则一旦经营波动就可能断供。'
                : 'Plain language: If you have external debt, monthly profit must be at least 1.25x the repayment amount, or any downturn risks a missed payment.'}
            </p>
            <p className="text-teal-900 bg-teal-50/80 p-2.5 rounded-xl border border-teal-100 font-medium">
              {language === 'zh'
                ? '改善方向提示：尝试协商延长贷款还款周期以降低月供，或暂停非必要杠杆扩张。'
                : 'Improvement tip: Try negotiating a longer loan repayment term to lower monthly payments, or pause non-essential leveraged expansion.'}
            </p>
          </div>
        </div>
      </div>

      {/* Dual-Line Metric Scoring Breakdown Table Bento */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-200 shadow-xs space-y-4">
        <div className="border-b border-neutral-100 pb-3">
          <h3 className="text-base font-black text-neutral-900 flex items-center space-x-2">
            <Percent className="w-5 h-5 text-teal-600" />
            <span>
              {language === 'zh'
                ? '梯度评分指标双行标准表 (板块 B-G)'
                : 'Tiered Scoring Metrics — Dual-Row Standards (Sections B-G)'}
            </span>
          </h3>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            {language === 'zh'
              ? '表头统一采用【专业术语 + 大白话副标题】双行展示，消除财务术语理解门槛。'
              : 'Each header uses [Technical Term + Plain-Language Subtitle] on two rows, removing the barrier of financial jargon.'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-100 text-neutral-800 border-b-2 border-neutral-200">
                <th className="p-3.5 font-bold rounded-l-2xl">
                  <div>{language === 'zh' ? '指标专业名称' : 'Metric Name'}</div>
                  <div className="text-[13px] font-normal text-neutral-500">
                    {language === 'zh' ? '大白话通俗说明' : 'Plain-language explanation'}
                  </div>
                </th>
                <th className="p-3.5 font-bold">{language === 'zh' ? '权重' : 'Weight'}</th>
                <th className="p-3.5 font-bold">{language === 'zh' ? '健康基准区间' : 'Healthy Benchmark Range'}</th>
                <th className="p-3.5 font-bold rounded-r-2xl">
                  {language === 'zh' ? '未达标通用改善方向' : 'General Improvement Direction'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-600">
              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">COGS Ratio / {language === 'zh' ? '原材料与直接成本占比' : 'Materials & Direct Cost Ratio'}</div>
                  <div className="text-neutral-400">
                    {language === 'zh' ? '进货原料花了多少钱' : 'How much you spend on sourcing materials'}
                  </div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">20%</td>
                <td className="p-3.5 font-mono">35% - 60%</td>
                <td className="p-3.5 text-neutral-700">
                  {language === 'zh'
                    ? '寻找就近源头供货商，减少中间商加价；优化配方或包装成本。'
                    : 'Find local direct-source suppliers to cut out middleman markup; optimize recipes or packaging costs.'}
                </td>
              </tr>

              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">OPEX Overhead / {language === 'zh' ? '运营固定开支占比' : 'Fixed Overhead Ratio'}</div>
                  <div className="text-neutral-400">
                    {language === 'zh' ? '每月房租、工人工资与日常杂费' : 'Monthly rent, wages, and routine miscellaneous fees'}
                  </div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">15%</td>
                <td className="p-3.5 font-mono">≤ 45%</td>
                <td className="p-3.5 text-neutral-700">
                  {language === 'zh'
                    ? '精简人工冗余工时、协商按月分段付租或分租部分场地以降低固定负担。'
                    : 'Trim redundant staff hours, negotiate monthly staggered rent, or sublet part of the space to lower fixed costs.'}
                </td>
              </tr>

              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">Net Profit Margin (PAT) / {language === 'zh' ? '到手纯利润率' : 'Take-Home Profit Margin'}</div>
                  <div className="text-neutral-400">
                    {language === 'zh' ? '最终揣进兜里的纯利润比例' : 'The share of revenue that ends up in your pocket'}
                  </div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">20%</td>
                <td className="p-3.5 font-mono">≥ 15%</td>
                <td className="p-3.5 text-neutral-700">
                  {language === 'zh'
                    ? '通过老客户会员复购或组合套餐提高客单价，严格压缩零碎损耗。'
                    : 'Raise average order value through loyalty repeat purchases or bundled deals, and tightly control small losses.'}
                </td>
              </tr>

              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">Cash Runway / {language === 'zh' ? '现金储备可支撑月数' : 'Cash Reserve Runway'}</div>
                  <div className="text-neutral-400">
                    {language === 'zh' ? '即使不进账，账上备用金能维持几个月' : 'How many months your reserves last with zero income'}
                  </div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">15%</td>
                <td className="p-3.5 font-mono">{language === 'zh' ? '≥ 3.0 个月' : '≥ 3.0 months'}</td>
                <td className="p-3.5 text-neutral-700">
                  {language === 'zh'
                    ? '每月坚持将 10%-15% 净利润提取到独立应急资金池，防范突发事件。'
                    : 'Consistently set aside 10%-15% of net profit into a separate emergency fund to guard against surprises.'}
                </td>
              </tr>

              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">DSCR / {language === 'zh' ? '债务偿付保障倍数' : 'Debt Service Coverage Ratio'}</div>
                  <div className="text-neutral-400">
                    {language === 'zh' ? '还债抗压能力（赚的钱够不够还贷）' : 'Ability to withstand repayments (does profit cover debt?)'}
                  </div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">15%</td>
                <td className="p-3.5 font-mono">{language === 'zh' ? '≥ 1.25x 或 无债' : '≥ 1.25x or no debt'}</td>
                <td className="p-3.5 text-neutral-700">
                  {language === 'zh'
                    ? '协商延长贷款还款年限以降低月供，避免过度举债扩大规模。'
                    : 'Negotiate a longer loan term to lower monthly payments, and avoid over-leveraging for expansion.'}
                </td>
              </tr>

              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">Continuity / {language === 'zh' ? '稳定经营时间与团队' : 'Operating Continuity & Team'}</div>
                  <div className="text-neutral-400">
                    {language === 'zh' ? '开了多少个月，团队规模是否平稳' : 'Months in operation and team stability'}
                  </div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">15%</td>
                <td className="p-3.5 font-mono">{language === 'zh' ? '≥ 12 个月' : '≥ 12 months'}</td>
                <td className="p-3.5 text-neutral-700">
                  {language === 'zh'
                    ? '建立清晰的经营台账，与核心员工签订互信分成机制以稳住团队。'
                    : 'Keep clear operating records and set up trust-based profit-sharing with core staff to retain the team.'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sector Benchmark Comparison (Plate H) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-200 shadow-xs space-y-5">
        <div className="border-b border-neutral-100 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-neutral-900 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <span>
                {language === 'zh'
                  ? '行业基准对照表与通俗自然语言总结 (板块 H)'
                  : 'Industry Benchmark Comparison & Plain-Language Summary (Section H)'}
              </span>
            </h3>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              {language === 'zh'
                ? '每个行业附带一句自然语言总结，让经营者一眼看懂行业常规盈利水平。'
                : 'Each industry comes with a plain-language summary so owners can quickly grasp typical profitability levels.'}
            </p>
          </div>

          <div className="flex gap-1.5 overflow-x-auto py-1">
            {INDUSTRY_BENCHMARKS.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedIndustry(b.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedIndustry === b.id
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {language === 'zh' ? b.nameZh.split(' ')[0] : b.nameEn}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Benchmark Detail Bento */}
        <div className="p-5 sm:p-6 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-neutral-900">
              {language === 'zh' ? activeBenchmark.nameZh : activeBenchmark.nameEn}
            </h4>
            <span className="text-xs font-mono font-medium text-neutral-500">
              {language === 'zh' ? activeBenchmark.nameEn : activeBenchmark.nameZh}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-2xl border-2 border-neutral-200 shadow-2xs">
              <span className="text-neutral-400 block text-[12px] uppercase font-bold mb-0.5">
                {language === 'zh' ? '典型毛利率区间' : 'Typical Gross Margin'}
              </span>
              <span className="font-mono font-bold text-neutral-900 text-sm">
                {activeBenchmark.typicalGrossMargin}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border-2 border-neutral-200 shadow-2xs">
              <span className="text-neutral-400 block text-[12px] uppercase font-bold mb-0.5">
                {language === 'zh' ? '典型固定开销比' : 'Typical OPEX Ratio'}
              </span>
              <span className="font-mono font-bold text-neutral-900 text-sm">
                {activeBenchmark.typicalOpexRatio}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border-2 border-neutral-200 shadow-2xs">
              <span className="text-neutral-400 block text-[12px] uppercase font-bold mb-0.5">
                {language === 'zh' ? '典型到手纯利' : 'Typical Net Margin'}
              </span>
              <span className="font-mono font-bold text-emerald-600 text-sm">
                {activeBenchmark.typicalNetMargin}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border-2 border-neutral-200 shadow-2xs">
              <span className="text-neutral-400 block text-[12px] uppercase font-bold mb-0.5">
                {language === 'zh' ? '抗风险备用金' : 'Cash Reserve Runway'}
              </span>
              <span className="font-mono font-bold text-teal-600 text-sm">
                {formatCashRunway(activeBenchmark.typicalCashRunway, language)}
              </span>
            </div>
          </div>

          {/* Natural Language Summary Bento */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-neutral-200 space-y-2">
            <div className="flex items-center space-x-1.5 text-neutral-900 font-bold text-xs">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>{language === 'zh' ? '行业通俗大白话总结：' : 'Plain-language industry summary:'}</span>
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed font-medium">
              “{language === 'zh' ? activeBenchmark.naturalLanguageSummaryZh : activeBenchmark.naturalLanguageSummaryEn}”
            </p>
            <div className="pt-2 border-t border-neutral-100 text-[13px] text-neutral-500 font-medium">
              <span className="font-bold text-neutral-800">
                {language === 'zh' ? '关键经营诀窍：' : 'Key operating advice: '}
              </span>
              <span>{language === 'zh' ? activeBenchmark.keyAdviceZh : activeBenchmark.keyAdviceEn}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
