import React, { useState } from 'react';
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
  EyeOff
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

  const getTierColor = (tier: AssessmentReport['tier']) => {
    switch (tier) {
      case 'AAA':
      case 'AA':
        return 'text-emerald-500 bg-emerald-50 border-emerald-300';
      case 'A':
      case 'BBB':
        return 'text-sky-600 bg-sky-50 border-sky-300';
      case 'BB':
      case 'B':
        return 'text-amber-600 bg-amber-50 border-amber-300';
      default:
        return 'text-rose-600 bg-rose-50 border-rose-300';
    }
  };

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

  // Radar chart points generator for 5 dimensions
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 print:p-0">
      {/* Top Action Bar (Bento Pill Header) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border-2 border-neutral-200 shadow-xs print:hidden">
        <div className="flex items-center flex-wrap gap-3">
          {/* Version Switcher */}
          {allVersions.length > 1 && (
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 bg-neutral-100 px-3 py-1.5 rounded-2xl border border-neutral-200">
              <span className="text-neutral-500 uppercase tracking-wider text-[10px]">历史版本:</span>
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
            </div>
          )}
          <div className="text-xs text-neutral-400 font-medium">
            生成时间: {new Date(report.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={onReAssess}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新评估</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>打印 / PDF</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>备份 JSON</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-2xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-bold transition-colors cursor-pointer"
            title="撤回并物理删除该项目全部数据"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>撤回数据</span>
          </button>
        </div>
      </div>

      {/* Main Bento Grid Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Bento: Project Identity & Specs */}
        <div className="lg:col-span-8 bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                BAM-PRD-2026-V1.4 标准体检报告
              </span>
              <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full border border-neutral-200">
                v{report.version}.0
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              {report.projectName}
            </h1>
            <p className="text-xs text-neutral-500 font-medium mt-1">
              所属行业：{report.industry} ｜ 报告主币种：{report.baseCurrency} ｜ 凭证方式：
              {report.proofTypeUsed === 'none' ? '无凭证纯手动填写' : report.proofTypeUsed}
            </p>
          </div>

          {/* Quick Informational Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
            {report.dataMinimizationNotice && (
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 flex items-start gap-2">
                <EyeOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-medium">{report.dataMinimizationNotice}</span>
              </div>
            )}

            {report.customRateNotice && (
              <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200 text-sky-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span className="font-medium">{report.customRateNotice}</span>
              </div>
            )}

            {report.proofTypeUsed === 'none' && (
              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 flex items-start gap-2 col-span-full">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  无凭证纯手动填写模式：与上传正规银行流水的用户共享 100% 相同评分规则与红线标准。
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Bento: Overall Tier & Score (Dark Bento Tile) */}
        <div className="lg:col-span-4 bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              综合评估等级与得分
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                report.gatePassed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {report.gatePassed ? 'Gate Passed' : 'Gate Rejected'}
            </span>
          </div>

          <div className="my-4 flex items-baseline justify-between">
            <div>
              <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white">
                {report.totalScore}
              </div>
              <div className="text-xs font-medium text-neutral-400 mt-1">满分 100 分 · 客观量化</div>
            </div>

            <div
              className={`w-18 h-18 rounded-2xl border-2 flex flex-col items-center justify-center font-black shadow-lg ${
                report.tier.startsWith('A')
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : report.tier.startsWith('B')
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              <span className="text-2xl leading-none">{report.tier}</span>
              <span className="text-[9px] font-bold mt-1 tracking-wider uppercase">TIER</span>
            </div>
          </div>

          <div className="p-3 bg-neutral-800/80 rounded-2xl border border-neutral-700 text-xs text-neutral-300 leading-relaxed">
            {report.gatePassed
              ? '✅ 全部 5 项底线红线核验达标，具备真实自营造血与偿债抗风险能力。'
              : '⚠️ 触发底线红线一票否决，请根据下方改善指引优化毛利或运营开支。'}
          </div>
        </div>
      </div>

      {/* Section 1: 5 Gates Evaluation (Bento Cards) */}
      <div className="bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>1. Gate 底线红线判定（一票否决项核验）</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              确保商业模式具备真实自营收入、毛利空间与净利留存，防范虚假流水。
            </p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              report.gatePassed
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {report.gatePassed ? '全部 5 项底线达标' : '触发一票否决'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {report.gates.map((g) => {
            const isPass = g.status === 'PASS';
            return (
              <div
                key={g.code}
                className={`p-4 rounded-2xl border-2 flex flex-col justify-between space-y-2 ${
                  isPass
                    ? 'bg-neutral-50/80 border-neutral-200'
                    : 'bg-rose-50/80 border-rose-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-bold text-neutral-900 flex items-center space-x-1.5">
                      {isPass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{g.name}</span>
                    </div>
                    <span
                      className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-lg ${
                        isPass
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {g.currentValue}
                    </span>
                  </div>

                  <p className="text-neutral-600 font-medium leading-relaxed">{g.plainDescription}</p>
                </div>

                {!isPass && (
                  <div className="p-2.5 rounded-xl bg-white border border-rose-200 text-rose-900 text-[11px]">
                    <span className="font-bold block mb-0.5">改善方向提示：</span>
                    <span>{g.improvementTip}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Radar Chart & Normalized Financials (Bento Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Radar Chart (Left 5 Cols) */}
        <div className="lg:col-span-5 bg-white border-2 border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center">
          <div className="w-full flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              5 大核心维度雷达透视
            </h4>
            <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
              RADAR
            </span>
          </div>

          <div className="relative w-56 h-56 my-2">
            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
              {/* Background Concentric Webs */}
              {[0.25, 0.5, 0.75, 1].map((scale) => {
                const r = 80 * scale;
                const pts = [0, 1, 2, 3, 4]
                  .map((i) => {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={scale}
                    points={pts}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                );
              })}

              {/* Axes */}
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
                fill="rgba(148, 163, 184, 0.15)"
                stroke="#94a3b8"
                strokeWidth="1.5"
              />

              {/* Actual Score Polygon */}
              <polygon
                points={radarPoints}
                fill="rgba(79, 70, 229, 0.3)"
                stroke="#4f46e5"
                strokeWidth="2.5"
              />
            </svg>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-neutral-600 mt-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span>本项目得分</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-400"></span>
              <span>行业均值基准</span>
            </span>
          </div>
        </div>

        {/* Normalized Financials (Right 7 Cols) - Bento Accent Tile */}
        <div className="lg:col-span-7 bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                主币种折算财务汇总 (Normalized Financials)
              </h4>
              <span className="text-[10px] font-mono font-bold bg-white text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                {report.baseCurrency}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-2xs">
                <span className="text-neutral-400 block text-[11px] font-bold uppercase mb-1">月均真实主营</span>
                <span className="font-mono font-bold text-neutral-900 text-sm sm:text-base">
                  {formatMoney(report.normalizedFinancials.monthlyRealRevenue, report.baseCurrency)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-2xs">
                <span className="text-neutral-400 block text-[11px] font-bold uppercase mb-1">直接进货采购</span>
                <span className="font-mono font-bold text-neutral-900 text-sm sm:text-base">
                  {formatMoney(report.normalizedFinancials.monthlyCogs, report.baseCurrency)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-2xs">
                <span className="text-neutral-400 block text-[11px] font-bold uppercase mb-1">月度毛利率</span>
                <span className="font-mono font-bold text-emerald-600 text-sm sm:text-base">
                  {report.normalizedFinancials.grossMarginPercent}%
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-2xs">
                <span className="text-neutral-400 block text-[11px] font-bold uppercase mb-1">运营固定开销</span>
                <span className="font-mono font-bold text-neutral-900 text-sm sm:text-base">
                  {formatMoney(report.normalizedFinancials.monthlyOpex, report.baseCurrency)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-2xs">
                <span className="text-neutral-400 block text-[11px] font-bold uppercase mb-1">到手月净利润</span>
                <span
                  className={`font-mono font-bold text-sm sm:text-base ${
                    report.normalizedFinancials.netProfit >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {formatMoney(report.normalizedFinancials.netProfit, report.baseCurrency)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-2xs">
                <span className="text-neutral-400 block text-[11px] font-bold uppercase mb-1">备用金缓冲</span>
                <span className="font-mono font-bold text-indigo-700 text-sm sm:text-base">
                  {report.normalizedFinancials.cashRunwayMonths} 个月
                </span>
              </div>
            </div>
          </div>

          {/* Plain Language Summary Box */}
          <div className="p-4 rounded-2xl bg-white border border-indigo-200 text-xs text-indigo-950 font-medium leading-relaxed shadow-2xs">
            <strong className="text-indigo-900">大白话诊断：</strong> {report.summaryPlainLanguage}
          </div>
        </div>
      </div>

      {/* Section 3: Dual-line Metric Breakdown Table */}
      <div className="bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 flex items-center space-x-2">
              <Percent className="w-5 h-5 text-indigo-600" />
              <span>2. 逐项指标得分与通用改善方向提示</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              表头双行展示（专业名称 + 大白话副标题）；未达标项均附带通用改善思路。
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                <th className="p-3.5 font-bold rounded-l-xl">
                  <div>指标名称</div>
                  <div className="text-[10px] font-normal text-neutral-500">大白话通俗说明</div>
                </th>
                <th className="p-3.5 font-bold">实际数值</th>
                <th className="p-3.5 font-bold">基准参考</th>
                <th className="p-3.5 font-bold">得分 / 权重</th>
                <th className="p-3.5 font-bold rounded-r-xl">诊断与改善建议</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {report.metrics.map((m) => (
                <tr key={m.key} className="hover:bg-neutral-50 transition-colors">
                  <td className="p-3.5 font-medium">
                    <div className="text-neutral-900 font-bold">{m.name}</div>
                    <div className="text-neutral-500 text-[11px]">{m.plainName}</div>
                  </td>
                  <td className="p-3.5 font-mono font-bold text-neutral-800">{m.actualValue}</td>
                  <td className="p-3.5 text-neutral-500">{m.benchmarkValue}</td>
                  <td className="p-3.5 font-mono font-bold text-indigo-600">
                    {m.score}分 / {m.weight}%
                  </td>
                  <td className="p-3.5 text-neutral-700">
                    <div>{m.plainExplanation}</div>
                    {m.status === 'poor' && (
                      <div className="text-indigo-800 font-semibold mt-1 text-[11px] bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                        💡 改善方向: {m.improvementTip}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Actionable Advice list (Dark Bento Tile) */}
      <div className="bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 text-white">
        <h4 className="text-sm font-bold flex items-center space-x-2 text-white">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>AI 大白话诊断与关键行动建议</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {report.aiActionableAdvice.map((advice, i) => (
            <div key={i} className="flex items-start space-x-2.5 bg-neutral-800/90 p-4 rounded-2xl border border-neutral-700 text-neutral-200 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{advice}</span>
            </div>
          ))}
        </div>
      </div>

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
