import React from 'react';
import {
  BatteryCharging,
  BatteryWarning,
  PieChart,
  ShieldCheck
} from 'lucide-react';
import { BusinessFormData } from '../../types';
import { calculateAssessmentReport } from '../../lib/scoringEngine';

interface LiveHealthGaugeProps {
  formData: BusinessFormData;
  onOpenAiHelper?: (topic?: string) => void;
}

export const LiveHealthGauge: React.FC<LiveHealthGaugeProps> = ({
  formData,
  onOpenAiHelper
}) => {
  // Real-time calculated metrics
  const report = calculateAssessmentReport(formData);

  const totalRev = Math.max(1, formData.monthlyRevenue.amount);
  const cogs = formData.cogsCost.amount;
  const opex =
    formData.rentCost.amount +
    formData.laborCost.amount +
    formData.utilityCost.amount +
    formData.taxCost.amount +
    formData.otherOpex.amount;
  const cash = formData.cashAndLiquidAssets.amount;

  const grossProfit = Math.max(0, totalRev - cogs);
  const netProfit = grossProfit - opex;

  const opexRatioPct = Math.round((opex / totalRev) * 100);
  const netMarginPct = Math.round((netProfit / totalRev) * 100);

  // Runway in months
  const monthlyBurn = opex + cogs * 0.4;
  const runwayMonths = monthlyBurn > 0 ? (cash / monthlyBurn).toFixed(1) : '99.0';
  const runwayNum = parseFloat(runwayMonths);

  // Runway battery color
  let batteryColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
  let batteryBarColor = 'bg-emerald-500';
  let batteryLabel = '充足安全 (≥3个月)';
  if (runwayNum < 1.5) {
    batteryColor = 'text-rose-600 bg-rose-50 border-rose-200';
    batteryBarColor = 'bg-rose-500';
    batteryLabel = '严重不足 (<1.5个月)';
  } else if (runwayNum < 3.0) {
    batteryColor = 'text-amber-600 bg-amber-50 border-amber-200';
    batteryBarColor = 'bg-amber-500';
    batteryLabel = '较为吃紧 (1.5~3个月)';
  }

  // Gates status from report.gates
  const failedGatesCount = (report.gates || []).filter((g) => g.status === 'FAIL').length;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-indigo-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-neutral-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                实时晴雨表
              </span>
              <span className="text-xs text-neutral-500 font-bold">100% 自动计算</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-neutral-900 mt-0.5">当前开店健康实时测算</h3>
          </div>
        </div>

        {/* Live Score Badge */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-xs text-neutral-400 font-medium block">预估健康分</span>
            <span className="text-2xl font-black text-indigo-900 font-mono">
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
            {report.tier} 级
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
              <span className="font-bold text-sm sm:text-base">救命现金电池 (能撑多久)</span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 border border-current">
              {batteryLabel}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
              {runwayMonths} <span className="text-base font-bold">个月</span>
            </span>
            <span className="text-xs sm:text-sm font-semibold opacity-90">
              备用金 {cash.toLocaleString()} {formData.baseCurrency}
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
            {runwayNum >= 3.0
              ? '✅ 备用金储备充裕，即使突发淡季或短期停业也能从容应对。'
              : runwayNum >= 1.5
              ? '⚠️ 现金储备中等，建议适度控制进货与非必要开销，留足 3 个月以上。'
              : '🚨 现金极其危险！一旦顾客减少或发生意外支出可能立即面临断流。'}
          </p>
        </div>

        {/* Gauge 2: 100 Yuan Flow Breakdown Bar */}
        <div className="p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-bold text-neutral-900">
              <PieChart className="w-5 h-5 text-indigo-600" />
              <span className="text-sm sm:text-base">每进账 100 块钱怎么分的？</span>
            </div>
            <span className="text-xs text-neutral-500 font-bold">大白话收支构成</span>
          </div>

          {/* Multi-segment Bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-neutral-200">
            <div
              className="bg-rose-400 h-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (cogs / totalRev) * 100))}%` }}
              title={`进货成本: ${Math.round((cogs / totalRev) * 100)}%`}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (opex / totalRev) * 100))}%` }}
              title={`房租人工水电: ${Math.round((opex / totalRev) * 100)}%`}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (Math.max(0, netProfit) / totalRev) * 100))}%` }}
              title={`净利润: ${Math.max(0, netMarginPct)}%`}
            />
          </div>

          <div className="grid grid-cols-3 gap-1 text-xs sm:text-sm font-semibold pt-1">
            <div className="flex items-center gap-1.5 text-rose-800">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
              <span>进货 <strong>{Math.round((cogs / totalRev) * 100)}%</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-800">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              <span>租金人工 <strong>{opexRatioPct}%</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>净赚落袋 <strong>{netMarginPct}%</strong></span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-medium">
            {netMarginPct >= 20
              ? '🎉 净利润率非常健康，自我造血与抗风险能力优秀。'
              : netMarginPct >= 8
              ? '👍 属于微利稳健运行，注意控制房租和原料损耗。'
              : '⚠️ 净利润偏薄或处于亏损边缘，需排查是否进价过高或租金过重。'}
          </p>
        </div>
      </div>

      {/* Traffic Light Gates Status */}
      <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-indigo-950 text-sm sm:text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>5 道核心安全红线实时自检</span>
          </span>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              failedGatesCount === 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {failedGatesCount === 0 ? '✅ 5道全部安全绿灯' : `⚠️ 存在 ${failedGatesCount} 项预警`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(report.gates || []).map((g) => (
            <div
              key={g.code}
              className={`p-3 rounded-xl border text-center transition-all ${
                g.status === 'PASS'
                  ? 'bg-white border-emerald-200 text-emerald-950'
                  : g.status === 'WARNING'
                  ? 'bg-amber-50 border-amber-200 text-amber-950 font-bold'
                  : 'bg-rose-50 border-rose-200 text-rose-950 font-bold'
              }`}
              title={g.plainDescription || g.threshold}
            >
              <div className="text-xs font-bold flex items-center justify-center gap-1.5 mb-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    g.status === 'PASS'
                      ? 'bg-emerald-500'
                      : g.status === 'WARNING'
                      ? 'bg-amber-500'
                      : 'bg-rose-500 animate-pulse'
                  }`}
                />
                <span className="truncate">{g.plainName || g.name}</span>
              </div>
              <span className="text-[11px] opacity-80 block truncate">
                {g.status === 'PASS' ? '安全达标' : g.status === 'WARNING' ? '适度关注' : '触发红线'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
