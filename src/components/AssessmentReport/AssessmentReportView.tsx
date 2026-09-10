import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
  TrendingUp,
  Percent,
  Calendar,
  AlertOctagon,
  EyeOff,
  DollarSign,
  Wallet,
  Store,
  Sliders,
  HelpCircle,
  ArrowUpRight,
  Check,
  X,
  Package,
  PiggyBank,
  Compass,
  FileText,
  Copy,
  CheckCheck,
  GitCompare,
  MoreVertical
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

// 行动清单卡片的标题/优先级需要跟随每条建议文案本身的内容动态判断，
// 而不能用固定的位置（第1/2/3条）硬编码文案——顺序会随项目数据变化，
// 硬编码会导致标题和正文风马牛不相及（如标题写"采购端"、正文却写"红线全部达标"）。
function deriveActionMeta(advice: string, index: number, language: Language): {
  title: string;
  priority: 'high' | 'medium' | 'low';
} {
  const tt = (zh: string, en: string) => (language === 'en' ? en : zh);
  if (advice.includes('恭喜') || advice.includes('全部达标')) {
    return { title: tt('红线端：保持监控', 'Gates: Keep Monitoring'), priority: 'low' };
  }
  if (advice.includes('红线')) {
    return { title: tt('红线端：优先修复未达标项', 'Gates: Fix Failing Items First'), priority: 'high' };
  }
  if (advice.includes('备用') || advice.includes('现金')) {
    return { title: tt('备用金端：建立应急专户', 'Cash Reserve: Build an Emergency Fund'), priority: 'high' };
  }
  if (advice.includes('固定支出') || advice.includes('开销')) {
    return { title: tt('开销端：精简运转与固定支出', 'Overhead: Trim Fixed Costs'), priority: 'medium' };
  }
  if (advice.includes('毛利') || advice.includes('采购')) {
    return { title: tt('采购端：优化进货损耗', 'Procurement: Reduce Purchasing Waste'), priority: 'low' };
  }
  if (advice.includes('凭证')) {
    return { title: tt('凭证端：数据透明度说明', 'Proof: Data Transparency Note'), priority: 'low' };
  }
  return { title: tt(`行动项 ${index + 1}`, `Action Item ${index + 1}`), priority: 'medium' };
}

const ACTION_PRIORITY_STYLE: Record<'high' | 'medium' | 'low', { label: [string, string]; className: string }> = {
  high: { label: ['优先级 · 高', 'Priority · High'], className: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  medium: { label: ['优先级 · 中', 'Priority · Medium'], className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  low: { label: ['优先级 · 低', 'Priority · Low'], className: 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30' }
};

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
  // 移动端把"彻底删除"这类危险操作从主按钮行里拿出来，收进"更多"里，
  // 避免和"复制摘要/重新测算"这些日常操作挤在一起换行、造成误触。
  const [showMoreActions, setShowMoreActions] = useState(false);
  const moreActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreActionsRef.current && !moreActionsRef.current.contains(event.target as Node)) {
        setShowMoreActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
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

  // 切到 EN 后此前顶部导航之外几乎全是中文（报告正文/按钮/标题一句没翻）。
  // 这里补齐界面级静态文案（标题/按钮/标签）的双语支持；由 AI 评分引擎生成的
  // 大段解读性文字（如逐项建议原文）暂维持中文，翻译该部分需要评分引擎本身
  // 产出双语内容，属于更大的后续工作。
  const t = (zh: string, en: string) => (language === 'en' ? en : zh);

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
    const reportGrade = report.tier || (report as any).letterGrade || 'A';
    const summaryText = language === 'en' ? `[${report.projectName} · Business Model Assessment Report v${report.version}]
Overall Health Score: ${report.totalScore} (${reportGrade})
Gate Compliance: ${report.gatePassed ? `All passed (${report.gates.length}/${report.gates.length})` : `Not all passed (${(report.failedGates || report.gates.filter((g) => g.status !== 'PASS')).length}/${report.gates.length} gate(s) triggered)`}

Core Operations & Ministry Data Overview:
- Monthly clinic/tuition revenue: ${formatMoney(monthlyRealRevenue, baseCurr)}
- Monthly net profit: ${formatMoney(netProfit, baseCurr)} (net margin ${netProfitMarginPercent}%)
- Medicine/supplies procurement cost: ${formatMoney(monthlyCogs, baseCurr)} (gross margin ${grossMarginPercent}%)
- Monthly rent & staff cost: ${formatMoney(monthlyOpex, baseCurr)} (${opexRatioPercent}% of revenue)
- Emergency cash reserve: covers ${cashRunwayMonths} months of fixed costs
${
  report.dynamicCogsItems?.length
    ? `\nIndustry-specific material costs:\n${report.dynamicCogsItems
        .map((it) => `  · ${it.label}: ${formatMoney(it.value, baseCurr)}/mo`)
        .join('\n')}`
    : ''
}
${
  report.dynamicOpexItems?.length
    ? `\nIndustry-specific operating costs:\n${report.dynamicOpexItems
        .map((it) => `  · ${it.label}: ${formatMoney(it.value, baseCurr)}/mo`)
        .join('\n')}`
    : ''
}

Key Recommendations:
${(aiCustomDiagnosis?.actionableAdvices || report.aiActionableAdvice).map((adv, i) => `${i + 1}. ${adv}`).join('\n')}

*Generated by the Business Model Assessment System and Gemini AI*` : `【${report.projectName} · 商宣商业模式检验报告 v${report.version}】
综合健康得分：${report.totalScore}分 (${reportGrade})
红线合规：${report.gatePassed ? `全部通过 (${report.gates.length}/${report.gates.length})` : `未通过 (${(report.failedGates || report.gates.filter((g) => g.status !== 'PASS')).length}/${report.gates.length} 项触发警示)`}

核心经营与服事数据概览：
- 每月门诊/学费进账：${formatMoney(monthlyRealRevenue, baseCurr)}
- 每月结余净产出：${formatMoney(netProfit, baseCurr)} (净利润率 ${netProfitMarginPercent}%)
- 药品耗材采购花销：${formatMoney(monthlyCogs, baseCurr)} (毛利率 ${grossMarginPercent}%)
- 每月租金与同工支出：${formatMoney(monthlyOpex, baseCurr)} (占进账 ${opexRatioPercent}%)
- 应急储备金水库：能支撑 ${cashRunwayMonths} 个月固定开销
${
  report.dynamicCogsItems?.length
    ? `\n按行业细分的物料成本：\n${report.dynamicCogsItems
        .map((it) => `  · ${it.label}：${formatMoney(it.value, baseCurr)}/月`)
        .join('\n')}`
    : ''
}
${
  report.dynamicOpexItems?.length
    ? `\n按行业细分的运营开支：\n${report.dynamicOpexItems
        .map((it) => `  · ${it.label}：${formatMoney(it.value, baseCurr)}/月`)
        .join('\n')}`
    : ''
}

关键建议：
${(aiCustomDiagnosis?.actionableAdvices || report.aiActionableAdvice).map((adv, i) => `${i + 1}. ${adv}`).join('\n')}

*由商宣商业模式检验系统与 Gemini AI 生成*`;

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

  // 找出雷达图中最薄弱的维度：即便所有一票否决红线都通过，某一维度得分过低（如备用金为 0 个月）
  // 仍代表真实风险，headline 结论不应与该维度的评分脱节，否则会给人"已经很安全"的错觉。
  const weakestDimension = report.radarScores.length
    ? [...report.radarScores].sort((a, b) => a.score - b.score)[0]
    : undefined;
  const hasCriticalWeakness = !!weakestDimension && weakestDimension.score < 30;

  // Health verdict helper
  const getHealthSummary = () => {
    if (!report.gatePassed) {
      return {
        badge: t('有资金隐患 · 急需调整', 'Cash Risk · Needs Urgent Adjustment'),
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        verdictTitle: t('生意面临固定支出或毛利倒挂风险', 'The business faces fixed-cost or margin-inversion risk'),
        verdictDesc: t('虽然有流水，但扣除进货和每月房租人工后已出现亏损或还贷压力过大，需要立即按下方建议优化开销。', 'There is revenue, but after deducting purchasing costs and monthly rent/wages, the business is running a loss or facing excessive debt pressure — costs need to be optimized immediately per the recommendations below.'),
        trafficIcon: '🔴'
      };
    }
    // 弱项警示：即便利润表现良好，若某一维度（如现金流与抗风险）得分过低，
    // 也要在结论里点出来，避免"整体健康"的措辞盖过真实的薄弱环节。
    const weaknessNotice = hasCriticalWeakness && weakestDimension
      ? t(
          `一旦进货涨价或淡季来临，容易承压——建议提前把「${weakestDimension.dimensionPlain}」这一维度补起来（详见下方雷达图，目前仅 ${weakestDimension.score}/100）。`,
          `If purchasing costs rise or a slow season arrives, the business could come under pressure — consider strengthening the "${weakestDimension.dimensionPlain}" dimension in advance (see the radar chart below, currently only ${weakestDimension.score}/100).`
        )
      : '';

    if (netProfitMarginPercent >= 20 && cashRunwayMonths >= 3) {
      return {
        badge: t('经营极度健康 · 能赚且抗风险', 'Extremely Healthy · Profitable & Resilient'),
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        verdictTitle: t('每月不仅稳稳赚钱，而且手里留有充足的救命钱！', 'The business is profitable every month, and there is ample emergency cash on hand!'),
        verdictDesc: t(
          `扣掉全部进货、房租与工人工资后，每月能稳稳揣进 ${formatMoney(netProfit, baseCurr)} 纯利，账上备用金足够支撑 ${cashRunwayMonths} 个月，抗风险能力非常强。`,
          `After deducting all purchasing, rent, and wages, the business nets a stable ${formatMoney(netProfit, baseCurr)} in profit each month, with enough cash reserve to cover ${cashRunwayMonths} months — very strong resilience.`
        ),
        trafficIcon: '🟢'
      };
    }
    if (netProfitMarginPercent >= 10) {
      return {
        badge: hasCriticalWeakness ? t('利润稳健 · 但有薄弱维度待补强', 'Stable Profit · But a Weak Dimension Needs Attention') : t('基本面良好 · 利润空间稳健', 'Solid Fundamentals · Stable Profit Margin'),
        badgeColor: hasCriticalWeakness
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-teal-50 text-teal-800 border-teal-200',
        verdictTitle: t('生意能正常盈利，建议适度增强现金储备与控成本。', 'The business is profitable — consider moderately strengthening cash reserves and controlling costs.'),
        verdictDesc: t(
          `每月净利润为 ${formatMoney(netProfit, baseCurr)} (利润率 ${netProfitMarginPercent}%)，整体处于良性循环，注意别盲目扩大固定负债。${weaknessNotice}`,
          `Monthly net profit is ${formatMoney(netProfit, baseCurr)} (margin ${netProfitMarginPercent}%), and the business is on a healthy track overall — avoid expanding fixed liabilities recklessly. ${weaknessNotice}`
        ),
        trafficIcon: hasCriticalWeakness ? '🟡' : '🟢'
      };
    }
    return {
      badge: t('利润偏薄 · 建议优化利润率', 'Thin Margins · Optimization Recommended'),
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      verdictTitle: t('生意在赚钱，但属于"辛苦钱"，利润空间偏紧。', 'The business is profitable, but margins are tight — it is hard-earned money.'),
      verdictDesc: t(
        `扣除所有成本后到手利润率仅为 ${netProfitMarginPercent}%。${weaknessNotice || '一旦进货涨价或淡季来临容易承压，建议按建议提升客单价或压降开支。'}`,
        `After all costs, the take-home margin is only ${netProfitMarginPercent}%. ${weaknessNotice || 'If purchasing costs rise or a slow season arrives, the business could come under pressure — consider raising average order value or cutting expenses.'}`
      ),
      trafficIcon: '🟡'
    };
  };

  const health = getHealthSummary();
  // 得分环形进度条的颜色跟随健康档位的红绿灯图标，保持语义一致
  const scoreRingColor =
    health.trafficIcon === '🟢' ? '#10b981' : health.trafficIcon === '🔴' ? '#f43f5e' : '#f59e0b';

  // 给完全不懂财务的宣教同工一句大白话结论
  const getPlainVerdict = () => {
    if (!report.gatePassed) {
      return t(
        '你的小店现在"入不敷出"或背着还不起的债，必须赶紧按下面的建议砍掉多余开销，否则撑不久。',
        'Your business is currently spending more than it earns, or is carrying unmanageable debt — you must cut excess expenses immediately per the recommendations below, or it won\'t last long.'
      );
    }
    if (netProfitMarginPercent >= 20 && cashRunwayMonths >= 3) {
      return t(
        '放心，你这小店既赚钱、手头又留了够花几个月的备用金，是很稳的状态，可以继续服事。',
        "Rest assured — your business is profitable and has enough cash reserve to last several months. It's a very stable position, and you can continue your work."
      );
    }
    if (netProfitMarginPercent >= 10) {
      return t(
        '小店能赚钱，但手头备用金不算厚，别急着借钱扩张，先多攒点"救命钱"。',
        "Your business is profitable, but cash reserves aren't very deep. Don't rush to borrow and expand — build up more emergency funds first."
      );
    }
    return t(
      '小店有赚但利润很薄，一旦遇淡季或涨价就容易紧巴巴，建议想办法提高单价或省点开支。',
      'Your business is profitable, but margins are thin. A slow season or rising costs could quickly cause strain — consider raising prices or cutting expenses.'
    );
  };

  const handlePrint = () => {
    // 说明：浏览器不支持一键存图时，最可靠的"保存体检卡"方式是在打印窗口中选"另存为 PDF"，
    // 所得 PDF/打印件可直接截图或发送给微信联系人。
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
          {/* 当前视图标识：默认只展示"小白速览"，专业明细降级为报告底部的次级入口 */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold">{viewMode === 'simple' ? t('小白速览（默认）', 'Simple View (Default)') : t('专业明细', 'Professional Detail')}</span>
          </div>

          {/* Version Switcher */}
          {allVersions.length > 1 && (
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 bg-neutral-50 px-3 py-1.5 rounded-2xl border border-neutral-200">
              <span className="text-neutral-400 uppercase tracking-wider text-[12px]">{t('历史版本:', 'Version history:')}</span>
              <select
                value={report.version}
                onChange={(e) => onSelectVersion?.(Number(e.target.value))}
                className="font-bold bg-transparent text-teal-600 focus:outline-hidden"
              >
                {allVersions.map((v) => (
                  <option key={`${v.id}-v${v.version}`} value={v.version}>
                    v{v.version} ({new Date(v.createdAt).toLocaleDateString()}) - {v.totalScore}{t('分', ' pts')}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowVersionDiff(!showVersionDiff)}
                className={`p-1 rounded-lg border text-[13px] font-bold flex items-center gap-1 cursor-pointer ${
                  showVersionDiff ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-neutral-600 border-neutral-200'
                }`}
                title={t('查看与上一版本的得分变化对比', 'View score changes compared to the previous version')}
              >
                <GitCompare className="w-3 h-3" />
                <span>{t('对比', 'Compare')}</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleCopySummary}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-colors cursor-pointer ${
              copiedSummary
                ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                : 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-700 shadow-xs'
            }`}
          >
            {copiedSummary ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">{t('已复制✓', 'Copied ✓')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t('复制摘要', 'Copy Summary')}</span>
              </>
            )}
          </button>

          <button
            onClick={onReAssess}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('重新测算', 'Re-assess')}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-teal-900 hover:bg-teal-800 border border-teal-900 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="sm:hidden">{t('导出 PDF', 'Export PDF')}</span>
            <span className="hidden sm:inline">{t('导出体检卡 PDF', 'Export Report PDF')}</span>
          </button>

          {/* 次要/危险操作收进"更多"菜单，与上面的日常操作按钮分开，避免误触彻底删除 */}
          <div className="relative" ref={moreActionsRef}>
            <button
              onClick={() => setShowMoreActions((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-2 rounded-2xl bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title={t('更多操作', 'More actions')}
              aria-haspopup="true"
              aria-expanded={showMoreActions}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMoreActions && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-neutral-200 shadow-xl p-1.5 z-50 animate-in fade-in">
                <button
                  onClick={() => {
                    setShowMoreActions(false);
                    handleExportJson();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-neutral-100 text-neutral-700 text-xs font-bold cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{t('备份（导出 JSON）', 'Backup (Export JSON)')}</span>
                </button>
                <div className="my-1 border-t border-neutral-100" />
                <button
                  onClick={() => {
                    setShowMoreActions(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                  title={t('撤回并物理删除该项目全部数据', 'Withdraw and permanently delete all data for this project')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('彻底删除', 'Delete Permanently')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version Diff Banner when enabled */}
      {showVersionDiff && prevVersion && (
        <div className="bg-teal-50 border-2 border-teal-200 rounded-3xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-900">
                对比上一版本 (v{prevVersion.version} ➔ v{report.version})
              </h4>
              <p className="text-[13px] text-neutral-500">
                优化措施落地后的数据变化趋势
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-teal-100 flex items-center space-x-1.5">
              <span className="text-neutral-500">得分变化:</span>
              <span className={scoreDiff >= 0 ? 'text-emerald-600 font-mono' : 'text-rose-600 font-mono'}>
                {scoreDiff >= 0 ? `+${scoreDiff}` : scoreDiff} 分
              </span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-xl border border-teal-100 flex items-center space-x-1.5">
              <span className="text-neutral-500">利润率变化:</span>
              <span className={marginDiff >= 0 ? 'text-emerald-600 font-mono' : 'text-rose-600 font-mono'}>
                {marginDiff >= 0 ? `+${marginDiff}%` : `${marginDiff}%`}
              </span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-xl border border-teal-100 flex items-center space-x-1.5">
              <span className="text-neutral-500">备用金支撑:</span>
              <span className={runwayDiff >= 0 ? 'text-emerald-600 font-mono' : 'text-rose-600 font-mono'}>
                {runwayDiff >= 0 ? `+${runwayDiff}月` : `${runwayDiff}月`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SIMPLE PLAIN LANGUAGE VIEW (DEFAULT & INTUITIVE) */}
      {/* ========================================================================= */}
      {viewMode === 'simple' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card 1: Health Headline & Verdict */}
          <div className="bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-wrap items-start gap-5">
              {/* Score Ring：用环形进度条直观呈现综合得分，替代原先单独的方块得分卡 */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                <svg viewBox="0 0 100 100" className="w-20 h-20 sm:w-24 sm:h-24 -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#eae4d6" strokeWidth="9" />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke={scoreRingColor}
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={`${(Math.max(0, Math.min(100, report.totalScore)) / 100) * 2 * Math.PI * 44} ${2 * Math.PI * 44}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-mono font-black text-neutral-900 leading-none">
                    {report.totalScore}
                  </span>
                  <span className="text-[12px] text-neutral-400 font-bold mt-0.5">/ 100 {t('分', '')}</span>
                </div>
              </div>

              <div className="flex-1 min-w-[220px]">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${health.badgeColor} flex items-center space-x-1.5`}>
                    <span>{health.trafficIcon}</span>
                    <span>{report.tier} {t('等级', 'Tier')} · {health.badge}</span>
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center space-x-1.5 ${
                      !report.gatePassed
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : hasCriticalWeakness
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {report.gatePassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertOctagon className="w-3.5 h-3.5" />}
                    <span>
                      {report.gatePassed
                        ? t('红线全部通过', 'All gates passed')
                        : t('红线未全部通过', 'Gates not all passed')}
                      {' · '}
                      {report.gates.length - (report.failedGates?.length || 0)}/{report.gates.length}
                    </span>
                  </span>
                </div>
                <div className="text-xs text-neutral-400 font-medium mb-1">
                  {t('项目名称', 'Project')}：<strong className="text-neutral-800 font-bold">{report.projectName}</strong>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-snug">
                  {health.verdictTitle}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 font-medium mt-2 leading-relaxed max-w-3xl">
                  {health.verdictDesc}
                </p>
                {/* Data sanity warning: when revenue is unrealistically small OR ratios are out of healthy range */}
                {(monthlyRealRevenue > 0 && monthlyRealRevenue < 1000) || cogsPct >= 80 || opexRatioPercent >= 200 ? (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border-2 border-amber-300 flex items-start gap-2 text-amber-900">
                    <span className="text-xl leading-none mt-0.5">⚠️</span>
                    <div className="text-xs leading-relaxed">
                      <strong className="font-black">数据合理性提示：</strong>
                      {monthlyRealRevenue > 0 && monthlyRealRevenue < 1000 ? (
                        <span>月营收仅 <strong>{formatMoney(monthlyRealRevenue, baseCurr)}</strong> 异常小，请检查是否把「年营业额」误填为月流水，或漏报真实生意规模。</span>
                      ) : cogsPct >= 80 && opexRatioPercent >= 200 ? (
                        <span>进货占比达 {cogsPct.toFixed(0)}% 同时固定开销占比 {opexRatioPercent.toFixed(0)}%，这两个比值同时异常很可能是明细项里某项金额错填了（粘错了数字 / 多填了一个 0 / AI 默认估算偏离实际）。请逐项核对下面的明细数值。</span>
                      ) : cogsPct >= 80 ? (
                        <span>进货占比达 {cogsPct.toFixed(0)}%（进货 ≈ 营收）。请检查动态物料明细项：是否有某项金额粘错（如把「月营业额」误填到进货明细里），或 AI 建议的初始金额偏离实际。</span>
                      ) : (
                        <span>固定开销占比 {opexRatioPercent.toFixed(0)}% 远超健康区间。请检查房租/人工/水电是否把「年总额」误填成月金额，或数字多填了零。</span>
                      )}
                    </div>
                  </div>
                ) : null}
                <p className="text-[13px] sm:text-xs text-neutral-500 font-medium mt-1.5 leading-relaxed max-w-3xl">
                  大白话：{getPlainVerdict()}
                </p>

                {/* 红线合规状态：从专业明细模式精简为一行，默认就能看见 */}
                <div
                  className={`mt-3 inline-flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 rounded-xl border-2 text-xs font-bold ${
                    !report.gatePassed
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : hasCriticalWeakness
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  {report.gatePassed ? (
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className={`w-3.5 h-3.5 ${hasCriticalWeakness ? 'text-amber-600' : 'text-emerald-600'}`} />
                      {hasCriticalWeakness && weakestDimension
                        ? `${report.gates.length} 项安全红线全部通过，但「${weakestDimension.dimensionPlain}」仅 ${weakestDimension.score}/100，仍有真实风险需关注`
                        : `${report.gates.length} 项安全红线全部通过，无资金断流或倒挂风险`}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                      触发 {((report.failedGates || report.gates.filter((g) => g.status !== 'PASS')).length)} 项安全红线：
                      {(report.failedGates && report.failedGates.length > 0
                        ? report.failedGates
                        : report.gates.filter((g) => g.status !== 'PASS')
                      ).map((g) => g.plainName || g.name).join('、')}
                    </span>
                  )}
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
                  {t('每收入 100 块钱，最终去了哪里？', 'Where does every 100 you earn actually go?')}
                </h3>
              </div>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                {t('直观拆解你的每笔营业额流向：多少付了进货成本、多少交了房租工人工资、多少真正落入口袋。', 'A breakdown of every dollar of revenue: how much goes to inventory, rent & wages, and how much you actually keep.')}
              </p>
            </div>

            {/* Stacked Visual Bar */}
            <div className="space-y-2">
              <div className="h-9 w-full rounded-2xl overflow-hidden flex shadow-inner border border-neutral-200 bg-neutral-100">
                {/* 1. COGS Bar */}
                {cogsPct > 0 && (
                  <div
                    key="breakdown-cogs"
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
                    key="breakdown-opex"
                    style={{ width: `${opexPct}%` }}
                    className="bg-teal-500 text-white flex items-center justify-center text-xs font-mono font-bold transition-all relative group"
                    title={`房租与工人工资: ${opexPct}% (${formatMoney(monthlyOpex, baseCurr)})`}
                  >
                    {opexPct >= 10 && <span>房租人工 {opexPct}元</span>}
                  </div>
                )}
                {/* 3. Taxes & Other */}
                {taxOtherPct > 0 && (
                  <div
                    key="breakdown-tax"
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
                    key="breakdown-net"
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
                    <span className="text-[12px] text-neutral-400 font-normal ml-1">/百元</span>
                  </div>
                  <div className="text-[13px] text-neutral-500 font-medium mt-0.5">
                    每月花费 {formatMoney(monthlyCogs, baseCurr)}
                  </div>
                </div>

                <div className="bg-teal-50/70 border border-teal-200 p-3 rounded-2xl">
                  <div className="flex items-center space-x-1.5 text-xs text-teal-800 font-bold mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0"></span>
                    <span>2. 房租工人工资</span>
                  </div>
                  <div className="text-base font-mono font-black text-neutral-900">
                    {opexPct} 块钱
                    <span className="text-[12px] text-neutral-400 font-normal ml-1">/百元</span>
                  </div>
                  <div className="text-[13px] text-neutral-500 font-medium mt-0.5">
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
                    <span className="text-[12px] text-neutral-400 font-normal ml-1">/百元</span>
                  </div>
                  <div className="text-[13px] text-neutral-500 font-medium mt-0.5">
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
                    <span className="text-[12px] text-neutral-400 font-normal ml-1">/百元</span>
                  </div>
                  <div className="text-[13px] text-neutral-500 font-medium mt-0.5">
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
                <Store className="w-4 h-4 text-teal-600" />
                <h3 className="text-base font-black text-neutral-900">
                  {t('日常经营 4 大核心关键指标体检', '4 Core Health Checks for Daily Operations')}
                </h3>
              </div>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                {t('直接回答你关于赚钱能力、抗风险能力与固定开销的最重要问题。', 'Direct answers to your most important questions about profitability, resilience, and fixed costs.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Question 1: Profitability */}
              <div className="p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[12px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                      QUESTION 01
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      {t('1. 这个生意到底能不能赚到钱？', '1. Is this business actually making money?')}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                    netProfit > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {netProfit > 0 ? t('🟢 稳定盈利', '🟢 Stably Profitable') : t('🔴 发生亏损', '🔴 Losing Money')}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <div className="text-2xl font-mono font-black text-neutral-900">
                    {formatMoney(netProfit, baseCurr)}
                    <span className="text-xs text-neutral-500 font-medium ml-2">{t('/ 每月净赚', '/ net profit per month')}</span>
                  </div>
                  <div className="text-xs text-neutral-600 font-medium mt-1">
                    {t('净利润率', 'Net margin')}: <strong className="text-neutral-900 font-bold font-mono">{netProfitMarginPercent}%</strong>
                    {netProfitMarginPercent >= 15 ? t(' (高于小微行业均值)', ' (above small-business average)') : t(' (有一定改善空间)', ' (room to improve)')}
                  </div>
                </div>

                <p className="text-xs text-neutral-600 font-medium">
                  {t('大白话：扣除所有进货和开销后，真正能装进自己腰包的纯收益。', 'In plain terms: what actually lands in your pocket after all costs and expenses.')}
                </p>
              </div>

              {/* Question 2: Margin Health */}
              <div className="p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[12px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                      QUESTION 02
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      {t('2. 产品卖得贵不贵，毛利空间够不够大？', '2. Are prices right — is gross margin wide enough?')}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                    grossMarginPercent >= 30 ? 'bg-emerald-100 text-emerald-800' : grossMarginPercent >= 20 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {grossMarginPercent >= 30 ? t('🟢 空间充足', '🟢 Ample Margin') : grossMarginPercent >= 20 ? t('🟡 刚好及格', '🟡 Just Passing') : t('🔴 毛利过低', '🔴 Margin Too Thin')}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <div className="text-2xl font-mono font-black text-neutral-900">
                    {grossMarginPercent}%
                    <span className="text-xs text-neutral-500 font-medium ml-2">
                      {t(`(月毛利 ${formatMoney(grossProfit, baseCurr)})`, `(gross profit ${formatMoney(grossProfit, baseCurr)}/mo)`)}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600 font-medium mt-1">
                    {t('扣除进货直接成本后，每 100 块钱能剩下', 'After direct costs, every 100 you earn keeps')} <strong className="text-neutral-900 font-bold font-mono">{grossMarginPercent}{t(' 块钱', '')}</strong>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 font-medium">
                  {t('大白话：毛利是包住所有房租和发工资的源泉，毛利率越高，抵御供货商涨价的能力越强。', 'In plain terms: gross profit is what covers rent and wages — the higher the margin, the more cushion against supplier price hikes.')}
                </p>
              </div>

              {/* Question 3: OPEX Burden */}
              <div className="p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[12px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                      QUESTION 03
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      {t('3. 房租和工人工资开销重不重？', '3. Is rent and payroll too heavy a burden?')}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                    opexRatioPercent <= 45 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {opexRatioPercent <= 45 ? t('🟢 负担轻便', '🟢 Manageable') : t('🟡 稍显沉重', '🟡 Somewhat Heavy')}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <div className="text-2xl font-mono font-black text-neutral-900">
                    {opexRatioPercent}%
                    <span className="text-xs text-neutral-500 font-medium ml-2">
                      {t(`(月固定开销 ${formatMoney(monthlyOpex, baseCurr)})`, `(fixed costs ${formatMoney(monthlyOpex, baseCurr)}/mo)`)}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600 font-medium mt-1">
                    {t('毛利润是否包得住固定开销', 'Does gross profit cover fixed costs')}: <strong className="text-emerald-700 font-bold">{grossProfit >= monthlyOpex ? t('✅ 完全包住并有盈余', '✅ Covered, with surplus') : t('❌ 无法包住出现透支', '❌ Not covered, running a deficit')}</strong>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 font-medium">
                  {t('大白话：每月雷打不动要付出去的店租和员工薪资，只要毛利润能轻松包住，小店就不会慌。', 'In plain terms: rent and wages are fixed monthly costs — as long as gross profit comfortably covers them, the business stays stable.')}
                </p>
              </div>

              {/* Question 4: Cash Runway */}
              <div className="p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[12px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                      QUESTION 04
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      {t('4. 万一生意突发断流，账上备用金能撑多久？', '4. If revenue suddenly stopped, how long would cash reserves last?')}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                    cashRunwayMonths >= 3 ? 'bg-emerald-100 text-emerald-800' : cashRunwayMonths >= 2 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {cashRunwayMonths >= 3 ? t('🟢 安全宽裕', '🟢 Safe & Ample') : cashRunwayMonths >= 2 ? t('🟡 稍显紧凑', '🟡 A Bit Tight') : t('🔴 必须补充', '🔴 Needs Urgent Top-up')}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <div className="text-2xl font-mono font-black text-neutral-900">
                    {cashRunwayMonths} {t('个月', 'months')}
                  </div>
                  <div className="text-xs text-neutral-600 font-medium mt-1">
                    {t('债务偿还安全性', 'Debt safety')}: <strong className="text-neutral-900 font-bold">{debtServiceCoverageRatio >= 90 ? t('无外部负债（极度安全）', 'No external debt (extremely safe)') : t(`${debtServiceCoverageRatio}x 保障倍数`, `${debtServiceCoverageRatio}x coverage ratio`)}</strong>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 font-medium">
                  {t('大白话：即使遇到极端突发情况一个月没有新进账，现有可用现金还能坚持发工资和交租金几个月。', 'In plain terms: even with zero income for a month, how many months your current cash can cover payroll and rent.')}
                </p>
              </div>
            </div>
          </div>

          {/* Card 5: Actionable Checklist & Live Gemini Deep Diagnosis */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl text-white space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-amber-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-black tracking-tight text-white">
                  {t('行动清单：按优先级追踪优化进度', 'Action Checklist: Track Progress by Priority')}
                </h3>
              </div>

              <button
                onClick={handleFetchAiDiagnosis}
                disabled={isAiDiagnosing}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiDiagnosing ? 'animate-spin' : ''}`} />
                <span>{isAiDiagnosing ? t('Gemini 正在分析业务数据...', 'Gemini is analyzing your data...') : t('获取 Gemini 3.7 AI 实时深度战略诊断', 'Get Gemini 3.7 AI Deep Diagnosis')}</span>
              </button>
            </div>

            {/* AI Custom Feedback if loaded */}
            {aiCustomDiagnosis && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-xs space-y-2 animate-in fade-in">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Gemini 3.7 定制诊断：{aiCustomDiagnosis.summaryHeadline || '已完成实时深度诊断'}</span>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  {aiCustomDiagnosis.plainExplanation || 'AI 已根据你的业务数据生成诊断结论，请参考下方行动清单与专业建议。'}
                </p>
                {aiCustomDiagnosis.potentialGrowthAreas && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {aiCustomDiagnosis.potentialGrowthAreas.map((g, idx) => (
                      <span key={`growth-${idx}-${g}`} className="bg-amber-900/60 text-amber-200 px-2.5 py-0.5 rounded-lg border border-amber-700/50 text-[13px] font-medium">
                        🚀 {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Interactive Action Items Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {(
                aiCustomDiagnosis?.actionableAdvices ||
                // 已达标的红线不算行动项，剔除后剩下的才是真正需要跟进的清单。
                (report.aiActionableAdvice || []).filter((a) => !a.includes('恭喜') && !a.includes('全部达标'))
              ).slice(0, 3).map((advice, i) => {
                const isDone = completedActions[i];
                const { title, priority } = deriveActionMeta(advice, i, language);
                const priorityStyle = ACTION_PRIORITY_STYLE[priority];
                return (
                  <div
                    key={`action-${i}-${advice}`}
                    onClick={() => toggleActionCompleted(i)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isDone
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
                        : 'bg-neutral-800/90 border-neutral-700 hover:border-neutral-600 text-neutral-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[12px] font-bold px-2 py-0.5 rounded-lg border ${priorityStyle.className}`}>
                          {language === 'en' ? priorityStyle.label[1] : priorityStyle.label[0]}
                        </span>
                        <input
                          type="checkbox"
                          checked={isDone || false}
                          onChange={() => {}}
                          className="w-4 h-4 text-emerald-500 rounded cursor-pointer"
                        />
                      </div>
                      <h4 className={`font-bold text-sm ${isDone ? 'text-emerald-300 line-through' : 'text-white'}`}>
                        {title}
                      </h4>
                      <p className="text-neutral-300 leading-relaxed text-xs">
                        {advice}
                      </p>
                    </div>

                    <div className="pt-2 text-[13px] font-bold flex items-center gap-1 text-neutral-400">
                      {isDone ? t('✅ 已完成落地', '✅ Completed') : t('点击标记为已完成', 'Click to mark as done')}
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
                <span>{t('想看更深入的雷达透视图与原始财务公式？点击切换至专业财务明细模式', 'Want the radar chart and raw formulas? Switch to the professional detail view')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DETAILED BREAKDOWN VIEW (FOR ACCOUNTANTS & DEEP AUDITS) */}
      {/* ========================================================================= */}
      {viewMode === 'detailed' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 返回小白速览：专业明细仅作为次级的按需查看入口 */}
          <button
            onClick={() => setViewMode('simple')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-neutral-700 text-xs font-bold transition-colors cursor-pointer print:hidden"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回小白速览</span>
          </button>
          {/* Main Bento Grid Header Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Bento: Project Identity & Specs */}
            <div className="lg:col-span-8 bg-white border-2 border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                    工场服事标准体检评估报告
                  </span>
                  <span className="text-[12px] text-neutral-400 font-medium">
                    生成时间: {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-tight">
                  {report.projectName || '工场医疗教育服事自测项目'}
                </h2>
                <p className="text-xs text-neutral-500 font-medium mt-1">
                  行业领域：{report.industry} ｜ 申报版本：v{report.version} ｜ 基准币种：{report.baseCurrency}
                </p>
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
                {report.dataMinimizationNotice && (
                  <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-3 py-1 rounded-xl border border-amber-200 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>敏感安全脱敏模式</span>
                  </span>
                )}

                {report.customRateNotice && (
                  <span className="text-xs bg-teal-50 text-teal-800 font-semibold px-3 py-1 rounded-xl border border-teal-200 flex items-center space-x-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{report.customRateNotice}</span>
                  </span>
                )}

                {report.estimatedMonthsCount > 0 && (
                  <span className="text-xs bg-cyan-50 text-cyan-800 font-semibold px-3 py-1 rounded-xl border border-cyan-200 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <span>流水断点平滑估算已确认 ({report.estimatedMonthsCount} 个月)</span>
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
                  {report.tier} 等级
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
                      <span>全部通过 ({report.gates.length}/{report.gates.length})</span>
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>{(report.failedGates || report.gates.filter((g) => g.status !== 'PASS')).length}项触发红线</span>
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
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <span>{report.gates.length} 项一票否决门槛红线 (Gate Checks)</span>
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
                  key={g.code}
                  className={`p-4 rounded-2xl border-2 flex items-start space-x-3 ${
                    g.status === 'PASS'
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/70 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {g.status === 'PASS' ? (
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
                      <span className="font-mono text-xs font-bold uppercase">{g.code}</span>
                      <h4 className="text-xs font-bold text-neutral-900">{g.plainName || g.name}</h4>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                      {g.plainDescription}
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
                        key={`radar-bg-${idx}`}
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
                        key={`radar-axis-${i}`}
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
                    fill="#ccfbf1"
                    fillOpacity="0.4"
                    stroke="#5eead4"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />

                  {/* Actual Score Polygon */}
                  <polygon
                    points={radarPoints}
                    fill="#0d9488"
                    fillOpacity="0.35"
                    stroke="#115e59"
                    strokeWidth="2.5"
                  />

                  {/* Labels on vertices */}
                  {report.radarScores.map((dim, i) => {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const x = 100 + 96 * Math.cos(angle);
                    const y = 100 + 96 * Math.sin(angle);
                    return (
                      <text
                        key={`radar-label-${i}`}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[11px] font-bold fill-neutral-700"
                      >
                        {dim.dimensionPlain || dim.dimension}
                      </text>
                    );
                  })}
                </svg>
              </div>

              <div className="flex items-center justify-center space-x-6 text-xs font-medium pt-2 border-t border-neutral-100">
                <div className="flex items-center space-x-1.5 text-teal-700">
                  <span className="w-3 h-3 rounded bg-teal-600 inline-block"></span>
                  <span className="font-bold">本项目得分</span>
                </div>
                <div className="flex items-center space-x-1.5 text-neutral-500">
                  <span className="w-3 h-3 rounded bg-teal-200 inline-block border border-teal-400"></span>
                  <span>行业标杆线</span>
                </div>
              </div>
            </div>

            {/* 5 Dimensions Details List */}
            <div className="lg:col-span-7 bg-white border-2 border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-base font-black text-neutral-900">5 维得分明细</h3>
                <p className="text-xs text-neutral-500 font-medium">每项满分 100 分，加权综合后构成总分 100 分</p>
              </div>

              <div className="space-y-3">
                {report.radarScores.map((dim, i) => (
                  <div key={`dim-${dim.dimensionPlain || dim.dimension}-${i}`} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-900">
                      <span>{dim.dimensionPlain || dim.dimension}</span>
                      <span className="font-mono text-teal-700 text-sm">
                        {dim.score} <span className="text-neutral-400 font-normal text-xs">/ 100</span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${Math.min(100, dim.score)}%` }}
                        className="bg-teal-600 rounded-full transition-all"
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[13px] text-neutral-500">
                      <span>{dim.dimension}</span>
                      <span>行业标杆: {dim.benchmark}/100</span>
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
                <div className="text-[12px] text-neutral-400 font-mono font-bold uppercase">月真实毛利率</div>
                <div className="text-xl font-mono font-black text-neutral-900 mt-1">
                  {grossMarginPercent}%
                </div>
                <div className="text-[13px] text-neutral-500 mt-0.5">月毛利 {formatMoney(grossProfit, baseCurr)}</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="text-[12px] text-neutral-400 font-mono font-bold uppercase">月净利润率</div>
                <div className="text-xl font-mono font-black text-neutral-900 mt-1">
                  {netProfitMarginPercent}%
                </div>
                <div className="text-[13px] text-neutral-500 mt-0.5">净利润 {formatMoney(netProfit, baseCurr)}</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="text-[12px] text-neutral-400 font-mono font-bold uppercase">固定开支占比 (OPEX)</div>
                <div className="text-xl font-mono font-black text-neutral-900 mt-1">
                  {opexRatioPercent}%
                </div>
                <div className="text-[13px] text-neutral-500 mt-0.5">固定开销 {formatMoney(monthlyOpex, baseCurr)}</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="text-[12px] text-neutral-400 font-mono font-bold uppercase">备用金支撑月数</div>
                <div className="text-xl font-mono font-black text-neutral-900 mt-1">
                  {cashRunwayMonths} 个月
                </div>
                <div className="text-[13px] text-neutral-500 mt-0.5">安全底线为 ≥ 3.0 月</div>
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
                  {t('确认撤回并彻底删除该项目数据？', 'Confirm withdrawal and permanent deletion of this project?')}
                </h3>
                <p className="text-xs text-neutral-500">{t('依据 BAM-PRD-2026-V1.4 数据安全规范第 10 节', 'Per BAM-PRD-2026-V1.4 Data Security Policy, Section 10')}</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-2">
              <p className="font-bold">{t('⚠️ 撤回后果说明（请仔细阅读）：', '⚠️ Consequences of withdrawal (please read carefully):')}</p>
              <ul className="list-disc pl-4 space-y-1 text-rose-800">
                <li>{t('该项目的所有表单数据、财务流水记录将被立即物理粉碎删除；', 'All form data and financial records for this project will be permanently destroyed immediately;')}</li>
                <li>{t('已生成的所有历史版本诊断报告（v1, v2...）将立即永久失效并清除；', 'All previously generated report versions (v1, v2...) will be permanently invalidated and erased;')}</li>
                <li>{t('此操作为即时生效、全程自助，无需联系任何人，且不可撤销。', 'This action takes effect immediately, requires no approval, and cannot be undone.')}</li>
              </ul>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded"
              />
              <span>{t('我已充分知晓撤回影响，确认永久销毁该项目全部数据', 'I fully understand the consequences and confirm permanent deletion of all project data')}</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                {t('取消', 'Cancel')}
              </button>
              <button
                disabled={!deleteConfirmed}
                onClick={() => {
                  setShowDeleteModal(false);
                  onDeleteAndRecall();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {t('确认彻底删除', 'Confirm Permanent Deletion')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};