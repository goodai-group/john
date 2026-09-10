import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Sparkles,
  HelpCircle,
  FileText,
  DollarSign,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  Camera,
  Trash2,
  RefreshCw,
  BarChart3,
  Settings2,
  ChevronDown,
  Wallet,
  TrendingUp,
  SlidersHorizontal,
  Briefcase,
  Building2,
  Landmark,
  Plane,
  Wrench,
  Target,
  AlertOctagon
} from 'lucide-react';
import {
  BusinessFormData,
  BusinessStage,
  CurrencyCode,
  Language,
  MoneyField,
  MonthlyBreakdown,
  ProofType,
  proofTypeLabel,
  ProofExtractedData
} from '../../types';
import { SUPPORTED_CURRENCIES, formatMoney, CUSTOM_CURRENCY_VALUE } from '../../lib/currencies';
import { INDUSTRY_BENCHMARKS } from '../../lib/industryBenchmarks';
import { saveActiveDraft, clearActiveDraft, getActiveDraft } from '../../lib/storage';
import {
  inferBusinessStructureLocally,
  normalizeIndustryKey,
  getIndustryTemplateByKey,
  inferRegulatoryCosts,
  InferredStructure
} from '../../lib/inferBusinessStructure';
import { calculateBreakEvenRevenue } from '../../lib/breakEvenCalculator';
import { calculatePaybackPeriod, calculateRequiredRevenueForTarget } from '../../lib/paybackCalculator';
import { detectFormAnomalies } from '../../lib/anomalyDetection';

/** 行业枚举值集合，用于在 AI 返回值与可选项之间做映射 */
const INDUSTRY_KEYS = INDUSTRY_BENCHMARKS.map((b) => b.id) as string[];
/** 下拉里选中的"自定义行业"占位值 */
export const CUSTOM_INDUSTRY_VALUE = '__CUSTOM__';

/** 调用后端 AI 接口，基于项目/店铺名称推算行业、币种与成本结构 */
async function callInferBusinessStructure(projectName: string): Promise<InferredStructure | null> {
  try {
    const res = await fetch('/api/ai/infer-business-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data as InferredStructure;
  } catch {
    return null;
  }
}

/** 标题旁的说明图标：默认只显示一个"?"，鼠标悬停/点击后才展开解释文字，避免正文里堆砌大段叙事 */
function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-300/80 hover:bg-slate-400 text-white text-[10px] font-black leading-none shrink-0"
        aria-label="说明"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-30 top-5 left-0 w-64 p-2.5 rounded-lg bg-slate-900 text-white text-[12px] leading-relaxed shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  );
}

interface FormProps {
  initialData?: Partial<BusinessFormData>;
  language: Language;
  onSubmit: (formData: BusinessFormData) => void;
  onOpenAiHelper: (topic?: string) => void;
  largeFont: boolean;
}

const DEFAULT_FORM_DATA: BusinessFormData = {
  id: `proj-${Date.now()}`,
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  projectName: '',
  industry: 'food_beverage',
  businessType: '餐饮与熟食',
  businessStage: 'has_revenue',
  initialInvestmentEstimate: { amount: 0, currency: 'USD' },
  targetPaybackMonths: 12,
  anomalyOverrides: {},
  isSensitiveRegion: false,
  regionCountry: '肯尼亚 (Kenya)',
  regionDetail: '',
  contactChannel: '',
  anonymousOwnerName: '',
  baseCurrency: 'USD',
  hasMultipleRates: false,
  customExchangeRateType: '民间/日常兑换参考价',
  customExchangeRateValue: 1.0,
  customExchangeRateSource: '',
  proofType: 'none',
  proofFiles: [],
  monthlyBreakdowns: [
    { month: '2026-01', revenue: { amount: 0, currency: 'USD' } },
    { month: '2026-02', revenue: { amount: 0, currency: 'USD' } },
    { month: '2026-03', revenue: { amount: 0, currency: 'USD' } },
    { month: '2026-04', revenue: { amount: 0, currency: 'USD' } },
    { month: '2026-05', revenue: { amount: 0, currency: 'USD' } },
    { month: '2026-06', revenue: { amount: 0, currency: 'USD' } }
  ],
  monthlyRevenue: { amount: 0, currency: 'USD' },
  monthlyRealOperatingRevenue: { amount: 0, currency: 'USD' },
  monthlyExternalGrants: { amount: 0, currency: 'USD' },
  cogsCost: { amount: 0, currency: 'USD' },
  rentCost: { amount: 0, currency: 'USD' },
  laborCost: { amount: 0, currency: 'USD' },
  utilityCost: { amount: 0, currency: 'USD' },
  taxCost: { amount: 0, currency: 'USD' },
  otherOpex: { amount: 0, currency: 'USD' },
  companyRegistrationCost: { amount: 0, currency: 'USD' },
  companyRegistrationAmortizationMonths: 12,
  visaFeeCost: { amount: 0, currency: 'USD' },
  visaFeeAmortizationMonths: 12,
  equipmentDepreciationCost: { amount: 0, currency: 'USD' },
  existingDebtMonthlyPayment: { amount: 0, currency: 'USD' },
  cashAndLiquidAssets: { amount: 0, currency: 'USD' },
  inventoryValue: { amount: 0, currency: 'USD' },
  operatingMonthsCount: 12,
  fullTimeEmployeesCount: 1,
  ownerEmail: '',
  collaborators: [],
  isSubmitted: false,
  isDraft: true
};

export const AssessmentForm: React.FC<FormProps> = ({
  initialData,
  language,
  onSubmit,
  onOpenAiHelper,
  largeFont
}) => {
  // 初始化时优先恢复本机未提交的草稿：
  // 切换导航 / 从外部链接回跳后组件会重新挂载，只取同一项目 id 的草稿，避免串项目
  const [formData, setFormData] = useState<BusinessFormData>(() => {
    const id = initialData?.id || `proj-${Date.now()}`;
    const base: BusinessFormData = {
      ...DEFAULT_FORM_DATA,
      ...initialData,
      id
    };
    const draft = getActiveDraft(id);
    return draft ? { ...base, ...draft, id } : base;
  });
  // 本次挂载是否恢复了草稿（用于提示"已恢复未提交的填写"）
  const restoredDraftRef = React.useRef(Boolean(initialData?.id && getActiveDraft(initialData.id)));

  // 两步流程：STEP 1 生意叫什么 → STEP 2 你的数字 → 出报告
  const [currentStep, setCurrentStep] = useState(1);
  const [isSimulatingOcr, setIsSimulatingOcr] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [valueWarnings, setValueWarnings] = useState<Record<string, string>>({});
  // 折叠区：STEP 1 高级设置（币种/行业/汇率/安全模式）、STEP 2 更多设置（资金证明/经营时长/员工）
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // —— AI 推算行业/币种/成本结构 相关状态 ——
  const [inferState, setInferState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [customIndustry, setCustomIndustry] = useState(formData.industry === CUSTOM_INDUSTRY_VALUE ? formData.customIndustryName || '' : '');
  const [customCurrencyCode, setCustomCurrencyCode] = useState(
    formData.baseCurrency === CUSTOM_CURRENCY_VALUE ? formData.customCurrencyCode || '' : ''
  );
  // 后端返回的 AI 建议（用于"恢复 AI 建议"按钮）
  const [aiSuggested, setAiSuggested] = useState<{
    cogs: Array<{ label: string; amount: number; suggestedAmount: number }>;
    opex: Array<{ label: string; amount: number; suggestedAmount: number }>;
  } | null>(null);
  // 用户是否手动改过动态项（用于显示"已手动调整"标记）
  const [cogsTouched, setCogsTouched] = useState(false);
  const [opexTouched, setOpexTouched] = useState(false);
  const [revenueTouched, setRevenueTouched] = useState(false);
  const inferTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inferReqId = React.useRef(0);

  // —— 第5点：属地税收/公司注册/签证成本 AI 预估（可核实修改，不直接参与计算）——
  // 注意：优先用项目名（与行业/币种推断同一信号源），不用 regionCountry——
  // regionCountry 只在"敏感地区安全模式"开启时才会展示给用户填写，未开启时它要么是空字符串、
  // 要么（首次进入、尚无任何项目时）取到表单默认值"肯尼亚 (Kenya)"，会让几乎所有新用户
  // 在还没填任何信息前就被误判成肯尼亚，与实际所在国家/所选币种无关。
  const regulatoryEstimate = React.useMemo(
    () => inferRegulatoryCosts(formData.projectName, formData.baseCurrency),
    [formData.projectName, formData.baseCurrency]
  );

  // —— 第3点：根据已填成本自动算出保本收入（每天/每月至少赚多少才不亏钱）——
  const breakEven = React.useMemo(() => calculateBreakEvenRevenue(formData), [
    formData.cogsCost,
    formData.dynamicCogsItems,
    formData.rentCost,
    formData.laborCost,
    formData.utilityCost,
    formData.otherOpex,
    formData.dynamicOpexItems,
    formData.taxCost,
    formData.existingDebtMonthlyPayment,
    formData.companyRegistrationCost,
    formData.companyRegistrationAmortizationMonths,
    formData.visaFeeCost,
    formData.visaFeeAmortizationMonths,
    formData.equipmentDepreciationCost,
    formData.baseCurrency,
    formData.customCurrencyCode,
    formData.hasMultipleRates,
    formData.customExchangeRateValue
  ]);

  // —— 第2点：AI 自动识别用户填错的数值及类目并提醒（本地规则化，仅提醒不阻断）——
  const rawAnomalyWarnings = React.useMemo(() => detectFormAnomalies(formData), [formData]);
  // 第4点"特殊理由"：用户已标注例外说明的提醒仍保留在列表里，但会附带其理由，不再当作待核对项
  const anomalyWarnings = rawAnomalyWarnings.filter((w) => !formData.anomalyOverrides?.[w.field]);
  const overriddenAnomalyWarnings = rawAnomalyWarnings.filter((w) => formData.anomalyOverrides?.[w.field]);

  // —— 第5点：回本时间（收回初始投资所需时间），与盈亏平衡点是两条独立时间线，避免混为一谈 ——
  const payback = React.useMemo(() => calculatePaybackPeriod(formData), [
    formData.monthlyRevenue,
    formData.monthlyRealOperatingRevenue,
    formData.cogsCost,
    formData.dynamicCogsItems,
    formData.rentCost,
    formData.laborCost,
    formData.utilityCost,
    formData.otherOpex,
    formData.dynamicOpexItems,
    formData.taxCost,
    formData.existingDebtMonthlyPayment,
    formData.companyRegistrationCost,
    formData.companyRegistrationAmortizationMonths,
    formData.visaFeeCost,
    formData.visaFeeAmortizationMonths,
    formData.equipmentDepreciationCost,
    formData.initialInvestmentEstimate,
    formData.baseCurrency,
    formData.customCurrencyCode,
    formData.hasMultipleRates,
    formData.customExchangeRateValue
  ]);

  // —— 第6点：按用户设定的目标回本时间反推所需月/日收入 ——
  const reverseTarget = React.useMemo(
    () => calculateRequiredRevenueForTarget(formData, formData.targetPaybackMonths || 12),
    [
      formData.targetPaybackMonths,
      formData.cogsCost,
      formData.dynamicCogsItems,
      formData.rentCost,
      formData.laborCost,
      formData.utilityCost,
      formData.otherOpex,
      formData.dynamicOpexItems,
      formData.taxCost,
      formData.existingDebtMonthlyPayment,
      formData.companyRegistrationCost,
      formData.companyRegistrationAmortizationMonths,
      formData.visaFeeCost,
      formData.visaFeeAmortizationMonths,
      formData.equipmentDepreciationCost,
      formData.initialInvestmentEstimate,
      formData.baseCurrency,
      formData.customCurrencyCode,
      formData.hasMultipleRates,
      formData.customExchangeRateValue
    ]
  );

  const setAnomalyOverride = (field: string, reason: string) => {
    setFormData((prev) => ({
      ...prev,
      anomalyOverrides: { ...(prev.anomalyOverrides || {}), [field]: reason },
      updatedAt: new Date().toISOString()
    }));
  };

  const clearAnomalyOverride = (field: string) => {
    setFormData((prev) => {
      const next = { ...(prev.anomalyOverrides || {}) };
      delete next[field];
      return { ...prev, anomalyOverrides: next, updatedAt: new Date().toISOString() };
    });
  };

  // Auto-save local draft on any change
  useEffect(() => {
    saveActiveDraft(formData);
    if (restoredDraftRef.current) {
      // 本次挂载恢复了草稿：先告诉用户内容还在，避免"我填的怎么还在/怎么变了"的困惑
      restoredDraftRef.current = false;
      setSaveStatus('已恢复上次未提交的填写');
    } else {
      setSaveStatus('草稿已自动暂存至本地');
    }
    const timer = setTimeout(() => setSaveStatus(null), 2500);
    return () => clearTimeout(timer);
  }, [formData]);

  const updateField = <K extends keyof BusinessFormData>(key: K, value: BusinessFormData[K]) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString()
    }));
  };

  // —— 根据推断行业动态调整固定字段标签与提示 ——
  const cogsFieldMeta = React.useMemo(() => {
    switch (formData.industry) {
      case 'food_beverage':
        return {
          label: '食材与饮品原料成本 (COGS)',
          badge: '咖啡/烘焙/餐食原料',
          tip: '咖啡豆、鲜奶、面粉、肉类蔬菜、酱料及一次性环保餐具等直接食材成本（不含房租人工）。'
        };
      case 'medical_health':
        return {
          label: '药品与医用耗材成本 (COGS)',
          badge: '药品与耗材',
          tip: '中西药品、注射器、敷料纱布、消毒用品等直接采购成本（不含房租人工）。'
        };
      case 'retail_store':
        return {
          label: '商品进货与采购成本 (COGS)',
          badge: '进货本钱',
          tip: '向批发商采购的日用百货、食品调料、数码家电等商品成本（含长途运费，不含房租人工）。'
        };
      case 'education_training':
        return {
          label: '教材与教学耗材成本 (COGS)',
          badge: '教学资料',
          tip: '教材讲义、练习册、文具教具、在线平台等直接教学耗材（不含房租人工）。'
        };
      case 'vocational_training':
        return {
          label: '实训原料与工具耗材 (COGS)',
          badge: '材料与工具',
          tip: '实训用的木料、皮革、布料、焊锡零配件、五金耗材等（不含房租人工）。'
        };
      case 'agriculture':
        return {
          label: '种苗肥料与农资成本 (COGS)',
          badge: '农业生产资料',
          tip: '种子种苗、有机肥料、生物农药、保鲜包装等直接农业投入（不含房租人工）。'
        };
      case 'child_care':
        return {
          label: '儿童膳食与教具耗材 (COGS)',
          badge: '餐食与用品',
          tip: '儿童每日营养食材、牛奶、益智教具、绘画文具、卫生纸品等（不含房租人工）。'
        };
      default:
        return {
          label: '原材料与直接采购成本 (COGS)',
          badge: '进货本钱',
          tip: '进货货款、生鲜食材原料等直接买货成本（包含长途运费，不含房租和员工工资）。'
        };
    }
  }, [formData.industry]);

  // —— 动态成本项（COGS / OPEX）辅助函数 ——
  const updateDynamicCogsItem = (id: string, patch: Partial<{ label: string; value: number; isFixed: boolean }>) => {
    setCogsTouched(true);
    setFormData((prev) => ({
      ...prev,
      dynamicCogsItems: (prev.dynamicCogsItems || []).map((it) => (it.id === id ? { ...it, ...patch } : it)),
      updatedAt: new Date().toISOString()
    }));
  };
  const addDynamicCogsItem = () => {
    setCogsTouched(true);
    setFormData((prev) => ({
      ...prev,
      dynamicCogsItems: [
        ...(prev.dynamicCogsItems || []),
        { id: `cogs-${Date.now()}`, label: '新增物料成本项', value: 0, isFixed: false }
      ],
      updatedAt: new Date().toISOString()
    }));
  };
  const removeDynamicCogsItem = (id: string) => {
    setCogsTouched(true);
    setFormData((prev) => ({
      ...prev,
      dynamicCogsItems: (prev.dynamicCogsItems || []).filter((it) => it.id !== id),
      updatedAt: new Date().toISOString()
    }));
  };

  const updateDynamicOpexItem = (id: string, patch: Partial<{ label: string; value: number; isFixed: boolean }>) => {
    setOpexTouched(true);
    setFormData((prev) => ({
      ...prev,
      dynamicOpexItems: (prev.dynamicOpexItems || []).map((it) => (it.id === id ? { ...it, ...patch } : it)),
      updatedAt: new Date().toISOString()
    }));
  };
  const addDynamicOpexItem = () => {
    setOpexTouched(true);
    setFormData((prev) => ({
      ...prev,
      dynamicOpexItems: [
        ...(prev.dynamicOpexItems || []),
        { id: `opex-${Date.now()}`, label: '新增运营开支项', value: 0, isFixed: false }
      ],
      updatedAt: new Date().toISOString()
    }));
  };
  const removeDynamicOpexItem = (id: string) => {
    setOpexTouched(true);
    setFormData((prev) => ({
      ...prev,
      dynamicOpexItems: (prev.dynamicOpexItems || []).filter((it) => it.id !== id),
      updatedAt: new Date().toISOString()
    }));
  };

  // —— 行业自定义 / 币种自定义 处理 ——
  const handleIndustryChange = (value: string) => {
    if (value === CUSTOM_INDUSTRY_VALUE) {
      updateField('industry', CUSTOM_INDUSTRY_VALUE as any);
      // 若用户尚未自填自定义行业，先用项目名预填，降低空框困惑
      const prefill = customIndustry || formData.projectName.trim();
      setCustomIndustry(prefill);
      updateField('customIndustryName', prefill || undefined);
      return;
    }
    updateField('industry', value as BusinessFormData['industry']);
    updateField('customIndustryName', undefined as any);
    setCustomIndustry('');

    // 如果用户手动切换行业且尚无动态成本项，自动填充该行业默认模板
    const hasCogs = (formData.dynamicCogsItems || []).length > 0;
    const hasOpex = (formData.dynamicOpexItems || []).length > 0;
    if (!hasCogs || !hasOpex) {
      const tpl = getIndustryTemplateByKey(value, formData.baseCurrency);
      const rate = SUPPORTED_CURRENCIES.find((c) => c.code === formData.baseCurrency)?.rateToUsd || 1;
      const toLocal = (usd: number) => Math.round(usd * rate);
      const newCogs = (tpl.cogsItems || []).map((it) => ({
        id: `cogs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: it.name || '物料成本项',
        value: Number(it.amount) || 0,
        suggestedAmount: Number(it.amount) || 0,
        isFixed: false
      }));
      const newOpex = (tpl.opexItems || []).map((it) => ({
        id: `opex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: it.name || '运营开支项',
        value: Number(it.amount) || 0,
        suggestedAmount: Number(it.amount) || 0,
        isFixed: false
      }));
      setFormData((prev) => ({
        ...prev,
        dynamicCogsItems: prev.dynamicCogsItems?.length ? prev.dynamicCogsItems : newCogs,
        dynamicOpexItems: prev.dynamicOpexItems?.length ? prev.dynamicOpexItems : newOpex,
        cogsCost: prev.cogsCost?.amount
          ? prev.cogsCost
          : { amount: newCogs.reduce((s, it) => s + it.value, 0), currency: prev.baseCurrency },
        updatedAt: new Date().toISOString()
      }));
      setAiSuggested({
        cogs: newCogs.map((it) => ({ label: it.label, amount: it.value, suggestedAmount: it.suggestedAmount })),
        opex: newOpex.map((it) => ({ label: it.label, amount: it.value, suggestedAmount: it.suggestedAmount }))
      });
    }
  };
  const handleCustomIndustryInput = (value: string) => {
    setCustomIndustry(value);
    updateField('customIndustryName', value || undefined);
  };

  // 主报告币种（Base Currency）字段名 → 各明细项自身的 MoneyField 字段名，
  // 用于用户切换主报告币种时，把已录入的每一条明细（如 COGS/AI咨询 的币种下拉）同步过去，
  // 避免出现「主币种改了，但某条明细的币种下拉还停在此前 AI 推断/模板带出的旧值」的不匹配。
  const MONEY_FIELD_KEYS: Array<keyof BusinessFormData> = [
    'monthlyRevenue',
    'monthlyRealOperatingRevenue',
    'monthlyExternalGrants',
    'cogsCost',
    'rentCost',
    'laborCost',
    'utilityCost',
    'taxCost',
    'otherOpex',
    'companyRegistrationCost',
    'visaFeeCost',
    'equipmentDepreciationCost',
    'existingDebtMonthlyPayment',
    'cashAndLiquidAssets',
    'initialInvestmentEstimate',
    'inventoryValue'
  ];

  const syncMoneyFieldsToCurrency = (prev: BusinessFormData, newCurrency: CurrencyCode): Partial<BusinessFormData> => {
    const patch: Partial<BusinessFormData> = {};
    MONEY_FIELD_KEYS.forEach((key) => {
      const field = prev[key] as unknown as MoneyField | undefined;
      if (field) {
        (patch as Record<string, unknown>)[key] = { ...field, currency: newCurrency };
      }
    });
    if (prev.monthlyBreakdowns?.length) {
      patch.monthlyBreakdowns = prev.monthlyBreakdowns.map((mb) => ({
        ...mb,
        revenue: { ...mb.revenue, currency: newCurrency }
      }));
    }
    return patch;
  };

  const handleCurrencyChange = (value: string) => {
    if (value === CUSTOM_CURRENCY_VALUE) {
      updateField('baseCurrency', CUSTOM_CURRENCY_VALUE as any);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      ...syncMoneyFieldsToCurrency(prev, value as CurrencyCode),
      baseCurrency: value as CurrencyCode,
      customCurrencyCode: undefined,
      updatedAt: new Date().toISOString()
    }));
    setCustomCurrencyCode('');
  };
  const handleCustomCurrencyInput = (value: string) => {
    const code = value.trim().toUpperCase().slice(0, 3);
    setCustomCurrencyCode(code);
    updateField('customCurrencyCode', code);
  };

  // —— AI 推算：根据项目/店铺名称推断行业、币种与成本结构 ——
  const applyInferResult = (result: InferredStructure) => {
    const patch: Partial<BusinessFormData> = { updatedAt: new Date().toISOString() };

    // 行业：优先使用后端 inferredIndustryKey，兼容 industry 别名；命中枚举则使用枚举，否则归为自定义行业
    // 注意：后端兜底规则对未匹配项返回 'custom'，应视为未命中枚举，改用 customIndustryName（即用户所填项目名）
    const rawIndustryKey = normalizeIndustryKey(result.inferredIndustryKey || result.industry || '');
    const rawIndustry =
      rawIndustryKey && rawIndustryKey !== 'custom' ? rawIndustryKey : (result.customIndustryName || '');
    const matchedIndustry = rawIndustry && INDUSTRY_KEYS.includes(rawIndustry) ? rawIndustry : null;
    if (matchedIndustry) {
      patch.industry = matchedIndustry as BusinessFormData['industry'];
      patch.customIndustryName = undefined as any;
      setCustomIndustry('');
    } else if (rawIndustry) {
      patch.industry = CUSTOM_INDUSTRY_VALUE as any;
      patch.customIndustryName = rawIndustry;
      setCustomIndustry(rawIndustry);
    }

    // 币种：优先 suggestedCurrency，兼容 baseCurrency 别名
    const rawCurrency = (result.suggestedCurrency || result.baseCurrency || '').trim();
    const knownCurrency = SUPPORTED_CURRENCIES.find(
      (c) => !c.isCustomOption && c.code.toUpperCase() === rawCurrency.toUpperCase()
    );
    if (knownCurrency) {
      patch.baseCurrency = knownCurrency.code as CurrencyCode;
      patch.customCurrencyCode = undefined as any;
      setCustomCurrencyCode('');
    } else if (rawCurrency) {
      const code = rawCurrency.toUpperCase().slice(0, 3);
      patch.baseCurrency = CUSTOM_CURRENCY_VALUE as any;
      patch.customCurrencyCode = code;
      setCustomCurrencyCode(code);
    }

    // 动态成本项：后端返回 cogsItems/opexItems（含 name + 已按币种换算的行业估值金额），
    // 直接填入明细与总额（用户可改）。仅当用户已手动调整过成本项（cogsTouched）时
    // 保留用户数据、不做覆盖，避免 AI 重推时破坏真实经营数据。
    const rawCogs = (result.cogsItems || []).filter((it) => it.name);
    const rawOpex = (result.opexItems || []).filter((it) => it.name);
    const finalCogs = rawCogs.length
      ? rawCogs.map((it) => ({ label: it.name!, amount: Number(it.amount) || 0, suggestedAmount: Number(it.amount) || 0 }))
      : (result.suggestedCogs || []).map((label) => ({ label, amount: 0, suggestedAmount: 0 }));
    const finalOpex = rawOpex.length
      ? rawOpex.map((it) => ({ label: it.name!, amount: Number(it.amount) || 0, suggestedAmount: Number(it.amount) || 0 }))
      : (result.suggestedOpex || []).map((label) => ({ label, amount: 0, suggestedAmount: 0 }));

    const cogsItems = finalCogs.map((it) => ({
      id: `cogs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: it.label,
      value: it.amount,
      suggestedAmount: it.suggestedAmount,
      isFixed: false
    }));
    const opexItems = finalOpex.map((it) => ({
      id: `opex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: it.label,
      value: it.amount,
      suggestedAmount: it.suggestedAmount,
      isFixed: false
    }));

    // —— 用 AI 估算同步营收与进货总额，清除旧草稿残留值 ——
    // 明细项完全脱节，导致进货占比算出 100% 或畸形比例。
    // 仅当用户尚未手动改过对应字段时才覆盖（避免覆盖用户真实数据）。
    const aiRev = Number(result.estimatedMonthlyRevenue) || 0;
    const aiCogs = (result.cogsItems || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
    // 金额币种：优先用本次推断出的币种，否则沿用表单当前币种（不再写死 USD）
    const inferCurrency = (patch.baseCurrency as any) || formData.baseCurrency || 'USD';

    // 成本：明细 + 总额一起写入（动态模式下评分以明细合计为准，不会重复计算）
    setAiSuggested({ cogs: finalCogs, opex: finalOpex });
    if (!cogsTouched) {
      patch.dynamicCogsItems = cogsItems;
      patch.cogsCost = { amount: aiCogs, currency: inferCurrency };
    }
    if (!opexTouched) {
      patch.dynamicOpexItems = opexItems;
    }
    // 收入：总流水与真实主营收入同步为 AI 行业估值（用户可改）
    if (aiRev > 0 && !revenueTouched) {
      patch.monthlyRevenue = { amount: aiRev, currency: inferCurrency };
      patch.monthlyRealOperatingRevenue = {
        amount: Math.max(0, aiRev - (formData.monthlyExternalGrants?.amount || 0)),
        currency: inferCurrency
      };
    }

    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const handleProjectNameChange = (value: string) => {
    updateField('projectName', value);
    if (value.trim()) setNameError(null);
    if (inferTimer.current) clearTimeout(inferTimer.current);
    const name = value.trim();
    if (name.length < 2) {
      setInferState('idle');
      return;
    }
    setInferState('loading');
    inferTimer.current = setTimeout(async () => {
      const reqId = ++inferReqId.current;
      let result = await callInferBusinessStructure(name);
      // 后端失败或返回空时，使用前端本地规则引擎兜底，避免"无法自动推算"
      const isEmpty =
        !result ||
        (!result.inferredIndustryKey &&
          !result.suggestedCurrency &&
          !result.opexItems?.length &&
          !result.cogsItems?.length);
      if (isEmpty) {
        result = inferBusinessStructureLocally(name, formData.baseCurrency);
      }
      if (reqId !== inferReqId.current) return; // 丢弃过期请求
      applyInferResult(result);
      setInferState('done');
    }, 1200);
  };

  /** 将动态成本项恢复为 AI 上次建议的结构（含预估金额） */
  const restoreAiSuggestion = () => {
    if (!aiSuggested) return;
    const ok = window.confirm(
      '恢复 AI 建议会把明细金额填回 AI 的估值（仅供参考，不代表你的真实成本）。\n\n建议：把数字改回你的实际值，避免数据失真。\n\n确认要恢复吗？'
    );
    if (!ok) return;
    const cogsItems = aiSuggested.cogs.map((it) => ({
      id: `cogs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: it.label,
      value: it.amount,
      suggestedAmount: it.suggestedAmount,
      isFixed: false
    }));
    const opexItems = aiSuggested.opex.map((it) => ({
      id: `opex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: it.label,
      value: it.amount,
      suggestedAmount: it.suggestedAmount,
      isFixed: false
    }));
    setFormData((prev) => ({ ...prev, dynamicCogsItems: cogsItems, dynamicOpexItems: opexItems, updatedAt: new Date().toISOString() }));
    setCogsTouched(false);
    setOpexTouched(false);
  };

  const updateMoney = (
    fieldKey:
      | 'monthlyRevenue'
      | 'monthlyRealOperatingRevenue'
      | 'monthlyExternalGrants'
      | 'cogsCost'
      | 'rentCost'
      | 'laborCost'
      | 'utilityCost'
      | 'taxCost'
      | 'otherOpex'
      | 'companyRegistrationCost'
      | 'visaFeeCost'
      | 'equipmentDepreciationCost'
      | 'existingDebtMonthlyPayment'
      | 'cashAndLiquidAssets'
      | 'initialInvestmentEstimate'
      | 'inventoryValue',
    amount: number,
    currency?: CurrencyCode
  ) => {
    if (fieldKey === 'monthlyRevenue') setRevenueTouched(true);

    let warning = '';
    if (amount < 0) {
      warning = language === 'en' ? 'Amount cannot be negative' : '金额不可为负';
    } else if (amount > 1e9) {
      warning = language === 'en' ? 'Value exceeds maximum limit (1,000,000,000)' : '数值超出 10 亿上限，请检查单位';
    }

    setValueWarnings((prev) => ({
      ...prev,
      [fieldKey]: warning
    }));

    setFormData((prev) => {
      const sanitized = Math.min(1e9, Math.max(0, isNaN(amount) ? 0 : amount));
      const patch: Record<string, unknown> = {
        [fieldKey]: {
          amount: sanitized,
          currency: currency || prev[fieldKey].currency || prev.baseCurrency,
          lastEditedBy: prev.ownerEmail,
          lastEditedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
      // 关键同步：总流水 ≈ 真实经营收入 + 外部赠款。
      // 若不同步，晴雨表"收支构成"（按总流水）与"健康分"（按真实经营收入）会使用不同收入，
      // 导致用户改流水后出现"显示亏损但健康分仍及格"的矛盾结果。
      if (fieldKey === 'monthlyRevenue') {
        patch.monthlyRealOperatingRevenue = {
          ...prev.monthlyRealOperatingRevenue,
          amount: Math.max(0, sanitized - (prev.monthlyExternalGrants?.amount || 0)),
          lastEditedBy: prev.ownerEmail,
          lastEditedAt: new Date().toISOString()
        };
      }
      return { ...prev, ...patch };
    });
  };

  const updateMonthlyBreakdown = (index: number, amount: number) => {
    // 修复：改为纯函数式更新，不再对 formData.monthlyBreakdowns[index] 原地修改——
    // 原实现虽然 slice 出了新数组，但数组里的元素对象引用未变，直接改写其字段属于
    // 隐式 mutation，与文件内其他 handler 统一的不可变更新模式不一致，存在更新丢失风险。
    setFormData((prev) => {
      if (!prev.monthlyBreakdowns[index]) return prev;
      const updated = prev.monthlyBreakdowns.map((b, i) =>
        i === index
          ? {
              ...b,
              revenue: { ...b.revenue, amount: Math.max(0, isNaN(amount) ? 0 : amount) },
              isEstimated: false // 用户手动编辑后解除估算标识
            }
          : b
      );
      return { ...prev, monthlyBreakdowns: updated };
    });
  };

  // AI Broken stream auto fill
  const handleInterpolateMissingMonths = () => {
    setIsSimulatingOcr(true);
    setTimeout(() => {
      const arr = formData.monthlyBreakdowns;
      // 修复：缺失月份改为参照"最近的真实（非估算）数据"插值，而不是简单取相邻月份的值——
      // 原实现在两个及以上连续月份缺失时，会让这些缺失月份互相以 0 求平均，
      // 导致估算结果被严重拉低（如 [1000,0,0,1000] 会把中间两月都估成 500 而非接近 1000）。
      const findNearestKnown = (fromIdx: number, step: 1 | -1): number | null => {
        for (let i = fromIdx; i >= 0 && i < arr.length; i += step) {
          if (arr[i].revenue.amount > 0) return arr[i].revenue.amount;
        }
        return null;
      };
      const updated = arr.map((b, idx) => {
        if (b.revenue.amount > 0) return b;
        const prevKnown = findNearestKnown(idx - 1, -1);
        const nextKnown = findNearestKnown(idx + 1, 1);
        const avg =
          prevKnown !== null && nextKnown !== null
            ? Math.round((prevKnown + nextKnown) / 2)
            : Math.round(prevKnown ?? nextKnown ?? 3500);
        return {
          ...b,
          revenue: { amount: avg, currency: formData.baseCurrency },
          isEstimated: true,
          note: 'AI识别流水缺口，按最近的真实月份数据自动估算'
        };
      });
      setFormData((prev) => ({ ...prev, monthlyBreakdowns: updated }));
      setIsSimulatingOcr(false);
    }, 800);
  };

  // 支持一次选择多个文件、多种格式上传；每个文件独立进入"AI 识别中" → 识别完成并落成结构化数据
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const uploadTime = new Date().toISOString();
    const newProofs = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      uploadTime,
      retainedAfterOcr: !formData.isSensitiveRegion, // 敏感地区下 OCR 后不留原图
      status: 'processing' as const
    }));
    setFormData((prev) => ({
      ...prev,
      proofFiles: [...prev.proofFiles, ...newProofs]
    }));
    e.target.value = '';

    // 模拟 AI 逐个识别凭证并转成结构化数据（各文件独立完成，互不阻塞）
    newProofs.forEach((proof, idx) => {
      setTimeout(() => {
        const seed = proof.size + proof.name.length;
        const extractedData: ProofExtractedData = {
          detectedAmount: Math.round((seed % 4000) + 800),
          currency: formData.baseCurrency,
          transactionCount: Math.max(3, seed % 40),
          periodLabel: '本次凭证覆盖周期（AI 自动提取）',
          note: 'AI 已从凭证中识别出以下结构化数据，可核对后手动修改上方金额'
        };
        setFormData((prev) => ({
          ...prev,
          proofFiles: prev.proofFiles.map((f) =>
            f.id === proof.id ? { ...f, status: 'done', extractedData } : f
          )
        }));
      }, 700 + idx * 300);
    });
  };

  const handleFinalSubmit = () => {
    const hasRevenue = (formData.monthlyRevenue.amount || 0) > 0 || (formData.monthlyRealOperatingRevenue.amount || 0) > 0;
    const hasCogs = (formData.cogsCost.amount || 0) > 0 || (formData.dynamicCogsItems || []).some((i) => i.value > 0);
    const hasOpex = (formData.rentCost.amount || 0) > 0 || (formData.laborCost.amount || 0) > 0 || (formData.dynamicOpexItems || []).some((i) => i.value > 0);
    const hasCash = (formData.cashAndLiquidAssets.amount || 0) > 0;

    if (!hasRevenue && !hasCogs && !hasOpex && !hasCash) {
      setSubmitError(
        language === 'en'
          ? 'Please enter at least monthly revenue, expenses, or liquid cash before generating the report.'
          : '请至少填写经营月均总流水、任意开支或现金备用金，以便系统生成有效体检诊断。'
      );
      return;
    }
    setSubmitError(null);

    const finalized: BusinessFormData = {
      ...formData,
      isSubmitted: true,
      isDraft: false,
      submittedAt: new Date().toISOString()
    };
    clearActiveDraft(finalized.id);
    onSubmit(finalized);
  };

  // —— 两步流程定义 ——
  const stepsList = [
    { num: 1, title: '生意叫什么？' },
    { num: 2, title: '赚多少、花多少、兜里有多少现金' }
  ];

  // —— 断点流水按需出现：仅当月度数据存在缺口（中间某月为 0 且前后有值）时显示 ——
  const monthlyAmounts = formData.monthlyBreakdowns.map((b) => b.revenue.amount);
  const hasMonthlyData = monthlyAmounts.some((a) => a > 0);
  const hasGap = monthlyAmounts.some(
    (a, i) => a === 0 && i > 0 && i < monthlyAmounts.length - 1 && (monthlyAmounts[i - 1] > 0 || monthlyAmounts[i + 1] > 0)
  );
  const showGapSection = hasMonthlyData && hasGap;

  // —— AI 推断结果摘要（行业/币种）——
  const industryLabel =
    INDUSTRY_BENCHMARKS.find((b) => b.id === formData.industry)?.nameZh ||
    (formData.industry === CUSTOM_INDUSTRY_VALUE ? formData.customIndustryName : formData.industry) ||
    '未识别';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* 1. Slim Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs sm:text-sm text-neutral-500 font-medium max-w-2xl">
            {language === 'en'
              ? 'Enter your name and numbers — AI infers the rest. Two steps to a full health report.'
              : '只要两步：先告诉生意叫什么，再填上赚多少、花多少。AI 自动补齐行业、币种与成本结构，30 秒出报告。'}
          </p>

          <div className="flex items-center gap-3">
            {saveStatus && (
              <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{saveStatus}</span>
              </span>
            )}
          </div>
        </div>

        {/* Step Indicator（两步） */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-100">
          {stepsList.map((s) => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                currentStep === s.num
                  ? 'bg-neutral-900 border-neutral-800 text-white shadow-md'
                  : 'bg-neutral-50 border-neutral-200/80 text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              <div className="text-[12px] font-mono font-bold uppercase tracking-wider opacity-80 mb-0.5">
                STEP 0{s.num}
              </div>
              <div className="text-xs font-bold truncate">{s.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: 生意叫什么？ */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="text-center space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <span>1. 生意叫什么？</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                只填名字。行业、币种、成本结构，AI 都会自动替你推断，也可以随时在下方「高级设置」里改。
              </p>
            </div>

            {/* 唯一主输入：项目名称 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {language === 'en' ? 'Project / Business Name' : '项目 / 店铺名称'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder={language === 'en' ? 'e.g. Sunshine Bakery Cafe' : '例如：阳光工坊社区烘焙店'}
                value={formData.projectName}
                onChange={(e) => handleProjectNameChange(e.target.value)}
                className={`w-full p-4 border-2 rounded-2xl text-base font-bold text-slate-900 shadow-2xs focus:ring-1 focus:ring-teal-500 ${
                  nameError ? 'border-rose-400 focus:border-rose-600' : 'border-teal-200 focus:border-teal-600'
                }`}
              />
              {nameError && (
                <p className="text-xs text-rose-600 font-bold mt-1.5 animate-in fade-in">
                  ⚠️ {nameError}
                </p>
              )}
              <div className="mt-2 text-[13px] space-y-1">
                {inferState === 'loading' && (
                  <span className="text-teal-500 font-semibold animate-pulse">AI 正在推算行业、币种与成本结构…</span>
                )}
                {inferState === 'done' && (
                  <span className="text-emerald-600 font-semibold">✓ AI 已自动预填，可修改或点「恢复 AI 建议」</span>
                )}
                {inferState === 'error' && (
                  <span className="text-amber-600 font-semibold">
                    网络或后端暂时不可用，请检查连接或手动选择行业。
                    <button
                      type="button"
                      onClick={() => formData.projectName.trim().length >= 2 && handleProjectNameChange(formData.projectName)}
                      className="ml-1 underline font-bold hover:text-amber-700 cursor-pointer"
                    >
                      重新推算
                    </button>
                  </span>
                )}
              </div>
            </div>

            {/* 所处阶段：决定后面是「填真实数字体检」还是「先估算未来」 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                <span>目前所处阶段</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { value: 'not_started', label: '尚未启动', desc: '还没开业，先估算成本和要赚多少' },
                    { value: 'has_prototype', label: '已有原型', desc: '小范围试过，还没稳定营收' },
                    { value: 'has_revenue', label: '已有营收', desc: '正在经营，想体检真实数字' }
                  ] as { value: BusinessStage; label: string; desc: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('businessStage', opt.value)}
                    className={`text-left p-3 rounded-xl border-2 transition-colors cursor-pointer ${
                      formData.businessStage === opt.value
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-slate-200 bg-white hover:border-teal-300'
                    }`}
                  >
                    <span className="block text-xs font-black text-slate-900">{opt.label}</span>
                    <span className="block text-[12px] text-slate-500 mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
              {formData.businessStage !== 'has_revenue' && (
                <p className="text-[12px] text-amber-700 font-medium mt-1.5">
                  你还没有真实营收，下一步的数字都当作「预估/假设」来填即可，系统会明确标注这是假设。
                </p>
              )}
            </div>

            {/* AI 推断结果摘要 */}
            {inferState === 'done' && formData.projectName.trim().length >= 2 && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>AI 已根据「{formData.projectName.trim()}」完成自动配置</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-900">
                  <div className="p-2.5 rounded-xl bg-white/70 border border-emerald-100">
                    <span className="text-emerald-600 block font-bold text-[12px] uppercase tracking-wider mb-0.5">所属行业</span>
                    <span className="font-bold">{industryLabel}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 border border-emerald-100">
                    <span className="text-emerald-600 block font-bold text-[12px] uppercase tracking-wider mb-0.5">主报告币种</span>
                    <span className="font-bold">{formData.baseCurrency}</span>
                  </div>
                </div>
                <p className="text-[13px] text-emerald-700">
                  成本结构与预估流水也已预填，下一步可直接修改成你的真实数字。
                </p>
              </div>
            )}

            {/* 高级设置：把复杂藏在小箭头后面 */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50/80 hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-teal-600" />
                  高级设置（币种 / 行业 / 汇率 / 安全模式）
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {showAdvanced && (
                <div className="p-4 sm:p-5 space-y-6 text-xs bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        所属行业类型 <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.industry}
                        onChange={(e) => handleIndustryChange(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-800 bg-white"
                      >
                        {INDUSTRY_BENCHMARKS.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nameZh}
                          </option>
                        ))}
                        <option value={CUSTOM_INDUSTRY_VALUE}>其他行业（自定义输入）</option>
                      </select>
                      {formData.industry === CUSTOM_INDUSTRY_VALUE && (
                        <input
                          type="text"
                          placeholder="请输入所属行业领域"
                          value={customIndustry}
                          onChange={(e) => handleCustomIndustryInput(e.target.value)}
                          className="mt-2 w-full p-2.5 border-2 border-teal-300 rounded-xl font-medium text-slate-800"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        主报告币种 (Base Currency) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.baseCurrency}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 bg-white"
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.nameZh} - {c.symbol}
                          </option>
                        ))}
                      </select>
                      {formData.baseCurrency === CUSTOM_CURRENCY_VALUE && (
                        <input
                          type="text"
                          placeholder="请输入 3 字母币种代码，例如：SLE / MVR / PGK"
                          value={customCurrencyCode}
                          onChange={(e) => handleCustomCurrencyInput(e.target.value)}
                          className="mt-2 w-full p-2.5 border-2 border-teal-300 rounded-xl font-bold text-slate-800"
                        />
                      )}
                      <p className="text-[13px] text-slate-400 mt-1">
                        后续所有其他币种金额将自动依据汇率折算为该主币种。
                      </p>
                    </div>
                  </div>

                  {/* 多重汇率标注 */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasMultipleRates}
                        onChange={(e) => updateField('hasMultipleRates', e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>本国存在多重汇率（官方汇率与民间/实际兑换汇率差距悬殊）</span>
                    </label>

                    {formData.hasMultipleRates && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">
                            实际兑换汇率数值 (1 USD ≈ 多少当地货币)
                          </label>
                          <input
                            type="number"
                            placeholder=""
                            value={formData.customExchangeRateValue || ''}
                            onChange={(e) =>
                              updateField('customExchangeRateValue', Number(e.target.value))
                            }
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">汇率类型与来源说明</label>
                          <input
                            type="text"
                            placeholder="例如：当地商会日常兑换价 / 街区现金汇兑价"
                            value={formData.customExchangeRateType || ''}
                            onChange={(e) => updateField('customExchangeRateType', e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 敏感地区数据安全模式开关 (P0) */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      formData.isSensitiveRegion
                        ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ShieldAlert
                            className={`w-4 h-4 ${formData.isSensitiveRegion ? 'text-amber-600' : 'text-slate-400'}`}
                          />
                          <span className="font-bold text-slate-900 text-xs">
                            敏感地区数据安全模式 (Sensitive Safe Mode)
                          </span>
                          <span className="text-[12px] bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                            P0 核心保障
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-600 leading-relaxed">
                          适合身处外部信息披露敏感、监管严苛地区的用户。开启后自动触发：地理信息脱敏、原始凭证全选填、OCR 后原图不保留、报告加注数据最小化说明——绝不影响得分。
                        </p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={formData.isSensitiveRegion}
                          onChange={(e) => updateField('isSensitiveRegion', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    {formData.isSensitiveRegion && (
                      <div className="mt-4 pt-3 border-t border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-amber-900 font-bold mb-1">
                            所在国家 / 宏观大区（不要求具体城市）
                          </label>
                          <input
                            type="text"
                            placeholder="例如：北非/中东大区 或 东南亚地区"
                            value={formData.regionCountry}
                            onChange={(e) => updateField('regionCountry', e.target.value)}
                            className="w-full p-2 border border-amber-300 rounded-lg bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-amber-900 font-bold mb-1">
                            联系渠道（允许填写匿名代号或内部ID）
                          </label>
                          <input
                            type="text"
                            placeholder="例如：Telegram: @coop_rep_09"
                            value={formData.contactChannel}
                            onChange={(e) => updateField('contactChannel', e.target.value)}
                            className="w-full p-2 border border-amber-300 rounded-lg bg-white font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end flex-col items-end gap-2">
            <button
              onClick={() => {
                if (!formData.projectName.trim()) {
                  setNameError(
                    language === 'en'
                      ? 'Please enter project / business name'
                      : '请输入项目/店铺名称'
                  );
                  return;
                }
                setNameError(null);
                setCurrentStep(2);
              }}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <span>{language === 'en' ? 'Next: Revenue & Expenses' : '下一步：赚多少、花多少'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: 赚多少、花多少、兜里有多少现金（一屏看完） */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-teal-600" />
                <span>2. 赚多少、花多少、兜里有多少现金</span>
              </h3>
              <p className="text-xs text-slate-500">
                左边是收入，右边是成本与现金。填完直接点「出报告」。
              </p>
            </div>

            {/* 两栏：收入 | 成本+现金 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* —— 左栏：赚多少（收入）—— */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  赚多少（每月收入）
                </h4>

                {/* 第3点：根据右边已填成本自动算出的保本收入，帮助没经验的用户先有参照锚点再填收入 */}
                {breakEven.hasEnoughData && (
                  <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-300 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-600" />
                      <span className="font-black text-amber-950">AI 算出的保本收入（不亏钱的最低线）</span>
                      <InfoTooltip
                        text={`根据你右边已填的进货、房租人工、税金、还贷与注册/签证/折旧成本合计 ${formatMoney(breakEven.monthlyCostTotal, formData.baseCurrency)} / 月，按每月经营 ${breakEven.operatingDaysPerMonth} 天估算得出。仅供填收入前参考，不代表最终评分结果。`}
                      />
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      你每天至少要卖到
                      <span className="text-base font-black text-amber-900 mx-1">
                        {formatMoney(breakEven.dailyBreakEvenRevenue, formData.baseCurrency)}
                      </span>
                      （每月至少 {formatMoney(breakEven.monthlyBreakEvenRevenue, formData.baseCurrency)}）才不亏钱。
                    </p>
                  </div>
                )}

                {/* F8 经营月均总流水 */}
                <div className="p-4 rounded-2xl bg-teal-50/40 border-2 border-teal-200 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <label className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                        <span>经营月均总流水</span>
                        <span className="text-[12px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded-full">
                          总营业额
                        </span>
                        <InfoTooltip text="大白话：客人买单进你口袋的全部毛钱，尚未扣除进货、房租与人工！若有教会补助、慈善捐赠或救济资金，请在下方单独列出，不会被误计入真实经营占比。" />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenAiHelper?.('经营月均总流水是收入还是什么？')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-800 text-[13px] font-bold transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-teal-600" />
                        <span>AI解答</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAiHelper?.('各行业大数据平均流水与利润基准是多少？')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[13px] font-bold transition-colors cursor-pointer"
                      >
                        <BarChart3 className="w-3 h-3 text-emerald-700" />
                        <span>查基准</span>
                      </button>
                      <select
                        value={formData.monthlyRevenue.currency}
                        onChange={(e) =>
                          updateMoney(
                            'monthlyRevenue',
                            formData.monthlyRevenue.amount,
                            e.target.value as CurrencyCode
                          )
                        }
                        className="px-2 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-700 text-xs shadow-2xs"
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="例如 50000"
                    value={formData.monthlyRevenue.amount || ''}
                    onChange={(e) => updateMoney('monthlyRevenue', Number(e.target.value))}
                    className="w-full p-3 border-2 border-teal-200 focus:border-teal-600 rounded-xl font-black text-slate-900 text-base bg-white shadow-2xs"
                  />
                  {formData.monthlyRevenue.amount > 0 && (
                    <p className="text-[13px] text-teal-700 font-semibold">
                      真实经营收入已自动同步为 {formatMoney(formData.monthlyRealOperatingRevenue.amount, formData.monthlyRealOperatingRevenue.currency)}（总流水 − 外部赠款）
                    </p>
                  )}
                </div>

                {/* 真实客户主营销售收入 */}
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <span>其中：真实客户主营销售收入</span>
                        <InfoTooltip text="排除任何亲友借款、救济补贴后，真正由客户买单带来的生意收入。" />
                      </label>
                    </div>
                    <select
                      value={formData.monthlyRealOperatingRevenue.currency}
                      onChange={(e) =>
                        updateMoney(
                          'monthlyRealOperatingRevenue',
                          formData.monthlyRealOperatingRevenue.amount,
                          e.target.value as CurrencyCode
                        )
                      }
                      className="px-2 py-1 rounded border border-emerald-300 font-bold bg-white text-emerald-900"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={formData.monthlyRealOperatingRevenue.amount || ''}
                    onChange={(e) =>
                      updateMoney('monthlyRealOperatingRevenue', Number(e.target.value))
                    }
                    className="w-full p-2.5 border border-emerald-300 rounded-xl font-bold text-emerald-950 bg-white"
                  />
                </div>

                {/* 外部支持款 / 机构赠款 */}
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-bold text-amber-950">
                        其中：外部支持款 / 机构赠款
                      </label>
                      <p className="text-[13px] text-amber-700">
                        若有教会补助、慈善捐赠或救济资金，请在此单独列出，不会被误计入真实经营占比。
                      </p>
                    </div>
                    <select
                      value={formData.monthlyExternalGrants.currency}
                      onChange={(e) =>
                        updateMoney(
                          'monthlyExternalGrants',
                          formData.monthlyExternalGrants.amount,
                          e.target.value as CurrencyCode
                        )
                      }
                      className="px-2 py-1 rounded border border-amber-300 font-bold bg-white text-amber-900"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="无则填 0"
                    value={formData.monthlyExternalGrants.amount || ''}
                    onChange={(e) => updateMoney('monthlyExternalGrants', Number(e.target.value))}
                    className="w-full p-2.5 border border-amber-300 rounded-xl font-bold text-amber-950 bg-white"
                  />
                </div>
              </div>

              {/* —— 右栏：花多少 + 兜里有多少现金 —— */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-600" />
                  花多少 + 兜里有多少现金
                </h4>

                {/* F10 COGS */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="font-bold text-slate-900">
                          {cogsFieldMeta.label}
                        </label>
                        <span className="text-[12px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                          {cogsFieldMeta.badge}
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-500">
                        {cogsFieldMeta.tip}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenAiHelper?.('进货成本（COGS）怎么算？包含运费吗？')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-[13px] font-bold transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-teal-600" />
                        <span>AI咨询</span>
                      </button>
                      <select
                        value={formData.cogsCost.currency}
                        onChange={(e) =>
                          updateMoney('cogsCost', formData.cogsCost.amount, e.target.value as CurrencyCode)
                        }
                        className="px-2 py-1 rounded border border-slate-300 font-bold bg-white text-slate-700"
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="例如 20000"
                    value={formData.cogsCost.amount || ''}
                    onChange={(e) => updateMoney('cogsCost', Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white"
                  />

                  {/* AI 推断的动态物料成本明细 */}
                  {(formData.dynamicCogsItems || []).length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-50/50 border border-dashed border-rose-300 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[13px] font-black text-rose-900">
                          按行业细分的物料成本明细（可增删改）
                          {cogsTouched && (
                            <span className="ml-1.5 inline-block text-[11px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold align-middle">已手动调整</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={restoreAiSuggestion}
                          className="text-[12px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold hover:bg-rose-200 cursor-pointer"
                        >
                          <RefreshCw className="inline w-3 h-3 mr-0.5" />恢复 AI 建议
                        </button>
                      </div>
                      <span className="text-[12px] text-rose-700">明细合计即物料总成本，使用细分项时上方总额框可留空</span>
                      {(formData.dynamicCogsItems || []).map((it) => (
                        <div key={it.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={it.label}
                            onChange={(e) => updateDynamicCogsItem(it.id, { label: e.target.value })}
                            className="flex-1 min-w-0 p-1.5 border border-rose-200 rounded-lg font-semibold text-slate-800"
                          />
                          <input
                            type="number"
                            value={it.value || ''}
                            onChange={(e) => updateDynamicCogsItem(it.id, { value: Number(e.target.value) })}
                            className="w-24 shrink-0 p-1.5 border border-rose-200 rounded-lg font-mono font-semibold text-right"
                            placeholder={it.suggestedAmount ? `AI建议 ${it.suggestedAmount}` : '金额'}
                            title={it.suggestedAmount ? `AI 建议参考金额：${it.suggestedAmount}（仅供参考，请填你的真实数字）` : '请填你的真实月度金额'}
                          />
                          <span className="text-[12px] text-rose-700 whitespace-nowrap shrink-0 pl-0.5">{formData.baseCurrency}/月</span>
                          <button type="button" onClick={() => removeDynamicCogsItem(it.id)} className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={addDynamicCogsItem} className="text-[12px] px-2 py-1 rounded border border-rose-300 text-rose-700 font-bold hover:bg-rose-100 cursor-pointer">
                        ＋ 添加物料成本项
                      </button>
                    </div>
                  )}
                </div>

                {/* 固定开销 2x2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800">场地租金与物业</label>
                      <span className="text-[13px] text-slate-400">{formData.rentCost.currency}</span>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={formData.rentCost.amount || ''}
                      onChange={(e) => updateMoney('rentCost', Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800">员工工资与人工支出</label>
                      <span className="text-[13px] text-slate-400">{formData.laborCost.currency}</span>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={formData.laborCost.amount || ''}
                      onChange={(e) => updateMoney('laborCost', Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800">水电网络杂费</label>
                      <span className="text-[13px] text-slate-400">{formData.utilityCost.currency}</span>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={formData.utilityCost.amount || ''}
                      onChange={(e) => updateMoney('utilityCost', Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800">税金及规费</label>
                      <span className="text-[13px] text-slate-400">{formData.taxCost.currency}</span>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={formData.taxCost.amount || ''}
                      onChange={(e) => updateMoney('taxCost', Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800">每月偿还债务本息</label>
                      <span className="text-[13px] text-slate-400">{formData.existingDebtMonthlyPayment.currency}</span>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="无债务填 0"
                      value={formData.existingDebtMonthlyPayment.amount || ''}
                      onChange={(e) => updateMoney('existingDebtMonthlyPayment', Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800">当前可用现金备用金</label>
                      <span className="text-[13px] text-slate-400">{formData.cashAndLiquidAssets.currency}</span>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={formData.cashAndLiquidAssets.amount || ''}
                      onChange={(e) => updateMoney('cashAndLiquidAssets', Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-emerald-800"
                    />
                  </div>

                  {/* 第5/6点：初始投资估算——回本时间与反推收入的基数 */}
                  <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-amber-600" />
                        初始投资估算（装修/设备/首批进货等一次性投入）
                      </label>
                      <span className="text-[13px] text-slate-400">{formData.initialInvestmentEstimate.currency}</span>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="例如：装修+设备+首批进货一次性总投入"
                      value={formData.initialInvestmentEstimate.amount || ''}
                      onChange={(e) => updateMoney('initialInvestmentEstimate', Number(e.target.value))}
                      className="w-full p-2 border border-amber-300 rounded-lg font-semibold text-amber-900"
                    />
                    <p className="text-[12px] text-amber-700 mt-1">
                      填了这一项，下方才能算出「回本时间」与「按目标回本时间反推所需收入」。
                    </p>
                  </div>
                </div>

                {/* AI 推断的动态运营开支明细 */}
                {(formData.dynamicOpexItems || []).length > 0 && (
                  <div className="p-3 rounded-xl bg-teal-50/50 border border-dashed border-teal-300 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-black text-teal-900">
                        按行业细分的运营开支明细（可增删改）
                        {opexTouched && (
                          <span className="ml-1.5 inline-block text-[11px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold align-middle">已手动调整</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={restoreAiSuggestion}
                        className="text-[12px] px-2 py-0.5 rounded bg-teal-100 text-teal-700 font-bold hover:bg-teal-200 cursor-pointer"
                      >
                        <RefreshCw className="inline w-3 h-3 mr-0.5" />恢复 AI 建议
                      </button>
                    </div>
                    {(formData.dynamicOpexItems || []).map((it) => (
                      <div key={it.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={it.label}
                          onChange={(e) => updateDynamicOpexItem(it.id, { label: e.target.value })}
                          className="flex-1 min-w-0 p-1.5 border border-teal-200 rounded-lg font-semibold text-slate-800"
                        />
                        <input
                          type="number"
                          min="0"
                          value={it.value || ''}
                          onChange={(e) => updateDynamicOpexItem(it.id, { value: Math.max(0, isNaN(Number(e.target.value)) ? 0 : Number(e.target.value)) })}
                          className="w-24 shrink-0 p-1.5 border border-teal-200 rounded-lg font-mono font-semibold text-right"
                          placeholder={it.suggestedAmount ? `AI建议 ${it.suggestedAmount}` : '金额'}
                          title={it.suggestedAmount ? `AI 建议参考金额：${it.suggestedAmount}（仅供参考，请填你的真实数字）` : '请填你的真实月度金额'}
                        />
                        <span className="text-[12px] text-teal-700 whitespace-nowrap shrink-0 pl-0.5">{formData.baseCurrency}/月</span>
                        <button type="button" onClick={() => removeDynamicOpexItem(it.id)} className="p-1 text-teal-500 hover:text-teal-700 cursor-pointer shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addDynamicOpexItem} className="text-[12px] px-2 py-1 rounded border border-teal-300 text-teal-700 font-bold hover:bg-teal-100 cursor-pointer">
                      ＋ 添加运营开支项
                    </button>
                  </div>
                )}

                {/* 第1点+第5点：全球化经营成本——税收/签证/设备折旧/公司注册费用全部纳入成本，AI 给出属地参考估值可核实修改 */}
                <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-200 space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-violet-600" />
                    <span className="font-black text-violet-950">全球化经营成本（注册/签证/折旧）</span>
                    <span className="text-[12px] bg-violet-200 text-violet-900 font-bold px-1.5 py-0.5 rounded">
                      AI 已给出 {regulatoryEstimate.countryLabel} 参考值
                    </span>
                  </div>
                  <p className="text-[13px] text-violet-700 leading-relaxed">
                    {regulatoryEstimate.corporateTaxRateHint}。以下为 AI 参考估值，请核实当地实际情况后修改为你的真实数字——
                    <span className="italic">{regulatoryEstimate.sourceNote}</span>
                  </p>

                  {/* 公司注册/执照费用 */}
                  <div className="p-3 rounded-xl bg-white border border-violet-200 space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-violet-500" />
                        公司注册 / 执照 / 年检费用（一次性或年度总额）
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateMoney('companyRegistrationCost', regulatoryEstimate.registrationLocal)
                        }
                        className="text-[12px] px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold hover:bg-violet-200 cursor-pointer whitespace-nowrap"
                      >
                        使用 AI 建议（约 {formatMoney(regulatoryEstimate.registrationLocal, formData.baseCurrency)}）
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder={`AI 参考约 ${regulatoryEstimate.registrationLocal}`}
                        value={formData.companyRegistrationCost.amount || ''}
                        onChange={(e) => updateMoney('companyRegistrationCost', Number(e.target.value))}
                        className="flex-1 p-2 border border-violet-200 rounded-lg font-semibold text-slate-900"
                      />
                      <span className="text-[12px] text-slate-500 whitespace-nowrap">分摊</span>
                      <input
                        type="number"
                        min={1}
                        title="分摊到经营的月数"
                        value={formData.companyRegistrationAmortizationMonths || 12}
                        onChange={(e) =>
                          updateField(
                            'companyRegistrationAmortizationMonths',
                            Math.max(1, Number(e.target.value) || 12)
                          )
                        }
                        className="w-16 p-2 border border-violet-200 rounded-lg font-semibold text-center"
                      />
                      <span className="text-[12px] text-slate-500 whitespace-nowrap">个月</span>
                    </div>
                  </div>

                  {/* 签证与工作许可费用 */}
                  <div className="p-3 rounded-xl bg-white border border-violet-200 space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Plane className="w-3.5 h-3.5 text-violet-500" />
                        经营者/员工签证与工作许可费用（总额）
                      </label>
                      <button
                        type="button"
                        onClick={() => updateMoney('visaFeeCost', regulatoryEstimate.visaLocal)}
                        className="text-[12px] px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold hover:bg-violet-200 cursor-pointer whitespace-nowrap"
                      >
                        使用 AI 建议（约 {formatMoney(regulatoryEstimate.visaLocal, formData.baseCurrency)}）
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder={`无需签证填 0，AI 参考约 ${regulatoryEstimate.visaLocal}`}
                        value={formData.visaFeeCost.amount || ''}
                        onChange={(e) => updateMoney('visaFeeCost', Number(e.target.value))}
                        className="flex-1 p-2 border border-violet-200 rounded-lg font-semibold text-slate-900"
                      />
                      <span className="text-[12px] text-slate-500 whitespace-nowrap">分摊</span>
                      <input
                        type="number"
                        min={1}
                        title="分摊到经营的月数"
                        value={formData.visaFeeAmortizationMonths || 12}
                        onChange={(e) =>
                          updateField('visaFeeAmortizationMonths', Math.max(1, Number(e.target.value) || 12))
                        }
                        className="w-16 p-2 border border-violet-200 rounded-lg font-semibold text-center"
                      />
                      <span className="text-[12px] text-slate-500 whitespace-nowrap">个月</span>
                    </div>
                  </div>

                  {/* 设备折旧费 */}
                  <div className="p-3 rounded-xl bg-white border border-violet-200 space-y-1.5">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-violet-500" />
                      设备月度折旧费（按月直接计入成本）
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="例如：设备总值 ÷ 预计使用月数"
                      value={formData.equipmentDepreciationCost.amount || ''}
                      onChange={(e) => updateMoney('equipmentDepreciationCost', Number(e.target.value))}
                      className="w-full p-2 border border-violet-200 rounded-lg font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 第2点：AI 自动识别用户填错的数值及类目并提醒（仅提醒，不阻断提交） */}
            {anomalyWarnings.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50/70 border-2 border-rose-300 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-black text-rose-950">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>AI 发现 {anomalyWarnings.length} 处可能填错的数值或类目，建议核对</span>
                </div>
                <ul className="space-y-1.5">
                  {anomalyWarnings.map((w, idx) => (
                    <li
                      key={`${w.field}-${idx}`}
                      className={`p-2 rounded-lg border flex items-start gap-1.5 ${
                        w.severity === 'error'
                          ? 'bg-rose-100/70 border-rose-300 text-rose-900'
                          : 'bg-amber-50/70 border-amber-300 text-amber-900'
                      }`}
                    >
                      <span className="font-bold shrink-0">{w.severity === 'error' ? '⚠️' : '💡'}</span>
                      <span className="flex-1">{language === 'en' ? w.messageEn : w.messageZh}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt('这个数值确实特殊？简单说明原因（AI 只记录，不做判断）：');
                          if (reason && reason.trim()) setAnomalyOverride(w.field, reason.trim());
                        }}
                        className="text-[12px] shrink-0 px-2 py-0.5 rounded bg-white/70 border border-current font-bold hover:bg-white cursor-pointer"
                      >
                        标注特殊理由
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 第4点：已标注特殊理由的提醒——不再当作待核对项，但保留记录，AI 只记录不判断 */}
            {overriddenAnomalyWarnings.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-black text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-slate-500" />
                  <span>{overriddenAnomalyWarnings.length} 项已标注特殊理由（仅记录，不影响评分判断）</span>
                </div>
                <ul className="space-y-1.5">
                  {overriddenAnomalyWarnings.map((w, idx) => (
                    <li key={`${w.field}-ov-${idx}`} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-start gap-1.5">
                      <span className="flex-1">
                        <span className="block text-slate-500">{language === 'en' ? w.messageEn : w.messageZh}</span>
                        <span className="block mt-0.5 font-semibold text-slate-700">理由：{formData.anomalyOverrides?.[w.field]}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => clearAnomalyOverride(w.field)}
                        className="text-[12px] shrink-0 px-2 py-0.5 rounded border border-slate-300 font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        撤销标注
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 第5/6点：回本时间 + 按目标回本时间反推所需收入 */}
            {formData.initialInvestmentEstimate.amount > 0 && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 border-2 border-indigo-200 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-black text-indigo-950">
                  <Target className="w-4 h-4 text-indigo-600" />
                  <span>回本时间（收回初始投资）</span>
                </div>
                <p className="text-indigo-800 leading-relaxed">
                  初始投资 <b>{formatMoney(payback.initialInvestment, formData.baseCurrency)}</b>，
                  按当前填写的月收入与月成本，月度净结余为
                  <b className={payback.monthlyNetSurplus >= 0 ? ' text-emerald-700' : ' text-rose-700'}>
                    {' '}{formatMoney(payback.monthlyNetSurplus, formData.baseCurrency)}/月
                  </b>
                  {payback.paybackMonths !== null ? (
                    <>
                      ，预计 <span className="text-base font-black text-indigo-900 mx-1">{payback.paybackMonths.toFixed(1)}</span> 个月可以回本。
                    </>
                  ) : (
                    '。当前净结余不为正，暂时算不出回本时间——先让「不亏钱」成立，回本时间才有意义。'
                  )}
                </p>
                <p className="text-[12px] text-indigo-500">
                  这条时间线回答「本金什么时候能收回来」，与上方的「盈亏平衡点」（回答「什么时候不再亏钱」）是两回事，请勿混淆；同时记得预留家庭生活费和应急资金，不要把全部结余都算作可抽走的利润。
                </p>

                <div className="pt-2 border-t border-indigo-200 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-indigo-900">如果我想在</span>
                    <input
                      type="number"
                      min={1}
                      value={formData.targetPaybackMonths || ''}
                      onChange={(e) => updateField('targetPaybackMonths', Math.max(1, Number(e.target.value) || 1))}
                      className="w-20 p-1.5 border border-indigo-300 rounded-lg font-black text-indigo-900 text-center"
                    />
                    <span className="font-bold text-indigo-900">个月内回本，至少要赚多少？</span>
                  </div>
                  {reverseTarget && (
                    <p className="text-indigo-800 leading-relaxed">
                      至少要做到每月收入
                      <span className="text-base font-black text-indigo-900 mx-1">
                        {formatMoney(reverseTarget.requiredMonthlyRevenue, formData.baseCurrency)}
                      </span>
                      （约每天 {formatMoney(reverseTarget.requiredDailyRevenue, formData.baseCurrency)}），
                      请对照上方行业基准判断这个目标相对你的成本结构是否现实、对应的市场需求量是否存在。
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 更多设置（月度流水 / 资金证明 / 经营时长 / 员工）——藏起来 */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50/80 hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-teal-600" />
                  更多设置（月度流水 / 资金证明 / 经营时长 / 员工人数）
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showMore ? 'rotate-180' : ''}`} />
              </button>

              {showMore && (
                <div className="p-4 sm:p-5 space-y-5 text-xs bg-white">
                  {/* 月度流水明细（选填）：平时藏在更多设置里，检测到缺口时按需高亮提示 */}
                  <div>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                      <div>
                        <label className="block text-slate-700 font-bold">
                          近 6 个月月度流水明细（选填，不填也能出报告）
                        </label>
                        <p className="text-[13px] text-slate-500">
                          提供逐月流水可让 AI 更精准评估现金流波动，不强制填写。
                        </p>
                      </div>
                      {showGapSection && (
                        <button
                          onClick={handleInterpolateMissingMonths}
                          disabled={isSimulatingOcr}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingOcr ? 'animate-spin' : ''}`} />
                          <span>{isSimulatingOcr ? 'AI 计算中...' : 'AI 智能补全缺口'}</span>
                        </button>
                      )}
                    </div>

                    {showGapSection && (
                      <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-[13px] text-amber-800 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        检测到部分月份流水缺失，可用「AI 智能补全缺口」按前后月均值补一个参考估算值，再手动确认。
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {formData.monthlyBreakdowns.map((b, idx) => (
                        <div
                          key={b.month}
                          className={`p-2.5 rounded-xl border ${
                            b.isEstimated
                              ? 'bg-amber-50/80 border-amber-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-700">{b.month}</span>
                            {b.isEstimated && (
                              <span className="text-[12px] bg-amber-200 text-amber-900 font-bold px-1.5 rounded">
                                AI 估算
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">{formData.baseCurrency}</span>
                            <input
                              type="number"
                              value={b.revenue.amount || ''}
                              onChange={(e) => updateMonthlyBreakdown(idx, Number(e.target.value))}
                              className="w-full p-1 border border-slate-300 rounded font-bold text-slate-800 bg-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Proof Type Radio Tiles */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-2">
                      资金证明方式（可选，不影响得分与通过率）
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          formData.proofType === 'none'
                            ? 'border-teal-600 bg-teal-50/80 ring-1 ring-teal-600'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-slate-900">无凭证纯手动填写</span>
                          <input
                            type="radio"
                            name="proofType"
                            checked={formData.proofType === 'none'}
                            onChange={() => updateField('proofType', 'none' as ProofType)}
                            className="text-teal-600"
                          />
                        </div>
                        <p className="text-slate-500 mt-1.5 text-[13px]">
                          直接手动录入数字，跳过文件上传，打分逻辑完全一致。
                        </p>
                      </label>

                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          formData.proofType === 'mobile_payment'
                            ? 'border-teal-600 bg-teal-50/80 ring-1 ring-teal-600'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-slate-900">移动支付截图 / 账单</span>
                          <input
                            type="radio"
                            name="proofType"
                            checked={formData.proofType === 'mobile_payment'}
                            onChange={() => updateField('proofType', 'mobile_payment' as ProofType)}
                            className="text-teal-600"
                          />
                        </div>
                        <p className="text-slate-500 mt-1.5 text-[13px]">
                          M-Pesa / 微信收款 / WhatsApp 转账记录等电子凭证。
                        </p>
                      </label>

                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          formData.proofType === 'handwritten_book'
                            ? 'border-teal-600 bg-teal-50/80 ring-1 ring-teal-600'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-slate-900">手写 / 电子记账本照片</span>
                          <input
                            type="radio"
                            name="proofType"
                            checked={formData.proofType === 'handwritten_book'}
                            onChange={() => updateField('proofType', 'handwritten_book' as ProofType)}
                            className="text-teal-600"
                          />
                        </div>
                        <p className="text-slate-500 mt-1.5 text-[13px]">
                          日常手工记账流水单页、账本拍照上传，AI 自动预提取。
                        </p>
                      </label>

                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          formData.proofType === 'institution_record'
                            ? 'border-teal-600 bg-teal-50/80 ring-1 ring-teal-600'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-slate-900">教会 / 合作社内部记录</span>
                          <input
                            type="radio"
                            name="proofType"
                            checked={formData.proofType === 'institution_record'}
                            onChange={() => updateField('proofType', 'institution_record' as ProofType)}
                            className="text-teal-600"
                          />
                        </div>
                        <p className="text-slate-500 mt-1.5 text-[13px]">
                          机构出具的经营往来对账单或证明函件。
                        </p>
                      </label>

                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          formData.proofType === 'bank_statement'
                            ? 'border-teal-600 bg-teal-50/80 ring-1 ring-teal-600'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-slate-900">正规银行对账单 (PDF)</span>
                          <input
                            type="radio"
                            name="proofType"
                            checked={formData.proofType === 'bank_statement'}
                            onChange={() => updateField('proofType', 'bank_statement' as ProofType)}
                            className="text-teal-600"
                          />
                        </div>
                        <p className="text-slate-500 mt-1.5 text-[13px]">
                          正规银行账户导出的月度对账明细。
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* File Upload Zone：支持一次多选、多种格式 */}
                  {formData.proofType !== 'none' && (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-800">
                        上传佐证凭证文件（选填，可一次多选多个文件 / 敏感地区模式下识别后立即销毁原图）
                      </label>
                      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-teal-50/40 transition-colors">
                        <UploadCloud className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          点击选择一个或多个文件，或直接拖拽到此处
                        </p>
                        <p className="text-[13px] text-slate-400 mt-1">
                          支持 JPG、PNG、HEIC、PDF、XLSX、CSV 等多种格式混合上传（单文件不超过 10MB）
                        </p>
                        <input
                          type="file"
                          multiple
                          accept="image/*,application/pdf,.pdf,.heic,.csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          onChange={handleUploadFile}
                          className="hidden"
                          id="proof-upload-input"
                        />
                        <label
                          htmlFor="proof-upload-input"
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>选择凭证附件（可多选）</span>
                        </label>
                      </div>

                      {formData.proofFiles.length > 0 && (
                        <div className="space-y-2">
                          {formData.proofFiles.map((file) => (
                            <div
                              key={file.id}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileSpreadsheet className="w-4 h-4 text-teal-600 shrink-0" />
                                  <span className="font-medium text-slate-800 truncate">{file.name}</span>
                                  <span className="text-[12px] text-slate-400 shrink-0">
                                    ({(file.size / 1024).toFixed(0)} KB)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {file.status === 'processing' ? (
                                    <span className="inline-flex items-center gap-1 text-[12px] bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded">
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                      AI 识别中...
                                    </span>
                                  ) : formData.isSensitiveRegion ? (
                                    <span className="text-[12px] bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded">
                                      脱敏模式：原图不入库
                                    </span>
                                  ) : (
                                    <span className="text-[12px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">
                                      已识别提取
                                    </span>
                                  )}
                                  <button
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        proofFiles: prev.proofFiles.filter((f) => f.id !== file.id)
                                      }))
                                    }
                                    className="text-slate-400 hover:text-rose-500 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {file.status === 'done' && file.extractedData && (
                                <div className="ml-6 p-2 rounded-lg bg-white border border-teal-200 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[12px]">
                                  {file.extractedData.detectedAmount !== undefined && (
                                    <div>
                                      <span className="text-slate-400">识别金额：</span>
                                      <span className="font-bold text-teal-800">
                                        {formatMoney(
                                          file.extractedData.detectedAmount,
                                          file.extractedData.currency || formData.baseCurrency
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {file.extractedData.transactionCount !== undefined && (
                                    <div>
                                      <span className="text-slate-400">识别笔数：</span>
                                      <span className="font-bold text-slate-700">
                                        {file.extractedData.transactionCount} 笔
                                      </span>
                                    </div>
                                  )}
                                  {file.extractedData.periodLabel && (
                                    <div className="col-span-2 sm:col-span-1">
                                      <span className="text-slate-400">覆盖周期：</span>
                                      <span className="font-medium text-slate-700">
                                        {file.extractedData.periodLabel}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Operating Duration & Team scale */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">连续稳定经营月数</label>
                      <input
                        type="number"
                        value={formData.operatingMonthsCount}
                        onChange={(e) =>
                          updateField('operatingMonthsCount', Math.max(1, Number(e.target.value)))
                        }
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">全职/兼职雇员人数</label>
                      <input
                        type="number"
                        value={formData.fullTimeEmployeesCount}
                        onChange={(e) =>
                          updateField('fullTimeEmployeesCount', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 提交前信息核对速览 */}
            <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-100 text-xs space-y-3">
              <div className="flex items-center gap-2 text-teal-950 font-bold">
                <Briefcase className="w-4 h-4 text-teal-600" />
                <span>提交前信息核对速览</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block">项目名称:</span>
                  <span className="font-bold">{formData.projectName || '未命名自测'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">主报告币种:</span>
                  <span className="font-bold">{formData.baseCurrency}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">所属行业:</span>
                  <span className="font-bold">{industryLabel}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">敏感地区模式:</span>
                  <span className="font-bold">
                    {formData.isSensitiveRegion ? '已启用（脱敏）' : '未开启'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">月均总流水:</span>
                  <span className="font-bold">
                    {formatMoney(formData.monthlyRevenue.amount, formData.monthlyRevenue.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">原材料采购(COGS):</span>
                  <span className="font-bold">
                    {formatMoney(formData.cogsCost.amount, formData.cogsCost.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Back' : '上一步'}</span>
            </button>
            <button
              onClick={handleFinalSubmit}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 rounded-xl text-sm font-black shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{language === 'en' ? 'Generate Health Report' : '出报告 · 生成财务测算与评估报告'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
