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
              <h2 className="text-xl font-black tracking-tight text-white">公开评分标准与行业基准库</h2>
              <span className="text-[12px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 rounded-full">
                STANDARDS HUB
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              公式公开 · 规则透明 · 大白话双行对照 · 凭证有无绝不影响打分
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-neutral-800/80 border border-neutral-700/80 text-xs text-neutral-300 leading-relaxed flex items-start space-x-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">核心公平性承诺：</span>
            <span>
              凭证类型不作为任何评分输入。无论您上传正规银行流水、手写记账本照片、移动支付截图，还是纯手动填写 14 项数字，梯度评分与 Gate 底线判定均执行完全相同的计算逻辑，用户可核实、可追责。
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
              <span>5 项 Gate 底线红线判定规则（一票否决项）</span>
            </h3>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              底线指标必须全部达标，否则触发预警或一票否决，确保商业模式具备真实造血能力。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm">Gate-1: 真实经营收入占比</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold">
                ≥ 60%
              </span>
            </div>
            <p className="text-neutral-600 font-medium">
              大白话：排除借款和外部赠款后，客户买单付给你的钱要占总进账的 60% 以上。
            </p>
            <p className="text-teal-900 bg-teal-50/80 p-2.5 rounded-xl border border-teal-100 font-medium">
              改善方向提示：专注提升核心主营商品或服务的销售复购，逐步降低对一次性救济款的依赖。
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm">Gate-2: 毛利率底线 (Gross Margin)</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold">
                ≥ 20%
              </span>
            </div>
            <p className="text-neutral-600 font-medium">
              大白话：每卖出 100 块钱东西，扣除直接进货和原材料成本后，至少要剩下 20 块钱毛利。
            </p>
            <p className="text-teal-900 bg-teal-50/80 p-2.5 rounded-xl border border-teal-100 font-medium">
              改善方向提示：与上游批发商谈判争取批量折扣，或精简损耗严重的低毛利进货品种。
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm">Gate-3: OPEX 运营固定开销覆盖</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold">
                毛利 ≥ OPEX
              </span>
            </div>
            <p className="text-neutral-600 font-medium">
              大白话：每月赚出来的毛利润，必须能够全额包住房租、工人工资与水电网络等固定支出。
            </p>
            <p className="text-teal-900 bg-teal-50/80 p-2.5 rounded-xl border border-teal-100 font-medium">
              改善方向提示：OPEX 超标时，通常可以从工时弹性排班、转租分摊部分场地或削减杂费入手。
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm">Gate-4: 最终税后净利润 (PAT)</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold">
                PAT ≥ 0
              </span>
            </div>
            <p className="text-neutral-600 font-medium">
              大白话：扣掉所有成本、开销和税金后，每月到手必须是正数，不能处于持续倒贴亏损状态。
            </p>
            <p className="text-teal-900 bg-teal-50/80 p-2.5 rounded-xl border border-teal-100 font-medium">
              改善方向提示：梳理非生产性杂费支出，提升单客消费客单价以拉正月度利润。
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm">Gate-5: 债务偿付安全边际 (Debt Service Ratio)</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold">
                无负债 或 DSCR ≥ 1.25x
              </span>
            </div>
            <p className="text-neutral-600 font-medium">
              大白话：如果有外部还贷，每月利润至少要是还款额的 1.25 倍以上，否则一旦经营波动就可能断供。
            </p>
            <p className="text-teal-900 bg-teal-50/80 p-2.5 rounded-xl border border-teal-100 font-medium">
              改善方向提示：尝试协商延长贷款还款周期以降低月供，或暂停非必要杠杆扩张。
            </p>
          </div>
        </div>
      </div>

      {/* Dual-Line Metric Scoring Breakdown Table Bento */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-200 shadow-xs space-y-4">
        <div className="border-b border-neutral-100 pb-3">
          <h3 className="text-base font-black text-neutral-900 flex items-center space-x-2">
            <Percent className="w-5 h-5 text-teal-600" />
            <span>梯度评分指标双行标准表 (板块 B-G)</span>
          </h3>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            表头统一采用【专业术语 + 大白话副标题】双行展示，消除财务术语理解门槛。
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-100 text-neutral-800 border-b-2 border-neutral-200">
                <th className="p-3.5 font-bold rounded-l-2xl">
                  <div>指标专业名称</div>
                  <div className="text-[13px] font-normal text-neutral-500">大白话通俗说明</div>
                </th>
                <th className="p-3.5 font-bold">权重</th>
                <th className="p-3.5 font-bold">健康基准区间</th>
                <th className="p-3.5 font-bold rounded-r-2xl">未达标通用改善方向</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-600">
              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">COGS Ratio / 原材料与直接成本占比</div>
                  <div className="text-neutral-400">进货原料花了多少钱</div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">20%</td>
                <td className="p-3.5 font-mono">35% - 60%</td>
                <td className="p-3.5 text-neutral-700">寻找就近源头供货商，减少中间商加价；优化配方或包装成本。</td>
              </tr>

              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">OPEX Overhead / 运营固定开支占比</div>
                  <div className="text-neutral-400">每月房租、工人工资与日常杂费</div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">15%</td>
                <td className="p-3.5 font-mono">≤ 45%</td>
                <td className="p-3.5 text-neutral-700">精简人工冗余工时、协商按月分段付租或分租部分场地以降低固定负担。</td>
              </tr>

              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">Net Profit Margin (PAT) / 到手纯利润率</div>
                  <div className="text-neutral-400">最终揣进兜里的纯利润比例</div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">20%</td>
                <td className="p-3.5 font-mono">≥ 15%</td>
                <td className="p-3.5 text-neutral-700">通过老客户会员复购或组合套餐提高客单价，严格压缩零碎损耗。</td>
              </tr>

              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">Cash Runway / 现金储备可支撑月数</div>
                  <div className="text-neutral-400">即使不进账，账上备用金能维持几个月</div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">15%</td>
                <td className="p-3.5 font-mono">≥ 3.0 个月</td>
                <td className="p-3.5 text-neutral-700">每月坚持将 10%-15% 净利润提取到独立应急资金池，防范突发事件。</td>
              </tr>

              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">DSCR / 债务偿付保障倍数</div>
                  <div className="text-neutral-400">还债抗压能力（赚的钱够不够还贷）</div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">15%</td>
                <td className="p-3.5 font-mono">≥ 1.25x 或 无债</td>
                <td className="p-3.5 text-neutral-700">协商延长贷款还款年限以降低月供，避免过度举债扩大规模。</td>
              </tr>

              <tr className="hover:bg-neutral-50/80 transition-colors">
                <td className="p-3.5 font-medium">
                  <div className="text-neutral-900 font-bold">Continuity / 稳定经营时间与团队</div>
                  <div className="text-neutral-400">开了多少个月，团队规模是否平稳</div>
                </td>
                <td className="p-3.5 font-mono font-bold text-teal-600">15%</td>
                <td className="p-3.5 font-mono">≥ 12 个月</td>
                <td className="p-3.5 text-neutral-700">建立清晰的经营台账，与核心员工签订互信分成机制以稳住团队。</td>
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
              <span>行业基准对照表与通俗自然语言总结 (板块 H)</span>
            </h3>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              每个行业附带一句自然语言总结，让经营者一眼看懂行业常规盈利水平。
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
                {b.nameZh.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Benchmark Detail Bento */}
        <div className="p-5 sm:p-6 rounded-2xl bg-neutral-50 border-2 border-neutral-100 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-neutral-900">{activeBenchmark.nameZh}</h4>
            <span className="text-xs font-mono font-medium text-neutral-500">{activeBenchmark.nameEn}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-2xl border-2 border-neutral-200 shadow-2xs">
              <span className="text-neutral-400 block text-[12px] uppercase font-bold mb-0.5">典型毛利率区间</span>
              <span className="font-mono font-bold text-neutral-900 text-sm">
                {activeBenchmark.typicalGrossMargin}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border-2 border-neutral-200 shadow-2xs">
              <span className="text-neutral-400 block text-[12px] uppercase font-bold mb-0.5">典型固定开销比</span>
              <span className="font-mono font-bold text-neutral-900 text-sm">
                {activeBenchmark.typicalOpexRatio}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border-2 border-neutral-200 shadow-2xs">
              <span className="text-neutral-400 block text-[12px] uppercase font-bold mb-0.5">典型到手纯利</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">
                {activeBenchmark.typicalNetMargin}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border-2 border-neutral-200 shadow-2xs">
              <span className="text-neutral-400 block text-[12px] uppercase font-bold mb-0.5">抗风险备用金</span>
              <span className="font-mono font-bold text-teal-600 text-sm">
                {activeBenchmark.typicalCashRunway}
              </span>
            </div>
          </div>

          {/* Natural Language Summary Bento */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-neutral-200 space-y-2">
            <div className="flex items-center space-x-1.5 text-neutral-900 font-bold text-xs">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>行业通俗大白话总结：</span>
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed font-medium">
              “{activeBenchmark.naturalLanguageSummaryZh}”
            </p>
            <div className="pt-2 border-t border-neutral-100 text-[13px] text-neutral-500 font-medium">
              <span className="font-bold text-neutral-800">关键经营诀窍：</span>
              <span>{activeBenchmark.keyAdviceZh}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
