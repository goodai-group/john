import React, { useState, useEffect } from 'react';
import {
  AssessmentReport,
  Language,
  ProofType
} from '../../types';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Printer,
  RotateCcw,
  Trash2,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  Calendar,
  AlertOctagon,
  EyeOff,
  DollarSign,
  Wallet,
  Store,
  Users,
  ThumbsUp,
  Sliders,
  HelpCircle,
  Activity,
  ArrowUpRight,
  Check,
  X,
  Package,
  PiggyBank,
  Compass,
  FileText,
  Copy,
  CheckCheck,
  GitCompare
} from 'lucide-react';
import { formatMoney } from '../../lib/currencies';

interface ReportViewProps {
  report: AssessmentReport;
  allVersions?: AssessmentReport[];
  onSelectVersion?: (version: number) => void;
  onReAssess: () => void;
  onDeleteAndRecall: () => void;
  language: Language;
}

export const AssessmentReportView: React.FC<ReportViewProps> = ({
  report,
  allVersions = [],
  onSelectVersion,
  onReAssess,
  onDeleteAndRecall,
  language
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  // Default to simple plain language mode
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isAiDiagnosing, setIsAiDiagnosing] = useState(false);
  const [aiCustomDiagnosis, setAiCustomDiagnosis] = useState<{
    summaryHeadline?: string;
    plainExplanation?: string;
    actionableAdvices?: string[];
    potentialGrowthAreas?: string[];
  } | null>(null);
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});
  const [showVersionDiff, setShowVersionDiff] = useState(false);

  const {
    monthlyGrossRevenue,
    monthlyRealRevenue,
    monthlyCogs,
    monthlyOpex,
    grossProfit,
    grossMarginPercent,
    netProfit,
    netProfitMarginPercent,
    opexRatioPercent,
    cashRunwayMonths,
    debtServiceCoverageRatio
  } = report.normalizedFinancials;

  const baseCurr = report.baseCurrency;

  // Previous version comparison if available
  const prevVersion = allVersions.find((v) => v.version === report.version - 1);
  const scoreDiff = prevVersion ? report.totalScore - prevVersion.totalScore : 0;
  const marginDiff = prevVersion
    ? report.normalizedFinancials.netProfitMarginPercent -
      prevVersion.normalizedFinancials.netProfitMarginPercent
    : 0;
  const runwayDiff = prevVersion
    ? Number((report.normalizedFinancials.cashRunwayMonths - prevVersion.normalizedFinancials.cashRunwayMonths).toFixed(1))
    : 0;

  // Fetch live Gemini AI Deep Diagnosis
  const handleFetchAiDiagnosis = async () => {
    setIsAiDiagnosing(true);
    try {
      const res = await fetch('/api/ai/deep-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report })
      });
      if (res.ok) {
        const data = await res.json();
        setAiCustomDiagnosis(data);
      }
    } catch (e) {
      console.warn('AI deep diagnosis fetch error:', e);
    } finally {
      setIsAiDiagnosing(false);
    }
  };

  // Copy plain language executive summary
  const handleCopySummary = () => {
    const summaryText = `【${report.projectName} · 商业自测体检报告 v${report.version}】
综合健康得分：${report.totalScore}分 (${report.letterGrade})
红线合规：${report.gatePassed ? '全部通过 (4/4)' : `未通过 (${report.failedGates.length} 项触发警示)`}

📊 核心经营数据概览：
- 月营业额：${formatMoney(monthlyRealRevenue, baseCurr)}
- 每月净利润：${formatMoney(netProfit, baseCurr)} (净利润率 ${netProfitMarginPercent}%)
- 直接进货成本：${formatMoney(monthlyCogs, baseCurr)} (毛利率 ${grossMarginPercent}%)
- 每月房租人工开销：${formatMoney(monthlyOpex, baseCurr)} (占营业额 ${opexRatioPercent}%)
- 现金应急备用金：能支撑 ${cashRunwayMonths} 个月固定开销

💡 关键建议：
${(aiCustomDiagnosis?.actionableAdvices || report.aiActionableAdvice).map((adv, i) => `${i + 1}. ${adv}`).join('\n')}

*由 BAM-PRD-2026-V1.4 商业模型自测系统与 Gemini AI 生成*`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const toggleActionCompleted = (index: number) => {
    setCompletedActions((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Calculate 100 Yuan breakdown percentages
  const rev = monthlyRealRevenue > 0 ? monthlyRealRevenue : 100;
  const cogsPct = Math.min(100, Math.max(0, Math.round((monthlyCogs / rev) * 100)));
  const opexPct = Math.min(100 - cogsPct, Math.max(0, Math.round((monthlyOpex / rev) * 100)));
  const netPct = Math.round((netProfit / rev) * 100);
  const taxOtherPct = Math.max(0, 100 - cogsPct - opexPct - Math.max(0, netPct));

  // Health verdict helper
  const getHealthSummary = () => {
    if (!report.gatePassed) {
      return {
        badge: '有资金隐患 · 急需调整',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        verdictTitle: '生意面临固定支出或毛利倒挂风险',
        verdictDesc: '虽然有流水，但扣除进货和每月房租人工后已出现亏损或还贷压力过大，需要立即按下方建议优化开销。',
        trafficIcon: '🔴'
      };
    }
    if (netProfitMarginPercent >= 20 && cashRunwayMonths >= 3) {
      return {
        badge: '经营极度健康 · 能赚且抗风险',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        verdictTitle: '每月不仅稳稳赚钱，而且手里留有充足的救命钱！',
        verdictDesc: `扣掉全部进货、房租与工人工资后，每月能稳稳揣进 ${formatMoney(netProfit, baseCurr)} 纯利，账上备用金足够支撑 ${cashRunwayMonths} 个月，抗风险能力非常强。`,
        trafficIcon: '🟢'
      };
    }
    if (netProfitMarginPercent >= 10) {
      return {
        badge: '基本面良好 · 利润空间稳健',
        badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        verdictTitle: '生意能正常盈利，建议适度增强现金储备与控成本。',
        verdictDesc: `每月净利润为 ${formatMoney(netProfit, baseCurr)} (利润率 ${netProfitMarginPercent}%)，整体处于良性循环，注意别盲目扩大固定负债。`,
        trafficIcon: '🟢'
      };
    }
    return {
      badge: '利润偏薄 · 建议优化利润率',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      verdictTitle: '生意在赚钱，但属于“辛苦钱”，利润空间偏紧。',
      verdictDesc: `扣除所有成本后到手利润率仅为 ${netProfitMarginPercent}%，一旦进货涨价或淡季来临容易承压，建议按建议提升客单价或压降开支。`,
      trafficIcon: '🟡'
    };
  };

  const health = getHealthSummary();

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${report.projectName}-Assessment-Report-v${report.version}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Radar chart points generator for 5 dimensions (for detailed view)
  const radarPoints = report.radarScores
    .map((r, i) => {
      const angle = (Math.PI * 2 * i) / report.radarScores.length - Math.PI / 2;
      const radius = (r.score / 100) * 80;
      const x = 100 + radius * Math.cos(angle);
      const y = 100 + radius * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(' ');

  const benchmarkPoints = report.radarScores
    .map((r, i) => {
      const angle = (Math.PI * 2 * i) / report.radarScores.length - Math.PI / 2;
      const radius = (r.benchmark / 100) * 80;
      const x = 100 + radius * Math.cos(angle);
      const y = 100 + radius * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 print:p-0">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border-2 border-neutral-200 shadow-xs print:hidden">
        <div className="flex items-center flex-wrap gap-3">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-2xl border border-neutral-200">
            <button
              onClick={() => setViewMode('simple')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'simple'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>极简大白话速览 (推荐)</span>
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'detailed'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>专业财务明细模式</span>
            </button>
          </div>

          {/* Version Switcher */}
          {allVersions.length > 1 && (
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 bg-neutral-50 px-3 py-1.5 rounded-2xl border border-neutral-200">
              <span className="text-neutral-400 uppercase tracking-wider text-[10px]">历史版本:</span>
              <select
                value={report.version}
                onChange={(e) => onSelectVersion?.(Number(e.target.value))}
                className="font-bold bg-transparent text-indigo-600 focus:outline-hidden"
              >
                {allVersions.map((v) => (
                  <option key={v.version} value={v.version}>
                    v{v.version} ({new Date(v.createdAt).toLocaleDateString()}) - {v.totalScore}分
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowVersionDiff(!showVersionDiff)}
                className={`p-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                  showVersionDiff ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-neutral-600 border-neutral-200'
                }`}
                title="查看与上一版本的得分变化对比"
              >
                <GitCompare className="w-3 h-3" />
                <span>对比</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
          >
            {copiedSummary ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">已复制摘要</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>复制摘要</span>
              </>
            )}
          </button>

          <button
            onClick={onReAssess}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新测算</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>打印 / 导出PDF</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>备份</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-2xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-bold transition-colors cursor-pointer"
            title="撤回并物理删除该项目全部数据"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>彻底删除</span>
          </button>
        </div>
      </div>

      {/* Version Diff Banner when enabled */}
      {showVersionDiff && prevVersion && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-3xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-900">
                对比上一版本 (v{prevVersion.version} ➔ v{report.version})
              </h4>
              <p className="text-[11px] text-neutral-500">
                优化措施落地后的数据变化趋势
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-100 flex items-center space-x-1.5">
              <span className="text-neutral-500">得分变化:</span>
              <span className={scoreDiff >= 0 ? 'text-emerald-600 font-mono' : 'text-rose-600 font-mono'}>
                {scoreDiff >= 0 ? `+${scoreDiff}` : scoreDiff} 分
              </span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-100 flex items-center space-x-1.5">
              <span className="text-neutral-500">利润率变化:</span>
              <span className={marginDiff >= 0 ? 'text-emerald-600 font-mono' : 'text-rose-600 font-mono'}>
                {marginDiff >= 0 ? `+${marginDiff}%` : `${marginDiff}%`}
              </span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-100 flex items-center space-x-1.5">
              <span className="text-neutral-500">备用金支撑:</span>
              <span className={runwayDiff >= 0 ? 'text-emerald-600 font-mono' : 'text-rose-600 font-mono'}>
                {runwayDiff >= 0 ? `+${runwayDiff}月` : `${runwayDiff}月`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 1. SIMPLE PLAIN LANGUAGE VIEW (DEFAULT & INTUITIVE) */}
      {/* ========================================================================= */}
      {viewMode === 'simple' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card 1: Health Headline & Verdict */}
          <div className="bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${health.badgeColor} flex items-center space-x-1.5`}>
                    <span>{health.trafficIcon}</span>
                    <span>{health.badge}</span>
                  </span>
                  <span className="text-xs text-neutral-400 font-medium">
                    项目名称：<strong className="text-neutral-800 font-bold">{report.projectName}</strong>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-snug">
                  {health.verdictTitle}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 font-medium mt-2 leading-relaxed max-w-3xl">
                  {health.verdictDesc}
                </p>
              </div>

              {/* Total Score & Grade Badge */}
              <div className="flex items-center space-x-3 bg-neutral-50 border-2 border-neutral-200 p-3 sm:p-4 rounded-2xl">
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase text-neutral-400 font-bold">综合体检得分</div>
                  <div className="text-3xl font-mono font-black text-neutral-900">
                    {report.totalScore}
                    <span className="text-xs font-normal text-neutral-400">/100</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-mono font-black text-xl shadow-xs">
                  {report.letterGrade}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: "Where does 100 Yuan go?" (钱流向图) */}
          <div className="bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            <div>
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-black text-neutral-900">
                  每收入 100 块钱，最终去了哪里？
                </h3>
              </div>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                直观拆解你的每笔营业额流向：多少付了进货成本、多少交了房租工人工资、多少真正落入口袋。
              </p>
            </div>

            {/* Stacked Visual Bar */}
            <div className="space-y-2">
              <div className="h-9 w-full rounded-2xl overflow-hidden flex shadow-inner border border-neutral-200 bg-neutral-100">
                {/* 1. COGS Bar */}
                {cogsPct > 0 && (
                  <div
                    style={{ width: `${cogsPct}%` }}
                    className="bg-amber-400 text-amber-950 flex items-center justify-center text-xs font-mono font-bold transition-all relative group"
                    title={`进货采购: ${cogsPct}% (${formatMoney(monthlyCogs, baseCurr)})`}
                  >
                    {cogsPct >= 10 && <span>进货 {cogsPct}元</span>}
                  </div>
                )}
                {/* 2. OPEX Bar */}
                {opexPct > 0 && (
                  <div
                    style={{ width: `${opexPct}%` }}
                    className="bg-indigo-500 text-white flex items-center justify-center text-xs font-mono font-bold transition-all relative group"
                    title={`房租与工人工资: ${opexPct}% (${formatMoney(monthlyOpex, baseCurr)})`}
                  >
                    {opexPct >= 10 && <span>房租人工 {opexPct}元</span>}
                  </div>
                )}
                {/* 3. Taxes & Other */}
                {taxOtherPct > 0 && (
                  <div
                    style={{ width: `${taxOtherPct}%` }}
                    className="bg-neutral-300 text-neutral-800 flex items-center justify-center text-xs font-mono font-bold transition-all relative group"
                    title={`税费与杂支: ${taxOtherPct}%`}
                  >
                    {taxOtherPct >= 10 && <span>税费 {taxOtherPct}元</span>}
                  </div>
                )}
                {/* 4. Net Profit Bar */}
                {netPct > 0 && (
                  <div
                    style={{ width: `${Math.max(4, netPct)}%` }}
                    className="bg-emerald-500 text-white flex items-center justify-center text-xs font-mono font-bold transition-all relative group"
                    title={`净赚利润: ${netPct}% (${formatMoney(netProfit, baseCurr)})`}
                  >
                    {netPct >= 8 && <span>净赚 {netPct}元</span>}
                  </div>
                )}
              </div>

              {/* Legend Bento Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-2xl">
                  <div className="flex items-center space-x-1.5 text-xs text-amber-800 font-bold mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                    <span>1. 进货采购成本</span>
                  </div>
                  <div className="text-base font-mono font-black text-neutral-900">
                    {cogsPct} 块钱
                    <span className="text-[10px] text-neutral-400 font-normal ml-1">/百元</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium mt-0.5">
                    每月花费 {formatMoney(monthlyCogs, baseCurr)}
                  </div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200 p-3 rounded-2xl">
                  <div className="flex items-center space-x-1.5 text-xs text-indigo-800 font-bold mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                    <span>2. 房租工人工资</span>
                  </div>
                  <div className="text-base font-mono font-black text-neutral-900">
                    {opexPct} 块钱
                    <span className="text-[10px] text-neutral-400 font-normal ml-1">/百元</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium mt-0.5">
                    每月花费 {formatMoney(monthlyOpex, baseCurr)}
                  </div>
                </div>

                <div className="bg-neutral-100 border border-neutral-200 p-3 rounded-2xl">
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-700 font-bold mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 shrink-0"></span>
                    <span>3. 税费与杂支</span>
                  </div>
                  <div className="text-base font-mono font-black text-neutral-900">
                    {taxOtherPct} 块钱
                    <span className="text-[10px] text-neutral-400 font-normal ml-1">/百元</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium mt-0.5">
                    合规与日常消耗
                  </div>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl">
                  <div className="flex items-center space-x-1.5 text-xs text-emerald-800 font-bold mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>4. 真正落袋净利</span>
                  </div>
                  <div className="text-base font-mono font-black text-emerald-700">
                    {netPct} 块钱
                    <span className="text-[10px] text-neutral-400 font-normal ml-1">/百元</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium mt-0.5">
                    每月净落袋 {formatMoney(netProfit, baseCurr)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: 4 Core Practical Questions (老板最关心的 4 个核心问题) */}
          <div className="bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div>
              <div className="flex items-center space-x-2">
                <Store className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-black text-neutral-900">
                  日常经营 4 大核心关键指标体检
                </h3>
              </div>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                直接回答你关于赚钱能力、抗风险能力与固定开销的最重要问题。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Question 1: Profitability */}
              <div className="p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                      QUESTION 01
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      1. 这个生意到底能不能赚到钱？
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                    netProfit > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {netProfit > 0 ? '🟢 稳定盈利' : '🔴 发生亏损'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <div className="text-2xl font-mono font-black text-neutral-900">
                    {formatMoney(netProfit, baseCurr)}
                    <span className="text-xs text-neutral-500 font-medium ml-2">/ 每月净赚</span>
                  </div>
                  <div className="text-xs text-neutral-600 font-medium mt-1">
                    净利润率: <strong className="text-neutral-900 font-bold font-mono">{netProfitMarginPercent}%</strong>
                    {netProfitMarginPercent >= 15 ? ' (高于小微行业均值)' : ' (有一定改善空间)'}
                  </div>
                </div>

                <p className="text-xs text-neutral-600 font-medium">
                  💡 大白话：扣除所有进货和开销后，真正能装进自己腰包的纯收益。
                </p>
              </div>

              {/* Question 2: Margin Health */}
              <div className="p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                      QUESTION 02
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      2. 产品卖得贵不贵，毛利空间够不够大？
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                    grossMarginPercent >= 30 ? 'bg-emerald-100 text-emerald-800' : grossMarginPercent >= 20 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {grossMarginPercent >= 30 ? '🟢 空间充足' : grossMarginPercent >= 20 ? '🟡 刚好及格' : '🔴 毛利过低'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <div className="text-2xl font-mono font-black text-neutral-900">
                    {grossMarginPercent}%
                    <span className="text-xs text-neutral-500 font-medium ml-2">
                      (月毛利 {formatMoney(grossProfit, baseCurr)})
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600 font-medium mt-1">
                    扣除进货直接成本后，每 100 块钱能剩下 <strong className="text-neutral-900 font-bold font-mono">{grossMarginPercent} 块钱</strong>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 font-medium">
                  💡 大白话：毛利是包住所有房租和发工资的源泉，毛利率越高，抵御供货商涨价的能力越强。
                </p>
              </div>

              {/* Question 3: OPEX Burden */}
              <div className="p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                      QUESTION 03
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      3. 房租和工人工资开销重不重？
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                    opexRatioPercent <= 45 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {opexRatioPercent <= 45 ? '🟢 负担轻便' : '🟡 稍显沉重'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <div className="text-2xl font-mono font-black text-neutral-900">
                    {opexRatioPercent}%
                    <span className="text-xs text-neutral-500 font-medium ml-2">
                      (月固定开销 {formatMoney(monthlyOpex, baseCurr)})
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600 font-medium mt-1">
                    毛利润是否包得住固定开销: <strong className="text-emerald-700 font-bold">{grossProfit >= monthlyOpex ? '✅ 完全包住并有盈余' : '❌ 无法包住出现透支'}</strong>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 font-medium">
                  💡 大白话：每月雷打不动要付出去的店租和员工薪资，只要毛利润能轻松包住，小店就不会慌。
                </p>
              </div>

              {/* Question 4: Cash Runway */}
              <div className="p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                      QUESTION 04
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      4. 万一生意突发断流，账上备用金能撑多久？
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                    cashRunwayMonths >= 3 ? 'bg-emerald-100 text-emerald-800' : cashRunwayMonths >= 2 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {cashRunwayMonths >= 3 ? '🟢 安全宽裕' : cashRunwayMonths >= 2 ? '🟡 稍显紧凑' : '🔴 必须补充'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <div className="text-2xl font-mono font-black text-neutral-900">
                    {cashRunwayMonths} 个月
                  </div>
                  <div className="text-xs text-neutral-600 font-medium mt-1">
                    债务偿还安全性: <strong className="text-neutral-900 font-bold">{debtServiceCoverageRatio >= 90 ? '无外部负债（极度安全）' : `${debtServiceCoverageRatio}x 保障倍数`}</strong>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 font-medium">
                  💡 大白话：即使遇到极端突发情况一个月没有新进账，现有可用现金还能坚持发工资和交租金几个月。
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Peer Comparison Table (你的店 vs 同行老手平均水平) */}
          <div className="bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-base font-black text-neutral-900">
                    同行老手横向对比表（{report.industry}）
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  一眼看清你的各项财务表现是跑赢同行还是需要追赶。
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-100 text-neutral-800 border-b-2 border-neutral-200">
                    <th className="p-3.5 font-bold rounded-l-2xl">经营指标 (大白话)</th>
                    <th className="p-3.5 font-bold">你的店当前表现</th>
                    <th className="p-3.5 font-bold">同行老手基准线</th>
                    <th className="p-3.5 font-bold rounded-r-2xl">综合评价</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  <tr className="hover:bg-neutral-50">
                    <td className="p-3.5 font-bold text-neutral-900">
                      💰 每月到手纯利润率
                      <span className="block text-[11px] text-neutral-400 font-normal">赚到手里的净利润比例</span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-indigo-700 text-sm">
                      {netProfitMarginPercent}%
                    </td>
                    <td className="p-3.5 font-mono text-neutral-500">≥ 15%</td>
                    <td className="p-3.5">
                      {netProfitMarginPercent >= 15 ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                          <ThumbsUp className="w-3 h-3" />
                          <span>优于同行平均</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-bold border border-amber-200">
                          <span>🟡 略低于同行，有提升空间</span>
                        </span>
                      )}
                    </td>
                  </tr>

                  <tr className="hover:bg-neutral-50">
                    <td className="p-3.5 font-bold text-neutral-900">
                      📦 进货采购成本占比
                      <span className="block text-[11px] text-neutral-400 font-normal">买原材料和商品花了多少</span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-indigo-700 text-sm">
                      {cogsPct}%
                    </td>
                    <td className="p-3.5 font-mono text-neutral-500">35% - 55%</td>
                    <td className="p-3.5">
                      {cogsPct <= 55 ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                          <Check className="w-3 h-3" />
                          <span>进货成本控制得当</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full font-bold border border-rose-200">
                          <span>🔴 进货偏贵，需争取批发价</span>
                        </span>
                      )}
                    </td>
                  </tr>

                  <tr className="hover:bg-neutral-50">
                    <td className="p-3.5 font-bold text-neutral-900">
                      🏠 房租人工固定开销占比
                      <span className="block text-[11px] text-neutral-400 font-normal">每月雷打不动的固定花费</span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-indigo-700 text-sm">
                      {opexRatioPercent}%
                    </td>
                    <td className="p-3.5 font-mono text-neutral-500">≤ 45%</td>
                    <td className="p-3.5">
                      {opexRatioPercent <= 45 ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                          <Check className="w-3 h-3" />
                          <span>开销处于安全健康线内</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-bold border border-amber-200">
                          <span>🟡 固定负担偏重，注意弹性排班</span>
                        </span>
                      )}
                    </td>
                  </tr>

                  <tr className="hover:bg-neutral-50">
                    <td className="p-3.5 font-bold text-neutral-900">
                      🛡️ 应急备用金缓冲期
                      <span className="block text-[11px] text-neutral-400 font-normal">账上备用金可支撑的月数</span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-indigo-700 text-sm">
                      {cashRunwayMonths} 个月
                    </td>
                    <td className="p-3.5 font-mono text-neutral-500">≥ 3.0 个月</td>
                    <td className="p-3.5">
                      {cashRunwayMonths >= 3 ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                          <ThumbsUp className="w-3 h-3" />
                          <span>防风险水库充足</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-bold border border-amber-200">
                          <span>🟡 建议再补充备用金至 3 个月以上</span>
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 5: Actionable Checklist & Live Gemini Deep Diagnosis */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl text-white space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-amber-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-black tracking-tight text-white">
                  老板行动清单：打勾追踪优化进度
                </h3>
              </div>

              <button
                onClick={handleFetchAiDiagnosis}
                disabled={isAiDiagnosing}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiDiagnosing ? 'animate-spin' : ''}`} />
                <span>{isAiDiagnosing ? 'Gemini 正在分析业务数据...' : '获取 Gemini 3.7 AI 实时深度战略诊断'}</span>
              </button>
            </div>

            {/* AI Custom Feedback if loaded */}
            {aiCustomDiagnosis && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-xs space-y-2 animate-in fade-in">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Gemini 3.7 定制诊断：{aiCustomDiagnosis.summaryHeadline}</span>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  {aiCustomDiagnosis.plainExplanation}
                </p>
                {aiCustomDiagnosis.potentialGrowthAreas && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {aiCustomDiagnosis.potentialGrowthAreas.map((g, idx) => (
                      <span key={idx} className="bg-amber-900/60 text-amber-200 px-2.5 py-0.5 rounded-lg border border-amber-700/50 text-[11px] font-medium">
                        🚀 {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Interactive Action Items Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {(aiCustomDiagnosis?.actionableAdvices || report.aiActionableAdvice || []).slice(0, 3).map((advice, i) => {
                const isDone = completedActions[i];
                return (
                  <div
                    key={i}
                    onClick={() => toggleActionCompleted(i)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isDone
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
                        : 'bg-neutral-800/90 border-neutral-700 hover:border-neutral-600 text-neutral-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-7 h-7 rounded-xl bg-neutral-700/60 flex items-center justify-center font-mono font-bold text-xs">
                          0{i + 1}
                        </span>
                        <input
                          type="checkbox"
                          checked={isDone || false}
                          onChange={() => {}}
                          className="w-4 h-4 text-emerald-500 rounded cursor-pointer"
                        />
                      </div>
                      <h4 className={`font-bold text-sm ${isDone ? 'text-emerald-300 line-through' : 'text-white'}`}>
                        {i === 0 ? '进货端：优化采购' : i === 1 ? '开销端：精简弹性工时' : '存钱端：建应急账户'}
                      </h4>
                      <p className="text-neutral-300 leading-relaxed text-xs">
                        {advice}
                      </p>
                    </div>

                    <div className="pt-2 text-[11px] font-bold flex items-center gap-1 text-neutral-400">
                      {isDone ? '✅ 已完成落地' : '👉 点击标记为已完成'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewMode('detailed')}
                className="text-xs text-neutral-400 hover:text-white flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <span>想看更深入的雷达透视图与原始财务公式？点击切换至专业财务明细模式</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📊 2. DETAILED BREAKDOWN VIEW (FOR ACCOUNTANTS & DEEP AUDITS) */}
      {/* ========================================================================= */}
      {viewMode === 'detailed' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Bento Grid Header Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Bento: Project Identity & Specs */}
            <div className="lg:col-span-8 bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    BAM-PRD-2026-V1.4 标准体检报告
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">
                    生成时间: {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-tight">
                  {report.projectName || '海外小微商业自测项目'}
                </h2>
                <p className="text-xs text-neutral-500 font-medium mt-1">
                  行业领域：{report.industry} ｜ 申报版本：v{report.version} ｜ 基准币种：{report.baseCurrency}
                </p>
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
                {report.isDataMinimizationMode && (
                  <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-3 py-1 rounded-xl border border-amber-200 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>敏感安全脱敏模式</span>
                  </span>
                )}

                {report.isCustomExchangeRate && (
                  <span className="text-xs bg-indigo-50 text-indigo-800 font-semibold px-3 py-1 rounded-xl border border-indigo-200 flex items-center space-x-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>自报平行汇率折算 (1 {report.baseCurrency} = {report.customRateValue})</span>
                  </span>
                )}

                {report.hasEstimatedMonths && (
                  <span className="text-xs bg-cyan-50 text-cyan-800 font-semibold px-3 py-1 rounded-xl border border-cyan-200 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <span>流水断点平滑估算已确认</span>
                  </span>
                )}
              </div>
            </div>

            {/* Right Bento: Total Score & Grade */}
            <div className="lg:col-span-4 bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between border-2 border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
                  SCORE & GRADE
                </span>
                <span className="text-xs bg-neutral-800 text-emerald-400 px-3 py-1 rounded-full font-bold border border-neutral-700">
                  {report.letterGrade} 等级
                </span>
              </div>

              <div className="py-4">
                <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white">
                  {report.totalScore}
                  <span className="text-base text-neutral-500 font-normal ml-1">/100</span>
                </div>
                <div className="text-xs text-neutral-400 font-medium mt-1">
                  综合抗风险与自我造血指数
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs font-medium">
                <span className="text-neutral-400">门槛红线 (Gates):</span>
                <span className={`font-bold flex items-center space-x-1 ${report.gatePassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {report.gatePassed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>全部通过 (4/4)</span>
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>{report.failedGates.length}项触发红线</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Gate Checks Bento Grid (P0) */}
          <div className="bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-neutral-900 flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span>4 项一票否决门槛红线 (Gate Checks)</span>
                </h3>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  依据标准规范，任何一项触发即判定商业模式存在资金断流或倒挂风险。
                </p>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-2xl border ${
                report.gatePassed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {report.gatePassed ? '全部红线合规' : '存在触发红线'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {report.gates.map((g) => (
                <div
                  key={g.id}
                  className={`p-4 rounded-2xl border-2 flex items-start space-x-3 ${
                    g.passed
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/70 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {g.passed ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                        <X className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold uppercase">{g.id}</span>
                      <h4 className="text-xs font-bold text-neutral-900">{g.name}</h4>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                      {g.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: 5 Radar Dimensions & Visual Spider Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Visual Radar SVG Box */}
            <div className="lg:col-span-5 bg-white border-2 border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-black text-neutral-900">5 维能力雷达透视</h3>
                <p className="text-xs text-neutral-500 font-medium">对比行业前 20% 标杆基准线</p>
              </div>

              {/* Spider Radar Chart SVG */}
              <div className="flex items-center justify-center py-4">
                <svg viewBox="0 0 200 200" className="w-64 h-64 overflow-visible">
                  {/* Background concentric polygons */}
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((level, idx) => {
                    const polyPoints = [0, 1, 2, 3, 4]
                      .map((i) => {
                        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                        const r = level * 80;
                        return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                      })
                      .join(' ');
                    return (
                      <polygon
                        key={idx}
                        points={polyPoints}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        strokeDasharray={idx < 4 ? '2 2' : 'none'}
                      />
                    );
                  })}

                  {/* Axes lines */}
                  {[0, 1, 2, 3, 4].map((i) => {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const x = 100 + 80 * Math.cos(angle);
                    const y = 100 + 80 * Math.sin(angle);
                    return (
                      <line
                        key={i}
                        x1="100"
                        y1="100"
                        x2={x}
                        y2={y}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Benchmark Polygon */}
                  <polygon
                    points={benchmarkPoints}
                    fill="#e0e7ff"
                    fillOpacity="0.4"
                    stroke="#818cf8"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />

                  {/* Actual Score Polygon */}
                  <polygon
                    points={radarPoints}
                    fill="#4f46e5"
                    fillOpacity="0.35"
                    stroke="#4338ca"
                    strokeWidth="2.5"
                  />

                  {/* Labels on vertices */}
                  {report.radarScores.map((dim, i) => {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const x = 100 + 96 * Math.cos(angle);
                    const y = 100 + 96 * Math.sin(angle);
                    return (
                      <text
                        key={i}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[9px] font-bold fill-neutral-700"
                      >
                        {dim.dimension}
                      </text>
                    );
                  })}
                </svg>
              </div>

              <div className="flex items-center justify-center space-x-6 text-xs font-medium pt-2 border-t border-neutral-100">
                <div className="flex items-center space-x-1.5 text-indigo-700">
                  <span className="w-3 h-3 rounded bg-indigo-600 inline-block"></span>
                  <span className="font-bold">本项目得分</span>
                </div>
                <div className="flex items-center space-x-1.5 text-neutral-500">
                  <span className="w-3 h-3 rounded bg-indigo-200 inline-block border border-indigo-400"></span>
                  <span>行业标杆线</span>
                </div>
              </div>
            </div>

            {/* 5 Dimensions Details List */}
            <div className="lg:col-span-7 bg-white border-2 border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-base font-black text-neutral-900">5 维得分明细</h3>
                <p className="text-xs text-neutral-500 font-medium">每项满分 20 分，综合加总构成 100 分</p>
              </div>

              <div className="space-y-3">
                {report.radarScores.map((dim, i) => (
                  <div key={i} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-900">
                      <span>{dim.dimension}</span>
                      <span className="font-mono text-indigo-700 text-sm">
                        {dim.score} <span className="text-neutral-400 font-normal text-xs">/ 20</span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(dim.score / 20) * 100}%` }}
                        className="bg-indigo-600 rounded-full transition-all"
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>{dim.description}</span>
                      <span>行业标杆: {dim.benchmark}/20</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Key Normalized Financial Metrics Cards */}
          <div className="bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-base font-black text-neutral-900">标准化财务指标核算</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="text-[10px] text-neutral-400 font-mono font-bold uppercase">月真实毛利率</div>
                <div className="text-xl font-mono font-black text-neutral-900 mt-1">
                  {grossMarginPercent}%
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">月毛利 {formatMoney(grossProfit, baseCurr)}</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="text-[10px] text-neutral-400 font-mono font-bold uppercase">月净利润率</div>
                <div className="text-xl font-mono font-black text-neutral-900 mt-1">
                  {netProfitMarginPercent}%
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">净利润 {formatMoney(netProfit, baseCurr)}</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="text-[10px] text-neutral-400 font-mono font-bold uppercase">固定开支占比 (OPEX)</div>
                <div className="text-xl font-mono font-black text-neutral-900 mt-1">
                  {opexRatioPercent}%
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">固定开销 {formatMoney(monthlyOpex, baseCurr)}</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="text-[10px] text-neutral-400 font-mono font-bold uppercase">备用金支撑月数</div>
                <div className="text-xl font-mono font-black text-neutral-900 mt-1">
                  {cashRunwayMonths} 个月
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">安全底线为 ≥ 3.0 月</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Withdrawal & Deletion Modal (P0) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-neutral-200 text-neutral-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  确认撤回并彻底删除该项目数据？
                </h3>
                <p className="text-xs text-neutral-500">依据 BAM-PRD-2026-V1.4 数据安全规范第 10 节</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-2">
              <p className="font-bold">⚠️ 撤回后果说明（请仔细阅读）：</p>
              <ul className="list-disc pl-4 space-y-1 text-rose-800">
                <li>该项目的所有表单数据、财务流水记录将被立即物理粉碎删除；</li>
                <li>已生成的所有历史版本诊断报告（v1, v2...）将立即永久失效并清除；</li>
                <li>此操作为即时生效、全程自助，无需联系任何人，且不可撤销。</li>
              </ul>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded"
              />
              <span>我已充分知晓撤回影响，确认永久销毁该项目全部数据</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                取消
              </button>
              <button
                disabled={!deleteConfirmed}
                onClick={() => {
                  setShowDeleteModal(false);
                  onDeleteAndRecall();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                确认彻底删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};