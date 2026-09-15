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
  AlertOctagon,
  Search
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
  normalizeIndustryKey,
  getIndustryTemplateByKey,
  inferRegulatoryCosts,
  InferredStructure,
  REGULATORY_COUNTRY_OPTIONS
} from '../../lib/inferBusinessStructure';
import { State as StateLib } from 'country-state-city';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';
import { calculateBreakEvenRevenue } from '../../lib/breakEvenCalculator';
import { calculatePaybackPeriod, calculateRequiredRevenueForTarget } from '../../lib/paybackCalculator';
import { detectFormAnomalies } from '../../lib/anomalyDetection';
import { FieldProvenanceBadge, PendingConfirmationsBar } from '../FieldProvenanceBadge';
import { NumberField } from './NumberField';

/** 行业枚举值集合，用于在 AI 返回值与可选项之间做映射 */
const INDUSTRY_KEYS = INDUSTRY_BENCHMARKS.map((b) => b.id) as string[];
/** 下拉里选中的"自定义行业"占位值 */
export const CUSTOM_INDUSTRY_VALUE = '__CUSTOM__';

/**
 * 该明细项是否已被用户真正复核过。
 * 值被改成与 AI 建议不同，才算用户过了目；仍等于建议值（含自动预填）视为未复核。
 */
function isReviewedByUser(it: { value?: number; suggestedAmount?: number }): boolean {
  if (!it.value) return false;
  if (!it.suggestedAmount) return true;
  return it.value !== it.suggestedAmount;
}

/** 调用后端 AI 接口，基于项目/店铺名称推算行业、币种与成本结构 */
async function callInferBusinessStructure(projectName: string): Promise<InferredStructure | null> {
  try {
    const res = await fetch('/api/ai/infer-business-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName })
    });
    // 后端即便走降级路径（如配额冷却中）也会返回 200 + { success:false, unavailable:true, reason }，
    // 只有真正的网络/服务器异常才会走到 !res.ok；即便如此也尝试解析 body，尽量保留具体原因。
    const data = await res.json().catch(() => null);
    if (!res.ok && !data) throw new Error(`HTTP ${res.status}`);
    return data as InferredStructure;
  } catch {
    return null;
  }
}

/** 标题旁的说明图标：默认只显示一个"?"，鼠标悬停/点击后才展开解释文字，避免正文里堆砌大段叙事 */
function InfoTooltip({ text, language }: { text: string; language?: Language }) {
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
        aria-label={language === 'en' ? 'Info' : '说明'}
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
  // 留空而不是硬编码某个国家：一个没人选过的默认值会被当成真实选择去推算税率/注册/签证成本，
  // 参见下方「所在国家/地区」下拉框——首次进入时应显示未选择，而不是悄悄把新用户判成肯尼亚。
  regionCountry: '',
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
  dynamicTaxItems: [],
  otherOpex: { amount: 0, currency: 'USD' },
  companyRegistrationCost: { amount: 0, currency: 'USD' },
  companyRegistrationAmortizationMonths: 12,
  visaFeeCost: { amount: 0, currency: 'USD' },
  visaFeeAmortizationMonths: 12,
  equipmentDepreciationCost: { amount: 0, currency: 'USD' },
  dynamicEquipmentItems: [],
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
  // 推断失败时的具体原因（如「配额冷却中」），用于替代笼统的“AI 暂时不可用”提示
  const [inferErrorReason, setInferErrorReason] = useState<string | null>(null);
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
  // 优先用用户在「全球化经营成本」区域明确选择的所在国家/地区（见下方 regionCountry 下拉框）；
  // 只有用户还没选择时，才退回到用店名/项目名猜地区这条弱信号，避免几乎所有新用户在还没填
  // 任何信息前就被悄悄套用某个不相关国家的税率/注册/签证费标准（反馈：全球化成本的AI估计值
  // 数据来源不明——没有明确的地区输入，用户没法判断参考值是基于什么算出来的）。
  const regulatoryEstimate = React.useMemo(
    () => inferRegulatoryCosts(formData.regionCountry || formData.projectName, formData.baseCurrency, language),
    [formData.regionCountry, formData.projectName, formData.baseCurrency, language]
  );

  // 已经选定「公司注册所在国家/地区」后，再用 country-state-city（成熟的现成省/州数据库，
  // 而不是自己手写一份国家->省州列表）按该国 ISO2 代码查出省/州选项，供下方精确到省/州填写。
  const regionCountryIso2 = React.useMemo(
    () => REGULATORY_COUNTRY_OPTIONS.find((o) => o.countryLabel === formData.regionCountry)?.iso2,
    [formData.regionCountry]
  );
  const statesForRegionCountry = React.useMemo(
    () => (regionCountryIso2 ? StateLib.getStatesOfCountry(regionCountryIso2) : []),
    [regionCountryIso2]
  );
  const stateOptions: SearchableSelectOption[] = React.useMemo(
    () => statesForRegionCountry.map((s) => ({ value: s.name, label: s.name })),
    [statesForRegionCountry]
  );

  // 国家/币种选项都是几十上百项，下拉框换成带搜索的 SearchableSelect 时复用同一份 options，
  // 避免每处调用现场各自重新 map 一遍。
  const countryOptions: SearchableSelectOption[] = React.useMemo(
    () =>
      REGULATORY_COUNTRY_OPTIONS.map((o) => ({
        value: o.countryLabel,
        label: language === 'en' ? o.countryLabelEn : o.countryLabel
      })),
    [language]
  );
  const currencyOptions: SearchableSelectOption[] = React.useMemo(
    () =>
      SUPPORTED_CURRENCIES.map((c) => ({
        value: c.code,
        label: `${language === 'en' ? c.nameEn : c.nameZh} - ${c.symbol}`
      })),
    [language]
  );
  // 紧凑版币种选项：用于行内小型币种选择器（如每条金额旁边的币种下拉），显示 CODE (符号) 而非全名
  const compactCurrencyOptions: SearchableSelectOption[] = React.useMemo(
    () => SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` })),
    []
  );
  // 更紧凑：只显示 3 字母代码，用于空间更窄的行内币种下拉，避免被截断
  const codeOnlyCurrencyOptions: SearchableSelectOption[] = React.useMemo(
    () => SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: c.code })),
    []
  );
  const industryOptions: SearchableSelectOption[] = React.useMemo(
    () => [
      ...INDUSTRY_BENCHMARKS.map((b) => ({ value: b.id, label: language === 'en' ? b.nameEn : b.nameZh })),
      { value: CUSTOM_INDUSTRY_VALUE, label: language === 'en' ? 'Other industry (custom input)' : '其他行业（自定义输入）' }
    ],
    [language]
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
    formData.dynamicEquipmentItems,
    formData.baseCurrency,
    formData.customCurrencyCode,
    formData.hasMultipleRates,
    formData.customExchangeRateValue
  ]);

  // —— 第2点：AI 自动识别用户填错的数值及类目并提醒（本地规则化，仅提醒不阻断）——
  const rawAnomalyWarnings = React.useMemo(() => detectFormAnomalies(formData), [formData]);

  /**
   * 尚未被用户复核的 AI 建议数量。
   *
   * 【判定口径】值为空，**或者值仍与 AI 建议值完全相同** —— 后者同样算未复核。
   *
   * 这一条很关键：本地推断引擎会把建议值直接自动预填进表单（见绿字「AI 已自动预填」），
   * 如果只看「有没有值」，这些 AI 填的数字会被当成用户填的，
   * 徽章会错误地显示「你已填写」。用户改过之后才算真正过了目。
   */
  const pendingSuggestionCount = React.useMemo(() => {
    const items = [
      ...(formData.dynamicCogsItems || []),
      ...(formData.dynamicOpexItems || [])
    ].filter((it) => it.suggestedAmount && !isReviewedByUser(it)).length;
    const estimatedMonths = (formData.monthlyBreakdowns || []).filter((b) => b.isEstimated).length;
    return items + estimatedMonths;
  }, [formData.dynamicCogsItems, formData.dynamicOpexItems, formData.monthlyBreakdowns]);
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
    formData.dynamicEquipmentItems,
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
      formData.dynamicEquipmentItems,
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

  // 反馈第6点「给开发的补充说明」：提醒应在对应字段旁就地展示，不要只集中到提交时统一弹窗——
  // 用户填到后面才被告知前面有问题，返工成本很高。这里从已算好的 anomalyWarnings 里按字段取出，
  // 就地渲染在该字段下方，和底部的汇总列表共用同一份数据、同一套"标注特殊理由"交互。
  const renderInlineAnomalies = (fieldKey: string) => {
    const matches = anomalyWarnings.filter((w) => w.field === fieldKey);
    if (matches.length === 0) return null;
    return (
      <div className="mt-2 space-y-1.5">
        {matches.map((w, idx) => (
          <div
            key={`${fieldKey}-inline-${idx}`}
            className={`p-2 rounded-lg border flex items-start gap-1.5 text-[12px] ${
              w.severity === 'error'
                ? 'bg-rose-100/70 border-rose-300 text-rose-900'
                : 'bg-amber-50/70 border-amber-300 text-amber-900'
            }`}
          >
            <span className="font-bold shrink-0">{w.severity === 'error' ? '⚠️' : '💡'}</span>
            <span className="flex-1 font-medium">{language === 'en' ? w.messageEn : w.messageZh}</span>
            <button
              type="button"
              onClick={() => {
                const reason = window.prompt(
                  language === 'en'
                    ? 'Is this value genuinely unusual? Briefly explain why:'
                    : '这个数值确实特殊？简单说明原因（AI 只记录，不做判断）：'
                );
                if (reason && reason.trim()) setAnomalyOverride(w.field, reason.trim());
              }}
              className="text-[11px] shrink-0 px-1.5 py-0.5 rounded bg-white/80 border border-current font-bold hover:bg-white cursor-pointer"
            >
              {language === 'en' ? 'Note' : '标注理由'}
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Auto-save local draft on any change
  useEffect(() => {
    saveActiveDraft(formData);
    if (restoredDraftRef.current) {
      // 本次挂载恢复了草稿：先告诉用户内容还在，避免"我填的怎么还在/怎么变了"的困惑
      restoredDraftRef.current = false;
      setSaveStatus(language === 'en' ? 'Restored your last unsubmitted draft' : '已恢复上次未提交的填写');
    } else {
      setSaveStatus(language === 'en' ? 'Draft auto-saved locally' : '草稿已自动暂存至本地');
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
          label: language === 'en' ? 'Food & Beverage Ingredient Cost (COGS)' : '食材与饮品原料成本 (COGS)',
          badge: language === 'en' ? 'Coffee / Bakery / Food Ingredients' : '咖啡/烘焙/餐食原料',
          tip: language === 'en'
            ? 'Direct food cost such as coffee beans, milk, flour, meat & vegetables, sauces, and disposable eco tableware (excludes rent and labor).'
            : '咖啡豆、鲜奶、面粉、肉类蔬菜、酱料及一次性环保餐具等直接食材成本（不含房租人工）。'
        };
      case 'medical_health':
        return {
          label: language === 'en' ? 'Medicine & Medical Supplies Cost (COGS)' : '药品与医用耗材成本 (COGS)',
          badge: language === 'en' ? 'Medicine & Supplies' : '药品与耗材',
          tip: language === 'en'
            ? 'Direct purchasing cost for Western/traditional medicine, syringes, dressings/gauze, disinfectant supplies, etc. (excludes rent and labor).'
            : '中西药品、注射器、敷料纱布、消毒用品等直接采购成本（不含房租人工）。'
        };
      case 'retail_store':
        return {
          label: language === 'en' ? 'Merchandise Purchasing Cost (COGS)' : '商品进货与采购成本 (COGS)',
          badge: language === 'en' ? 'Purchasing Cost' : '进货本钱',
          tip: language === 'en'
            ? 'Cost of daily goods, food seasonings, digital appliances, etc. purchased from wholesalers (includes long-haul freight, excludes rent and labor).'
            : '向批发商采购的日用百货、食品调料、数码家电等商品成本（含长途运费，不含房租人工）。'
        };
      case 'education_training':
        return {
          label: language === 'en' ? 'Teaching Materials & Supplies Cost (COGS)' : '教材与教学耗材成本 (COGS)',
          badge: language === 'en' ? 'Teaching Materials' : '教学资料',
          tip: language === 'en'
            ? 'Direct teaching materials such as textbooks, handouts, workbooks, stationery/teaching aids, online platforms (excludes rent and labor).'
            : '教材讲义、练习册、文具教具、在线平台等直接教学耗材（不含房租人工）。'
        };
      case 'vocational_training':
        return {
          label: language === 'en' ? 'Hands-on Training Materials & Tools (COGS)' : '实训原料与工具耗材 (COGS)',
          badge: language === 'en' ? 'Materials & Tools' : '材料与工具',
          tip: language === 'en'
            ? 'Materials for hands-on training such as wood, leather, fabric, solder/hardware fittings, etc. (excludes rent and labor).'
            : '实训用的木料、皮革、布料、焊锡零配件、五金耗材等（不含房租人工）。'
        };
      case 'agriculture':
        return {
          label: language === 'en' ? 'Seeds, Fertilizer & Farm Inputs Cost (COGS)' : '种苗肥料与农资成本 (COGS)',
          badge: language === 'en' ? 'Agricultural Inputs' : '农业生产资料',
          tip: language === 'en'
            ? 'Direct agricultural inputs such as seeds/seedlings, organic fertilizer, biopesticides, preservation packaging (excludes rent and labor).'
            : '种子种苗、有机肥料、生物农药、保鲜包装等直接农业投入（不含房租人工）。'
        };
      case 'child_care':
        return {
          label: language === 'en' ? "Children's Meals & Teaching Supplies Cost (COGS)" : '儿童膳食与教具耗材 (COGS)',
          badge: language === 'en' ? 'Meals & Supplies' : '餐食与用品',
          tip: language === 'en'
            ? "Children's daily nutritional food, milk, educational aids, drawing supplies, hygiene products, etc. (excludes rent and labor)."
            : '儿童每日营养食材、牛奶、益智教具、绘画文具、卫生纸品等（不含房租人工）。'
        };
      default:
        return {
          label: language === 'en' ? 'Raw Materials & Direct Purchasing Cost (COGS)' : '原材料与直接采购成本 (COGS)',
          badge: language === 'en' ? 'Purchasing Cost' : '进货本钱',
          tip: language === 'en'
            ? 'Direct purchasing cost such as goods payment, fresh food ingredients, etc. (includes long-haul freight, excludes rent and staff wages).'
            : '进货货款、生鲜食材原料等直接买货成本（包含长途运费，不含房租和员工工资）。'
        };
    }
  }, [formData.industry, language]);

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
        { id: `cogs-${Date.now()}`, label: language === 'en' ? 'New material cost item' : '新增物料成本项', value: 0, isFixed: false }
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
        { id: `opex-${Date.now()}`, label: language === 'en' ? 'New operating expense item' : '新增运营开支项', value: 0, isFixed: false }
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

  // —— 动态设备清单（问题5：让用户逐台填「设备值 + 预计使用月数」，AI 自动求和算月度折旧，避免自己心算总设备值） ——
  const updateDynamicEquipmentItem = (
    id: string,
    patch: Partial<{ label: string; value: number; usefulLifeMonths: number }>
  ) => {
    setFormData((prev) => ({
      ...prev,
      dynamicEquipmentItems: (prev.dynamicEquipmentItems || []).map((it) =>
        it.id === id ? { ...it, ...patch } : it
      ),
      updatedAt: new Date().toISOString()
    }));
  };
  const addDynamicEquipmentItem = () => {
    setFormData((prev) => ({
      ...prev,
      dynamicEquipmentItems: [
        ...(prev.dynamicEquipmentItems || []),
        {
          id: `equip-${Date.now()}`,
          label: language === 'en' ? 'New equipment' : '新增设备',
          value: 0,
          usefulLifeMonths: 12
        }
      ],
      updatedAt: new Date().toISOString()
    }));
  };
  const removeDynamicEquipmentItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      dynamicEquipmentItems: (prev.dynamicEquipmentItems || []).filter((it) => it.id !== id),
      updatedAt: new Date().toISOString()
    }));
  };
  const dynamicEquipmentMonthlyTotal = (formData.dynamicEquipmentItems || []).reduce(
    (sum, it) => sum + (Number(it.value) || 0) / Math.max(1, Math.round(Number(it.usefulLifeMonths) || 12)),
    0
  );

  // 反馈问题4：设备清单只给一个「机器A」这样的占位示例，用户不知道该买什么型号、去哪买。
  // 不做一份维护成本很高的"精选设备型号库"，而是给一个按行业+用户已填名称拼出的谷歌购物/
  // 二手市场搜索链接，用户点开就能直接看到该类目下的具体型号与市场价，纯前端跳转，无需 AI 调用。
  const openEquipmentSearch = (label: string) => {
    const trimmed = (label || '').trim();
    const placeholder = language === 'en' ? 'New equipment' : '新增设备';
    const industryHint = cogsFieldMeta.badge;
    const subject = trimmed && trimmed !== placeholder ? trimmed : `${industryHint}${language === 'en' ? ' equipment' : '常用设备'}`;
    const query = language === 'en' ? `${subject} price used marketplace` : `${subject} 二手 价格`;
    window.open(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  // —— 税金及规费明细分项（反馈问题1：单个数字太草率，展开后可按增值税/附加税/所得税预估/
  //     年度规费按月摊等逐项填写，合计自动替代单一数字，且用户能顺带看清自己到底要交哪些税）——
  const updateDynamicTaxItem = (id: string, patch: Partial<{ label: string; value: number }>) => {
    setFormData((prev) => ({
      ...prev,
      dynamicTaxItems: (prev.dynamicTaxItems || []).map((it) => (it.id === id ? { ...it, ...patch } : it)),
      updatedAt: new Date().toISOString()
    }));
  };
  const addDynamicTaxItem = (label?: string) => {
    setFormData((prev) => ({
      ...prev,
      dynamicTaxItems: [
        ...(prev.dynamicTaxItems || []),
        { id: `tax-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label: label || (language === 'en' ? 'New tax/fee item' : '新增税费项'), value: 0 }
      ],
      updatedAt: new Date().toISOString()
    }));
  };
  const removeDynamicTaxItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      dynamicTaxItems: (prev.dynamicTaxItems || []).filter((it) => it.id !== id),
      updatedAt: new Date().toISOString()
    }));
  };
  const startTaxBreakdown = () => {
    const labels = language === 'en'
      ? ['VAT', 'Additional/surtax', 'Income tax estimate', 'Annual dues (amortized monthly)']
      : ['增值税', '附加税', '所得税预估', '年度规费（按月摊）'];
    setFormData((prev) => ({
      ...prev,
      dynamicTaxItems: labels.map((label, i) => ({
        id: `tax-${Date.now()}-${i}`,
        label,
        value: i === 0 ? Number(prev.taxCost.amount) || 0 : 0
      })),
      updatedAt: new Date().toISOString()
    }));
  };
  const dynamicTaxTotal = (formData.dynamicTaxItems || []).reduce((sum, it) => sum + (Number(it.value) || 0), 0);

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
        label: it.name || (language === 'en' ? 'Material cost item' : '物料成本项'),
        value: Number(it.amount) || 0,
        suggestedAmount: Number(it.amount) || 0,
        isFixed: false
      }));
      const newOpex = (tpl.opexItems || []).map((it) => ({
        id: `opex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: it.name || (language === 'en' ? 'Operating expense item' : '运营开支项'),
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

  // 公司注册所在国家/地区：第一步选定后直接联动主报告币种（该国法定货币），
  // 并同步已录入的各明细币种，避免用户后面还要在「高级设置」里重复选一遍币种；
  // 同一份 regionCountry 也是第5点属地税收/注册/签证参考值的唯一权威信号源。
  const handleRegionCountryChange = (value: string) => {
    const matched = REGULATORY_COUNTRY_OPTIONS.find((o) => o.countryLabel === value);
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        ...syncMoneyFieldsToCurrency(prev, matched.code as CurrencyCode),
        regionCountry: value,
        // 国家变了，此前选的省/州（regionDetail）就不再对应，清空避免残留成另一个国家的省份
        regionDetail: prev.regionCountry === value ? prev.regionDetail : '',
        baseCurrency: matched.code as CurrencyCode,
        customCurrencyCode: undefined,
        updatedAt: new Date().toISOString()
      }));
      setCustomCurrencyCode('');
    } else {
      // 清空为「未选择」时，同样清掉不再对应任何国家的省/州
      setFormData((prev) => ({ ...prev, regionCountry: value, regionDetail: '', updatedAt: new Date().toISOString() }));
    }
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
    // 租金/人力/水电已有专属固定字段（rentCost/laborCost/utilityCost），
    // 若 AI 在 opexItems 中重复给出会导致这三类开支被计算两次，需在客户端兜底过滤。
    const DUPLICATE_OPEX_PATTERN = /(rent|labor|wage|salary|utilit|electric|水电|房租|租金|薪|工资|人力|同工|物业)/i;
    const rawOpex = (result.opexItems || []).filter(
      (it) => it.name && !DUPLICATE_OPEX_PATTERN.test(`${it.id ?? ''} ${it.name ?? ''}`)
    );
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

    setFormData((prev) => {
      // 主币种变化时，把所有费用明细（场地租金/工资/水电/税金/债务/现金备用金/初始投资等）
      // 的币种也一并同步，避免出现「顶部收入已变 THB，但其余费用项仍停在旧币种」的错位。
      const currencyPatch =
        patch.baseCurrency && patch.baseCurrency !== prev.baseCurrency
          ? syncMoneyFieldsToCurrency(prev, patch.baseCurrency as CurrencyCode)
          : {};
      return { ...prev, ...currencyPatch, ...patch };
    });
  };

  const handleProjectNameChange = (value: string) => {
    updateField('projectName', value);
    if (value.trim()) setNameError(null);
    if (inferTimer.current) clearTimeout(inferTimer.current);
    const name = value.trim();
    if (name.length < 2) {
      setInferState('idle');
      setInferErrorReason(null);
      return;
    }
    setInferState('loading');
    setInferErrorReason(null);
    inferTimer.current = setTimeout(async () => {
      const reqId = ++inferReqId.current;
      const result = await callInferBusinessStructure(name);
      if (reqId !== inferReqId.current) return; // 丢弃过期请求
      // 不再用写死的行业模板冒充推断结果——云端 AI 不可用或未返回有效结构时，
      // 如实提示用户手动填写，而不是悄悄套上一份跟项目毫无关系的固定数字。
      const isUsable =
        !!result &&
        (result as any).success !== false &&
        (result.inferredIndustryKey ||
          result.suggestedCurrency ||
          result.opexItems?.length ||
          result.cogsItems?.length);
      if (!isUsable) {
        setInferErrorReason((result as any)?.unavailable ? (result as any).reason ?? null : null);
        setInferState('error');
        return;
      }
      setInferErrorReason(null);
      applyInferResult(result);
      setInferState('done');
    }, 1200);
  };

  /** 将动态成本项恢复为 AI 上次建议的结构（含预估金额） */
  const restoreAiSuggestion = () => {
    if (!aiSuggested) return;
    const ok = window.confirm(
      language === 'en'
        ? 'Restoring the AI suggestion will fill the line-item amounts with the AI\'s estimate (for reference only, not your actual cost).\n\nTip: change the numbers back to your real values to avoid inaccurate data.\n\nConfirm restore?'
        : '恢复 AI 建议会把明细金额填回 AI 的估值（仅供参考，不代表你的真实成本）。\n\n建议：把数字改回你的实际值，避免数据失真。\n\n确认要恢复吗？'
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
          note: language === 'en'
            ? 'AI detected a revenue gap and auto-estimated it from the nearest real monthly data'
            : 'AI识别流水缺口，按最近的真实月份数据自动估算'
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
          periodLabel: language === 'en'
            ? 'Period covered by this proof (auto-extracted by AI)'
            : '本次凭证覆盖周期（AI 自动提取）',
          note: language === 'en'
            ? 'AI has extracted the structured data below from your proof; review and manually adjust the amounts above if needed'
            : 'AI 已从凭证中识别出以下结构化数据，可核对后手动修改上方金额'
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
    { num: 1, title: language === 'en' ? 'What\'s your business?' : '生意叫什么？' },
    { num: 2, title: language === 'en' ? 'Revenue, expenses & cash on hand' : '赚多少、花多少、兜里有多少现金' }
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
    INDUSTRY_BENCHMARKS.find((b) => b.id === formData.industry)?.[language === 'en' ? 'nameEn' : 'nameZh'] ||
    (formData.industry === CUSTOM_INDUSTRY_VALUE ? formData.customIndustryName : formData.industry) ||
    (language === 'en' ? 'Not identified' : '未识别');

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
                <span>{language === 'en' ? '1. What\'s your business?' : '1. 生意叫什么？'}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {language === 'en'
                  ? 'Just the name. AI will automatically infer industry, currency and cost structure for you — you can always change it below in "Advanced Settings".'
                  : '只填名字。行业、币种、成本结构，AI 都会自动替你推断，也可以随时在下方「高级设置」里改。'}
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
                  <span className="text-teal-500 font-semibold animate-pulse">
                    {language === 'en' ? 'AI is inferring industry, currency and cost structure…' : 'AI 正在推算行业、币种与成本结构…'}
                  </span>
                )}
                {inferState === 'done' && (
                  <span className="text-emerald-600 font-semibold">
                    {language === 'en' ? '✓ AI has auto-filled the fields — edit them or click "Restore AI Suggestion"' : '✓ AI 已自动预填，可修改或点「恢复 AI 建议」'}
                  </span>
                )}
                {inferState === 'error' && (
                  <span className="text-amber-600 font-semibold">
                    {inferErrorReason && /quota|配额|冷却/i.test(inferErrorReason)
                      ? (language === 'en'
                          ? 'AI free quota is temporarily exhausted (cooling down ~90s) — please wait a moment and retry, or fill in the fields manually for now.'
                          : 'AI 免费额度暂时用尽（冷却约 90 秒），请稍后重试，或先手动填写成本与收入项目。')
                      : (language === 'en' ? 'AI is temporarily unavailable — please select the industry manually and fill in the cost/revenue items yourself.' : 'AI 暂时不可用，请手动选择行业并自行填写成本与收入项目。')}
                    <button
                      type="button"
                      onClick={() => formData.projectName.trim().length >= 2 && handleProjectNameChange(formData.projectName)}
                      className="ml-1 underline font-bold hover:text-amber-700 cursor-pointer"
                    >
                      {language === 'en' ? 'Retry' : '重新推算'}
                    </button>
                  </span>
                )}
              </div>
            </div>

            {/* 公司注册所在国家/地区：放在第一步，因为它直接决定主报告币种，
                并作为后面「全球化经营成本」区域税收/注册/签证参考值的唯一权威信号源。 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>{language === 'en' ? 'Company Registration Country / Region' : '公司注册所在国家/地区'}</span>
              </label>
              <SearchableSelect
                value={formData.regionCountry}
                onChange={handleRegionCountryChange}
                options={countryOptions}
                placeholder={language === 'en' ? '-- Select where your company is registered --' : '-- 请选择公司注册所在国家/地区 --'}
                controlClassName="w-full p-3 border-2 border-teal-200 rounded-2xl font-bold text-slate-900 bg-white"
                isClearable
              />
              <p className="text-[12px] text-slate-500 mt-1">
                {language === 'en'
                  ? 'Determines your base currency and the tax/registration/visa reference values shown later — you can still override any of them yourself.'
                  : '将决定主报告币种，以及后面「全球化经营成本」区域的税收/注册/签证参考值——你随时可以在下方自行修改覆盖。'}
              </p>
            </div>

            {/* 所处阶段：决定后面是「填真实数字体检」还是「先估算未来」 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                <span>{language === 'en' ? 'Current stage' : '目前所处阶段'}</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  (
                    language === 'en'
                      ? [
                          { value: 'not_started', label: 'Not started', desc: 'Not open yet — estimate cost and target earnings first' },
                          { value: 'has_prototype', label: 'Have a prototype', desc: 'Tried on a small scale, no stable revenue yet' },
                          { value: 'has_revenue', label: 'Have revenue', desc: 'Currently operating, want a real-numbers check-up' }
                        ]
                      : [
                          { value: 'not_started', label: '尚未启动', desc: '还没开业，先估算成本和要赚多少' },
                          { value: 'has_prototype', label: '已有原型', desc: '小范围试过，还没稳定营收' },
                          { value: 'has_revenue', label: '已有营收', desc: '正在经营，想体检真实数字' }
                        ]
                  ) as { value: BusinessStage; label: string; desc: string }[]
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
                  {language === 'en'
                    ? "You don't have real revenue yet — just enter the next numbers as estimates/assumptions; the system will clearly label them as such."
                    : '你还没有真实营收，下一步的数字都当作「预估/假设」来填即可，系统会明确标注这是假设。'}
                </p>
              )}
            </div>

            {/* AI 推断结果摘要 */}
            {inferState === 'done' && formData.projectName.trim().length >= 2 && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>
                    {language === 'en'
                      ? `AI has auto-configured based on "${formData.projectName.trim()}"`
                      : `AI 已根据「${formData.projectName.trim()}」完成自动配置`}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-900">
                  <div className="p-2.5 rounded-xl bg-white/70 border border-emerald-100">
                    <span className="text-emerald-600 block font-bold text-[12px] uppercase tracking-wider mb-0.5">{language === 'en' ? 'Industry' : '所属行业'}</span>
                    <span className="font-bold">{industryLabel}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 border border-emerald-100">
                    <span className="text-emerald-600 block font-bold text-[12px] uppercase tracking-wider mb-0.5">{language === 'en' ? 'Base Currency' : '主报告币种'}</span>
                    <span className="font-bold">{formData.baseCurrency}</span>
                  </div>
                </div>
                <p className="text-[13px] text-emerald-700">
                  {language === 'en'
                    ? 'Cost structure and estimated revenue have also been pre-filled — you can edit them to your real numbers in the next step.'
                    : '成本结构与预估流水也已预填，下一步可直接修改成你的真实数字。'}
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
                  {language === 'en' ? 'Advanced Settings (Currency / Industry / Exchange Rate / Safe Mode)' : '高级设置（币种 / 行业 / 汇率 / 安全模式）'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {showAdvanced && (
                <div className="p-4 sm:p-5 space-y-6 text-xs bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        {language === 'en' ? 'Industry Type' : '所属行业类型'} <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        value={formData.industry}
                        onChange={handleIndustryChange}
                        options={industryOptions}
                        placeholder={language === 'en' ? '-- Select industry --' : '-- 请选择行业 --'}
                        controlClassName="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-800 bg-white"
                      />
                      {formData.industry === CUSTOM_INDUSTRY_VALUE && (
                        <input
                          type="text"
                          placeholder={language === 'en' ? 'Please enter your industry' : '请输入所属行业领域'}
                          value={customIndustry}
                          onChange={(e) => handleCustomIndustryInput(e.target.value)}
                          className="mt-2 w-full p-2.5 border-2 border-teal-300 rounded-xl font-medium text-slate-800"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        {language === 'en' ? 'Base Currency' : '主报告币种 (Base Currency)'} <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        value={formData.baseCurrency}
                        onChange={handleCurrencyChange}
                        options={currencyOptions}
                        placeholder={language === 'en' ? '-- Select currency --' : '-- 请选择币种 --'}
                        controlClassName="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 bg-white"
                      />
                      {formData.baseCurrency === CUSTOM_CURRENCY_VALUE && (
                        <input
                          type="text"
                          placeholder={language === 'en' ? 'Enter a 3-letter currency code, e.g. SLE / MVR / PGK' : '请输入 3 字母币种代码，例如：SLE / MVR / PGK'}
                          value={customCurrencyCode}
                          onChange={(e) => handleCustomCurrencyInput(e.target.value)}
                          className="mt-2 w-full p-2.5 border-2 border-teal-300 rounded-xl font-bold text-slate-800"
                        />
                      )}
                      <p className="text-[13px] text-slate-400 mt-1">
                        {language === 'en'
                          ? 'All other currency amounts will automatically be converted to this base currency using the exchange rate.'
                          : '后续所有其他币种金额将自动依据汇率折算为该主币种。'}
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
                      <span>{language === 'en' ? 'This country has multiple exchange rates (official rate differs greatly from the informal/actual rate)' : '本国存在多重汇率（官方汇率与民间/实际兑换汇率差距悬殊）'}</span>
                    </label>

                    {formData.hasMultipleRates && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">
                            {language === 'en' ? 'Actual exchange rate (1 USD ≈ how much local currency)' : '实际兑换汇率数值 (1 USD ≈ 多少当地货币)'}
                          </label>
                          <NumberField
                            placeholder=""
                            value={formData.customExchangeRateValue || 0}
                            onChange={(v) => updateField('customExchangeRateValue', v)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">{language === 'en' ? 'Rate type and source' : '汇率类型与来源说明'}</label>
                          <input
                            type="text"
                            placeholder={language === 'en' ? 'e.g. daily rate from local chamber of commerce / street cash exchange rate' : '例如：当地商会日常兑换价 / 街区现金汇兑价'}
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
                            {language === 'en' ? 'Sensitive Region Safe Mode' : '敏感地区数据安全模式 (Sensitive Safe Mode)'}
                          </span>
                          <span className="text-[12px] bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                            {language === 'en' ? 'P0 Core Protection' : 'P0 核心保障'}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-600 leading-relaxed">
                          {language === 'en'
                            ? 'For users in regions with sensitive information disclosure or strict regulation. Enabling this automatically triggers: geo-anonymization, original documents optional, original images discarded after OCR, and a data-minimization note added to the report — this never affects your score.'
                            : '适合身处外部信息披露敏感、监管严苛地区的用户。开启后自动触发：地理信息脱敏、原始凭证全选填、OCR 后原图不保留、报告加注数据最小化说明——绝不影响得分。'}
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
                            {language === 'en' ? 'Country / Macro Region (no specific city required)' : '所在国家 / 宏观大区（不要求具体城市）'}
                          </label>
                          <input
                            type="text"
                            placeholder={language === 'en' ? 'e.g. North Africa/Middle East region or Southeast Asia' : '例如：北非/中东大区 或 东南亚地区'}
                            value={formData.regionCountry}
                            onChange={(e) => updateField('regionCountry', e.target.value)}
                            className="w-full p-2 border border-amber-300 rounded-lg bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-amber-900 font-bold mb-1">
                            {language === 'en' ? 'Contact Channel (anonymous alias or internal ID allowed)' : '联系渠道（允许填写匿名代号或内部ID）'}
                          </label>
                          <input
                            type="text"
                            placeholder={language === 'en' ? 'e.g. Telegram: @coop_rep_09' : '例如：Telegram: @coop_rep_09'}
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

      {/* STEP 2: 赚多少、花多少、兜里有多少现金（清晰分块纵向排版） */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* 待确认汇总：让用户知道还有几项 AI 建议没被采纳。
              刻意不自动采纳 —— 幻觉数字到不了评分引擎的前提，就是必须由用户亲自确认。 */}
          <PendingConfirmationsBar count={pendingSuggestionCount} language={language} />

          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-teal-600" />
                <span>{language === 'en' ? '2. Revenue, expenses & cash on hand' : '2. 赚多少、花多少、兜里有多少现金'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'en'
                  ? 'Enter by category: revenue, costs & expenses, cash reserve. AI will calculate break-even and payback periods in real-time.'
                  : '分模块清晰录入：收入、成本与开支、现金备用金，AI 实时计算保本与回本。'}
              </p>
            </div>

            {/* 清晰模块化纵向流式排版 */}
            <div className="flex flex-col space-y-6">

              {/* —— 模块 1：赚多少（收入模块） —— */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-100 pb-3">
                  <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'en' ? '1. Revenue (Monthly Income)' : '1. 赚多少（每月收入）'}</span>
                  </h4>
                  <span className="text-[12px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                    {language === 'en' ? 'Monthly Inflow' : '月度现金流入'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* F8 经营月均总流水 */}
                  <div className="p-4 rounded-xl bg-white border-2 border-teal-200 shadow-2xs space-y-2.5 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <label className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{language === 'en' ? 'Average Monthly Total Revenue' : '经营月均总流水'}</span>
                          <span className="text-[12px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded-full">
                            {language === 'en' ? 'Total Turnover' : '总营业额'}
                          </span>
                          <InfoTooltip language={language} text={language === 'en'
                            ? 'In plain terms: all the cash customers pay into your pocket, before deducting purchasing, rent and labor! If you have church subsidies, charity donations or relief funds, list them separately below so they are not mistakenly counted as real operating revenue.'
                            : '大白话：客人买单进你口袋的全部毛钱，尚未扣除进货、房租与人工！若有教会补助、慈善捐赠或救济资金，请在下方单独列出，不会被误计入真实经营占比。'} />
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenAiHelper?.(language === 'en' ? 'Is average monthly total revenue income or something else?' : '经营月均总流水是收入还是什么？')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-800 text-[13px] font-bold transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-teal-600" />
                          <span>{language === 'en' ? 'Ask AI' : 'AI解答'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenAiHelper?.(language === 'en' ? 'What are the average revenue and profit benchmarks across industries?' : '各行业大数据平均流水与利润基准是多少？')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[13px] font-bold transition-colors cursor-pointer"
                        >
                          <BarChart3 className="w-3 h-3 text-emerald-700" />
                          <span>{language === 'en' ? 'Check Benchmarks' : '查基准'}</span>
                        </button>
                        <SearchableSelect
                          value={formData.monthlyRevenue.currency}
                          onChange={(v) => updateMoney('monthlyRevenue', formData.monthlyRevenue.amount, v as CurrencyCode)}
                          options={compactCurrencyOptions}
                          placeholder={language === 'en' ? 'Currency' : '币种'}
                          controlClassName="px-2 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-700 text-xs shadow-2xs whitespace-nowrap"
                        />
                      </div>
                    </div>
                    <NumberField
                      inputMode="numeric"
                      min={0}
                      placeholder={language === 'en' ? 'e.g. 50000' : '例如 50000'}
                      value={formData.monthlyRevenue.amount}
                      onChange={(v) => updateMoney('monthlyRevenue', v)}
                      className="w-full p-3 border-2 border-teal-200 focus:border-teal-600 rounded-xl font-black text-slate-900 text-base bg-white shadow-2xs"
                    />
                    {formData.monthlyRevenue.amount > 0 && (
                      <p className="text-[13px] text-teal-700 font-semibold">
                        {language === 'en'
                          ? `Real operating revenue auto-synced to ${formatMoney(formData.monthlyRealOperatingRevenue.amount, formData.monthlyRealOperatingRevenue.currency)} (total revenue − external grants)`
                          : `真实经营收入已自动同步为 ${formatMoney(formData.monthlyRealOperatingRevenue.amount, formData.monthlyRealOperatingRevenue.currency)}（总流水 − 外部赠款）`}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 真实客户主营销售收入 */}
                    <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                            <span>{language === 'en' ? 'Of which: real customer sales revenue' : '其中：真实客户主营销售收入'}</span>
                            <InfoTooltip language={language} text={language === 'en' ? 'Business revenue truly paid by customers, excluding any loans from friends/family or relief subsidies.' : '排除任何亲友借款、救济补贴后，真正由客户买单带来的生意收入。'} />
                          </label>
                        </div>
                        <SearchableSelect
                          value={formData.monthlyRealOperatingRevenue.currency}
                          onChange={(v) =>
                            updateMoney('monthlyRealOperatingRevenue', formData.monthlyRealOperatingRevenue.amount, v as CurrencyCode)
                          }
                          options={codeOnlyCurrencyOptions}
                          placeholder={language === 'en' ? 'Currency' : '币种'}
                          controlClassName="px-2 py-1 rounded border border-emerald-300 font-bold bg-white text-emerald-900 whitespace-nowrap"
                        />
                      </div>
                      <NumberField
                        inputMode="numeric"
                        min={0}
                        value={formData.monthlyRealOperatingRevenue.amount}
                        onChange={(v) => updateMoney('monthlyRealOperatingRevenue', v)}
                        className="w-full p-2.5 border border-emerald-300 rounded-xl font-bold text-emerald-950 bg-white"
                      />
                    </div>

                    {/* 外部支持款 / 机构赠款 */}
                    <div className="p-4 rounded-xl bg-white border border-amber-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-bold text-amber-950">
                            {language === 'en' ? 'Of which: external support / institutional grants' : '其中：外部支持款 / 机构赠款'}
                          </label>
                        </div>
                        <SearchableSelect
                          value={formData.monthlyExternalGrants.currency}
                          onChange={(v) =>
                            updateMoney('monthlyExternalGrants', formData.monthlyExternalGrants.amount, v as CurrencyCode)
                          }
                          options={codeOnlyCurrencyOptions}
                          placeholder={language === 'en' ? 'Currency' : '币种'}
                          controlClassName="px-2 py-1 rounded border border-amber-300 font-bold bg-white text-amber-900 whitespace-nowrap"
                        />
                      </div>
                      <NumberField
                        inputMode="numeric"
                        min={0}
                        placeholder={language === 'en' ? 'Enter 0 if none' : '无则填 0'}
                        value={formData.monthlyExternalGrants.amount}
                        onChange={(v) => updateMoney('monthlyExternalGrants', v)}
                        className="w-full p-2.5 border border-amber-300 rounded-xl font-bold text-amber-950 bg-white"
                      />
                      <p className="text-[12px] text-amber-700">
                        {language === 'en'
                          ? 'Church subsidies, charity donations or relief funds listed here will not be miscounted as real customer revenue.'
                          : '教会补助、慈善捐赠或救济资金单独列出，不会误计为真实经营占比。'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>


              {/* —— 模块 2：花多少（成本与开支模块） —— */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50/70 to-slate-50 border border-rose-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-rose-100 pb-3">
                  <h4 className="text-sm font-black text-rose-950 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-rose-600" />
                    <span>{language === 'en' ? '2. Costs & Expenses (Monthly Outflow)' : '2. 花多少（每月成本与开支）'}</span>
                  </h4>
                  <span className="text-[12px] bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full">
                    {language === 'en' ? 'Monthly Expenses' : '月度运营开支'}
                  </span>
                </div>

                {/* F10 COGS —— 只保留「按行业细分的物料成本细则」这一份录入，不再另设重复的总额白框，
                    避免用户改了总额框、AI 分析却仍按细则计算、毫无变化的困惑。明细合计即月度变动成本，
                    自动作为后续 AI 分析的数据来源。 */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
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
                    <button
                      type="button"
                      onClick={() => onOpenAiHelper?.(language === 'en' ? 'How is cost of goods sold (COGS) calculated? Does it include freight?' : '进货成本（COGS）怎么算？包含运费吗？')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-[13px] font-bold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-teal-600" />
                      <span>{language === 'en' ? 'Ask AI' : 'AI咨询'}</span>
                    </button>
                  </div>

                  {/* 按行业细分的动态物料成本细则（AI 推断，可自由增删改） */}
                  <div className="mt-1 p-3 rounded-xl bg-rose-50/50 border border-dashed border-rose-300 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-black text-rose-900">
                        {language === 'en' ? 'Industry-specific material cost line items (add/remove/edit)' : '按行业细分的物料成本细则（可增删改）'}
                        {cogsTouched && (
                          <span className="ml-1.5 inline-block text-[11px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold align-middle">{language === 'en' ? 'Manually adjusted' : '已手动调整'}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={restoreAiSuggestion}
                        className="text-[12px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold hover:bg-rose-200 cursor-pointer"
                      >
                        <RefreshCw className="inline w-3 h-3 mr-0.5" />{language === 'en' ? 'Restore AI Suggestion' : '恢复 AI 建议'}
                      </button>
                    </div>
                    <span className="text-[12px] text-rose-700">{language === 'en' ? 'The total of the line items below is your monthly material (variable) cost, and is what feeds the AI analysis directly.' : '以下逐项合计即为每月物料（变动）成本，将直接用于 AI 分析。'}</span>
                    {(formData.dynamicCogsItems || []).map((it) => (
                      <div key={it.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={it.label}
                          onChange={(e) => updateDynamicCogsItem(it.id, { label: e.target.value })}
                          className="flex-1 min-w-0 p-1.5 border border-rose-200 rounded-lg font-semibold text-slate-800"
                        />
                        <NumberField
                          value={it.value}
                          onChange={(v) => updateDynamicCogsItem(it.id, { value: v })}
                          className="w-24 shrink-0 p-1.5 border border-rose-200 rounded-lg font-mono font-semibold text-right"
                          placeholder={it.suggestedAmount ? `${language === 'en' ? 'AI suggests' : 'AI建议'} ${it.suggestedAmount}` : (language === 'en' ? 'Amount' : '金额')}
                          title={it.suggestedAmount ? (language === 'en' ? `AI suggested reference amount: ${it.suggestedAmount} (for reference only, please fill in your real figure)` : `AI 建议参考金额：${it.suggestedAmount}（仅供参考，请填你的真实数字）`) : (language === 'en' ? 'Please fill in your real monthly amount' : '请填你的真实月度金额')}
                        />
                        <span className="text-[12px] text-rose-700 whitespace-nowrap shrink-0 pl-0.5">{formData.baseCurrency}/{language === 'en' ? 'mo' : '月'}</span>
                        {it.suggestedAmount ? (
                          <FieldProvenanceBadge
                            confidence={isReviewedByUser(it) ? 'confirmed' : 'suggested'}
                            language={language}
                          />
                        ) : null}
                        <button type="button" onClick={() => removeDynamicCogsItem(it.id)} className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      <button type="button" onClick={addDynamicCogsItem} className="text-[12px] px-2 py-1 rounded border border-rose-300 text-rose-700 font-bold hover:bg-rose-100 cursor-pointer">
                        {language === 'en' ? '+ Add material cost item' : '＋ 添加物料成本项'}
                      </button>
                      <span className="text-[13px] font-black text-rose-900">
                        {language === 'en' ? 'Total:' : '合计：'}{' '}
                        {(formData.dynamicCogsItems || []).reduce((sum, it) => sum + (Number(it.value) || 0), 0)}{' '}
                        {formData.baseCurrency}/{language === 'en' ? 'mo' : '月'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 固定开销网格 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800">{language === 'en' ? 'Rent & Property' : '场地租金与物业'}</label>
                      <span className="text-[13px] text-slate-400">{formData.rentCost.currency}/{language === 'en' ? 'mo' : '月'}</span>
                    </div>
                    <NumberField
                      inputMode="numeric"
                      min={0}
                      value={formData.rentCost.amount}
                      onChange={(v) => updateMoney('rentCost', v)}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800">{language === 'en' ? 'Staff Wages & Labor Costs' : '员工工资与人工支出'}</label>
                      <span className="text-[13px] text-slate-400">{formData.laborCost.currency}/{language === 'en' ? 'mo' : '月'}</span>
                    </div>
                    <NumberField
                      inputMode="numeric"
                      min={0}
                      value={formData.laborCost.amount}
                      onChange={(v) => updateMoney('laborCost', v)}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800">{language === 'en' ? 'Utilities, Internet & Misc.' : '水电网络杂费'}</label>
                      <span className="text-[13px] text-slate-400">{formData.utilityCost.currency}/{language === 'en' ? 'mo' : '月'}</span>
                    </div>
                    <NumberField
                      inputMode="numeric"
                      min={0}
                      value={formData.utilityCost.amount}
                      onChange={(v) => updateMoney('utilityCost', v)}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800">{language === 'en' ? 'Taxes & Fees' : '税金及规费'}</label>
                      <span className="text-[13px] text-slate-400">{formData.taxCost.currency}/{language === 'en' ? 'mo' : '月'}</span>
                    </div>

                    {dynamicTaxTotal > 0 || (formData.dynamicTaxItems || []).length > 0 ? (
                      <div className="space-y-1.5">
                        {(formData.dynamicTaxItems || []).map((it) => (
                          <div key={it.id} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={it.label}
                              onChange={(e) => updateDynamicTaxItem(it.id, { label: e.target.value })}
                              className="flex-1 min-w-0 p-1.5 border border-slate-200 rounded-lg text-[12px] font-semibold text-slate-800"
                            />
                            <NumberField
                              value={it.value}
                              onChange={(v) => updateDynamicTaxItem(it.id, { value: v })}
                              className="w-20 shrink-0 p-1.5 border border-slate-200 rounded-lg font-mono font-semibold text-right"
                            />
                            <button type="button" onClick={() => removeDynamicTaxItem(it.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center justify-between flex-wrap gap-1.5 pt-0.5">
                          <button type="button" onClick={() => addDynamicTaxItem()} className="text-[11px] px-2 py-0.5 rounded border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer">
                            {language === 'en' ? '+ Add item' : '＋ 添加分项'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { updateField('dynamicTaxItems', []); }}
                            className="text-[11px] text-slate-400 underline hover:text-slate-600 cursor-pointer"
                          >
                            {language === 'en' ? 'Switch back to a single number' : '改回单一数字填写'}
                          </button>
                        </div>
                        <div className="text-[12px] font-black text-slate-800 pt-0.5 border-t border-slate-100">
                          {language === 'en' ? 'Total (used in analysis):' : '合计（计入分析）：'} {dynamicTaxTotal} {formData.taxCost.currency}/{language === 'en' ? 'mo' : '月'}
                        </div>
                      </div>
                    ) : (
                      <>
                        <NumberField
                          inputMode="numeric"
                          min={0}
                          value={formData.taxCost.amount}
                          onChange={(v) => updateMoney('taxCost', v)}
                          className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                        />
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={startTaxBreakdown}
                            className="text-[11px] px-2 py-0.5 rounded border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                          >
                            {language === 'en' ? '+ Break down (VAT / surtax / income tax / annual dues)' : '＋ 展开明细（增值税/附加税/所得税预估/年度规费按月摊）'}
                          </button>
                          {formData.taxCost.amount > 0 && (
                            <button
                              type="button"
                              onClick={() => updateMoney('taxCost', Math.round((Number(formData.taxCost.amount) || 0) / 12))}
                              className="text-[11px] px-2 py-0.5 rounded border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                              title={language === 'en' ? 'I entered an annual amount — convert to monthly' : '我填的是年度金额，帮我换算成月度'}
                            >
                              {language === 'en' ? '÷12 (annual → monthly)' : '按年填的？÷12 换算成月度'}
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {/* 反馈问题1第1/3层：默认值应有来源标注，数据不全时诚实告知，而不是一个空白框；
                        这里复用「全球化经营成本」区域已算好的 regulatoryEstimate，同一份数据、同一处地区选择。 */}
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      {formData.regionCountry
                        ? (language === 'en'
                            ? `Reference for ${regulatoryEstimate.countryLabel}: ${regulatoryEstimate.corporateTaxRateHint}. ${regulatoryEstimate.sourceNote}`
                            : `${regulatoryEstimate.countryLabel}参考：${regulatoryEstimate.corporateTaxRateHint}。${regulatoryEstimate.sourceNote}`)
                        : (language === 'en'
                            ? 'No local tax-rate data yet — pick your country/region below in "Global Operating Costs" for a reference range, or consult a local tax authority/accountant before filling this in.'
                            : '暂无你所在地区的税率参考数据：请在下方「全球化经营成本」区域选择所在国家/地区查看参考区间，或直接咨询当地税务机构/会计师后填写。')}
                    </p>

                    {renderInlineAnomalies('taxCost')}
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white col-span-1 sm:col-span-2 lg:col-span-2">
                    <div className="flex justify-between mb-1">
                      <label className="font-bold text-slate-800">{language === 'en' ? 'Monthly Debt Repayment (Principal & Interest)' : '每月偿还债务本息'}</label>
                      <span className="text-[13px] text-slate-400">{formData.existingDebtMonthlyPayment.currency}/{language === 'en' ? 'mo' : '月'}</span>
                    </div>
                    <NumberField
                      inputMode="numeric"
                      min={0}
                      placeholder={language === 'en' ? 'Enter 0 if no debt' : '无债务填 0'}
                      value={formData.existingDebtMonthlyPayment.amount}
                      onChange={(v) => updateMoney('existingDebtMonthlyPayment', v)}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>
                </div>

                {/* AI 按行业推断的运营开支补充项：上方白色栏目（房租/人工/水电）是各行业通用的固定成本，予以保留；
                    这里不是对白色栏目的重复拆解，而是该行业在此基础上通常还会有的额外开支（如排烟维护、消杀等），
                    两者相加计入总运营开支，不会互相覆盖。 */}
                {(formData.dynamicOpexItems || []).length > 0 && (
                  <div className="p-3 rounded-xl bg-white border border-dashed border-slate-300 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-black text-slate-900">
                        {language === 'en' ? 'Industry-specific additional operating expenses, on top of the fields above (add/remove/edit)' : '在上方固定开销基础上，按行业补充的额外运营开支（可增删改）'}
                        {opexTouched && (
                          <span className="ml-1.5 inline-block text-[11px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold align-middle">{language === 'en' ? 'Manually adjusted' : '已手动调整'}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={restoreAiSuggestion}
                        className="text-[12px] px-2 py-0.5 rounded bg-teal-100 text-teal-700 font-bold hover:bg-teal-200 cursor-pointer"
                      >
                        <RefreshCw className="inline w-3 h-3 mr-0.5" />{language === 'en' ? 'Restore AI Suggestion' : '恢复 AI 建议'}
                      </button>
                    </div>
                    <span className="text-[12px] text-slate-500">
                      {language === 'en'
                        ? 'These are added to Rent/Wages/Utilities above (not a re-breakdown of them) to form the total monthly operating expense used in the AI analysis.'
                        : '以下条目会与上方「场地租金/员工工资/水电杂费」相加（而非重复拆解它们），合计构成 AI 分析所用的每月运营开支总额。'}
                    </span>
                    {(formData.dynamicOpexItems || []).map((it) => (
                      <div key={it.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={it.label}
                          onChange={(e) => updateDynamicOpexItem(it.id, { label: e.target.value })}
                          className="flex-1 min-w-0 p-1.5 border border-teal-200 rounded-lg font-semibold text-slate-800"
                        />
                        <NumberField
                          min={0}
                          value={it.value}
                          onChange={(v) => updateDynamicOpexItem(it.id, { value: Math.max(0, v) })}
                          className="w-24 shrink-0 p-1.5 border border-teal-200 rounded-lg font-mono font-semibold text-right"
                          placeholder={it.suggestedAmount ? `${language === 'en' ? 'AI suggests' : 'AI建议'} ${it.suggestedAmount}` : (language === 'en' ? 'Amount' : '金额')}
                          title={it.suggestedAmount ? (language === 'en' ? `AI suggested reference amount: ${it.suggestedAmount} (for reference only, please fill in your real figure)` : `AI 建议参考金额：${it.suggestedAmount}（仅供参考，请填你的真实数字）`) : (language === 'en' ? 'Please fill in your real monthly amount' : '请填你的真实月度金额')}
                        />
                        <span className="text-[12px] text-teal-700 whitespace-nowrap shrink-0 pl-0.5">{formData.baseCurrency}/{language === 'en' ? 'mo' : '月'}</span>
                        {it.suggestedAmount ? (
                          <FieldProvenanceBadge
                            confidence={isReviewedByUser(it) ? 'confirmed' : 'suggested'}
                            language={language}
                          />
                        ) : null}
                        <button type="button" onClick={() => removeDynamicOpexItem(it.id)} className="p-1 text-teal-500 hover:text-teal-700 cursor-pointer shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      <button type="button" onClick={addDynamicOpexItem} className="text-[12px] px-2 py-1 rounded border border-teal-300 text-teal-700 font-bold hover:bg-teal-100 cursor-pointer">
                        {language === 'en' ? '+ Add operating expense item' : '＋ 添加运营开支项'}
                      </button>
                      <span className="text-[13px] font-black text-slate-900">
                        {language === 'en' ? 'Rent+Wages+Utilities+Supplement total:' : '房租+工资+水电+补充项 合计：'}{' '}
                        {(
                          (Number(formData.rentCost.amount) || 0) +
                          (Number(formData.laborCost.amount) || 0) +
                          (Number(formData.utilityCost.amount) || 0) +
                          (formData.dynamicOpexItems || []).reduce((sum, it) => sum + (Number(it.value) || 0), 0)
                        )}{' '}
                        {formData.baseCurrency}/{language === 'en' ? 'mo' : '月'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 全球化经营成本——税收/签证/设备折旧/公司注册 */}
                <div className="p-4 rounded-2xl bg-white border border-violet-200 space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-violet-600" />
                    <span className="font-black text-violet-950">{language === 'en' ? 'Global Operating Costs (Registration/Visa/Depreciation)' : '全球化经营成本（注册/签证/折旧）'}</span>
                    {formData.regionCountry ? (
                      <span className="text-[12px] bg-violet-200 text-violet-900 font-bold px-1.5 py-0.5 rounded">
                        {language === 'en' ? `AI reference for ${regulatoryEstimate.countryLabel}` : `AI 已给出 ${regulatoryEstimate.countryLabel} 参考值`}
                      </span>
                    ) : (
                      <span className="text-[12px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                        {language === 'en' ? 'Country not selected — showing generic reference' : '尚未选择国家 — 当前为通用参考值'}
                      </span>
                    )}
                  </div>

                  {/* 反馈：以前完全没有让用户明确选所在国家/地区，只能靠猜店名，
                      导致这里给出的税收/注册/签证参考值数据来源不透明。改为显式下拉选择，
                      作为上面 regulatoryEstimate 的唯一权威信号源；不选时诚实标注"通用参考值"。 */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      {language === 'en' ? 'Country / Region Located' : '所在国家/地区'}
                    </label>
                    <SearchableSelect
                      value={formData.regionCountry}
                      onChange={handleRegionCountryChange}
                      options={countryOptions}
                      placeholder={language === 'en' ? '-- Select your country/region --' : '-- 请选择所在国家/地区 --'}
                      controlClassName="w-full p-2 border border-violet-300 rounded-lg font-semibold text-slate-900 bg-white"
                      isClearable
                    />
                    <p className="text-[12px] text-slate-500 mt-1">
                      {language === 'en'
                        ? 'Changing it here also switches your base currency to match — never affects your score, and you can still edit every number.'
                        : '在此修改也会同步切换主报告币种为该国货币——绝不影响得分，所有数字你都可以核实后自由修改。'}
                    </p>
                  </div>

                  {/* 国家已经选好了，这里精确到省/州：用 country-state-city（现成的省/州数据库）
                      按上面选定国家的 ISO2 代码查询，不用自己维护一份国家->省州的列表。
                      该国在库里没有省/州细分数据时（如欧盟/西非法郎区这类跨国货币区），
                      退化为自由文本填写，仍然写入同一个 regionDetail 字段。 */}
                  {formData.regionCountry && (
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        {language === 'en' ? 'State / Province' : '省/州'}
                      </label>
                      {statesForRegionCountry.length > 0 ? (
                        <SearchableSelect
                          value={formData.regionDetail}
                          onChange={(v) => updateField('regionDetail', v)}
                          options={stateOptions}
                          placeholder={language === 'en' ? '-- Select state/province (optional) --' : '-- 请选择省/州（可选）--'}
                          controlClassName="w-full p-2 border border-violet-300 rounded-lg font-semibold text-slate-900 bg-white"
                          isClearable
                        />
                      ) : (
                        <input
                          type="text"
                          value={formData.regionDetail}
                          onChange={(e) => updateField('regionDetail', e.target.value)}
                          placeholder={
                            language === 'en'
                              ? 'This region has no state/province list — enter manually (optional)'
                              : '该地区暂无省/州列表，可手动填写（可选）'
                          }
                          className="w-full p-2 border border-violet-300 rounded-lg font-medium text-slate-900 bg-white"
                        />
                      )}
                    </div>
                  )}

                  <p className="text-[13px] text-violet-700 leading-relaxed">
                    {regulatoryEstimate.corporateTaxRateHint}
                    {language === 'en' ? '. Below are AI reference estimates — update to your real figures:' : '。以下为 AI 参考估值，请核实后修改为你的真实数字：'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 公司注册/执照费用 */}
                    <div className="p-3 rounded-xl bg-violet-50/40 border border-violet-200 space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <label className="font-bold text-slate-800 text-[12px]">
                          {language === 'en' ? 'Registration/License Fee' : '公司注册/执照年检费'}
                          <span className="text-[11px] text-slate-400 font-normal"> ({formData.companyRegistrationCost.currency}, {language === 'en' ? 'one-time/annual' : '一次性/年度'})</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => updateMoney('companyRegistrationCost', regulatoryEstimate.registrationLocal)}
                          className="text-[11px] underline text-violet-700 font-bold hover:text-violet-900 cursor-pointer"
                        >
                          {language === 'en' ? 'Use AI value' : '填入AI估值'}
                        </button>
                      </div>
                      <NumberField
                        inputMode="numeric"
                        min={0}
                        placeholder={`约 ${regulatoryEstimate.registrationLocal}`}
                        value={formData.companyRegistrationCost.amount}
                        onChange={(v) => updateMoney('companyRegistrationCost', v)}
                        className="w-full p-2 border border-violet-200 rounded-lg font-semibold text-slate-900 bg-white"
                      />
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span>{language === 'en' ? 'Amortize over' : '分摊'}</span>
                        <NumberField
                          min={1}
                          value={formData.companyRegistrationAmortizationMonths}
                          onChange={(v) => updateField('companyRegistrationAmortizationMonths', v)}
                          className="w-12 p-0.5 border border-violet-200 rounded text-center bg-white font-bold"
                        />
                        <span>{language === 'en' ? 'months' : '个月'}</span>
                      </div>
                    </div>

                    {/* 签证与工作许可费用 */}
                    <div className="p-3 rounded-xl bg-violet-50/40 border border-violet-200 space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <label className="font-bold text-slate-800 text-[12px]">
                          {language === 'en' ? 'Visa & Work Permits' : '签证与工作许可费用'}
                          <span className="text-[11px] text-slate-400 font-normal"> ({formData.visaFeeCost.currency}, {language === 'en' ? 'total' : '总额'})</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => updateMoney('visaFeeCost', regulatoryEstimate.visaLocal)}
                          className="text-[11px] underline text-violet-700 font-bold hover:text-violet-900 cursor-pointer"
                        >
                          {language === 'en' ? 'Use AI value' : '填入AI估值'}
                        </button>
                      </div>
                      <NumberField
                        inputMode="numeric"
                        min={0}
                        placeholder={`约 ${regulatoryEstimate.visaLocal}`}
                        value={formData.visaFeeCost.amount}
                        onChange={(v) => updateMoney('visaFeeCost', v)}
                        className="w-full p-2 border border-violet-200 rounded-lg font-semibold text-slate-900 bg-white"
                      />
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span>{language === 'en' ? 'Amortize over' : '分摊'}</span>
                        <NumberField
                          min={1}
                          value={formData.visaFeeAmortizationMonths}
                          onChange={(v) => updateField('visaFeeAmortizationMonths', v)}
                          className="w-12 p-0.5 border border-violet-200 rounded text-center bg-white font-bold"
                        />
                        <span>{language === 'en' ? 'months' : '个月'}</span>
                      </div>
                    </div>

                  </div>

                  {/* 设备月度折旧费：问题5——避免用户自己心算「总设备值 ÷ 预计使用月数」，
                      改为逐台填「设备值 + 预计使用月数」，AI 自动求和汇总月度折旧。 */}
                  <div className="p-3 rounded-xl bg-violet-50/40 border border-violet-200 space-y-2">
                    <label className="font-bold text-slate-800 text-[12px]">
                      {language === 'en' ? 'Equipment Monthly Depreciation' : '设备月度折旧费'}
                      <span className="text-[11px] text-slate-400 font-normal"> ({formData.equipmentDepreciationCost.currency}/{language === 'en' ? 'mo' : '月'})</span>
                    </label>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {language === 'en'
                        ? "Add each piece of equipment with its total value and estimated useful life — the monthly depreciation (value ÷ months) is summed for you."
                        : '逐台填写设备值与预计使用月数，月度折旧（设备值 ÷ 使用月数）由系统自动求和，无需自己心算总设备值。'}
                    </p>
                    {(formData.dynamicEquipmentItems || []).map((it) => (
                      <div key={it.id} className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={it.label}
                          onChange={(e) => updateDynamicEquipmentItem(it.id, { label: e.target.value })}
                          placeholder={language === 'en' ? 'e.g. Machine A' : '例如：机器A'}
                          className="flex-1 min-w-[7rem] p-1.5 border border-violet-200 rounded-lg font-semibold text-slate-800 bg-white"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] text-slate-500">{language === 'en' ? 'Value' : '设备值'}</span>
                          <NumberField
                            min={0}
                            value={it.value}
                            onChange={(v) => updateDynamicEquipmentItem(it.id, { value: v })}
                            className="w-20 p-1.5 border border-violet-200 rounded-lg font-mono font-semibold text-right bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] text-slate-500">÷</span>
                          <NumberField
                            min={1}
                            value={it.usefulLifeMonths}
                            onChange={(v) => updateDynamicEquipmentItem(it.id, { usefulLifeMonths: v })}
                            className="w-14 p-1.5 border border-violet-200 rounded-lg font-mono font-semibold text-right bg-white"
                          />
                          <span className="text-[11px] text-slate-500">{language === 'en' ? 'months' : '个月'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEquipmentSearch(it.label)}
                          title={language === 'en' ? 'Search this equipment online (Google Shopping / marketplace)' : '在网上搜索该设备（谷歌购物/二手市场）'}
                          className="p-1 text-violet-500 hover:text-violet-700 cursor-pointer shrink-0"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => removeDynamicEquipmentItem(it.id)} className="p-1 text-violet-500 hover:text-violet-700 cursor-pointer shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addDynamicEquipmentItem} className="text-[12px] px-2 py-1 rounded border border-violet-300 text-violet-700 font-bold hover:bg-violet-100 cursor-pointer">
                      {language === 'en' ? '+ Add equipment' : '＋ 添加设备'}
                    </button>

                    <div className="pt-1 border-t border-violet-200/70 space-y-1">
                      <label className="font-bold text-slate-800 text-[12px]">
                        {language === 'en' ? 'Other depreciation (supplement, optional)' : '其他补充折旧（可选）'}
                      </label>
                      <NumberField
                        inputMode="numeric"
                        min={0}
                        placeholder={language === 'en' ? 'For small tools not listed above' : '未逐台列出的零散小型设备'}
                        value={formData.equipmentDepreciationCost.amount}
                        onChange={(v) => updateMoney('equipmentDepreciationCost', v)}
                        className="w-full p-2 border border-violet-200 rounded-lg font-semibold text-slate-900 bg-white"
                      />
                    </div>

                    <p className="text-[13px] font-black text-violet-900 pt-1">
                      {language === 'en' ? 'Total monthly depreciation:' : '设备月度折旧合计：'}{' '}
                      {(dynamicEquipmentMonthlyTotal + (Number(formData.equipmentDepreciationCost.amount) || 0)).toFixed(2)}{' '}
                      {formData.equipmentDepreciationCost.currency}/{language === 'en' ? 'mo' : '月'}
                    </p>
                  </div>
                </div>
              </div>


              {/* —— 模块 3：兜里有多少现金 & 初始投入（现金储备与投资模块） —— */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/40 border border-indigo-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-indigo-100 pb-3">
                  <h4 className="text-sm font-black text-indigo-950 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-indigo-600" />
                    <span>{language === 'en' ? '3. Cash Reserve & Initial Investment' : '3. 兜里现金 & 初始投入'}</span>
                  </h4>
                  <span className="text-[12px] bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full">
                    {language === 'en' ? 'Capital & Liquidity' : '资本与资金链储备'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 可用现金备用金 */}
                  <div className="p-4 rounded-xl bg-white border-2 border-emerald-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <label className="font-black text-slate-900 flex items-center gap-1 text-xs">
                        <span>{language === 'en' ? 'Current Available Cash Reserve' : '当前可用现金备用金'}</span>
                      </label>
                      <span className="text-xs font-bold text-slate-500">
                        {formData.cashAndLiquidAssets.currency}
                        {language === 'en' ? ' (balance, not periodic)' : '（当前余额，非周期性）'}
                      </span>
                    </div>
                    <NumberField
                      inputMode="numeric"
                      min={0}
                      value={formData.cashAndLiquidAssets.amount}
                      onChange={(v) => updateMoney('cashAndLiquidAssets', v)}
                      className="w-full p-2.5 border border-emerald-300 rounded-xl font-black text-emerald-900 text-base bg-white"
                    />
                    <p className="text-[12px] text-slate-500">
                      {language === 'en'
                        ? 'Includes bank deposits and mobile money that can cover urgent operational risks.'
                        : '包含可随时支取的银行存款、移动支付资金等，用于抵御风险。'}
                    </p>
                  </div>

                  {/* 初始投资估算 */}
                  <div className="p-4 rounded-xl bg-white border border-amber-300 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-900 flex items-center gap-1 text-xs">
                        <Target className="w-3.5 h-3.5 text-amber-600" />
                        <span>{language === 'en' ? 'Initial Investment Estimate' : '初始投资估算（一次性投入）'}</span>
                      </label>
                      <span className="text-xs font-bold text-slate-500">
                        {formData.initialInvestmentEstimate.currency}
                        {language === 'en' ? ' (one-time)' : '（一次性）'}
                      </span>
                    </div>
                    <NumberField
                      inputMode="numeric"
                      min={0}
                      placeholder={language === 'en' ? 'renovation + equipment + stock' : '例如：装修+设备+首批进货'}
                      value={formData.initialInvestmentEstimate.amount}
                      onChange={(v) => updateMoney('initialInvestmentEstimate', v)}
                      className="w-full p-2.5 border border-amber-300 rounded-xl font-bold text-amber-900 bg-white"
                    />
                    <p className="text-[12px] text-amber-700">
                      {language === 'en'
                        ? 'Used by AI to calculate payback period and target revenue below.'
                        : '填入此项后，下方 AI 会自动测算「回本时间」与「目标反推收入」。'}
                    </p>
                    {renderInlineAnomalies('initialInvestmentEstimate')}
                  </div>
                </div>
              </div>


              {/* —— 模块 4：AI 动态测算与风险校验（保本与回本分析） —— */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-50/30 border-2 border-amber-300 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-200 pb-3">
                  <h4 className="text-sm font-black text-amber-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>{language === 'en' ? '4. AI Real-time Financial Analysis & Diagnostics' : '4. AI 实时财务测算与智能校验'}</span>
                  </h4>
                  <span className="text-[12px] bg-amber-200 text-amber-900 font-bold px-2.5 py-0.5 rounded-full">
                    {language === 'en' ? 'Live Auto-Calculations' : 'AI 动态计算'}
                  </span>
                </div>

                {/* AI 算出的保本收入 */}
                {breakEven.hasEnoughData ? (
                  <div className="p-4 rounded-xl bg-white border border-amber-300 space-y-1.5 text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-black text-amber-950 text-sm">{language === 'en' ? 'AI Break-Even Revenue Threshold' : 'AI 算出的保本收入（不亏钱最低线）'}</span>
                      <InfoTooltip
                        language={language}
                        text={
                          language === 'en'
                            ? `Based on monthly cost of ${formatMoney(breakEven.monthlyCostTotal, formData.baseCurrency)} (purchasing + opex + taxes + debt repayment + amortizations), calculated over ${breakEven.operatingDaysPerMonth} operating days.`
                            : `根据你已填的进货、房租人工、税金、还贷与折旧/许可成本合计 ${formatMoney(breakEven.monthlyCostTotal, formData.baseCurrency)} / 月，按每月经营 ${breakEven.operatingDaysPerMonth} 天估算。`
                        }
                      />
                    </div>
                    <p className="text-amber-900 leading-relaxed font-medium">
                      {language === 'en' ? (
                        <>
                          You need to sell at least
                          <span className="text-base font-black text-amber-950 mx-1.5 underline decoration-amber-400 decoration-2">
                            {formatMoney(breakEven.dailyBreakEvenRevenue, formData.baseCurrency)}
                          </span>
                          per day (at least <span className="font-bold">{formatMoney(breakEven.monthlyBreakEvenRevenue, formData.baseCurrency)}</span> per month) to avoid a loss.
                        </>
                      ) : (
                        <>
                          你每天至少要卖到
                          <span className="text-base font-black text-amber-950 mx-1.5 underline decoration-amber-400 decoration-2">
                            {formatMoney(breakEven.dailyBreakEvenRevenue, formData.baseCurrency)}
                          </span>
                          （每月至少 <span className="font-bold">{formatMoney(breakEven.monthlyBreakEvenRevenue, formData.baseCurrency)}</span>）才不亏钱。
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200 text-xs text-amber-800 font-medium flex items-center gap-2">
                    <InfoTooltip language={language} text={language === 'en' ? 'Please fill in cost and expense items above.' : '请先在上方填入成本或开支项目。'} />
                    <span>{language === 'en' ? 'Fill in monthly cost or expenses above to unlock AI break-even calculations.' : '在上方填入月度成本或开支后，此处将自动算出不亏钱的保本流水门槛。'}</span>
                  </div>
                )}

                {/* 回本时间与目标反推 */}
                {formData.initialInvestmentEstimate.amount > 0 && (
                  <div className="p-4 rounded-xl bg-white border border-indigo-200 space-y-3 text-xs shadow-2xs">
                    <div className="flex items-center gap-2 font-black text-indigo-950 text-sm">
                      <Target className="w-4 h-4 text-indigo-600" />
                      <span>{language === 'en' ? 'Payback Period & Target Required Revenue' : '回本时间预测与目标反推'}</span>
                    </div>
                    <p className="text-indigo-900 leading-relaxed font-medium">
                      {language === 'en' ? (
                        <>
                          Initial investment <b>{formatMoney(payback.initialInvestment, formData.baseCurrency)}</b>, monthly net surplus is
                          <b className={payback.monthlyNetSurplus >= 0 ? ' text-emerald-700' : ' text-rose-700'}>
                            {' '}{formatMoney(payback.monthlyNetSurplus, formData.baseCurrency)}/mo
                          </b>
                          {payback.paybackMonths !== null ? (
                            <>
                              , expected payback in <span className="text-base font-black text-indigo-900 mx-1.5">{payback.paybackMonths.toFixed(1)}</span> months.
                            </>
                          ) : (
                            '. Net surplus is not positive yet — payback period cannot be calculated until operational profit is positive.'
                          )}
                        </>
                      ) : (
                        <>
                          初始投资 <b>{formatMoney(payback.initialInvestment, formData.baseCurrency)}</b>，
                          月度净结余为
                          <b className={payback.monthlyNetSurplus >= 0 ? ' text-emerald-700' : ' text-rose-700'}>
                            {' '}{formatMoney(payback.monthlyNetSurplus, formData.baseCurrency)}/月
                          </b>
                          {payback.paybackMonths !== null ? (
                            <>
                              ，预计 <span className="text-base font-black text-indigo-900 mx-1.5">{payback.paybackMonths.toFixed(1)}</span> 个月可以回本。
                            </>
                          ) : (
                            '。当前净结余不为正，暂时算不出回本时间——先让经营结余为正，回本时间才有意义。'
                          )}
                        </>
                      )}
                    </p>

                    <div className="pt-2 border-t border-indigo-100 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-indigo-900">{language === 'en' ? 'Target payback period:' : '如果我想在'}</span>
                        <NumberField
                          min={1}
                          value={formData.targetPaybackMonths}
                          onChange={(v) => updateField('targetPaybackMonths', v)}
                          className="w-20 p-1.5 border border-indigo-300 rounded-lg font-black text-indigo-900 text-center bg-white"
                        />
                        <span className="font-bold text-indigo-900">{language === 'en' ? 'months, required monthly revenue:' : '个月内回本，至少要赚多少？'}</span>
                      </div>
                      {reverseTarget && (
                        <p className="text-indigo-900 leading-relaxed font-semibold">
                          {language === 'en' ? (
                            <>
                              Need monthly revenue of at least
                              <span className="text-base font-black text-indigo-950 mx-1.5">
                                {formatMoney(reverseTarget.requiredMonthlyRevenue, formData.baseCurrency)}
                              </span>
                              (approx. {formatMoney(reverseTarget.requiredDailyRevenue, formData.baseCurrency)} / day).
                            </>
                          ) : (
                            <>
                              至少要做到的每月收入：
                              <span className="text-base font-black text-indigo-950 mx-1.5">
                                {formatMoney(reverseTarget.requiredMonthlyRevenue, formData.baseCurrency)}
                              </span>
                              （约每天 {formatMoney(reverseTarget.requiredDailyRevenue, formData.baseCurrency)}）。
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* AI 异常数值提醒 */}
                {anomalyWarnings.length > 0 && (
                  <div className="p-4 rounded-xl bg-rose-50/90 border-2 border-rose-300 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-black text-rose-950">
                      <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        {language === 'en'
                          ? `AI found ${anomalyWarnings.length} item(s) to verify`
                          : `AI 发现 ${anomalyWarnings.length} 处可能填错的数值或类目，建议核对`}
                      </span>
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
                          <span className="flex-1 font-medium">{language === 'en' ? w.messageEn : w.messageZh}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const reason = window.prompt(
                                language === 'en'
                                  ? 'Is this value genuinely unusual? Briefly explain why:'
                                  : '这个数值确实特殊？简单说明原因（AI 只记录，不做判断）：'
                              );
                              if (reason && reason.trim()) setAnomalyOverride(w.field, reason.trim());
                            }}
                            className="text-[12px] shrink-0 px-2 py-0.5 rounded bg-white/80 border border-current font-bold hover:bg-white cursor-pointer"
                          >
                            {language === 'en' ? 'Add Note' : '标注特殊理由'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 已标注特殊理由的提醒 */}
                {overriddenAnomalyWarnings.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-black text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-slate-500" />
                      <span>
                        {language === 'en'
                          ? `${overriddenAnomalyWarnings.length} item(s) annotated with a special reason`
                          : `${overriddenAnomalyWarnings.length} 项已标注特殊理由（仅记录，不影响评分判断）`}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {overriddenAnomalyWarnings.map((w, idx) => (
                        <li key={`${w.field}-ov-${idx}`} className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 flex items-start gap-1.5">
                          <span className="flex-1">
                            <span className="block text-slate-500">{language === 'en' ? w.messageEn : w.messageZh}</span>
                            <span className="block mt-0.5 font-semibold text-slate-700">{language === 'en' ? 'Reason: ' : '理由：'}{formData.anomalyOverrides?.[w.field]}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => clearAnomalyOverride(w.field)}
                            className="text-[12px] shrink-0 px-2 py-0.5 rounded border border-slate-300 font-bold hover:bg-slate-100 cursor-pointer"
                          >
                            {language === 'en' ? 'Remove Note' : '撤销标注'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

            </div>

            {/* 更多设置（月度流水 / 资金证明 / 经营时长 / 员工）——藏起来 */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50/80 hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-teal-600" />
                  {language === 'en' ? 'More Settings (Monthly Revenue / Proof of Funds / Operating Duration / Staff Count)' : '更多设置（月度流水 / 资金证明 / 经营时长 / 员工人数）'}
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
                          {language === 'en' ? 'Last 6 Months Revenue Breakdown (optional, report works without it)' : '近 6 个月月度流水明细（选填，不填也能出报告）'}
                        </label>
                        <p className="text-[13px] text-slate-500">
                          {language === 'en'
                            ? 'Providing month-by-month revenue lets AI assess cash-flow volatility more precisely; not required.'
                            : '提供逐月流水可让 AI 更精准评估现金流波动，不强制填写。'}
                        </p>
                      </div>
                      {showGapSection && (
                        <button
                          onClick={handleInterpolateMissingMonths}
                          disabled={isSimulatingOcr}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingOcr ? 'animate-spin' : ''}`} />
                          <span>{isSimulatingOcr ? (language === 'en' ? 'AI calculating...' : 'AI 计算中...') : (language === 'en' ? 'AI Fill Gaps' : 'AI 智能补全缺口')}</span>
                        </button>
                      )}
                    </div>

                    {showGapSection && (
                      <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-[13px] text-amber-800 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        {language === 'en'
                          ? 'Some months are missing revenue data — use "AI Fill Gaps" to estimate a reference value from the surrounding months, then confirm manually.'
                          : '检测到部分月份流水缺失，可用「AI 智能补全缺口」按前后月均值补一个参考估算值，再手动确认。'}
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
                                {language === 'en' ? 'AI Estimated' : 'AI 估算'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">{formData.baseCurrency}</span>
                            <NumberField
                              value={b.revenue.amount}
                              onChange={(v) => updateMonthlyBreakdown(idx, v)}
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
                      {language === 'en' ? 'Proof of Funds Method (optional, does not affect score or pass rate)' : '资金证明方式（可选，不影响得分与通过率）'}
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
                          <span className="font-bold text-slate-900">{proofTypeLabel('none', language)}</span>
                          <input
                            type="radio"
                            name="proofType"
                            checked={formData.proofType === 'none'}
                            onChange={() => updateField('proofType', 'none' as ProofType)}
                            className="text-teal-600"
                          />
                        </div>
                        <p className="text-slate-500 mt-1.5 text-[13px]">
                          {language === 'en'
                            ? 'Enter numbers manually, skipping file upload — the scoring logic is exactly the same.'
                            : '直接手动录入数字，跳过文件上传，打分逻辑完全一致。'}
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
                          <span className="font-bold text-slate-900">{proofTypeLabel('mobile_payment', language)}</span>
                          <input
                            type="radio"
                            name="proofType"
                            checked={formData.proofType === 'mobile_payment'}
                            onChange={() => updateField('proofType', 'mobile_payment' as ProofType)}
                            className="text-teal-600"
                          />
                        </div>
                        <p className="text-slate-500 mt-1.5 text-[13px]">
                          {language === 'en'
                            ? 'Electronic proof such as M-Pesa, WeChat Pay, or WhatsApp transfer records.'
                            : 'M-Pesa / 微信收款 / WhatsApp 转账记录等电子凭证。'}
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
                          <span className="font-bold text-slate-900">{proofTypeLabel('handwritten_book', language)}</span>
                          <input
                            type="radio"
                            name="proofType"
                            checked={formData.proofType === 'handwritten_book'}
                            onChange={() => updateField('proofType', 'handwritten_book' as ProofType)}
                            className="text-teal-600"
                          />
                        </div>
                        <p className="text-slate-500 mt-1.5 text-[13px]">
                          {language === 'en'
                            ? 'Photos of daily handwritten or electronic ledger pages, auto pre-extracted by AI.'
                            : '日常手工记账流水单页、账本拍照上传，AI 自动预提取。'}
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
                          <span className="font-bold text-slate-900">{proofTypeLabel('institution_record', language)}</span>
                          <input
                            type="radio"
                            name="proofType"
                            checked={formData.proofType === 'institution_record'}
                            onChange={() => updateField('proofType', 'institution_record' as ProofType)}
                            className="text-teal-600"
                          />
                        </div>
                        <p className="text-slate-500 mt-1.5 text-[13px]">
                          {language === 'en'
                            ? 'Statements or proof letters issued by a church, cooperative or other institution.'
                            : '机构出具的经营往来对账单或证明函件。'}
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
                          <span className="font-bold text-slate-900">{proofTypeLabel('bank_statement', language)}</span>
                          <input
                            type="radio"
                            name="proofType"
                            checked={formData.proofType === 'bank_statement'}
                            onChange={() => updateField('proofType', 'bank_statement' as ProofType)}
                            className="text-teal-600"
                          />
                        </div>
                        <p className="text-slate-500 mt-1.5 text-[13px]">
                          {language === 'en'
                            ? 'Monthly statement exported from a formal bank account.'
                            : '正规银行账户导出的月度对账明细。'}
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* File Upload Zone：支持一次多选、多种格式 */}
                  {formData.proofType !== 'none' && (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-800">
                        {language === 'en'
                          ? 'Upload Supporting Documents (optional, multiple files allowed / originals are discarded immediately after recognition in Sensitive Region Mode)'
                          : '上传佐证凭证文件（选填，可一次多选多个文件 / 敏感地区模式下识别后立即销毁原图）'}
                      </label>
                      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-teal-50/40 transition-colors">
                        <UploadCloud className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          {language === 'en'
                            ? 'Click to select one or more files, or drag and drop here'
                            : '点击选择一个或多个文件，或直接拖拽到此处'}
                        </p>
                        <p className="text-[13px] text-slate-400 mt-1">
                          {language === 'en'
                            ? 'Supports JPG, PNG, HEIC, PDF, XLSX, CSV and mixed formats (max 10MB per file)'
                            : '支持 JPG、PNG、HEIC、PDF、XLSX、CSV 等多种格式混合上传（单文件不超过 10MB）'}
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
                          <span>{language === 'en' ? 'Choose Attachments (multiple allowed)' : '选择凭证附件（可多选）'}</span>
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
                                      {language === 'en' ? 'AI recognizing...' : 'AI 识别中...'}
                                    </span>
                                  ) : formData.isSensitiveRegion ? (
                                    <span className="text-[12px] bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded">
                                      {language === 'en' ? 'Anonymized mode: original not stored' : '脱敏模式：原图不入库'}
                                    </span>
                                  ) : (
                                    <span className="text-[12px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">
                                      {language === 'en' ? 'Recognized & extracted' : '已识别提取'}
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
                                      <span className="text-slate-400">{language === 'en' ? 'Detected amount: ' : '识别金额：'}</span>
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
                                      <span className="text-slate-400">{language === 'en' ? 'Detected transactions: ' : '识别笔数：'}</span>
                                      <span className="font-bold text-slate-700">
                                        {file.extractedData.transactionCount} {language === 'en' ? '' : '笔'}
                                      </span>
                                    </div>
                                  )}
                                  {file.extractedData.periodLabel && (
                                    <div className="col-span-2 sm:col-span-1">
                                      <span className="text-slate-400">{language === 'en' ? 'Period covered: ' : '覆盖周期：'}</span>
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
                      <label className="block font-bold text-slate-800 mb-1">{language === 'en' ? 'Months of Continuous Stable Operation' : '连续稳定经营月数'}</label>
                      <NumberField
                        value={formData.operatingMonthsCount}
                        onChange={(v) => updateField('operatingMonthsCount', v)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">{language === 'en' ? 'Number of Full-time/Part-time Employees' : '全职/兼职雇员人数'}</label>
                      <NumberField
                        value={formData.fullTimeEmployeesCount}
                        onChange={(v) => updateField('fullTimeEmployeesCount', v)}
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
                <span>{language === 'en' ? 'Pre-Submission Summary' : '提交前信息核对速览'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block">{language === 'en' ? 'Project Name:' : '项目名称:'}</span>
                  <span className="font-bold">{formData.projectName || (language === 'en' ? 'Untitled assessment' : '未命名自测')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{language === 'en' ? 'Base Currency:' : '主报告币种:'}</span>
                  <span className="font-bold">{formData.baseCurrency}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{language === 'en' ? 'Industry:' : '所属行业:'}</span>
                  <span className="font-bold">{industryLabel}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{language === 'en' ? 'Sensitive Region Mode:' : '敏感地区模式:'}</span>
                  <span className="font-bold">
                    {formData.isSensitiveRegion
                      ? (language === 'en' ? 'Enabled (anonymized)' : '已启用（脱敏）')
                      : (language === 'en' ? 'Off' : '未开启')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{language === 'en' ? 'Avg. Monthly Revenue:' : '月均总流水:'}</span>
                  <span className="font-bold">
                    {formatMoney(formData.monthlyRevenue.amount, formData.monthlyRevenue.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{language === 'en' ? 'Materials Purchasing (COGS):' : '原材料采购(COGS):'}</span>
                  <span className="font-bold">
                    {formatMoney(
                      (formData.dynamicCogsItems || []).reduce((sum, it) => sum + (Number(it.value) || 0), 0) ||
                        formData.cogsCost.amount,
                      formData.cogsCost.currency
                    )}
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
