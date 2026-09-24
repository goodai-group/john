import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  FlaskConical,
  HelpCircle,
  Loader2,
  Target,
  TrendingUp
} from 'lucide-react';
import { BusinessFormData, Language } from '../types';
import { calculateBreakEvenRevenue } from '../lib/breakEvenCalculator';
import { calculatePaybackPeriod } from '../lib/paybackCalculator';
import { CUSTOM_CURRENCY_VALUE } from '../lib/currencies';
import { getAuthHeaders } from '../lib/supabaseClient';

/**
 * 开业可行性简报 —— 面向「还没开业的人」的第二套报告模板。
 *
 * 【为什么需要第二套模板】体检报告的 14 个核心字段全是「过去发生的事」，
 * 尚未开业的用户一个都填不出来。对这批人，产品此前几乎完全无法服务。
 *
 * 这一页刻意不复用 AssessmentReportView：
 *   体检报告回答「我现在健康吗」，可行性简报回答「这事该不该做」。
 *   两者的问题不同、数据来源不同、交付物也不同。
 *
 * 【弱网优先】保本点、回本周期、三档情景全部在浏览器本地算（复用既有确定性引擎），
 * 断网也能出简报；只有「开业前假设验证计划」需要后端，拿不到时降级为本地模板。
 */

interface Props {
  project: BusinessFormData | undefined;
  language: Language;
  onGoToForm: () => void;
}

interface AssumptionTest {
  assumption: string;
  howToVerify: string;
  estimatedCost: string;
}

const fmt = (n: number, currency: string) =>
  `${Math.round(n).toLocaleString()} ${currency}`;

export function FeasibilityBriefPage({ project, language, onGoToForm }: Props) {
  const isEn = language === 'en';
  const [tests, setTests] = useState<AssumptionTest[] | null>(null);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testsFromServer, setTestsFromServer] = useState(false);

  const currency = useMemo(() => {
    if (!project) return 'USD';
    return project.baseCurrency === CUSTOM_CURRENCY_VALUE && project.customCurrencyCode
      ? project.customCurrencyCode
      : project.baseCurrency || 'USD';
  }, [project]);

  // —— 确定性测算：全部本地计算，不依赖网络 ——
  const breakEven = useMemo(
    () => (project ? calculateBreakEvenRevenue(project) : null),
    [project]
  );
  const payback = useMemo(
    () => (project ? calculatePaybackPeriod(project) : null),
    [project]
  );

  /**
   * 三档情景：以确定性算出的月度净结余为中性档，按 ±30% 给出悲观与乐观。
   * 这里刻意不引入任何模型预测 —— 三档只是同一组确定性公式在不同假设下的结果。
   */
  const scenarios = useMemo(() => {
    if (!payback || !payback.hasEnoughData) return null;
    const surplus = payback.monthlyNetSurplus;
    const invest = payback.initialInvestment;
    const monthsFor = (s: number) => (s > 0 ? Math.ceil(invest / s) : null);
    return [
      {
        key: 'pessimistic',
        labelZh: '悲观',
        labelEn: 'Pessimistic',
        note: isEn ? 'surplus 30% lower than planned' : '月结余比预期低 30%',
        months: monthsFor(surplus * 0.7),
        tone: 'text-red-600 bg-red-50 border-red-200'
      },
      {
        key: 'neutral',
        labelZh: '中性',
        labelEn: 'Neutral',
        note: isEn ? 'the figures you entered' : '按你填写的数字',
        months: monthsFor(surplus),
        tone: 'text-amber-700 bg-amber-50 border-amber-200'
      },
      {
        key: 'optimistic',
        labelZh: '乐观',
        labelEn: 'Optimistic',
        note: isEn ? 'surplus 30% higher than planned' : '月结余比预期高 30%',
        months: monthsFor(surplus * 1.3),
        tone: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      }
    ];
  }, [payback, isEn]);

  // —— 假设验证计划：走后端 Strategist；失败时降级为本地模板 ——
  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    setLoadingTests(true);

    getAuthHeaders()
      .then((authHeaders) =>
        fetch('/api/agents/strategist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            form: project,
            report: { normalizedFinancials: {}, totalScore: 0, tier: 'B', gates: [], metrics: [] },
            language
          })
        })
      )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d?.assumptionTests) && d.assumptionTests.length > 0) {
          setTests(d.assumptionTests);
          setTestsFromServer(true);
        } else {
          setTests(localTests(isEn, breakEven?.dailyBreakEvenRevenue ?? 0, currency));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setTests(localTests(isEn, breakEven?.dailyBreakEvenRevenue ?? 0, currency));
      })
      .finally(() => {
        if (!cancelled) setLoadingTests(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, language]);

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Compass className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {isEn ? 'No project yet' : '还没有项目'}
        </h2>
        <p className="text-slate-500 mb-6">
          {isEn
            ? 'Create a project first, then come back for the launch feasibility brief.'
            : '先建一个项目，再回来看开业可行性简报。'}
        </p>
        <button
          onClick={onGoToForm}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-700"
        >
          {isEn ? 'Go to the form' : '去填表'}
        </button>
      </div>
    );
  }

  const notStarted = project.businessStage !== 'has_revenue';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* 头部 */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-amber-300 border border-amber-400/40 rounded px-2 py-0.5 mb-3">
              <Compass className="w-3 h-3" />
              {isEn ? 'LAUNCH FEASIBILITY BRIEF' : '开业可行性简报'}
            </div>
            <h1 className="text-2xl font-black mb-1">{project.projectName}</h1>
            <p className="text-slate-300 text-sm">
              {isEn
                ? 'This brief answers "should I do this?" — not "am I healthy?"'
                : '这份简报回答的是「这事该不该做」，不是「我现在健康吗」。'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-400 mb-1">
              {isEn ? 'Stage' : '所处阶段'}
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/10 text-sm font-bold">
              {project.businessStage === 'not_started'
                ? isEn
                  ? 'Not started'
                  : '尚未启动'
                : project.businessStage === 'has_prototype'
                  ? isEn
                    ? 'Has prototype'
                    : '已有原型'
                  : isEn
                    ? 'Has revenue'
                    : '已有营收'}
            </div>
          </div>
        </div>
      </div>

      {!notStarted && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            {isEn
              ? 'This project is already generating revenue. The full health report is the better fit — this brief is designed for businesses that have not launched yet.'
              : '这个项目已经有营收了，看「体检报告」更合适。这份简报是为尚未开业的项目设计的。'}
          </p>
        </div>
      )}

      {/* 保本点 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-1">
          <Target className="w-5 h-5 text-amber-600" />
          {isEn ? 'Break-even point' : '保本点'}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          {isEn ? 'When you stop losing money' : '什么时候不再亏钱'}
        </p>

        {breakEven?.hasEnoughData ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs text-slate-500 mb-1">
                {isEn ? 'Needed per operating day' : '每个营业日至少要做到'}
              </div>
              <div className="text-2xl font-black text-slate-900">
                {fmt(breakEven.dailyBreakEvenRevenue, currency)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs text-slate-500 mb-1">
                {isEn ? 'Needed per month' : '每月至少要做到'}
              </div>
              <div className="text-2xl font-black text-slate-900">
                {fmt(breakEven.monthlyBreakEvenRevenue, currency)}
              </div>
            </div>
            <p className="sm:col-span-2 text-xs text-slate-500">
              {isEn
                ? `Based on total monthly cost of ${fmt(breakEven.monthlyCostTotal, currency)} over ${breakEven.operatingDaysPerMonth} operating days. This total does not include tax (same basis as "Monthly cash burn" below), so it may be lower than the total in your expense list.`
                : `按你已填的每月成本合计 ${fmt(breakEven.monthlyCostTotal, currency)}、每月经营 ${breakEven.operatingDaysPerMonth} 天估算。此合计不含税费（与下方"每月现金消耗"口径一致），可能会比花费清单里的总额略低。`}
            </p>
          </div>
        ) : (
          <EmptyHint
            isEn={isEn}
            onGoToForm={onGoToForm}
            zh="还缺成本数据，先去表单里填写进货、房租、人工等每月开销。"
            en="Cost data is missing — fill in procurement, rent and labor in the form first."
          />
        )}
      </section>

      {/* 三档情景 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-1">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          {isEn ? 'Payback under three scenarios' : '三档情景下的回本周期'}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          {isEn
            ? 'When the money you put in comes back. All three are the same deterministic formula under different assumptions — no model prediction involved.'
            : '投进去的本金什么时候收回来。三档是同一组确定性公式在不同假设下的结果，不含任何模型预测。'}
        </p>

        {scenarios ? (
          <div className="grid sm:grid-cols-3 gap-3">
            {scenarios.map((s) => (
              <div key={s.key} className={`rounded-xl border p-4 ${s.tone}`}>
                <div className="text-xs font-bold mb-1">{isEn ? s.labelEn : s.labelZh}</div>
                <div className="text-2xl font-black mb-1">
                  {s.months === null ? (isEn ? 'Never' : '回不了本') : `${s.months} ${isEn ? 'mo' : '个月'}`}
                </div>
                <div className="text-[11px] opacity-80">{s.note}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyHint
            isEn={isEn}
            onGoToForm={onGoToForm}
            zh="还没填「初始投资估算」，填了才能算回本周期。"
            en="The initial investment estimate is missing — it is required to compute payback."
          />
        )}

        {payback?.hasEnoughData && payback.paybackMonths === null && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {isEn
                ? 'At the numbers you entered, the monthly surplus is not positive — the business would keep losing money rather than pay itself back. Revisit pricing or cost structure before launching.'
                : '按你填的数字，每月净结余不为正 —— 这门生意会一直亏钱，而不是回本。开业前需要重新算定价或成本结构。'}
            </span>
          </div>
        )}
      </section>

      {/* 开业前假设验证 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-1">
          <FlaskConical className="w-5 h-5 text-amber-600" />
          {isEn ? 'Assumptions to verify before launching' : '开业前必须验证的假设'}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          {isEn
            ? 'Each one is a falsifiable claim with the cheapest way to test it.'
            : '每条都是可以被证伪的具体命题，并配一条最低成本的验证方法。'}
        </p>

        {loadingTests && (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            {isEn ? 'Preparing the verification plan…' : '正在准备验证计划…'}
          </div>
        )}

        {!loadingTests && tests && (
          <>
            <div className="space-y-3">
              {tests.map((t, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 mb-2">{t.assumption}</p>
                      <div className="flex items-start gap-2 text-sm text-slate-700 mb-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{t.howToVerify}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {t.estimatedCost}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!testsFromServer && (
              <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                {isEn
                  ? 'Offline mode: showing the built-in verification plan.'
                  : '离线模式：显示的是内置验证计划。'}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function EmptyHint({
  isEn,
  zh,
  en,
  onGoToForm
}: {
  isEn: boolean;
  zh: string;
  en: string;
  onGoToForm: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
      <p className="text-sm text-slate-600 mb-3">{isEn ? en : zh}</p>
      <button
        onClick={onGoToForm}
        className="text-sm font-bold text-amber-700 hover:text-amber-800 underline underline-offset-2"
      >
        {isEn ? 'Go to the form →' : '去表单填写 →'}
      </button>
    </div>
  );
}

/** 后端不可用时的内置验证计划（与 Strategist 的降级路径保持一致的三条） */
function localTests(isEn: boolean, dailyBreakEven: number, currency: string): AssumptionTest[] {
  const daily = `${Math.round(dailyBreakEven).toLocaleString()} ${currency}`;
  return isEn
    ? [
        {
          assumption: `Customers at this location will actually spend enough to reach ${daily} per operating day.`,
          howToVerify:
            'Run a 3-day pop-up stall or pre-sale at the exact target location and count real paying customers, not passers-by.',
          estimatedCost: '3 days plus a small stock of goods'
        },
        {
          assumption:
            'The rent, staffing and utility quotes you used are the real numbers a newcomer gets, not the advertised ones.',
          howToVerify:
            'Get three written quotes from different landlords/suppliers on the same street and compare against what you assumed.',
          estimatedCost: 'About a week of legwork, no cash outlay'
        },
        {
          assumption:
            'The payback period is acceptable to you and to whoever funded the initial investment.',
          howToVerify:
            'Write the monthly surplus on paper and check it against the minimum you need to live on and to repay borrowed capital.',
          estimatedCost: 'One evening'
        }
      ]
    : [
        {
          assumption: `这个位置的客人真的能撑起每个营业日约 ${daily} 的营业额。`,
          howToVerify: '在目标地点摆 3 天临时摊位或做一次预售，数真正掏钱的客人，不是路过的人。',
          estimatedCost: '3 天时间 + 少量备货'
        },
        {
          assumption: '你用的房租、人工、水电报价，是新人真能拿到的价，而不是挂出来的价。',
          howToVerify: '在同一条街找三家不同房东/供应商各要一份书面报价，和你的假设对一遍。',
          estimatedCost: '约一周跑腿，不花钱'
        },
        {
          assumption: '这个回本周期，你本人和出本金的人都能接受。',
          howToVerify: '把每月净结余的数字写在纸上，对照你的生活最低开销和需要还的本金，看撑不撑得住。',
          estimatedCost: '一个晚上'
        }
      ];
}
