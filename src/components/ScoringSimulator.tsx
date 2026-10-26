import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
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
  Sparkles,
  XCircle
} from 'lucide-react';
import { BusinessFormData, CurrencyCode, GateCheckResult, Language } from '../types';
import { SUPPORTED_CURRENCIES, formatMoney, getCurrencyInfo } from '../lib/currencies';
import { calculateAssessmentReport } from '../lib/scoringEngine';
import { INDUSTRY_BENCHMARKS } from '../lib/industryBenchmarks';
import {
  classifyMarginProfileLocal,
  describeMarginPolicy,
  getMarginProfileById,
  marginProfilesForIndustry,
  normalizeMarginIndustry,
  resolveMarginProfile,
  usesDirectServiceLabor
} from '../lib/grossMarginPolicy';
import { getAuthHeaders } from '../lib/supabaseClient';
import { PageContainer, PageHeader } from './ui/PageHeader';
import { simulatorInputsFromProject } from '../lib/simulatorSeed';
import { HEALTH_LEVEL_META, healthLabel, healthLevelOf, tierLabel } from '../lib/healthStatus';

interface SimulatorProps {
  language: Language;
  /** 把试算数值带入一份新的草稿项目并跳转到表单 */
  onApplyToForm: (data: Partial<BusinessFormData>) => void;
  /** 用户已有的项目，可一键载入为试算起点 */
  projects?: BusinessFormData[];
  /** 进入页面时自动载入的项目（例如从开业测算点「在沙盒里调整」跳过来） */
  seedProjectId?: string;
}

/** 细分业态判定结果的来源，用于给用户看"这是谁判的" */
interface ProfileVerdict {
  source: 'gemini' | 'rules' | 'saved' | 'manual';
  reason: string;
  /** 规则模式下只命中了兜底口径，提醒用户手动确认 */
  confident: boolean;
}

/** 比例展示：整数原样显示，从项目载入的非整数比例保留 1 位小数 */
const pct = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

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

export const ScoringSimulator: React.FC<SimulatorProps> = ({ language, onApplyToForm, projects = [], seedProjectId }) => {
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
  const [employees, setEmployees] = useState(0);
  const [loadedProjectId, setLoadedProjectId] = useState<string | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 毛利率红线按"细分业态"取值：业态由 AI 根据业务描述判定，也可手动改选
  const [marginProfileId, setMarginProfileId] = useState<string | undefined>(undefined);
  const [profileText, setProfileText] = useState('');
  const [profileVerdict, setProfileVerdict] = useState<ProfileVerdict | null>(null);
  const [classifying, setClassifying] = useState(false);
  const classifySeq = useRef(0);

  /** 让 AI 判断业务属于哪个细分业态；云端不可用时后端会用本地关键词规则兜底，网络断了则在前端兜底 */
  const classifyProfile = async (ind: string, text: string) => {
    const seq = ++classifySeq.current;
    setClassifying(true);
    let verdict: ProfileVerdict & { id: string };
    try {
      const res = await fetch('/api/ai/margin-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ industry: ind, description: text })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.profileId) throw new Error(data?.error || `HTTP ${res.status}`);
      verdict = { id: data.profileId, source: data.source, reason: data.reason, confident: data.confident !== false };
    } catch {
      const local = classifyMarginProfileLocal(ind, text);
      verdict = {
        id: local.profile.id,
        source: 'rules',
        confident: local.specific,
        reason: local.specific
          ? `网络不可用，按关键词「${local.matched.slice(0, 3).join('、')}」判定`
          : '网络不可用，且描述里没有足够线索，暂按通用口径'
      };
    }
    // 用户在等待期间又触发了新的判定 / 改了行业：丢弃这次过期的结果
    if (seq !== classifySeq.current) return;
    setMarginProfileId(verdict.id);
    setProfileVerdict({ source: verdict.source, reason: verdict.reason, confident: verdict.confident });
    setClassifying(false);
  };

  const changeIndustry = (next: string) => {
    classifySeq.current++;
    setClassifying(false);
    setIndustry(next);
    setMarginProfileId(undefined);
    setProfileVerdict(null);
  };

  const loadProject = (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const v = simulatorInputsFromProject(project);
    setCurrency(v.currency);
    setIndustry(v.industry);
    setProfileText(v.profileText);
    if (v.marginProfileId && getMarginProfileById(v.marginProfileId)) {
      classifySeq.current++;
      setClassifying(false);
      setMarginProfileId(v.marginProfileId);
      setProfileVerdict({ source: 'saved', reason: '沿用项目里已保存的细分业态', confident: true });
    } else {
      setMarginProfileId(undefined);
      setProfileVerdict(null);
      void classifyProfile(v.industry, v.profileText);
    }
    setMonthlyRevenue(v.monthlyRevenue);
    setRealRevenueRatio(v.realRevenueRatio);
    setCogsRatio(v.cogsRatio);
    setRent(v.rent);
    setLabor(v.labor);
    setUtilities(v.utilities);
    setOtherOpex(v.otherOpex);
    setTaxes(v.taxes);
    setDebtPayment(v.debtPayment);
    setLiquidCash(v.liquidCash);
    setOperatingMonths(v.operatingMonths);
    setEmployees(v.employees);
    setLoadedProjectId(id);
  };

  useEffect(() => {
    if (seedProjectId) loadProject(seedProjectId);
    // 只在进入页面时按传入的项目载入一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedProjectId]);

  // 金额上限按币种折算（约合 1000 万美元），避免 VND/IDR 这类大面额币种被一个固定上限卡死
  const amountMax = Math.round(10_000_000 * usdRate(currency));
  // 月流水滑块的默认量程：约合 5 万美元；手动输入更大的数时量程跟着放大
  const revenueSliderMax = Math.max(niceCeil(50_000 * usdRate(currency)), niceCeil(monthlyRevenue));
  const revenueSliderStep = Math.max(1, revenueSliderMax / 500);

  const { profile: marginProfile } = resolveMarginProfile(industry, { profileId: marginProfileId, text: profileText });
  const policy = marginProfile.policy;
  const marginProfileOptions = [
    ...marginProfilesForIndustry(industry),
    ...(normalizeMarginIndustry(industry) === 'custom' ? [getMarginProfileById('custom_default')!] : [])
  ];
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
    marginProfileId: marginProfile.id,
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
    operatingMonthsCount: operatingMonths,
    fullTimeEmployeesCount: employees
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
    setEmployees(0);
    setLoadedProjectId(undefined);
    classifySeq.current++;
    setClassifying(false);
    setMarginProfileId(undefined);
    setProfileText('');
    setProfileVerdict(null);
  };

  const gateLabel = (g: GateCheckResult): { label: string; value: string } => {
    switch (g.code) {
      case 'GATE-1':
        return { label: t('真实营业额占比 ≥ 60%', 'Real revenue ratio ≥ 60%'), value: `${pct(realRevenueRatio)}%` };
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

  const level = healthLevelOf(report);
  const scoreColor = HEALTH_LEVEL_META[level].hex;
  // 一句人话结论：没过红线时点名是哪几条；过了就说清每月赚多少、钱能撑多久
  const failedGateLabels = report.gates.filter((g) => g.status !== 'PASS').map((g) => gateLabel(g).label);
  const verdict = !report.gatePassed
    ? t(`没过的红线：${failedGateLabels.join('、')}`, `Failed: ${failedGateLabels.join('; ')}`)
    : t(
        `每月净赚 ${formatMoney(fin.netProfit, currency)}，备用金可撑 ${fin.cashRunwayMonths} 个月`,
        `Nets ${formatMoney(fin.netProfit, currency)} a month; cash lasts ${fin.cashRunwayMonths} months`
      );

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
            {projects.length > 0 && (
              <Select
                className="w-full sm:w-56"
                value={loadedProjectId}
                placeholder={t('从我的项目载入…', 'Load from my project…')}
                onChange={loadProject}
                options={projects.map((p) => ({
                  value: p.id,
                  label: p.projectName?.trim() || t('（未命名项目）', '(untitled)')
                }))}
                aria-label={t('从我的项目载入', 'Load from my project')}
              />
            )}
            <Button icon={<RotateCcw className="w-4 h-4" />} onClick={resetDefaults}>
              {t('清空', 'Clear')}
            </Button>
            <Button type="primary" disabled={!hasInput} onClick={() => setConfirmOpen(true)}>
              {t('用这组数字新建项目', 'Create project from these numbers')}
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
                    onChange={changeIndustry}
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
                  <label className="block mb-1 text-neutral-700" htmlFor="sim-profile-text">
                    {t('生意描述（AI 据此判断细分业态）', 'Describe the business (AI picks the sub-sector)')}
                  </label>
                  <Flex gap={8} wrap>
                    <Input
                      id="sim-profile-text"
                      className="flex-1 min-w-56"
                      value={profileText}
                      maxLength={200}
                      onChange={(e) => setProfileText(e.target.value)}
                      onPressEnter={() => void classifyProfile(industry, profileText)}
                      placeholder={t('例：合作社种水稻玉米，批发给粮站', 'e.g. co-op growing rice and maize for grain depots')}
                    />
                    <Button
                      icon={<Sparkles className="w-4 h-4" />}
                      loading={classifying}
                      disabled={!profileText.trim()}
                      onClick={() => void classifyProfile(industry, profileText)}
                    >
                      {t('AI 判定', 'Classify')}
                    </Button>
                  </Flex>
                </Col>

                <Col span={24}>
                  <label className="block mb-1 text-neutral-700">{t('细分业态（决定毛利率红线）', 'Sub-sector (sets the gross-margin red line)')}</label>
                  <Select
                    className="w-full"
                    value={marginProfile.id}
                    loading={classifying}
                    onChange={(id) => {
                      classifySeq.current++;
                      setClassifying(false);
                      setMarginProfileId(id);
                      setProfileVerdict({ source: 'manual', reason: '已手动选择', confident: true });
                    }}
                    options={marginProfileOptions.map((m) => ({ value: m.id, label: isEn ? m.nameEn : m.nameZh }))}
                    aria-label={t('细分业态', 'Sub-sector')}
                  />
                  <Alert
                    className="mt-2"
                    type={profileVerdict && !profileVerdict.confident ? 'warning' : 'info'}
                    showIcon
                    title={
                      <>
                        {isEn ? describeMarginPolicy(policy, true) : describeMarginPolicy(policy)}
                        {profileVerdict && (
                          <Tag className="ml-2 me-0">
                            {profileVerdict.source === 'gemini'
                              ? t('AI 判定', 'AI')
                              : profileVerdict.source === 'rules'
                                ? t('规则判定', 'Rules')
                                : profileVerdict.source === 'saved'
                                  ? t('项目已保存', 'Saved')
                                  : t('手动选择', 'Manual')}
                          </Tag>
                        )}
                      </>
                    }
                    description={
                      profileVerdict
                        ? profileVerdict.reason
                        : t(
                            '行业红线按细分业态区分；写一句生意描述并点「AI 判定」，或直接手动选择。',
                            'Red lines vary by sub-sector; describe the business and click Classify, or pick one manually.'
                          )
                    }
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
                      {pct(realRevenueRatio)}% · {formatMoney(realRevenue, currency)}
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
                      {pct(cogsRatio)}% · {formatMoney(cogsAmount, currency)}
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
                {amountInput('otherOpex', t('其他固定开销', 'Other overhead'), otherOpex, setOtherOpex)}
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
                <Col xs={24} sm={12}>
                  <label className="block mb-1 text-neutral-700" htmlFor="sim-employees">
                    {t('全职员工数', 'Full-time staff')}
                  </label>
                  <InputNumber
                    id="sim-employees"
                    className="w-full"
                    min={0}
                    max={10000}
                    precision={0}
                    value={employees}
                    onChange={(v) => setEmployees(typeof v === 'number' ? v : 0)}
                    suffix={t('人', 'ppl')}
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
                    <Flex vertical gap={6} className="min-w-0 flex-1">
                      <Typography.Title level={4} style={{ margin: 0, color: HEALTH_LEVEL_META[level].hex }}>
                        {healthLabel(level, language)}
                      </Typography.Title>
                      <Typography.Text>{verdict}</Typography.Text>
                      <Typography.Text type="secondary" className="text-xs">
                        {t('评级', 'Tier')} {tierLabel(report.tier, language)}
                      </Typography.Text>
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
                  '试算与正式报告使用同一套评分引擎。需要完整诊断报告时，点「用这组数字新建项目」继续填写。',
                  'The simulator uses the same scoring engine as the formal report. Click "Create project from these numbers" to continue for the full report.'
                )}
              />
            </Card>
          </div>
        </Col>
      </Row>

      <Modal
        open={confirmOpen}
        title={t('用这组数字新建项目', 'Create a project from these numbers')}
        okText={t('新建项目', 'Create project')}
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
