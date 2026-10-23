import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Slider,
  Statistic,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Info,
  RotateCcw,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { BusinessFormData, CurrencyCode, GateCheckResult, Language } from '../types';
import { SUPPORTED_CURRENCIES, formatMoney, getCurrencyInfo } from '../lib/currencies';
import { calculateAssessmentReport } from '../lib/scoringEngine';
import { INDUSTRY_BENCHMARKS } from '../lib/industryBenchmarks';
import { getGrossMarginPolicy, usesDirectServiceLabor } from '../lib/grossMarginPolicy';
import { PageContainer, PageHeader } from './ui/PageHeader';

interface SimulatorProps {
  language: Language;
  /** 把试算数值带入一份新的草稿项目并跳转到表单 */
  onApplyToForm: (data: Partial<BusinessFormData>) => void;
}

/** 1 美元在 currency 下等于多少 */
const usdRate = (currency: CurrencyCode) => getCurrencyInfo(currency).rateToUsd || 1;

/** 向上取到"好看"的整数刻度：12,345 → 20,000；3.2e6 → 4,000,000 */
const niceCeil = (n: number) => {
  if (n <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / pow) * pow;
};

const STATUS_META: Record<GateCheckResult['status'], { color: string; zh: string; en: string; icon: React.ReactNode }> = {
  PASS: { color: 'success', zh: '达标', en: 'Pass', icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
  WARNING: { color: 'warning', zh: '预警', en: 'Warning', icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
  FAIL: { color: 'error', zh: '不达标', en: 'Fail', icon: <XCircle className="w-4 h-4 text-red-500" /> }
};

export const ScoringSimulator: React.FC<SimulatorProps> = ({ language, onApplyToForm }) => {
  const isEn = language === 'en';
  const t = (zh: string, en: string) => (isEn ? en : zh);

  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [industry, setIndustry] = useState<string>('food_beverage');
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 金额上限按币种折算（约合 1000 万美元），避免 VND/IDR 这类大面额币种被一个固定上限卡死
  const amountMax = Math.round(10_000_000 * usdRate(currency));
  // 月流水滑块的默认量程：约合 5 万美元；手动输入更大的数时量程跟着放大
  const revenueSliderMax = Math.max(niceCeil(50_000 * usdRate(currency)), niceCeil(monthlyRevenue));
  const revenueSliderStep = Math.max(1, revenueSliderMax / 500);

  const policy = getGrossMarginPolicy(industry);
  const isServiceIndustry = usesDirectServiceLabor(industry);

  // 切换币种时把已填金额按汇率换算过去，而不是让 5,000 美元直接变成 5,000 越南盾
  const changeCurrency = (next: CurrencyCode) => {
    const factor = usdRate(next) / usdRate(currency);
    const conv = (n: number) => Math.round(n * factor);
    setMonthlyRevenue(conv);
    setRent(conv);
    setLabor(conv);
    setUtilities(conv);
    setTaxes(conv);
    setOtherOpex(conv);
    setDebtPayment(conv);
    setLiquidCash(conv);
    setCurrency(next);
  };

  // 试算数值拼成一份最小可用的 BusinessFormData，直接交给正式评分引擎计算，
  // 保证试算结果与正式提交后的报告分数、红线判定完全一致。
  const realRevenue = (monthlyRevenue * realRevenueRatio) / 100;
  const externalGrants = monthlyRevenue - realRevenue;
  const cogsAmount = (realRevenue * cogsRatio) / 100;

  const simulatedPatch: Partial<BusinessFormData> = {
    industry,
    businessStage: 'has_revenue',
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
  };

  const report = useMemo(() => {
    const now = new Date().toISOString();
    const form: BusinessFormData = {
      id: 'sim-preview',
      version: 1,
      createdAt: now,
      updatedAt: now,
      projectName: t('试算预览', 'Simulator Preview'),
      businessType: '',
      initialInvestmentEstimate: { amount: 0, currency },
      targetPaybackMonths: 12,
      anomalyOverrides: {},
      isSensitiveRegion: false,
      regionCountry: '',
      regionDetail: '',
      contactChannel: '',
      anonymousOwnerName: '',
      hasMultipleRates: false,
      proofType: 'none',
      proofFiles: [],
      monthlyBreakdowns: [],
      companyRegistrationCost: { amount: 0, currency },
      companyRegistrationAmortizationMonths: 12,
      visaFeeCost: { amount: 0, currency },
      visaFeeAmortizationMonths: 12,
      equipmentDepreciationCost: { amount: 0, currency },
      inventoryValue: { amount: 0, currency },
      fullTimeEmployeesCount: 0,
      ownerEmail: '',
      collaborators: [],
      isSubmitted: false,
      isDraft: true,
      ...(simulatedPatch as Required<typeof simulatedPatch>)
    } as BusinessFormData;
    return calculateAssessmentReport(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(simulatedPatch), language]);

  const fin = report.normalizedFinancials;
  const hasInput = monthlyRevenue > 0;

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

  const gateLabel = (g: GateCheckResult): { label: string; value: string } => {
    switch (g.code) {
      case 'GATE-1':
        return { label: t('真实营业额占比 ≥ 60%', 'Real revenue ratio ≥ 60%'), value: `${realRevenueRatio}%` };
      case 'GATE-2':
        return {
          label: t(`毛利率 ≥ ${policy.passAt}%`, `Gross margin ≥ ${policy.passAt}%`),
          value: `${fin.grossMarginPercent.toFixed(1)}%`
        };
      case 'GATE-3':
        return {
          label: t('毛利润覆盖每月固定开销', 'Gross profit covers monthly overhead'),
          value: `${formatMoney(fin.grossProfit, currency)} / ${formatMoney(fin.monthlyOpex, currency)}`
        };
      case 'GATE-4':
        return { label: t('税后净利润 ≥ 0', 'Net profit after tax ≥ 0'), value: formatMoney(fin.netProfit, currency) };
      case 'GATE-5':
        return {
          label: t('无负债或偿债倍数 ≥ 1.25', 'No debt or DSCR ≥ 1.25x'),
          value: debtPayment === 0 ? t('无债务', 'No debt') : `${fin.debtServiceCoverageRatio.toFixed(2)}x`
        };
      default:
        return { label: g.name, value: g.currentValue };
    }
  };

  const amountInput = (
    key: string,
    label: string,
    value: number,
    setter: (n: number) => void,
    hint?: string
  ) => (
    <Col xs={24} sm={12} key={key}>
      <label className="block mb-1 text-neutral-700" htmlFor={`sim-${key}`}>
        {label}
        {hint && (
          <Tooltip title={hint}>
            <Info className="inline w-3.5 h-3.5 ml-1 text-neutral-400 align-[-2px]" />
          </Tooltip>
        )}
      </label>
      <InputNumber
        id={`sim-${key}`}
        className="w-full"
        min={0}
        max={amountMax}
        value={value}
        prefix={getCurrencyInfo(currency).symbol}
        formatter={(v) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        parser={(v) => Number((v || '').replace(/[^\d.]/g, '')) || 0}
        onChange={(v) => setter(typeof v === 'number' ? v : 0)}
        inputMode="decimal"
      />
    </Col>
  );

  const scoreColor = !report.gatePassed ? '#ff4d4f' : report.totalScore >= 80 ? '#52c41a' : '#faad14';

  return (
    <PageContainer>
      <PageHeader
        icon={<Calculator className="w-5 h-5" />}
        title={t('沙盒试算', 'Sandbox Simulator')}
        tags={<Tag color="success">{t('不提交 · 不记录', 'Not saved')}</Tag>}
        description={t(
          '调整收入、成本与负债，实时查看红线判定与综合得分。数据只在本机计算，不会保存。',
          'Adjust revenue, costs and debt to see the gate checks and score update live. Calculated locally, nothing is saved.'
        )}
        extra={
          <>
            <Button icon={<RotateCcw className="w-4 h-4" />} onClick={resetDefaults}>
              {t('重置', 'Reset')}
            </Button>
            <Button type="primary" disabled={!hasInput} onClick={() => setConfirmOpen(true)}>
              {t('带入正式申报表', 'Apply to form')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Flex vertical gap={16}>
            <Card
              title={t('1. 行业与收入', '1. Industry & revenue')}
              variant="borderless"
              className="shadow-xs"
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <label className="block mb-1 text-neutral-700">{t('行业', 'Industry')}</label>
                  <Select
                    className="w-full"
                    value={industry}
                    onChange={setIndustry}
                    options={INDUSTRY_BENCHMARKS.map((b) => ({
                      value: b.id,
                      label: isEn ? b.nameEn : b.nameZh.split(' (')[0]
                    }))}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <label className="block mb-1 text-neutral-700">{t('币种', 'Currency')}</label>
                  <Select
                    className="w-full"
                    showSearch
                    optionFilterProp="label"
                    value={currency}
                    onChange={changeCurrency}
                    options={SUPPORTED_CURRENCIES.filter((c) => !c.isCustomOption).map((c) => ({
                      value: c.code,
                      label: `${c.code} ${c.symbol} · ${isEn ? c.nameEn : c.nameZh.replace(/\s*\(.*\)$/, '')}`
                    }))}
                  />
                </Col>

                <Col span={24}>
                  <Flex justify="space-between" align="center" wrap gap={8} className="mb-1">
                    <label className="text-neutral-700" htmlFor="sim-revenue">
                      {t('月均总流水', 'Monthly gross revenue')}
                    </label>
                    <InputNumber
                      id="sim-revenue"
                      className="w-44"
                      min={0}
                      max={amountMax}
                      value={monthlyRevenue}
                      prefix={getCurrencyInfo(currency).symbol}
                      formatter={(v) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(v) => Number((v || '').replace(/[^\d.]/g, '')) || 0}
                      onChange={(v) => setMonthlyRevenue(typeof v === 'number' ? v : 0)}
                      inputMode="decimal"
                    />
                  </Flex>
                  <Slider
                    min={0}
                    max={revenueSliderMax}
                    step={revenueSliderStep}
                    value={Math.min(monthlyRevenue, revenueSliderMax)}
                    onChange={setMonthlyRevenue}
                    tooltip={{ formatter: (v) => formatMoney(v || 0, currency) }}
                  />
                </Col>

                <Col span={24}>
                  <Flex justify="space-between" align="center" wrap gap={8} className="mb-1">
                    <span className="text-neutral-700">
                      {t('其中真实经营收入占比', 'Share from real sales')}
                      <Tooltip
                        title={t(
                          '扣除借款、捐赠和补贴后，客户真正付给你的钱占总流水的比例。红线：≥ 60%。',
                          'Share of gross revenue paid by real customers, excluding loans, donations and grants. Gate: ≥ 60%.'
                        )}
                      >
                        <Info className="inline w-3.5 h-3.5 ml-1 text-neutral-400 align-[-2px]" />
                      </Tooltip>
                    </span>
                    <Typography.Text type={realRevenueRatio >= 60 ? 'success' : 'danger'} strong>
                      {realRevenueRatio}% · {formatMoney(realRevenue, currency)}
                    </Typography.Text>
                  </Flex>
                  <Slider
                    min={0}
                    max={100}
                    value={realRevenueRatio}
                    onChange={setRealRevenueRatio}
                    marks={{ 60: '60%' }}
                    tooltip={{ formatter: (v) => `${v}%` }}
                  />
                </Col>

                <Col span={24}>
                  <Flex justify="space-between" align="center" wrap gap={8} className="mb-1">
                    <span className="text-neutral-700">
                      {isServiceIndustry
                        ? t('直接成本占比（物料 + 一线服务人工）', 'Direct cost ratio (materials + front-line staff)')
                        : t('直接成本占比（进货 / 原材料）', 'Direct cost ratio (purchasing / materials)')}
                    </span>
                    <Typography.Text strong>
                      {cogsRatio}% · {formatMoney(cogsAmount, currency)}
                    </Typography.Text>
                  </Flex>
                  <Slider
                    min={0}
                    max={100}
                    value={cogsRatio}
                    onChange={setCogsRatio}
                    marks={{ [100 - policy.passAt]: t('红线', 'Gate') }}
                    tooltip={{ formatter: (v) => `${v}%` }}
                  />
                </Col>
              </Row>
            </Card>

            <Card title={t('2. 每月固定开销与资金', '2. Monthly overhead & cash')} variant="borderless" className="shadow-xs">
              <Row gutter={[16, 16]}>
                {amountInput('rent', t('房租', 'Rent'), rent, setRent)}
                {amountInput(
                  'labor',
                  t('管理人工费用', 'Admin staff wages'),
                  labor,
                  setLabor,
                  isServiceIndustry
                    ? t(
                        '前台、行政、招生、店长等管理人员工资。老师、技师等一线服务人员工资请计入上方直接成本占比。',
                        'Front desk, admin, sales and manager wages. Front-line staff pay belongs in the direct cost ratio above.'
                      )
                    : undefined
                )}
                {amountInput('utilities', t('水电网络', 'Utilities'), utilities, setUtilities)}
                {amountInput('otherOpex', t('其他运营开销', 'Other overhead'), otherOpex, setOtherOpex)}
                {amountInput('taxes', t('税费', 'Taxes & fees'), taxes, setTaxes)}
                {amountInput('debt', t('每月还贷本息', 'Monthly debt payment'), debtPayment, setDebtPayment)}
                {amountInput('cash', t('可用备用金', 'Cash reserves'), liquidCash, setLiquidCash)}
                <Col xs={24} sm={12}>
                  <label className="block mb-1 text-neutral-700" htmlFor="sim-months">
                    {t('已经营月数', 'Months in operation')}
                  </label>
                  <InputNumber
                    id="sim-months"
                    className="w-full"
                    min={0}
                    max={600}
                    precision={0}
                    value={operatingMonths}
                    onChange={(v) => setOperatingMonths(typeof v === 'number' ? v : 0)}
                    suffix={t('个月', 'mo')}
                    inputMode="numeric"
                  />
                </Col>
              </Row>
            </Card>
          </Flex>
        </Col>

        <Col xs={24} lg={10}>
          <div className="lg:sticky lg:top-4 flex flex-col gap-4">
            <Card title={t('实时评分', 'Live score')} variant="borderless" className="shadow-xs">
              {!hasInput ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('先填写月均总流水，即可开始试算', 'Enter monthly revenue to start')}
                />
              ) : (
                <>
                  <Flex align="center" gap={20} wrap>
                    <Progress
                      type="dashboard"
                      percent={report.totalScore}
                      strokeColor={scoreColor}
                      size={132}
                      format={() => (
                        <div>
                          <div className="text-3xl font-bold text-neutral-900">{report.totalScore}</div>
                          <div className="text-xs text-neutral-500">/ 100</div>
                        </div>
                      )}
                    />
                    <Flex vertical gap={8}>
                      <div>
                        <Typography.Text type="secondary">{t('评级', 'Tier')} </Typography.Text>
                        <Tag color={report.tier === 'REJECT' ? 'error' : 'processing'} className="text-base">
                          {report.tier}
                        </Tag>
                      </div>
                      <Tag
                        color={report.gatePassed ? 'success' : 'error'}
                        icon={report.gatePassed ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> : <XCircle className="w-3.5 h-3.5 inline mr-1" />}
                      >
                        {report.gatePassed ? t('红线全部通过', 'All gates passed') : t('触发红线（一票否决）', 'Gate failed')}
                      </Tag>
                    </Flex>
                  </Flex>

                  <Row gutter={[12, 12]} className="mt-4">
                    <Col span={12}>
                      <Statistic
                        title={t('毛利率', 'Gross margin')}
                        value={fin.grossMarginPercent}
                        precision={1}
                        suffix="%"
                        styles={{ content: { fontSize: 20 } }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={t('月到手纯利', 'Monthly net profit')}
                        value={formatMoney(fin.netProfit, currency)}
                        styles={{ content: { fontSize: 20, color: fin.netProfit >= 0 ? '#389e0d' : '#cf1322' } }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={t('固定开销占收入', 'Overhead / revenue')}
                        value={fin.opexRatioPercent}
                        precision={1}
                        suffix="%"
                        styles={{ content: { fontSize: 20 } }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={t('备用金可撑', 'Cash runway')}
                        value={fin.cashRunwayMonths}
                        precision={1}
                        suffix={t('个月', 'mo')}
                        styles={{ content: { fontSize: 20 } }}
                      />
                    </Col>
                  </Row>
                </>
              )}
            </Card>

            <Card
              title={
                <Flex align="center" gap={8}>
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  {t('5 项红线检查', '5 gate checks')}
                </Flex>
              }
              variant="borderless"
              className="shadow-xs"
            >
              <Flex vertical>
                {report.gates.map((g, i) => {
                  const meta = STATUS_META[g.status];
                  const { label, value } = gateLabel(g);
                  return (
                    <Flex
                      key={g.code}
                      align="center"
                      gap={8}
                      wrap
                      className={`py-2.5 ${i > 0 ? 'border-t border-neutral-100' : ''}`}
                    >
                      {hasInput ? meta.icon : <span className="w-4 h-4 rounded-full border border-neutral-300" />}
                      <span className="flex-1 min-w-40 text-neutral-800">{label}</span>
                      {hasInput ? (
                        <Flex align="center" gap={6} className="ml-auto">
                          <span className="tabular-nums text-neutral-500">{value}</span>
                          <Tag color={meta.color} className="me-0">
                            {isEn ? meta.en : meta.zh}
                          </Tag>
                        </Flex>
                      ) : (
                        <Typography.Text type="secondary" className="ml-auto">
                          —
                        </Typography.Text>
                      )}
                    </Flex>
                  );
                })}
              </Flex>
              <Alert
                className="mt-3"
                type="info"
                showIcon
                title={t(
                  '试算与正式报告使用同一套评分引擎。需要完整诊断报告时，点「带入正式申报表」生成一个新项目继续填写。',
                  'The simulator uses the same scoring engine as the formal report. Click "Apply to form" to continue in a new project for the full report.'
                )}
              />
            </Card>
          </div>
        </Col>
      </Row>

      <Modal
        open={confirmOpen}
        title={t('带入正式申报表', 'Apply to the assessment form')}
        okText={t('新建项目并带入', 'Create project')}
        cancelText={t('取消', 'Cancel')}
        onCancel={() => setConfirmOpen(false)}
        onOk={() => {
          setConfirmOpen(false);
          onApplyToForm(simulatedPatch);
        }}
      >
        <Typography.Paragraph>
          {t(
            '将用这组试算数值新建一个草稿项目，并跳转到表单继续补充。你已有的项目不会被修改。',
            'A new draft project will be created from these numbers and opened in the form. Your existing projects are not changed.'
          )}
        </Typography.Paragraph>
      </Modal>
    </PageContainer>
  );
};
