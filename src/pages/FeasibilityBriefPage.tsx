import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Flex, Row, Skeleton, Statistic, Tag, Typography } from 'antd';
import { CheckCircle2, Clock, Compass, FlaskConical, Target, TrendingUp } from 'lucide-react';
import { BusinessFormData, Language } from '../types';
import { calculateBreakEvenRevenue } from '../lib/breakEvenCalculator';
import { calculatePaybackPeriod } from '../lib/paybackCalculator';
import { CUSTOM_CURRENCY_VALUE, formatMoney } from '../lib/currencies';
import { getAuthHeaders } from '../lib/supabaseClient';
import { PageContainer, PageHeader } from '../components/ui/PageHeader';

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
  /** 带着当前项目的数字打开沙盒试算 */
  onOpenSimulator: (projectId: string) => void;
  language: Language;
  onGoToForm: () => void;
}

interface AssumptionTest {
  assumption: string;
  howToVerify: string;
  estimatedCost: string;
}

const STAGE_LABEL: Record<string, { zh: string; en: string; color: string }> = {
  not_started: { zh: '尚未启动', en: 'Not started', color: 'default' },
  has_prototype: { zh: '已有原型', en: 'Has prototype', color: 'processing' },
  has_revenue: { zh: '已有营收', en: 'Has revenue', color: 'success' }
};

export function FeasibilityBriefPage({ project, onOpenSimulator, language, onGoToForm }: Props) {
  const isEn = language === 'en';
  const t = (zh: string, en: string) => (isEn ? en : zh);
  const [tests, setTests] = useState<AssumptionTest[] | null>(null);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testsFromServer, setTestsFromServer] = useState(false);

  const currency = useMemo(() => {
    if (!project) return 'USD';
    return project.baseCurrency === CUSTOM_CURRENCY_VALUE && project.customCurrencyCode
      ? project.customCurrencyCode
      : project.baseCurrency || 'USD';
  }, [project]);
  const money = (n: number) => formatMoney(n, currency);

  // —— 确定性测算：全部本地计算，不依赖网络 ——
  const breakEven = useMemo(() => (project ? calculateBreakEvenRevenue(project) : null), [project]);
  const payback = useMemo(() => (project ? calculatePaybackPeriod(project) : null), [project]);

  // 保本点（含税）与回本测算是同一口径：月收入恰好等于保本点时，月度净结余正好为 0
  const breakEvenMonthly = breakEven?.monthlyBreakEvenRevenue ?? 0;
  const breakEvenDaily = breakEven?.dailyBreakEvenRevenue ?? 0;

  // 用户填写的预计月收入：与回本测算同一口径（净结余 = 收入 − 含税成本），直接反推，
  // 保证"收入是否达到保本点"与"回本周期"的结论一致
  const expectedRevenue = payback ? Math.max(0, payback.monthlyNetSurplus + breakEvenMonthly) : 0;

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
        label: t('悲观', 'Pessimistic'),
        note: t('月结余比预期低 30%', 'Surplus 30% lower'),
        months: monthsFor(surplus * 0.7),
        color: '#cf1322'
      },
      {
        key: 'neutral',
        label: t('中性', 'Neutral'),
        note: t('按你填写的数字', 'Your figures'),
        months: monthsFor(surplus),
        color: '#d48806'
      },
      {
        key: 'optimistic',
        label: t('乐观', 'Optimistic'),
        note: t('月结余比预期高 30%', 'Surplus 30% higher'),
        months: monthsFor(surplus * 1.3),
        color: '#389e0d'
      }
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payback, isEn]);

  // —— 假设验证计划：走后端 Strategist；失败时降级为本地模板 ——
  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    setLoadingTests(true);
    const fallback = () => localTests(isEn, breakEvenDaily > 0 ? money(breakEvenDaily) : null);

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
          setTests(fallback());
          setTestsFromServer(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setTests(fallback());
        setTestsFromServer(false);
      })
      .finally(() => {
        if (!cancelled) setLoadingTests(false);
      });

    return () => {
      cancelled = true;
    };
    // 项目内容（而不只是 id）变化后也要重新生成：用户改完表单回来，验证计划里的金额应随之更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.updatedAt, language]);

  if (!project) {
    return (
      <PageContainer width="max-w-3xl">
        <Card variant="borderless" className="shadow-xs">
          <Empty
            image={<Compass className="w-12 h-12 mx-auto text-neutral-300" />}
            description={
              <>
                <Typography.Title level={5}>{t('还没有项目', 'No project yet')}</Typography.Title>
                <Typography.Text type="secondary">
                  {t('先建一个项目，再回来看开业可行性简报。', 'Create a project first, then come back for the launch brief.')}
                </Typography.Text>
              </>
            }
          >
            <Button type="primary" onClick={onGoToForm}>
              {t('去填表', 'Go to the form')}
            </Button>
          </Empty>
        </Card>
      </PageContainer>
    );
  }

  const stage = STAGE_LABEL[project.businessStage] || STAGE_LABEL.not_started;
  const coverage = breakEvenMonthly > 0 ? Math.round((expectedRevenue / breakEvenMonthly) * 100) : 0;

  const emptyHint = (text: string) => (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text}>
      <Button onClick={onGoToForm}>{t('去表单填写', 'Fill in the form')}</Button>
    </Empty>
  );

  return (
    <PageContainer width="max-w-5xl">
      <PageHeader
        icon={<Compass className="w-5 h-5" />}
        title={t('开业测算', 'Launch Feasibility')}
        tags={<Tag color={stage.color}>{isEn ? stage.en : stage.zh}</Tag>}
        description={t(
          '回答「这事该不该做」：保本点、回本周期与开业前要验证的假设。全部在本机计算。',
          'Answers "should I do this?": break-even, payback and the assumptions to test before launch. Calculated locally.'
        )}
      />

      {project.businessStage === 'has_revenue' && (
        <Alert
          type="warning"
          showIcon
          title={t(
            '这个项目已经有营收了，看「体检报告」更合适。这份简报是为尚未开业的项目设计的。',
            'This project already has revenue — the health report is a better fit. This brief is designed for businesses that have not launched yet.'
          )}
        />
      )}

      <Card
        variant="borderless"
        className="shadow-xs"
        title={
          <Flex align="center" gap={8}>
            <Target className="w-5 h-5 text-amber-600" />
            {t('保本点：每月至少要卖多少才不亏', 'Break-even: the minimum to stop losing money')}
          </Flex>
        }
      >
        {breakEven?.hasEnoughData ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Statistic title={t('每个营业日至少', 'Per operating day')} value={money(breakEvenDaily)} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic title={t('每月至少', 'Per month')} value={money(breakEvenMonthly)} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title={t('你预计的月收入', 'Your expected monthly revenue')}
                  value={expectedRevenue > 0 ? money(expectedRevenue) : t('未填写', 'Not entered')}
                  styles={{
                    content: {
                      color: expectedRevenue <= 0 ? undefined : coverage >= 100 ? '#389e0d' : '#cf1322'
                    }
                  }}
                />
                {expectedRevenue > 0 && (
                  <Tag color={coverage >= 100 ? 'success' : 'error'} className="mt-1">
                    {coverage >= 100
                      ? t(`达到保本点的 ${coverage}%`, `${coverage}% of break-even`)
                      : t(`只有保本点的 ${coverage}%`, `Only ${coverage}% of break-even`)}
                  </Tag>
                )}
              </Col>
            </Row>
            <Typography.Paragraph type="secondary" className="mt-4 mb-0 text-xs">
              {t(
                `按每月成本合计 ${money(breakEvenMonthly)}（含税费 ${money(breakEven.costBreakdown.tax)}）、每月经营 ${breakEven.operatingDaysPerMonth} 天估算。`,
                `Based on total monthly costs of ${money(breakEvenMonthly)} (incl. ${money(breakEven.costBreakdown.tax)} tax) over ${breakEven.operatingDaysPerMonth} operating days.`
              )}
            </Typography.Paragraph>
          </>
        ) : (
          emptyHint(
            t(
              '还缺成本数据，先去表单里填写进货、房租、人工等每月开销。',
              'Cost data is missing — fill in procurement, rent and labor in the form first.'
            )
          )
        )}
      </Card>

      <Card
        variant="borderless"
        className="shadow-xs"
        title={
          <Flex align="center" gap={8}>
            <TrendingUp className="w-5 h-5 text-amber-600" />
            {t('回本周期：投进去的钱多久收回', 'Payback: when your investment comes back')}
          </Flex>
        }
        extra={
          <Button type="link" size="small" className="px-0" onClick={() => onOpenSimulator(project.id)}>
            {t('改改数字试试', 'Try other numbers')}
          </Button>
        }
      >
        {scenarios ? (
          <>
            <Typography.Paragraph type="secondary">
              {t(
                `初始投资 ${money(payback!.initialInvestment)}，按你填的数字每月净结余 ${money(payback!.monthlyNetSurplus)}。三档是同一组公式在不同假设下的结果，不含任何模型预测。`,
                `Initial investment ${money(payback!.initialInvestment)}, monthly net surplus ${money(payback!.monthlyNetSurplus)} at your figures. All three use the same formula under different assumptions — no model prediction.`
              )}
            </Typography.Paragraph>
            <Row gutter={[12, 12]}>
              {scenarios.map((s) => (
                <Col xs={24} sm={8} key={s.key}>
                  <Card size="small" style={{ borderTop: `3px solid ${s.color}` }}>
                    <Statistic
                      title={s.label}
                      value={s.months === null ? t('回不了本', 'Never') : s.months}
                      suffix={s.months === null ? undefined : t('个月', 'mo')}
                      styles={{ content: { color: s.color } }}
                    />
                    <Typography.Text type="secondary" className="text-xs">
                      {s.note}
                    </Typography.Text>
                  </Card>
                </Col>
              ))}
            </Row>
            {payback!.paybackMonths === null && (
              <Alert
                className="mt-3"
                type="error"
                showIcon
                action={
                  <Button size="small" danger onClick={() => onOpenSimulator(project.id)}>
                    {t('去沙盒调整', 'Adjust in simulator')}
                  </Button>
                }
                title={t(
                  '按你填的数字，每月净结余不为正 —— 这门生意会一直亏钱，而不是回本。开业前需要重新算定价或成本结构。',
                  'At your figures the monthly surplus is not positive — the business would keep losing money rather than pay back. Revisit pricing or costs before launching.'
                )}
              />
            )}
          </>
        ) : (
          emptyHint(
            t(
              '还没填「初始投资估算」，填了才能算回本周期。',
              'The initial investment estimate is missing — it is required to compute payback.'
            )
          )
        )}
      </Card>

      <Card
        variant="borderless"
        className="shadow-xs"
        title={
          <Flex align="center" gap={8}>
            <FlaskConical className="w-5 h-5 text-amber-600" />
            {t('开业前必须验证的假设', 'Assumptions to verify before launching')}
          </Flex>
        }
        extra={!loadingTests && tests && !testsFromServer ? <Tag>{t('离线模板', 'Offline')}</Tag> : null}
      >
        <Typography.Paragraph type="secondary">
          {t(
            '每条都是可以被证伪的具体命题，并配一条最低成本的验证方法。',
            'Each one is a falsifiable claim with the cheapest way to test it.'
          )}
        </Typography.Paragraph>
        {loadingTests || !tests ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <Flex vertical gap={12}>
            {tests.map((item, i) => (
              <Flex key={i} gap={12} className="p-3 sm:p-4 rounded-lg bg-neutral-50 border border-neutral-100">
                <span className="shrink-0 w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <Typography.Text strong className="block mb-1.5">
                    {item.assumption}
                  </Typography.Text>
                  <Flex gap={6} align="flex-start" className="text-neutral-700 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <span>{item.howToVerify}</span>
                  </Flex>
                  <Flex gap={6} align="center" className="text-xs text-neutral-500">
                    <Clock className="w-3.5 h-3.5" />
                    {item.estimatedCost}
                  </Flex>
                </div>
              </Flex>
            ))}
          </Flex>
        )}
      </Card>
    </PageContainer>
  );
}

/** 后端不可用时的内置验证计划（与 Strategist 的降级路径保持一致的三条） */
function localTests(isEn: boolean, dailyBreakEven: string | null): AssumptionTest[] {
  // 还没填成本时没有保本点，不再输出"每天约 $ 0"这种误导性的数字
  return isEn
    ? [
        {
          assumption: dailyBreakEven
            ? `Customers at this location will actually spend enough to reach ${dailyBreakEven} per operating day.`
            : 'Customers at this location will actually spend enough to cover your daily costs.',
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
          assumption: 'The payback period is acceptable to you and to whoever funded the initial investment.',
          howToVerify:
            'Write the monthly surplus on paper and check it against the minimum you need to live on and to repay borrowed capital.',
          estimatedCost: 'One evening'
        }
      ]
    : [
        {
          assumption: dailyBreakEven
            ? `这个位置的客人真的能撑起每个营业日约 ${dailyBreakEven} 的营业额。`
            : '这个位置的客人真的能撑起每天的成本开销。',
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
