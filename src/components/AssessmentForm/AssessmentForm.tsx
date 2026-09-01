import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  FileText,
  DollarSign,
  Layers,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  Mic,
  Camera,
  Trash2,
  RefreshCw,
  Info,
  BarChart3,
  Bot,
  Zap
} from 'lucide-react';
import {
  BusinessFormData,
  CurrencyCode,
  Language,
  MoneyField,
  MonthlyBreakdown,
  ProofType,
  proofTypeLabel
} from '../../types';
import { SUPPORTED_CURRENCIES, formatMoney, CUSTOM_CURRENCY_VALUE } from '../../lib/currencies';
import { INDUSTRY_BENCHMARKS } from '../../lib/industryBenchmarks';

/** 行业枚举值集合，用于在 AI 返回值与可选项之间做映射 */
const INDUSTRY_KEYS = INDUSTRY_BENCHMARKS.map((b) => b.id) as string[];
/** 下拉里选中的"自定义行业"占位值 */
export const CUSTOM_INDUSTRY_VALUE = '__CUSTOM__';

interface InferredStructure {
  // 后端真实返回字段
  inferredIndustryKey?: string;
  industryDisplayName?: string;
  customIndustryName?: string;
  suggestedCurrency?: string;
  cogsItems?: Array<{ id?: string; name?: string; amount?: number }>;
  opexItems?: Array<{ id?: string; name?: string; amount?: number }>;
  estimatedMonthlyRevenue?: number;
  // 兼容别名（备用）
  industry?: string;
  baseCurrency?: string;
  suggestedCogs?: string[];
  suggestedOpex?: string[];
}

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
import { saveActiveDraft, clearActiveDraft } from '../../lib/storage';

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
  proofType: 'mobile_payment',
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
  const [formData, setFormData] = useState<BusinessFormData>(() => ({
    ...DEFAULT_FORM_DATA,
    ...initialData,
    id: initialData?.id || `proj-${Date.now()}`
  }));

  const [currentStep, setCurrentStep] = useState(1);
  const [isSimulatingOcr, setIsSimulatingOcr] = useState(false);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [collaboratorSection, setCollaboratorSection] = useState('all');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // —— AI 推算行业/币种/成本结构 相关状态 ——
  const [inferState, setInferState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [customIndustry, setCustomIndustry] = useState(formData.industry === CUSTOM_INDUSTRY_VALUE ? formData.customIndustryName || '' : '');
  const [customCurrencyCode, setCustomCurrencyCode] = useState(
    formData.baseCurrency === CUSTOM_CURRENCY_VALUE ? formData.customCurrencyCode || '' : ''
  );
  // 后端返回的 AI 建议（用于"恢复 AI 建议"按钮）
  // AI 建议的成本项结构（含 label + 预估金额 amount），用于"恢复 AI 建议"
  const [aiSuggested, setAiSuggested] = useState<{
    cogs: Array<{ label: string; amount: number }>;
    opex: Array<{ label: string; amount: number }>;
  } | null>(null);
  // 用户是否手动改过动态项（用于显示"已手动调整"标记）
  const [cogsTouched, setCogsTouched] = useState(false);
  const [opexTouched, setOpexTouched] = useState(false);
  const [revenueTouched, setRevenueTouched] = useState(false);
  const inferTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inferReqId = React.useRef(0);

  // Auto-save local draft on any change
  useEffect(() => {
    saveActiveDraft(formData);
    setSaveStatus('草稿已自动暂存至本地');
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
  };
  const handleCustomIndustryInput = (value: string) => {
    setCustomIndustry(value);
    updateField('customIndustryName', value || undefined);
  };

  const handleCurrencyChange = (value: string) => {
    if (value === CUSTOM_CURRENCY_VALUE) {
      updateField('baseCurrency', CUSTOM_CURRENCY_VALUE as any);
      return;
    }
    updateField('baseCurrency', value as CurrencyCode);
    updateField('customCurrencyCode', undefined as any);
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
    const rawIndustryKey = result.inferredIndustryKey || result.industry || '';
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
      : (result.suggestedCogs || []).map((label) => ({ label, amount: 0 }));
    const finalOpex = rawOpex.length
      ? rawOpex.map((it) => ({ label: it.name!, amount: Number(it.amount) || 0, suggestedAmount: Number(it.amount) || 0 }))
      : (result.suggestedOpex || []).map((label) => ({ label, amount: 0 }));

    const cogsItems = finalCogs.map((it) => ({
      id: `cogs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: it.label,
      value: it.amount,
      suggestedAmount: (it as any).suggestedAmount,
      isFixed: false
    }));
    const opexItems = finalOpex.map((it) => ({
      id: `opex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: it.label,
      value: it.amount,
      suggestedAmount: (it as any).suggestedAmount,
      isFixed: false
    }));

    // —— 用 AI 估算同步营收与进货总额，清除旧 demo/seed 残留值 ——
    // 否则表单里会残留 INITIAL_PRESET（如 330000 KES / 132000 KES），与 AI 推断的
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
    if (inferTimer.current) clearTimeout(inferTimer.current);
    const name = value.trim();
    if (name.length < 2) {
      setInferState('idle');
      return;
    }
    setInferState('loading');
    inferTimer.current = setTimeout(async () => {
      const reqId = ++inferReqId.current;
      const result = await callInferBusinessStructure(name);
      if (reqId !== inferReqId.current) return; // 丢弃过期请求
      if (result && (result.inferredIndustryKey || result.suggestedCurrency || result.opexItems?.length || result.cogsItems?.length)) {
        applyInferResult(result);
        setInferState('done');
      } else {
        setInferState('error');
      }
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
      | 'existingDebtMonthlyPayment'
      | 'cashAndLiquidAssets'
      | 'inventoryValue',
    amount: number,
    currency?: CurrencyCode
  ) => {
    if (fieldKey === 'monthlyRevenue') setRevenueTouched(true);
    setFormData((prev) => {
      const sanitized = Math.max(0, isNaN(amount) ? 0 : amount);
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
    const updated = [...formData.monthlyBreakdowns];
    if (updated[index]) {
      updated[index].revenue.amount = Math.max(0, isNaN(amount) ? 0 : amount);
      updated[index].isEstimated = false; // 用户手动编辑后解除估算标识
      setFormData((prev) => ({ ...prev, monthlyBreakdowns: updated }));
    }
  };

  // AI Broken stream auto fill
  const handleInterpolateMissingMonths = () => {
    setIsSimulatingOcr(true);
    setTimeout(() => {
      const updated = formData.monthlyBreakdowns.map((b, idx, arr) => {
        if (b.revenue.amount > 0) return b;
        const prev = arr[idx - 1]?.revenue.amount || 3500;
        const next = arr[idx + 1]?.revenue.amount || 3500;
        const avg = Math.round((prev + next) / 2);
        return {
          ...b,
          revenue: { amount: avg, currency: formData.baseCurrency },
          isEstimated: true,
          note: 'AI识别流水缺口，按前后相邻月份平均值自动估算'
        };
      });
      setFormData((prev) => ({ ...prev, monthlyBreakdowns: updated }));
      setIsSimulatingOcr(false);
    }, 800);
  };

  // Fake upload attachment
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const newProof = {
      id: `file-${Date.now()}`,
      name: file.name,
      type: file.type || 'image/jpeg',
      size: file.size,
      uploadTime: new Date().toISOString(),
      retainedAfterOcr: !formData.isSensitiveRegion // 敏感地区下 OCR 后不留原图
    };
    setFormData((prev) => ({
      ...prev,
      proofFiles: [...prev.proofFiles, newProof]
    }));
  };

  const handleAddCollaborator = () => {
    if (!newCollaboratorEmail || !newCollaboratorEmail.includes('@')) return;
    const newCollab = {
      email: newCollaboratorEmail.trim(),
      role: 'editor' as const,
      invitedAt: new Date().toISOString(),
      sectionAccess: collaboratorSection === 'all' ? ['all'] : [collaboratorSection]
    };
    setFormData((prev) => ({
      ...prev,
      collaborators: [...prev.collaborators, newCollab]
    }));
    setNewCollaboratorEmail('');
  };

  const handleFinalSubmit = () => {
    const finalized: BusinessFormData = {
      ...formData,
      isSubmitted: true,
      isDraft: false,
      submittedAt: new Date().toISOString()
    };
    clearActiveDraft();
    onSubmit(finalized);
  };

  const stepsList = [
    { num: 1, title: '基本信息与安全模式' },
    { num: 2, title: '资金证明与断点流水' },
    { num: 3, title: '营业收入与混合资金' },
    { num: 4, title: '成本开销与资产负债' },
    { num: 5, title: '多人协作与核对提交' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* 1. Slim Header (no duplicated hero title) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs sm:text-sm text-neutral-500 font-medium max-w-2xl">
            {language === 'en'
              ? 'Enter core financials to instantly measure business-model health, cash runway and resilience.'
              : '输入核心财务收支与储备数据，系统实时测算商业模型的健康度、现金跑道与抗风险能力。'}
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

        {/* Step Indicator */}
        {(
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-neutral-100">
            {stepsList.map((s) => (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  currentStep === s.num
                    ? 'bg-neutral-900 border-neutral-800 text-white shadow-md'
                    : currentStep > s.num
                    ? 'bg-indigo-50/80 border-indigo-100 text-indigo-900 hover:bg-indigo-100'
                    : 'bg-neutral-50 border-neutral-200/80 text-neutral-500 hover:bg-neutral-100'
                }`}
              >
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80 mb-0.5">
                  STEP 0{s.num}
                </div>
                <div className="text-xs font-bold truncate">{s.title}</div>
              </button>
            ))}
          </div>
        )}
      </div>


      {/* STEP 1: Basic Information & Sensitive Region Safe Mode */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>1. 项目基本资料与主币种设置</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  项目/店铺名称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如：阳光工坊社区烘焙店"
                  value={formData.projectName}
                  onChange={(e) => handleProjectNameChange(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <div className="mt-1 text-[11px]">
                  {inferState === 'loading' && <span className="text-indigo-500 font-semibold animate-pulse">AI 正在推算行业、币种与成本结构…</span>}
                  {inferState === 'done' && <span className="text-emerald-600 font-semibold">✓ AI 已自动预填，可修改或点“恢复 AI 建议”</span>}
                  {inferState === 'error' && (
                    <span className="text-amber-600 font-semibold">
                      无法自动推算，请手动选择。
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
                    className="mt-2 w-full p-2.5 border-2 border-indigo-300 rounded-xl font-medium text-slate-800"
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
                    className="mt-2 w-full p-2.5 border-2 border-indigo-300 rounded-xl font-bold text-slate-800"
                  />
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  后续所有其他币种金额将自动依据汇率折算为该主币种。
                </p>
              </div>

            </div>

            {/* 多重汇率标注 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasMultipleRates}
                  onChange={(e) => updateField('hasMultipleRates', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
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
              className={`p-5 rounded-2xl border transition-all ${
                formData.isSensitiveRegion
                  ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      className={`w-5 h-5 ${
                        formData.isSensitiveRegion ? 'text-amber-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-bold text-slate-900 text-sm">
                      敏感地区数据安全模式 (Sensitive Safe Mode)
                    </span>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                      P0 核心保障
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    适合身处外部信息披露敏感、监管严苛地区的用户。开启后将自动触发：
                    <br />
                    1. <strong>地理信息脱敏</strong>（不采集城市，仅选大区）；
                    2. <strong>原始凭证全选填</strong>（可仅填汇总数字）；
                    3. <strong>OCR后原图不保留</strong>（提取数字后即刻物理销毁图片）；
                    4. <strong>报告自动加注数据最小化说明</strong>，绝不影响得分！
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
                <div className="mt-4 pt-3 border-t border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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

          <div className="flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <span>下一步：资金证明与断点流水</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Proof Type & Broken Stream GAP Handling */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>2. 资金证明方式多元化与断点流水处理</span>
                </h3>
                <p className="text-xs text-slate-500">
                  没有正规银行流水？凭证有无只影响录入便捷度，与打分和通过率完全无关。
                </p>
              </div>
            </div>

            {/* Proof Type Radio Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  formData.proofType === 'none'
                    ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-900">无凭证纯手动填写</span>
                  <input
                    type="radio"
                    name="proofType"
                    checked={formData.proofType === 'none'}
                    onChange={() => updateField('proofType', 'none')}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-slate-500 mt-2 text-[11px]">
                  直接手动录入 14 项经营数字，跳过文件上传，打分逻辑完全一致。
                </p>
                <span className="mt-2 text-[10px] text-indigo-700 font-bold bg-white px-2 py-0.5 rounded w-fit border border-indigo-200">
                  兜底平等路径
                </span>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  formData.proofType === 'mobile_payment'
                    ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-900">移动支付截图 / 账单</span>
                  <input
                    type="radio"
                    name="proofType"
                    checked={formData.proofType === 'mobile_payment'}
                    onChange={() => updateField('proofType', 'mobile_payment')}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-slate-500 mt-2 text-[11px]">
                  M-Pesa / 微信收款 / WhatsApp 转账记录等电子凭证。
                </p>
                <span className="mt-2 text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded w-fit border border-emerald-200">
                  支持拍照识别
                </span>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  formData.proofType === 'handwritten_book'
                    ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-900">手写 / 电子记账本照片</span>
                  <input
                    type="radio"
                    name="proofType"
                    checked={formData.proofType === 'handwritten_book'}
                    onChange={() => updateField('proofType', 'handwritten_book')}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-slate-500 mt-2 text-[11px]">
                  日常手工记账流水单页、账本拍照上传，AI 自动预提取。
                </p>
                <span className="mt-2 text-[10px] text-amber-700 font-bold bg-white px-2 py-0.5 rounded w-fit border border-amber-200">
                  适合传统小商户
                </span>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  formData.proofType === 'institution_record'
                    ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-900">教会 / 合作社内部记录</span>
                  <input
                    type="radio"
                    name="proofType"
                    checked={formData.proofType === 'institution_record'}
                    onChange={() => updateField('proofType', 'institution_record')}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-slate-500 mt-2 text-[11px]">
                  机构出具的经营往来对账单或证明函件。
                </p>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  formData.proofType === 'bank_statement'
                    ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-900">正规银行对账单 (PDF)</span>
                  <input
                    type="radio"
                    name="proofType"
                    checked={formData.proofType === 'bank_statement'}
                    onChange={() => updateField('proofType', 'bank_statement')}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-slate-500 mt-2 text-[11px]">
                  正规银行账户导出的月度对账明细。
                </p>
              </label>
            </div>

            {/* File Upload Zone (Optional / Enabled when proof is not 'none') */}
            {formData.proofType !== 'none' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  上传佐证凭证文件（选填 / 敏感地区模式下识别后立即销毁原图）
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-indigo-50/40 transition-colors">
                  <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    点击选择图片或 PDF 文件，或直接拖拽到此处
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    支持 JPG、PNG、PDF（单文件不超过 10MB）
                  </p>
                  <input
                    type="file"
                    onChange={handleUploadFile}
                    className="hidden"
                    id="proof-upload-input"
                  />
                  <label
                    htmlFor="proof-upload-input"
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>选择凭证附件</span>
                  </label>
                </div>

                {formData.proofFiles.length > 0 && (
                  <div className="space-y-2">
                    {formData.proofFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium text-slate-800">{file.name}</span>
                          <span className="text-[10px] text-slate-400">
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {formData.isSensitiveRegion ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded">
                              脱敏模式：原图不入库
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">
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
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Monthly Breakdowns with AI Gap filling */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    近 6 个月月度流水记录与断点估算 (P0)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    若部分月份断续缺失，AI 可自动按前后月均值算出一个参考估算值供您确认。
                  </p>
                </div>
                <button
                  onClick={handleInterpolateMissingMonths}
                  disabled={isSimulatingOcr}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingOcr ? 'animate-spin' : ''}`} />
                  <span>{isSimulatingOcr ? 'AI 计算中...' : 'AI 智能补全缺口'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
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
                        <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 rounded">
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
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>上一步</span>
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <span>下一步：营业收入与混合资金</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Revenues & Mixed Funds Source (P1) */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                <span>3. 营业收入与混合资金来源标注 (Mixed Funds Separation)</span>
              </h3>
              <p className="text-xs text-slate-500">
                支持字段级币种选择；请将“真实经营收入”与“外部赠款/借款”分开填写，避免影响 Gate-1 判定。
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Field 1: Monthly Gross Total */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border-2 border-indigo-200 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                      <span>F8. 经营月均总流水 (Monthly Inflow Total)</span>
                      <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                        总营业额
                      </span>
                    </label>
                    <p className="text-xs text-indigo-900 font-medium mt-0.5">
                      <b>大白话：</b>这是客人买单进你口袋/收银机/微信/银行卡的<b>全部毛钱（总营业额）</b>，<b>尚未扣除</b>进货成本、房租与人工！
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenAiHelper?.('经营月均总流水是收入还是什么？')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      <span>AI解答：是收入还是什么？</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAiHelper?.('各行业大数据平均流水与利润基准是多少？')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <BarChart3 className="w-3 h-3 text-emerald-700" />
                      <span>查大数据基准</span>
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
                  placeholder=""
                  value={formData.monthlyRevenue.amount || ''}
                  onChange={(e) => updateMoney('monthlyRevenue', Number(e.target.value))}
                  className="w-full p-3 border-2 border-indigo-200 focus:border-indigo-600 rounded-xl font-black text-slate-900 text-base bg-white shadow-2xs"
                />
              </div>

              {/* Field 2: Real Operating Revenue (Customers payment) */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-emerald-950">
                      其中：真实客户主营销售收入 (Real Operating Revenue)
                    </label>
                    <p className="text-[11px] text-emerald-700">
                      排除任何亲友借款、救济补贴后，真正由客户买单带来的生意收入。
                    </p>
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
                  value={formData.monthlyRealOperatingRevenue.amount || ''}
                  onChange={(e) =>
                    updateMoney('monthlyRealOperatingRevenue', Number(e.target.value))
                  }
                  className="w-full p-2.5 border border-emerald-300 rounded-xl font-bold text-emerald-950 bg-white"
                />
              </div>

              {/* Field 3: External Grants / Donations */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-amber-950">
                      其中：外部支持款 / 机构赠款 (External Grants / Donations)
                    </label>
                    <p className="text-[11px] text-amber-700">
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
                  placeholder="无则填 0"
                  value={formData.monthlyExternalGrants.amount || ''}
                  onChange={(e) => updateMoney('monthlyExternalGrants', Number(e.target.value))}
                  className="w-full p-2.5 border border-amber-300 rounded-xl font-bold text-amber-950 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>上一步</span>
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <span>下一步：成本开销与资产负债</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: COGS, OPEX, Assets, Debt & Team Scale */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>4. 成本结构、固定开销与流动性储备</span>
              </h3>
              <p className="text-xs text-slate-500">
                包含直接进货 (COGS)、房租人工水电 (OPEX) 及抗风险现金储备。
              </p>
            </div>

            {/* Direct Cost (COGS) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-slate-900">
                      F10. 原材料与直接采购成本 (COGS)
                    </label>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                      进货本钱
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    进货货款、生鲜食材原料等直接买货成本（包含长途运费，但不含房租和员工工资）。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenAiHelper?.('进货成本（COGS）怎么算？包含运费吗？')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>AI咨询进货成本与毛利</span>
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
                placeholder=""
                value={formData.cogsCost.amount || ''}
                onChange={(e) => updateMoney('cogsCost', Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white"
              />

              {/* AI 推断的动态物料成本明细 */}
              {(formData.dynamicCogsItems || []).length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50/50 border border-dashed border-rose-300 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-black text-rose-900">
                      按行业细分的物料成本明细（可增删改）
                      {cogsTouched && (
                        <span className="ml-1.5 inline-block text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold align-middle">已手动调整</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={restoreAiSuggestion}
                      className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold hover:bg-rose-200 cursor-pointer"
                    >
                      <RefreshCw className="inline w-3 h-3 mr-0.5" />恢复 AI 建议
                    </button>
                  </div>
                  <span className="text-[10px] text-rose-700">明细合计即物料总成本，使用细分项时上方总额框可留空</span>
                  {(formData.dynamicCogsItems || []).map((it) => (
                    <div key={it.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={it.label}
                        onChange={(e) => updateDynamicCogsItem(it.id, { label: e.target.value })}
                        className="flex-1 p-1.5 border border-rose-200 rounded-lg font-semibold text-slate-800"
                      />
                      <input
                        type="number"
                        value={it.value || ''}
                        onChange={(e) => updateDynamicCogsItem(it.id, { value: Number(e.target.value) })}
                        className="w-24 p-1.5 border border-rose-200 rounded-lg font-mono font-semibold"
                        placeholder={it.suggestedAmount ? `AI建议 ${it.suggestedAmount}` : '金额'}
                        title={it.suggestedAmount ? `AI 建议参考金额：${it.suggestedAmount}（仅供参考，请填你的真实数字）` : '请填你的真实月度金额'}
                      />
                      <span className="text-[10px] text-rose-700 w-12">{formData.baseCurrency}/月</span>
                      <button type="button" onClick={() => removeDynamicCogsItem(it.id)} className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addDynamicCogsItem} className="text-[10px] px-2 py-1 rounded border border-rose-300 text-rose-700 font-bold hover:bg-rose-100 cursor-pointer">
                    ＋ 添加物料成本项
                  </button>
                </div>
              )}
            </div>

            {/* OPEX Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex justify-between mb-1">
                  <label className="font-bold text-slate-800">F11. 场地租金与物业 (Rent)</label>
                  <span className="text-[11px] text-slate-400">{formData.rentCost.currency}</span>
                </div>
                <input
                  type="number"
                  value={formData.rentCost.amount || ''}
                  onChange={(e) => updateMoney('rentCost', Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex justify-between mb-1">
                  <label className="font-bold text-slate-800">F12. 员工工资与人工支出 (Labor)</label>
                  <span className="text-[11px] text-slate-400">{formData.laborCost.currency}</span>
                </div>
                <input
                  type="number"
                  value={formData.laborCost.amount || ''}
                  onChange={(e) => updateMoney('laborCost', Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex justify-between mb-1">
                  <label className="font-bold text-slate-800">F13. 水电网络杂费 (Utilities)</label>
                  <span className="text-[11px] text-slate-400">{formData.utilityCost.currency}</span>
                </div>
                <input
                  type="number"
                  value={formData.utilityCost.amount || ''}
                  onChange={(e) => updateMoney('utilityCost', Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex justify-between mb-1">
                  <label className="font-bold text-slate-800">F16. 税金及规费 (Taxes)</label>
                  <span className="text-[11px] text-slate-400">{formData.taxCost.currency}</span>
                </div>
                <input
                  type="number"
                  value={formData.taxCost.amount || ''}
                  onChange={(e) => updateMoney('taxCost', Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex justify-between mb-1">
                  <label className="font-bold text-slate-800">每月偿还债务本息 (Debt Service)</label>
                  <span className="text-[11px] text-slate-400">
                    {formData.existingDebtMonthlyPayment.currency}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="无债务填 0"
                  value={formData.existingDebtMonthlyPayment.amount || ''}
                  onChange={(e) => updateMoney('existingDebtMonthlyPayment', Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex justify-between mb-1">
                  <label className="font-bold text-slate-800">当前可用现金备用金 (Liquid Cash)</label>
                  <span className="text-[11px] text-slate-400">
                    {formData.cashAndLiquidAssets.currency}
                  </span>
                </div>
                <input
                  type="number"
                  value={formData.cashAndLiquidAssets.amount || ''}
                  onChange={(e) => updateMoney('cashAndLiquidAssets', Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-emerald-800"
                />
              </div>
            </div>

            {/* AI 推断的动态运营开支明细 */}
            {(formData.dynamicOpexItems || []).length > 0 && (
              <div className="p-3 rounded-xl bg-indigo-50/50 border border-dashed border-indigo-300 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-black text-indigo-900">
                    按行业细分的运营开支明细（可增删改）
                    {opexTouched && (
                      <span className="ml-1.5 inline-block text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold align-middle">已手动调整</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={restoreAiSuggestion}
                    className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200 cursor-pointer"
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
                      className="flex-1 p-1.5 border border-indigo-200 rounded-lg font-semibold text-slate-800"
                    />
                    <input
                      type="number"
                      min="0"
                      value={it.value || ''}
                      onChange={(e) => updateDynamicOpexItem(it.id, { value: Math.max(0, isNaN(Number(e.target.value)) ? 0 : Number(e.target.value)) })}
                      className="w-24 p-1.5 border border-indigo-200 rounded-lg font-mono font-semibold"
                      placeholder={it.suggestedAmount ? `AI建议 ${it.suggestedAmount}` : '金额'}
                      title={it.suggestedAmount ? `AI 建议参考金额：${it.suggestedAmount}（仅供参考，请填你的真实数字）` : '请填你的真实月度金额'}
                    />
                    <span className="text-[10px] text-indigo-700 w-12">{formData.baseCurrency}/月</span>
                    <button type="button" onClick={() => removeDynamicOpexItem(it.id)} className="p-1 text-indigo-500 hover:text-indigo-700 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addDynamicOpexItem} className="text-[10px] px-2 py-1 rounded border border-indigo-300 text-indigo-700 font-bold hover:bg-indigo-100 cursor-pointer">
                  ＋ 添加运营开支项
                </button>
              </div>
            )}

            {/* Operating Duration & Team scale */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
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

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>上一步</span>
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <span>下一步：多人协作与核对提交</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Collaboration, Audit Trace & Final Submission */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>5. 多人协作填写与最终确认提交 (Collaboration & Audit)</span>
              </h3>
              <p className="text-xs text-slate-500">
                可邀请配偶、当地同工协同录入；系统自动留存修改记录，最终提交需负责人确认。
              </p>
            </div>

            {/* Collaborators Invitation */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">邀请项目协作者 (1-2名)</span>
                <span className="text-slate-400">权限分级：仅项目负责人可最终提交</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="输入协作者邮箱 (如 partner@example.com)"
                  value={newCollaboratorEmail}
                  onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                  className="flex-1 p-2 border border-slate-300 rounded-lg bg-white"
                />
                <button
                  onClick={handleAddCollaborator}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  发送邀请
                </button>
              </div>

              {formData.collaborators.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  {formData.collaborators.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-medium text-slate-800">{c.email}</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                          协作者 · 可编辑
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            collaborators: prev.collaborators.filter((_, i) => i !== idx)
                          }))
                        }
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submission Pre-check summary */}
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-3">
              <div className="flex items-center gap-2 text-indigo-950 font-bold">
                <Sparkles className="w-4 h-4 text-indigo-600" />
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
                  <span className="text-slate-500 block">资金证明方式:</span>
                  <span className="font-bold">
                    {proofTypeLabel(formData.proofType, language)}
                  </span>
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
                    {formData.monthlyRevenue.currency} {formData.monthlyRevenue.amount}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">原材料采购(COGS):</span>
                  <span className="font-bold">
                    {formData.cogsCost.currency} {formData.cogsCost.amount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>上一步</span>
            </button>
            <button
              onClick={handleFinalSubmit}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>确认提交 · 生成财务测算与评估报告</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
