import React from 'react';
import {
  BatteryCharging,
  BatteryWarning,
  PieChart,
  Activity
} from 'lucide-react';
import { BusinessFormData, Language } from '../../types';
import { calculateAssessmentReport } from '../../lib/scoringEngine';

interface LiveHealthGaugeProps {
  formData: BusinessFormData;
  language: Language;
  onOpenAiHelper?: (topic?: string) => void;
  revenueTouched?: boolean;
}

export const LiveHealthGauge: React.FC<LiveHealthGaugeProps> = ({
  formData,
  language,
  onOpenAiHelper,
  revenueTouched = false
}) => {
  // Real-time calculated metrics
  const report = calculateAssessmentReport(formData);

  const totalRev = formData.monthlyRevenue.amount;
  const hasRevenue = totalRev > 0;
  // COGS / OPEX / 毛利 / 净利 一律复用评分引擎统一口径
  // （动态明细项优先、OPEX 不含税费），保证晴雨表与体检报告完全一致
  const nf = report.normalizedFinancials;
  const cogs = nf.monthlyCogs;
  const opex = nf.monthlyOpex;
  const tax = formData.taxCost.amount;
  const cash = formData.cashAndLiquidAssets.amount;

  const grossProfit = nf.grossProfit;
  const netProfit = nf.netProfit;

  const opexRatioPct = hasRevenue ? Math.round((opex / totalRev) * 100) : 0;
  const netMarginPct = hasRevenue ? Math.round((netProfit / totalRev) * 100) : 0;

  // 晴雨表只应在用户真正输入过月总流水后显示；
  // 避免 AI 自动预填的行业估值被误当成真实经营结果，吓到未填表的用户。
  const isReady = hasRevenue && revenueTouched;

  // 现金跑道直接复用评分引擎的统一口径（COGS + OPEX + 还贷，不含税），
  // 保证"快速体检晴雨表"与"体检报告"显示完全一致
  const runwayNum = report.normalizedFinancials.cashRunwayMonths || 0;
  // 无任何开销但持有储备金时视为"几乎不会耗尽"；连储备金都没有则直接显示 0 个月
  const runwayMonths =
    runwayNum > 0 ? runwayNum.toFixed(1) : cash > 0 ? '99.0' : '0.0';

  // 收支构成三段（进货/开销/净利）。净利为负时三段合计可能超过 100%，
  // 按比例压缩进度条宽度避免溢出，文字仍显示真实百分比。
  const cogsPct = hasRevenue ? Math.max(0, (cogs / totalRev) * 100) : 0;
  const opexPct = hasRevenue ? Math.max(0, (opex / totalRev) * 100) : 0;
  const netPct = hasRevenue ? Math.max(0, (netProfit / totalRev) * 100) : 0;
  const totalPct = cogsPct + opexPct + netPct;
  const scale = totalPct > 100 ? 100 / totalPct : 1;

  // Runway battery color
  let batteryColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
  let batteryBarColor = 'bg-emerald-500';
  let batteryLabel = language === 'en' ? 'Safe & Sufficient (≥3 months)' : '充足安全 (≥3个月)';
  if (runwayNum < 1.5) {
    batteryColor = 'text-rose-600 bg-rose-50 border-rose-200';
    batteryBarColor = 'bg-rose-500';
    batteryLabel = language === 'en' ? 'Critically Low (<1.5 months)' : '严重不足 (<1.5个月)';
  } else if (runwayNum < 3.0) {
    batteryColor = 'text-amber-600 bg-amber-50 border-amber-200';
    batteryBarColor = 'bg-amber-500';
    batteryLabel = language === 'en' ? 'Somewhat Tight (1.5~3 months)' : '较为吃紧 (1.5~3个月)';
  }


  if (!isReady) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-dashed border-neutral-200 shadow-sm space-y-6">
        {/* Header (muted) */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50 px-2.5 py-0.5 rounded-full border border-neutral-100">
                  {language === 'en' ? 'Live Barometer' : '实时晴雨表'}
                </span>
                <span className="text-xs text-neutral-500 font-bold">{language === 'en' ? '100% Auto-calculated' : '100% 自动计算'}</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 mt-0.5">{language === 'en' ? 'Live Business Health Check' : '商宣模式运转健康实时测算'}</h3>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-xs text-neutral-400 font-medium block">{language === 'en' ? 'Estimated Health Score' : '预估健康分'}</span>
              <span className="text-2xl font-black text-neutral-300 font-mono">
                -- <span className="text-sm text-neutral-300">/ 100</span>
              </span>
            </div>
            <span className="px-3.5 py-2 rounded-2xl font-black text-sm border bg-neutral-100 text-neutral-500 border-neutral-200">
              {language === 'en' ? 'Awaiting Input' : '待填写'}
            </span>
          </div>
        </div>

        <div className="py-10 text-center">
          <p className="text-sm font-medium text-neutral-500">
            {language === 'en'
              ? 'Once you enter real monthly total revenue, the health check will appear here live'
              : '输入真实月总流水后，这里会实时显示健康测算'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-teal-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-neutral-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                {language === 'en' ? 'Live Barometer' : '实时晴雨表'}
              </span>
              <span className="text-xs text-neutral-500 font-bold">{language === 'en' ? '100% Auto-calculated' : '100% 自动计算'}</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-neutral-900 mt-0.5">{language === 'en' ? 'Live Business Health Check' : '商宣模式运转健康实时测算'}</h3>
          </div>
        </div>

        {/* Live Score Badge */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-xs text-neutral-400 font-medium block">{language === 'en' ? 'Estimated Health Score' : '预估健康分'}</span>
            <span className="text-2xl font-black text-teal-900 font-mono">
              {report.totalScore} <span className="text-sm text-neutral-400">/ 100</span>
            </span>
          </div>
          <span
            className={`px-3.5 py-2 rounded-2xl font-black text-sm border shadow-xs ${
              report.tier === 'AAA' || report.tier === 'AA'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : report.tier === 'A' || report.tier === 'BBB'
                ? 'bg-sky-100 text-sky-900 border-sky-300'
                : report.tier === 'BB' || report.tier === 'B'
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-rose-100 text-rose-900 border-rose-300'
            }`}
          >
            {report.tier} {language === 'en' ? 'Tier' : '级'}
          </span>
        </div>
      </div>

      {/* Grid of Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Gauge 1: Cash Battery */}
        <div className={`p-5 rounded-2xl border-2 ${batteryColor} space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {runwayNum < 1.5 ? (
                <BatteryWarning className="w-6 h-6" />
              ) : (
                <BatteryCharging className="w-6 h-6" />
              )}
              <span className="font-bold text-sm sm:text-base">{language === 'en' ? 'Emergency Cash Battery (how long it lasts)' : '救命现金电池 (能撑多久)'}</span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 border border-current">
              {batteryLabel}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
              {runwayMonths} <span className="text-base font-bold">{language === 'en' ? 'months' : '个月'}</span>
            </span>
            <span className="text-xs sm:text-sm font-semibold opacity-90">
              {language === 'en' ? 'Reserve' : '备用金'} {cash.toLocaleString()} {formData.baseCurrency}
            </span>
          </div>

          {/* Battery Meter Visual Bar */}
          <div className="w-full bg-black/10 h-3.5 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${batteryBarColor}`}
              style={{ width: `${Math.min(100, Math.max(8, (runwayNum / 6) * 100))}%` }}
            />
          </div>

          <p className="text-xs sm:text-sm opacity-90 leading-relaxed font-medium">
            {language === 'en'
              ? (runwayNum >= 3.0
                  ? 'Your reserve is ample — you can comfortably handle a sudden slow season or a short closure.'
                  : runwayNum >= 1.5
                  ? 'Your cash reserve is moderate — consider moderately controlling purchasing and non-essential spending, and build up at least 3 months of runway.'
                  : 'Your cash position is extremely risky! A drop in customers or an unexpected expense could immediately cause a cash-flow break.')
              : (runwayNum >= 3.0
                  ? '备用金储备充裕，即使突发淡季或短期停业也能从容应对。'
                  : runwayNum >= 1.5
                  ? '现金储备中等，建议适度控制进货与非必要开销，留足 3 个月以上。'
                  : '现金极其危险！一旦顾客减少或发生意外支出可能立即面临断流。')}
          </p>
        </div>

        {/* Gauge 2: 100 Yuan Flow Breakdown Bar */}
        <div className="p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-bold text-neutral-900">
              <PieChart className="w-5 h-5 text-teal-600" />
              <span className="text-sm sm:text-base">{language === 'en' ? 'Where does every 100 you earn go?' : '每进账 100 块钱怎么分的？'}</span>
            </div>
            <span className="text-xs text-neutral-500 font-bold">{language === 'en' ? 'Plain-language income breakdown' : '大白话收支构成'}</span>
          </div>

          {/* Multi-segment Bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-neutral-200">
            <div
              className="bg-rose-400 h-full transition-all duration-300"
              style={{ width: `${cogsPct * scale}%` }}
              title={language === 'en' ? `Purchasing cost: ${Math.round(cogsPct)}%` : `进货成本: ${Math.round(cogsPct)}%`}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${opexPct * scale}%` }}
              title={language === 'en' ? `Rent, labor & utilities: ${Math.round(opexPct)}%` : `房租人工水电: ${Math.round(opexPct)}%`}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${netPct * scale}%` }}
              title={language === 'en' ? `Net profit: ${Math.max(0, netMarginPct)}%` : `净利润: ${Math.max(0, netMarginPct)}%`}
            />
          </div>

          <div className="grid grid-cols-3 gap-1 text-xs sm:text-sm font-semibold pt-1">
            <div className="flex items-center gap-1.5 text-rose-800">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
              <span>{language === 'en' ? 'Purchasing' : '进货'} <strong>{Math.round(cogsPct)}%</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-800">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              <span>{language === 'en' ? 'Rent & Labor' : '租金人工'} <strong>{opexRatioPct}%</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{language === 'en' ? 'Net Profit' : '净赚落袋'} <strong>{netMarginPct}%</strong></span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-medium">
            {language === 'en'
              ? (netProfit < 0
                  ? 'You are currently operating at a loss: for every 100 you earn, purchasing and expenses already take up 100% or more — prioritize cutting costs or raising prices.'
                  : netMarginPct >= 20
                  ? 'Your net profit margin is very healthy, with excellent self-sustaining and risk-resilience capability.'
                  : netMarginPct >= 8
                  ? 'You are running at a modest, stable profit — watch your rent and material waste.'
                  : 'Your net profit is thin or near the loss line — check whether your purchasing costs are too high or rent too heavy.')
              : (netProfit < 0
                  ? '当前处于亏损状态：每进账 100 块，进货与开销已占满甚至超过 100%，需优先压缩成本或提升售价。'
                  : netMarginPct >= 20
                  ? '净利润率非常健康，自我造血与抗风险能力优秀。'
                  : netMarginPct >= 8
                  ? '属于微利稳健运行，注意控制房租和原料损耗。'
                  : '净利润偏薄或处于亏损边缘，需排查是否进价过高或租金过重。')}
          </p>
        </div>
      </div>
    </div>
  );
};
