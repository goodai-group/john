import React, { useState } from 'react';
import {
  Calculator,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { BusinessFormData, CurrencyCode, Language } from '../types';
import { SUPPORTED_CURRENCIES, formatMoney } from '../lib/currencies';
import { calculateAssessmentReport } from '../lib/scoringEngine';

interface SimulatorProps {
  language: Language;
  onApplyToForm: (data: any) => void;
}

export const ScoringSimulator: React.FC<SimulatorProps> = ({ language, onApplyToForm }) => {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [realRevenueRatio, setRealRevenueRatio] = useState(100);
  const [cogsRatio, setCogsRatio] = useState(0);
  const [rent, setRent] = useState(0);
  const [labor, setLabor] = useState(0);
  const [utilities, setUtilities] = useState(0);
  const [taxes, setTaxes] = useState(0);
  const [otherOpex, setOtherOpex] = useState(0);
  const [debtPayment, setDebtPayment] = useState(0);
  const [liquidCash, setLiquidCash] = useState(0);
  const [operatingMonths, setOperatingMonths] = useState(12);

  // 修复：不再手写一套独立的打分/红线公式（会与正式报告引擎的加权算法长期跑偏，
  // 同样的输入曾出现试算器与正式报告分数、评级档位都不一致的问题）。
  // 改为把试算器的滑块参数拼装成一份最小可用的 BusinessFormData，
  // 直接复用 runBusinessAssessment（正式评分引擎）来计算，确保结果与正式提交完全一致。
  const realRevenue = (monthlyRevenue * realRevenueRatio) / 100;
  const externalGrants = monthlyRevenue - realRevenue;
  const cogsAmount = (realRevenue * cogsRatio) / 100;

  const simulatedFormData: BusinessFormData = {
    id: 'sim-preview',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectName: '试算预览',
    industry: 'other',
    businessType: '',
    isSensitiveRegion: false,
    regionCountry: '',
    regionDetail: '',
    contactChannel: '',
    anonymousOwnerName: '',
    baseCurrency: currency,
    hasMultipleRates: false,
    proofType: 'none',
    proofFiles: [],
    monthlyBreakdowns: [],
    monthlyRevenue: { amount: monthlyRevenue, currency },
    monthlyRealOperatingRevenue: { amount: realRevenue, currency },
    monthlyExternalGrants: { amount: externalGrants, currency },
    cogsCost: { amount: cogsAmount, currency },
    rentCost: { amount: rent, currency },
    laborCost: { amount: labor, currency },
    utilityCost: { amount: utilities, currency },
    taxCost: { amount: taxes, currency },
    otherOpex: { amount: otherOpex, currency },
    companyRegistrationCost: { amount: 0, currency },
    companyRegistrationAmortizationMonths: 12,
    visaFeeCost: { amount: 0, currency },
    visaFeeAmortizationMonths: 12,
    equipmentDepreciationCost: { amount: 0, currency },
    existingDebtMonthlyPayment: { amount: debtPayment, currency },
    cashAndLiquidAssets: { amount: liquidCash, currency },
    inventoryValue: { amount: 0, currency },
    operatingMonthsCount: operatingMonths,
    fullTimeEmployeesCount: 0,
    ownerEmail: '',
    collaborators: [],
    isSubmitted: false,
    isDraft: true
  };

  const simulatedReport = calculateAssessmentReport(simulatedFormData);
  const { normalizedFinancials: fin } = simulatedReport;

  const totalOpex = fin.monthlyOpex;
  const grossProfit = fin.grossProfit;
  const grossMargin = fin.grossMarginPercent;
  const operatingProfitPBT = fin.operatingProfit;
  const netProfitPAT = fin.netProfit;
  const opexRatio = fin.opexRatioPercent;
  const cashRunway = fin.cashRunwayMonths;
  const dscr = fin.debtServiceCoverageRatio;

  // Gate checks（直接取自正式引擎的判定结果，与上方数值口径完全一致）
  const gateByCode = (code: string) => simulatedReport.gates.find((g) => g.code === code)?.status === 'PASS';
  const gate1 = gateByCode('GATE-1');
  const gate2 = gateByCode('GATE-2');
  const gate3 = gateByCode('GATE-3');
  const gate4 = gateByCode('GATE-4');
  const gate5 = gateByCode('GATE-5');
  const allGatesPassed = simulatedReport.gatePassed;

  const score = simulatedReport.totalScore;
  const tier = simulatedReport.tier;

  const resetDefaults = () => {
    setMonthlyRevenue(0);
    setRealRevenueRatio(100);
    setCogsRatio(0);
    setRent(0);
    setLabor(0);
    setUtilities(0);
    setTaxes(0);
    setOtherOpex(0);
    setDebtPayment(0);
    setLiquidCash(0);
    setOperatingMonths(12);
  };

  const handleApply = () => {
    onApplyToForm({
      baseCurrency: currency,
      monthlyRevenue: { amount: monthlyRevenue, currency },
      monthlyRealOperatingRevenue: { amount: Math.round(realRevenue), currency },
      monthlyExternalGrants: { amount: Math.round(externalGrants), currency },
      cogsCost: { amount: Math.round(cogsAmount), currency },
      rentCost: { amount: rent, currency },
      laborCost: { amount: labor, currency },
      utilityCost: { amount: utilities, currency },
      taxCost: { amount: taxes, currency },
      otherOpex: { amount: otherOpex, currency },
      existingDebtMonthlyPayment: { amount: debtPayment, currency },
      cashAndLiquidAssets: { amount: liquidCash, currency },
      operatingMonthsCount: operatingMonths
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Bento Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">商业模型试算器 (Sandbox Simulator)</h2>
                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  不提交 · 不记录
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                随意滑动滑块测算不同进货成本、租金人工与毛利变化对红线判定与最终得分的影响，数据纯本地计算。
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={resetDefaults}
              className="flex items-center space-x-1 px-3.5 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 text-xs font-bold border border-neutral-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置默认参数</span>
            </button>
            <button
              onClick={handleApply}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-md shadow-neutral-900/10 border-2 border-neutral-800 transition-all cursor-pointer hover:scale-102"
            >
              <span>带入正式申报表</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Interactive Sliders & Inputs (Bento Grid Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>1. 收入与毛利参数调校</span>
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">试算币种:</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="px-3 py-1 rounded-xl border-2 border-neutral-200 text-xs font-bold text-neutral-800 bg-neutral-50"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Monthly gross revenue */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="flex justify-between text-xs font-bold text-neutral-800 mb-2">
                <span>月均总流水 (Gross Revenue)</span>
                <span className="text-indigo-600 font-mono text-sm">
                  {formatMoney(monthlyRevenue, currency)}
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="50000"
                step="100"
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Real revenue ratio */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="flex justify-between text-xs font-bold text-neutral-800 mb-2">
                <span className="flex items-center space-x-1">
                  <span>真实自营收入占比 (排除借款/赠款)</span>
                  <span className="text-neutral-400 font-normal text-[11px]">[Gate-1 ≥ 60%]</span>
                </span>
                <span className={`font-mono text-sm ${realRevenueRatio >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {realRevenueRatio}% ({formatMoney(realRevenue, currency)})
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={realRevenueRatio}
                onChange={(e) => setRealRevenueRatio(Number(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                  realRevenueRatio >= 60 ? 'accent-emerald-600 bg-emerald-100' : 'accent-rose-600 bg-rose-100'
                }`}
              />
            </div>

            {/* COGS Ratio */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="flex justify-between text-xs font-bold text-neutral-800 mb-2">
                <span className="flex items-center space-x-1">
                  <span>COGS 原材料与直接进货成本占比</span>
                  <span className="text-neutral-400 font-normal text-[11px]">[毛利率: {grossMargin.toFixed(1)}%]</span>
                </span>
                <span className="text-amber-600 font-mono text-sm">
                  {cogsRatio}% ({formatMoney(cogsAmount, currency)})
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="85"
                value={cogsRatio}
                onChange={(e) => setCogsRatio(Number(e.target.value))}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
            </div>
          </div>

          {/* Section 2: OPEX Costs Bento */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
              2. OPEX 运营固定开销与债务结构
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <label className="block text-neutral-500 font-bold mb-1">每月房租 (Rent)</label>
                <input
                  type="number"
                  value={rent}
                  onChange={(e) => setRent(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 border-2 border-neutral-200 rounded-xl font-mono font-bold text-neutral-900 bg-white"
                />
              </div>
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <label className="block text-neutral-500 font-bold mb-1">员工工资 (Labor)</label>
                <input
                  type="number"
                  value={labor}
                  onChange={(e) => setLabor(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 border-2 border-neutral-200 rounded-xl font-mono font-bold text-neutral-900 bg-white"
                />
              </div>
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <label className="block text-neutral-500 font-bold mb-1">水电杂费 (Utility)</label>
                <input
                  type="number"
                  value={utilities}
                  onChange={(e) => setUtilities(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 border-2 border-neutral-200 rounded-xl font-mono font-bold text-neutral-900 bg-white"
                />
              </div>
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <label className="block text-neutral-500 font-bold mb-1">税金及规费 (Tax)</label>
                <input
                  type="number"
                  value={taxes}
                  onChange={(e) => setTaxes(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 border-2 border-neutral-200 rounded-xl font-mono font-bold text-neutral-900 bg-white"
                />
              </div>
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <label className="block text-neutral-500 font-bold mb-1">每月偿债本息 (Debt)</label>
                <input
                  type="number"
                  value={debtPayment}
                  onChange={(e) => setDebtPayment(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 border-2 border-neutral-200 rounded-xl font-mono font-bold text-neutral-900 bg-white"
                />
              </div>
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <label className="block text-neutral-500 font-bold mb-1">现有可用备用金 (Cash)</label>
                <input
                  type="number"
                  value={liquidCash}
                  onChange={(e) => setLiquidCash(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 border-2 border-neutral-200 rounded-xl font-mono font-bold text-neutral-900 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Diagnostics & Gate Verification (Bento Grid Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Result Card: Dark Bento Tile */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 uppercase tracking-widest font-bold">
                实时预估综合评分
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  allGatesPassed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {allGatesPassed ? '通过红线检查' : '触发一票否决'}
              </span>
            </div>

            <div className="flex items-baseline justify-between my-2">
              <div>
                <div className="text-5xl sm:text-6xl font-mono font-black tracking-tight">{score}</div>
                <div className="text-xs font-semibold text-neutral-400 mt-1">/ 100 分 · 客观推演</div>
              </div>

              {/* 同 AssessmentReportView 的修复：固定宽度装不下 "REJECT" 会被裁切，改为 min-w + 自适应字号 */}
              <div className="h-16 min-w-16 px-2 rounded-2xl bg-neutral-800 border border-neutral-700 flex flex-col items-center justify-center">
                <span className={`font-black text-amber-400 whitespace-nowrap ${tier.length > 3 ? 'text-sm' : 'text-xl'}`}>
                  {tier}
                </span>
                <span className="text-[9px] font-bold text-neutral-400 tracking-wider">TIER</span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-800 text-xs">
              <div className="bg-neutral-800/80 p-3 rounded-2xl border border-neutral-700/80">
                <span className="text-neutral-400 block text-[10px] uppercase font-bold mb-0.5">毛利率</span>
                <span className="font-mono font-bold text-sm text-emerald-400">{grossMargin.toFixed(1)}%</span>
              </div>
              <div className="bg-neutral-800/80 p-3 rounded-2xl border border-neutral-700/80">
                <span className="text-neutral-400 block text-[10px] uppercase font-bold mb-0.5">月到手纯利</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    netProfitPAT >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatMoney(netProfitPAT, currency)}
                </span>
              </div>
              <div className="bg-neutral-800/80 p-3 rounded-2xl border border-neutral-700/80">
                <span className="text-neutral-400 block text-[10px] uppercase font-bold mb-0.5">OPEX 固定比</span>
                <span className="font-mono font-bold text-sm text-amber-400">{opexRatio.toFixed(1)}%</span>
              </div>
              <div className="bg-neutral-800/80 p-3 rounded-2xl border border-neutral-700/80">
                <span className="text-neutral-400 block text-[10px] uppercase font-bold mb-0.5">备用金缓冲</span>
                <span className="font-mono font-bold text-sm text-sky-400">{cashRunway.toFixed(1)} 个月</span>
              </div>
            </div>
          </div>

          {/* Gate Verification Checklist Bento */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-neutral-900 flex items-center space-x-2 pb-2 border-b border-neutral-100">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>5 项 Gate 红线底线检查状态</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center space-x-2">
                  {gate1 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span className="font-bold text-neutral-800">真实营业额占比 ≥ 60%</span>
                </div>
                <span className={`font-mono font-bold ${gate1 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {realRevenueRatio}%
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center space-x-2">
                  {gate2 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span className="font-bold text-neutral-800">毛利率底线 ≥ 20%</span>
                </div>
                <span className={`font-mono font-bold ${gate2 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {grossMargin.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center space-x-2">
                  {gate3 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span className="font-bold text-neutral-800">毛利润覆盖每月固定开销</span>
                </div>
                <span className={`font-mono font-bold ${gate3 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {grossProfit >= totalOpex ? '已全额覆盖' : '缺口透支'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center space-x-2">
                  {gate4 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span className="font-bold text-neutral-800">税后净利润 PAT ≥ 0</span>
                </div>
                <span className={`font-mono font-bold ${gate4 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {netProfitPAT >= 0 ? '正向盈利' : '月度净亏损'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center space-x-2">
                  {gate5 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span className="font-bold text-neutral-800">偿债保障 ≥ 1.25x 或 无债</span>
                </div>
                <span className={`font-mono font-bold ${gate5 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {debtPayment === 0 ? '无债务' : `${dscr.toFixed(2)}x`}
                </span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-neutral-400 font-medium flex items-start space-x-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <span>试算仅供自我推演，如需生成带有雷达图与行业对比的正式诊断报告，可点击上方“带入正式申报表”一键填报。</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
