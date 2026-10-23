import React, { useState } from 'react';
import { Alert, Card, Col, Flex, Grid, Row, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import { AlertTriangle, BookOpen, Building2, Lightbulb, Percent, ShieldCheck } from 'lucide-react';
import { Language } from '../types';
import { INDUSTRY_BENCHMARKS } from '../lib/industryBenchmarks';
import { SCORING_METRIC_DEFINITIONS } from '../lib/scoringEngine';
import { PageContainer, PageHeader } from './ui/PageHeader';

interface StandardsProps {
  language: Language;
}

// "≥ 3.0 个月" -> "≥ 3.0 months" for English display; the underlying data only stores the Chinese phrasing.
const localizeMonths = (text: string, language: Language) =>
  language === 'zh' ? text : text.replace('个月', 'months');

type Bi = { zh: string; en: string };

/** 5 项红线（一票否决）。阈值须与 scoringEngine.ts 的 gates 判定保持一致。 */
const GATES: { code: string; title: Bi; threshold: Bi; plain: Bi; extra?: Bi; tip: Bi }[] = [
  {
    code: 'Gate-1',
    title: { zh: '真实经营收入占比', en: 'Real operating revenue ratio' },
    threshold: { zh: '≥ 60%', en: '≥ 60%' },
    plain: {
      zh: '排除借款和外部赠款后，客户买单付给你的钱要占总进账的 60% 以上。',
      en: 'After excluding loans and external grants, money customers actually pay you must be at least 60% of total receipts.'
    },
    tip: {
      zh: '专注提升核心主营商品或服务的销售复购，逐步降低对一次性救济款的依赖。',
      en: 'Focus on repeat sales of your core products or services, and gradually reduce reliance on one-off relief funds.'
    }
  },
  {
    code: 'Gate-2',
    title: { zh: '毛利率底线', en: 'Gross margin floor' },
    threshold: { zh: '按行业 ≥ 20%~30%', en: '≥ 20%–30% by industry' },
    plain: {
      zh: '每做 100 块钱生意，扣除直接成本后至少要剩下一定的毛利。卖货生意的直接成本是进货和原材料；教育培训、美容美发、托育、诊所等服务型生意，还要加上老师、技师、医护等一线服务人员的工资（前台、行政、招生等管理人员工资算固定开销）。',
      en: 'For every 100 of business, a minimum gross profit must remain after direct costs. For goods businesses that is purchasing and materials; service businesses (education, beauty, childcare, clinics) also include front-line staff wages (front desk, admin and sales staff count as overhead).'
    },
    extra: {
      zh: '零售/餐饮/农业及其他 ≥ 20%（10%~20% 预警）；语言教育、职业实训、美容美发与社区服务 ≥ 30%（20%~30% 预警）；儿童日托、诊所 ≥ 25%（15%~25% 预警）。',
      en: 'Retail / food / agriculture / other ≥ 20% (10–20% warning); education, vocational training, beauty & community services ≥ 30% (20–30% warning); childcare and clinics ≥ 25% (15–25% warning).'
    },
    tip: {
      zh: '与上游批发商谈判争取批量折扣，或精简损耗严重的低毛利品种。',
      en: 'Negotiate bulk discounts with suppliers, or trim low-margin, high-waste product lines.'
    }
  },
  {
    code: 'Gate-3',
    title: { zh: '毛利覆盖固定开销', en: 'Gross profit covers overhead' },
    threshold: { zh: '毛利 ≥ 固定开销', en: 'Gross profit ≥ overhead' },
    plain: {
      zh: '每月赚出来的毛利润，必须能够全额包住房租、管理人工费用与水电网络等固定支出。',
      en: 'Your monthly gross profit must fully cover fixed costs such as rent, admin wages and utilities.'
    },
    tip: {
      zh: '固定开销偏高时，可以从弹性排班、转租分摊部分场地或削减杂费入手。',
      en: 'When overhead runs high, try flexible scheduling, subletting part of the space, or cutting miscellaneous fees.'
    }
  },
  {
    code: 'Gate-4',
    title: { zh: '税后净利润', en: 'Net profit after tax' },
    threshold: { zh: '≥ 0', en: '≥ 0' },
    plain: {
      zh: '扣掉所有成本、开销和税金后，每月到手必须是正数，不能处于持续倒贴亏损状态。',
      en: 'After all costs, overhead and taxes, what you take home each month must be positive — not a persistent loss.'
    },
    tip: {
      zh: '梳理非生产性杂费支出，提升客单价以拉正月度利润。',
      en: 'Review non-productive spending and raise average spend per customer to turn monthly profit positive.'
    }
  },
  {
    code: 'Gate-5',
    title: { zh: '偿债安全边际', en: 'Debt service margin' },
    threshold: { zh: '无负债 或 ≥ 1.25 倍', en: 'No debt or DSCR ≥ 1.25x' },
    plain: {
      zh: '如果有外部还贷，每月经营利润至少要是还款额的 1.25 倍，否则一旦经营波动就可能断供。',
      en: 'If you have external debt, monthly operating profit must be at least 1.25x the repayment, or any downturn risks a missed payment.'
    },
    tip: {
      zh: '尝试协商延长还款周期以降低月供，或暂停非必要的借贷扩张。',
      en: 'Negotiate a longer repayment term to lower monthly payments, or pause non-essential leveraged expansion.'
    }
  }
];

/** 6 项加权指标。权重与健康区间直接读取 SCORING_METRIC_DEFINITIONS，确保与报告一致。 */
const METRICS: { key: keyof typeof SCORING_METRIC_DEFINITIONS; name: Bi; plain: Bi; tip: Bi }[] = [
  {
    key: 'real_revenue_strength',
    name: { zh: '真实营业额占比', en: 'Real revenue ratio' },
    plain: { zh: '真金白银的客户成交，占总进账的比例', en: 'Share of receipts from real paying customers' },
    tip: {
      zh: '逐步减少对外部赠款/借款的依赖，提高主打产品在本地市场的真实成交量。',
      en: 'Reduce reliance on grants or loans, and grow real local sales of your core product.'
    }
  },
  {
    key: 'gross_margin_rate',
    name: { zh: '毛利率', en: 'Gross margin' },
    plain: {
      zh: '扣除进货原料（服务业另含一线服务人工）后剩下的比例',
      en: 'What is left after materials (plus front-line labor for service businesses)'
    },
    tip: {
      zh: '寻找就近源头供货商，减少中间商加价；优化配方或包装成本。',
      en: 'Find direct-source suppliers to cut middleman markup; optimize recipes or packaging.'
    }
  },
  {
    key: 'opex_efficiency',
    name: { zh: '固定开销占比', en: 'Overhead ratio' },
    plain: { zh: '每月房租、管理人工费用与日常杂费占收入的比例', en: 'Monthly rent, admin wages and routine fees as a share of revenue' },
    tip: {
      zh: '精简冗余工时、协商分段付租或分租部分场地以降低固定负担。',
      en: 'Trim redundant hours, negotiate staggered rent, or sublet part of the space.'
    }
  },
  {
    key: 'net_margin_rate',
    name: { zh: '到手纯利润率', en: 'Net profit margin' },
    plain: { zh: '最终揣进兜里的纯利润比例', en: 'The share of revenue that ends up in your pocket' },
    tip: {
      zh: '通过会员复购或组合套餐提高客单价，严格压缩零碎损耗。',
      en: 'Raise order value through loyalty or bundles, and tightly control small losses.'
    }
  },
  {
    key: 'cash_buffer_runway',
    name: { zh: '现金储备可撑月数', en: 'Cash runway' },
    plain: { zh: '即使不进账，账上备用金能维持几个月', en: 'How many months reserves last with zero income' },
    tip: {
      zh: '每月把 10%~15% 净利润存入独立应急资金池，防范突发事件。',
      en: 'Set aside 10–15% of net profit into a separate emergency fund every month.'
    }
  },
  {
    key: 'business_continuity',
    name: { zh: '持续经营时间与团队', en: 'Operating continuity & team' },
    plain: { zh: '开了多少个月，团队规模是否平稳', en: 'Months in operation and team stability' },
    tip: {
      zh: '建立清晰的经营台账，与核心员工建立分成机制以稳住团队。',
      en: 'Keep clear records and set up profit-sharing with core staff to retain the team.'
    }
  }
];

/** 评级档位，与 scoringEngine.ts 的 tier 划分一致 */
const TIERS = [
  { tier: 'AAA', range: '≥ 88', color: 'success' },
  { tier: 'AA', range: '≥ 80', color: 'success' },
  { tier: 'A', range: '≥ 70', color: 'success' },
  { tier: 'BBB', range: '≥ 60', color: 'warning' },
  { tier: 'BB', range: '< 60', color: 'warning' },
  { tier: 'REJECT', range: '', color: 'error' }
];

export const PublicScoringStandards: React.FC<StandardsProps> = ({ language }) => {
  const isEn = language === 'en';
  const pick = (b: Bi) => (isEn ? b.en : b.zh);
  const t = (zh: string, en: string) => (isEn ? en : zh);
  const screens = Grid.useBreakpoint();
  const [selectedIndustry, setSelectedIndustry] = useState<string>(INDUSTRY_BENCHMARKS[0].id);

  const activeBenchmark = INDUSTRY_BENCHMARKS.find((b) => b.id === selectedIndustry) || INDUSTRY_BENCHMARKS[0];
  const metricRows = METRICS.map((m) => ({ ...m, def: SCORING_METRIC_DEFINITIONS[m.key] }));

  return (
    <PageContainer>
      <PageHeader
        icon={<BookOpen className="w-5 h-5" />}
        title={t('评分规则', 'Scoring Rules')}
        tags={<Tag color="processing">{t('公式公开', 'Open formulas')}</Tag>}
        description={t(
          '红线、加权指标与行业基准全部公开，报告里的每一分都能在这里找到出处。',
          'Gates, weighted metrics and industry benchmarks are all public — every point in your report can be traced here.'
        )}
      >
        <Alert
          className="mt-4"
          type="success"
          showIcon
          icon={<ShieldCheck className="w-4 h-4" />}
          title={t('公平性承诺：凭证类型不参与评分', 'Fairness: proof type never affects the score')}
          description={t(
            '无论上传银行流水、手写账本照片、移动支付截图，还是纯手动填写，红线判定与加权评分都执行完全相同的计算逻辑。',
            'Whether you upload bank statements, a handwritten ledger photo, payment screenshots, or enter numbers manually, the gate checks and weighted score run exactly the same calculation.'
          )}
        />
      </PageHeader>

      <Card
        variant="borderless"
        className="shadow-xs"
        title={
          <Flex align="center" gap={8}>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {t('5 项红线（一票否决）', '5 gates (automatic disqualifiers)')}
          </Flex>
        }
      >
        <Typography.Paragraph type="secondary">
          {t(
            '红线必须全部达标：任意一项不达标（含预警），评级直接判为 REJECT，综合得分最高 54 分。',
            'All gates must pass: failing any one (including a warning) sets the tier to REJECT and caps the score at 54.'
          )}
        </Typography.Paragraph>
        <Row gutter={[16, 16]}>
          {GATES.map((g) => (
            <Col xs={24} md={12} key={g.code}>
              <Card size="small" className="h-full bg-neutral-50">
                <div className="mb-2">
                  <Typography.Text strong className="mr-2">
                    {isEn ? g.code : g.code.replace("Gate-", "红线 ")} · {pick(g.title)}
                  </Typography.Text>
                  <Tag color="success" className="me-0">
                    {pick(g.threshold)}
                  </Tag>
                </div>
                <Typography.Paragraph className="mb-2">{pick(g.plain)}</Typography.Paragraph>
                {g.extra && (
                  <Typography.Paragraph type="secondary" className="mb-2">
                    {pick(g.extra)}
                  </Typography.Paragraph>
                )}
                <Flex gap={6} align="flex-start" className="text-teal-800">
                  <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{pick(g.tip)}</span>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card
        variant="borderless"
        className="shadow-xs"
        title={
          <Flex align="center" gap={8}>
            <Percent className="w-5 h-5 text-teal-700" />
            {t('6 项加权评分指标', '6 weighted scoring metrics')}
          </Flex>
        }
      >
        {screens.md ? (
          <Table
            rowKey="key"
            size="middle"
            pagination={false}
            dataSource={metricRows}
            columns={[
              {
                title: t('指标', 'Metric'),
                key: 'name',
                render: (_, r) => (
                  <>
                    <Typography.Text strong>{pick(r.name)}</Typography.Text>
                    <div className="text-xs text-neutral-500">{pick(r.plain)}</div>
                  </>
                )
              },
              {
                title: t('权重', 'Weight'),
                key: 'weight',
                width: 80,
                align: 'right',
                render: (_, r) => <Typography.Text strong className="text-teal-700">{r.def.weight}%</Typography.Text>
              },
              {
                title: t('健康区间', 'Healthy range'),
                key: 'bench',
                width: 130,
                render: (_, r) => <span className="whitespace-nowrap">{localizeMonths(r.def.benchmarkValue, language)}</span>
              },
              {
                title: t('未达标时的改善方向', 'How to improve'),
                key: 'tip',
                render: (_, r) => pick(r.tip)
              }
            ]}
          />
        ) : (
          <Flex vertical gap={12}>
            {metricRows.map((r) => (
              <Card size="small" key={r.key} className="bg-neutral-50">
                <Flex justify="space-between" align="flex-start" gap={8}>
                  <div className="min-w-0">
                    <Typography.Text strong>{pick(r.name)}</Typography.Text>
                    <div className="text-xs text-neutral-500">{pick(r.plain)}</div>
                  </div>
                  <Tag color="processing" className="me-0 shrink-0">
                    {t('权重', 'Weight')} {r.def.weight}%
                  </Tag>
                </Flex>
                <div className="mt-2 text-sm">
                  <Typography.Text type="secondary">{t('健康区间：', 'Healthy: ')}</Typography.Text>
                  {localizeMonths(r.def.benchmarkValue, language)}
                </div>
                <Flex gap={6} align="flex-start" className="mt-1 text-sm text-teal-800">
                  <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{pick(r.tip)}</span>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
        <Flex wrap gap={8} align="center" className="mt-4">
          <Typography.Text type="secondary">{t('评级档位：', 'Tiers: ')}</Typography.Text>
          {TIERS.map((tier) => (
            <Tag key={tier.tier} color={tier.color} className="me-0">
              {tier.tier} {tier.range || t('红线未过', 'gate failed')}
            </Tag>
          ))}
        </Flex>
        <Typography.Paragraph type="secondary" className="mt-3 mb-0 text-xs">
          {t(
            '6 项权重合计 100%，与报告综合得分的加权算法逐项对应。服务型行业的毛利率区间按行业另行设定（见上方红线 2）。偿债倍数不参与加权，属于红线 5。',
            'The 6 weights sum to 100% and map one-to-one to the report score. Service industries use industry-specific gross margin ranges (see Gate-2). DSCR is not weighted — it is Gate-5.'
          )}
        </Typography.Paragraph>
      </Card>

      <Card
        variant="borderless"
        className="shadow-xs"
        title={
          <Flex align="center" gap={8}>
            <Building2 className="w-5 h-5 text-teal-700" />
            {t('行业基准对照', 'Industry benchmarks')}
          </Flex>
        }
      >
        <Tabs
          activeKey={selectedIndustry}
          onChange={setSelectedIndustry}
          items={INDUSTRY_BENCHMARKS.map((b) => ({
            key: b.id,
            label: isEn ? b.nameEn : b.nameZh.split(' (')[0]
          }))}
        />
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic title={t('典型毛利率', 'Gross margin')} value={activeBenchmark.typicalGrossMargin} styles={{ content: { fontSize: 18 } }} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title={t('典型固定开销比', 'Overhead ratio')} value={activeBenchmark.typicalOpexRatio} styles={{ content: { fontSize: 18 } }} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title={t('典型到手纯利', 'Net margin')}
              value={activeBenchmark.typicalNetMargin}
              styles={{ content: { fontSize: 18, color: '#389e0d' } }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title={t('建议备用金', 'Cash runway')}
              value={localizeMonths(activeBenchmark.typicalCashRunway, language)}
              styles={{ content: { fontSize: 18 } }}
            />
          </Col>
        </Row>
        <div className="mt-4 p-3 sm:p-4 rounded-lg bg-neutral-50 border border-neutral-100">
          <Typography.Paragraph className="mb-2">
            {isEn ? activeBenchmark.naturalLanguageSummaryEn : activeBenchmark.naturalLanguageSummaryZh}
          </Typography.Paragraph>
          <Flex gap={6} align="flex-start" className="text-teal-800">
            <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <Typography.Text strong>{t('经营诀窍：', 'Tip: ')}</Typography.Text>
              {isEn ? activeBenchmark.keyAdviceEn : activeBenchmark.keyAdviceZh}
            </span>
          </Flex>
        </div>
      </Card>
    </PageContainer>
  );
};
