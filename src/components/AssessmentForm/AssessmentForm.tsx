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
  ProofType
} from '../../types';
import { SUPPORTED_CURRENCIES, formatMoney } from '../../lib/currencies';
import { INDUSTRY_BENCHMARKS } from '../../lib/industryBenchmarks';
import { saveActiveDraft, clearActiveDraft } from '../../lib/storage';
import { LiveHealthGauge } from './LiveHealthGauge';

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
    { month: '2026-01', revenue: { amount: 3500, currency: 'USD' } },
    { month: '2026-02', revenue: { amount: 3800, currency: 'USD' } },
    { month: '2026-03', revenue: { amount: 3600, currency: 'USD' } },
    { month: '2026-04', revenue: { amount: 4100, currency: 'USD' } },
    { month: '2026-05', revenue: { amount: 3900, currency: 'USD' } },
    { month: '2026-06', revenue: { amount: 4200, currency: 'USD' } }
  ],
  monthlyRevenue: { amount: 3850, currency: 'USD' },
  monthlyRealOperatingRevenue: { amount: 3850, currency: 'USD' },
  monthlyExternalGrants: { amount: 0, currency: 'USD' },
  cogsCost: { amount: 1540, currency: 'USD' },
  rentCost: { amount: 450, currency: 'USD' },
  laborCost: { amount: 600, currency: 'USD' },
  utilityCost: { amount: 150, currency: 'USD' },
  taxCost: { amount: 80, currency: 'USD' },
  otherOpex: { amount: 120, currency: 'USD' },
  existingDebtMonthlyPayment: { amount: 100, currency: 'USD' },
  cashAndLiquidAssets: { amount: 5000, currency: 'USD' },
  inventoryValue: { amount: 2000, currency: 'USD' },
  operatingMonthsCount: 16,
  fullTimeEmployeesCount: 2,
  ownerEmail: 'owner@example.com',
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

  const [formMode, setFormMode] = useState<'simple' | 'detailed'>('simple');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSimulatingOcr, setIsSimulatingOcr] = useState(false);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [collaboratorSection, setCollaboratorSection] = useState('all');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

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
    setFormData((prev) => ({
      ...prev,
      [fieldKey]: {
        amount: Math.max(0, isNaN(amount) ? 0 : amount),
        currency: currency || prev[fieldKey].currency || prev.baseCurrency,
        lastEditedBy: prev.ownerEmail,
        lastEditedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    }));
  };

  const updateMonthlyBreakdown = (index: number, amount: number) => {
    const updated = [...formData.monthlyBreakdowns];
    if (updated[index]) {
      updated[index].revenue.amount = amount;
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
      {/* 1. Header & Title (Clean, Professional, Focused) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1 max-w-2xl">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              商业宣教商业模型财务测算
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 font-medium leading-relaxed">
              输入核心财务收支与储备数据，系统实时测算商业模型的健康度、现金跑道与抗风险能力。
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveStatus && (
              <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{saveStatus}</span>
              </span>
            )}

            {/* Mode Switcher Toggle: 极简单页 / 完整分步 */}
            <div className="flex p-1 bg-neutral-100 rounded-2xl border border-neutral-200">
              <button
                type="button"
                onClick={() => setFormMode('simple')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  formMode === 'simple'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                ⚡ 极简单页测算
              </button>
              <button
                type="button"
                onClick={() => setFormMode('detailed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  formMode === 'detailed'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                📑 完整分步明细
              </button>
            </div>
          </div>
        </div>

        {/* Step Indicator (Only shown in Detailed mode) */}
        {formMode === 'detailed' && (
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

      {/* Real-time Live Health Gauge (Battery & 100-Yuan Flow) */}
      <LiveHealthGauge formData={formData} onOpenAiHelper={onOpenAiHelper} />

      {/* ZERO-BARRIER SIMPLE MODE FORM (SINGLE SCREEN) */}
      {formMode === 'simple' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-neutral-200 shadow-sm space-y-8 animate-in fade-in">
          {/* Section 1: Store & Industry */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                1
              </span>
              <h3 className="text-base sm:text-lg font-black text-neutral-900">
                项目基本信息
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-neutral-800 mb-1.5">
                  项目/店铺名称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如：恩典社区义诊所 / 阳光社区烘焙坊"
                  value={formData.projectName}
                  onChange={(e) => updateField('projectName', e.target.value)}
                  className="w-full p-3.5 border-2 border-neutral-200 rounded-2xl font-bold text-neutral-800 text-base focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-800 mb-1.5">
                  所属行业领域 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  className="w-full p-3.5 border-2 border-neutral-200 rounded-2xl font-bold text-neutral-800 text-base bg-white focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="medical_health">🩺 医疗健康 / 爱心诊所</option>
                  <option value="education_training">📚 语言教育 / 辅导中心</option>
                  <option value="vocational_training">🛠️ 职业实训 / 手工工坊</option>
                  <option value="food_beverage">☕ 餐饮烘焙 / 社区咖啡</option>
                  <option value="child_care">🧒 儿童日托 / 社区启蒙</option>
                  <option value="community_service">🤝 综合助贫 / 社会企业</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-800 mb-1.5">
                  测算主币种 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.baseCurrency}
                  onChange={(e) => updateField('baseCurrency', e.target.value as CurrencyCode)}
                  className="w-full p-3.5 border-2 border-neutral-200 rounded-2xl font-bold text-neutral-800 text-base bg-white focus:border-indigo-500 focus:outline-hidden"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameZh} ({c.code} - {c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Revenue & Direct Cost */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                2
              </span>
              <h3 className="text-base sm:text-lg font-black text-neutral-900">
                营业收入与直接物料成本
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-200 space-y-2">
                <label className="block text-sm sm:text-base font-black text-emerald-950">
                  月度营业总流水 / 服务进账 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.monthlyRevenue.amount || ''}
                    onChange={(e) => updateMoney('monthlyRevenue', Number(e.target.value))}
                    className="w-full p-4 border-2 border-emerald-300 rounded-2xl font-mono text-xl sm:text-2xl font-black text-emerald-950 bg-white focus:border-emerald-500 focus:outline-hidden"
                    placeholder="38000"
                  />
                  <span className="absolute right-4 top-4 font-bold text-emerald-700">
                    {formData.baseCurrency} / 月
                  </span>
                </div>
                <p className="text-xs text-emerald-800 font-medium">
                  包含诊金/药费、学费、餐饮销售或服务收费等全部月度营业进账。
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-rose-50/70 border-2 border-rose-200 space-y-2">
                <label className="block text-sm sm:text-base font-black text-rose-950">
                  直接物料 / 耗材 / 进货采购成本 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.cogsCost.amount || ''}
                    onChange={(e) => updateMoney('cogsCost', Number(e.target.value))}
                    className="w-full p-4 border-2 border-rose-300 rounded-2xl font-mono text-xl sm:text-2xl font-black text-rose-950 bg-white focus:border-rose-500 focus:outline-hidden"
                    placeholder="15000"
                  />
                  <span className="absolute right-4 top-4 font-bold text-rose-700">
                    {formData.baseCurrency} / 月
                  </span>
                </div>
                <p className="text-xs text-rose-800 font-medium">
                  如采购药品器材、食材原料、教材耗材等随业务量波动的直接进货成本。
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Fixed OPEX Expenses */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                3
              </span>
              <h3 className="text-base sm:text-lg font-black text-neutral-900">
                每月固定运营开支
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-50 border-2 border-neutral-200 space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-neutral-800">
                  场地租金
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.rentCost.amount || ''}
                    onChange={(e) => updateMoney('rentCost', Number(e.target.value))}
                    className="w-full p-3 border-2 border-neutral-300 rounded-xl font-mono text-lg font-bold text-neutral-900 bg-white"
                    placeholder="3500"
                  />
                </div>
                <span className="text-[11px] text-neutral-500 block">每月固定支付给房东的租金</span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border-2 border-neutral-200 space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-neutral-800">
                  人员薪酬与同工补贴
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.laborCost.amount || ''}
                    onChange={(e) => updateMoney('laborCost', Number(e.target.value))}
                    className="w-full p-3 border-2 border-neutral-300 rounded-xl font-mono text-lg font-bold text-neutral-900 bg-white"
                    placeholder="4800"
                  />
                </div>
                <span className="text-[11px] text-neutral-500 block">本地员工或全职同工补贴 (无则填0)</span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border-2 border-neutral-200 space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-neutral-800">
                  水电、网络及日常杂支
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.utilityCost.amount || ''}
                    onChange={(e) => updateMoney('utilityCost', Number(e.target.value))}
                    className="w-full p-3 border-2 border-neutral-300 rounded-xl font-mono text-lg font-bold text-neutral-900 bg-white"
                    placeholder="950"
                  />
                </div>
                <span className="text-[11px] text-neutral-500 block">水费、电费、通讯网络及其他杂费</span>
              </div>
            </div>
          </div>

          {/* Section 4: Cash Buffer & Track Record */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                4
              </span>
              <h3 className="text-base sm:text-lg font-black text-neutral-900">
                资金储备与运营概况
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4.5 rounded-2xl bg-sky-50/80 border-2 border-sky-200 space-y-1.5">
                <label className="block text-xs sm:text-sm font-black text-sky-950">
                  活期应急备用金储备
                </label>
                <input
                  type="number"
                  value={formData.cashAndLiquidAssets.amount || ''}
                  onChange={(e) => updateMoney('cashAndLiquidAssets', Number(e.target.value))}
                  className="w-full p-3 border-2 border-sky-300 rounded-xl font-mono text-lg font-black text-sky-950 bg-white"
                  placeholder="40000"
                />
                <span className="text-[11px] text-sky-800 font-medium block">
                  银行账户或现金中随时可动用的储备资金
                </span>
              </div>

              <div className="p-4.5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-neutral-800">
                  实际运营时长 (月)
                </label>
                <input
                  type="number"
                  value={formData.operatingMonthsCount || ''}
                  onChange={(e) => updateField('operatingMonthsCount', Number(e.target.value))}
                  className="w-full p-3 border-2 border-neutral-300 rounded-xl font-mono text-lg font-bold text-neutral-900 bg-white"
                  placeholder="24"
                />
                <span className="text-[11px] text-neutral-500 block">新启动项目按实际筹备/运营月数填写</span>
              </div>

              <div className="p-4.5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-neutral-800">
                  全职团队人数 (不含自己)
                </label>
                <input
                  type="number"
                  value={formData.fullTimeEmployeesCount || ''}
                  onChange={(e) => updateField('fullTimeEmployeesCount', Number(e.target.value))}
                  className="w-full p-3 border-2 border-neutral-300 rounded-xl font-mono text-lg font-bold text-neutral-900 bg-white"
                  placeholder="2"
                />
                <span className="text-[11px] text-neutral-500 block">单人负责或独立运营填 0</span>
              </div>
            </div>
          </div>

          {/* Action Submit Button */}
          <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-neutral-500 font-medium">
              数据仅用于本地财务测算与模型健康度评估。
            </div>

            <button
              type="button"
              onClick={handleFinalSubmit}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-2xl text-base sm:text-lg font-black shadow-xl shadow-indigo-600/25 transition-all cursor-pointer hover:scale-102 flex items-center justify-center gap-2.5"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>生成商业宣教商业模型财务测算报告</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Basic Information & Sensitive Region Safe Mode */}
      {formMode === 'detailed' && currentStep === 1 && (
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
                  onChange={(e) => updateField('projectName', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  所属行业类型 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-800 bg-white"
                >
                  {INDUSTRY_BENCHMARKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameZh}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  主报告币种 (Base Currency) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.baseCurrency}
                  onChange={(e) => updateField('baseCurrency', e.target.value as CurrencyCode)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 bg-white"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameZh} - {c.symbol}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  后续所有其他币种金额将自动依据汇率折算为该主币种。
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">经营者联络邮箱</label>
                <input
                  type="email"
                  placeholder="owner@example.com"
                  value={formData.ownerEmail}
                  onChange={(e) => updateField('ownerEmail', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-800"
                />
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
                      placeholder="例如：52.5 或 1580"
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
      {formMode === 'detailed' && currentStep === 2 && (
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
      {formMode === 'detailed' && currentStep === 3 && (
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
                      💡 <b>大白话：</b>这是客人买单进你口袋/收银机/微信/银行卡的<b>全部毛钱（总营业额）</b>，<b>尚未扣除</b>进货成本、房租与人工！
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
                  placeholder="例如：50000（填近3-12个月平均每月总营业额）"
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
      {formMode === 'detailed' && currentStep === 4 && (
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
                    💡 进货货款、生鲜食材原料等直接买货成本（包含长途运费，但不含房租和员工工资）。
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
                placeholder="例如：15000（每月进货与原材料总支出）"
                value={formData.cogsCost.amount || ''}
                onChange={(e) => updateMoney('cogsCost', Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white"
              />
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
      {formMode === 'detailed' && currentStep === 5 && (
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
                    {formData.proofType === 'none' ? '无凭证纯手动填写' : formData.proofType}
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
