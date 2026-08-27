import React from 'react';
import {
  Store,
  Coffee,
  ShoppingBag,
  Scissors,
  Laptop,
  CheckCircle2,
  Sparkles,
  Zap
} from 'lucide-react';
import { BusinessFormData, CurrencyCode } from '../../types';

interface IndustryTemplatesBarProps {
  onSelectTemplate: (templateData: Partial<BusinessFormData>) => void;
  baseCurrency: CurrencyCode;
}

export const REAL_TEMPLATES = [
  {
    id: 'medical_clinic',
    name: '🩺 工场社区义诊与爱心卫生所',
    tag: '基础医疗 · 药品采购 · 关怀贫民',
    industry: 'medical_health',
    desc: '月门诊/药品 3.8万 · 进药耗材 1.5万 · 诊所租金 3500 · 备用金 4万',
    data: {
      projectName: '恩典社区爱心便民诊所',
      industry: 'medical_health',
      businessType: '基层医疗义诊与药物平价供应',
      monthlyRevenue: { amount: 38000, currency: 'USD' },
      monthlyRealOperatingRevenue: { amount: 38000, currency: 'USD' },
      monthlyExternalGrants: { amount: 0, currency: 'USD' },
      cogsCost: { amount: 15000, currency: 'USD' },
      rentCost: { amount: 3500, currency: 'USD' },
      laborCost: { amount: 4800, currency: 'USD' },
      utilityCost: { amount: 950, currency: 'USD' },
      taxCost: { amount: 300, currency: 'USD' },
      otherOpex: { amount: 850, currency: 'USD' },
      existingDebtMonthlyPayment: { amount: 0, currency: 'USD' },
      cashAndLiquidAssets: { amount: 40000, currency: 'USD' },
      inventoryValue: { amount: 12000, currency: 'USD' },
      operatingMonthsCount: 24,
      fullTimeEmployeesCount: 2
    }
  },
  {
    id: 'language_education',
    name: '📚 语言学习与青年辅导中心',
    tag: '英语语言培训 · 技能赋能 · 课后辅导',
    industry: 'education_training',
    desc: '月学费收入 3.5万 · 教材耗材 3200 · 教学场地 4500 · 备用金 4万',
    data: {
      projectName: '麦种多语言与青年教育中心',
      industry: 'education_training',
      businessType: '语言培训与青年课业辅导',
      monthlyRevenue: { amount: 35000, currency: 'USD' },
      monthlyRealOperatingRevenue: { amount: 35000, currency: 'USD' },
      monthlyExternalGrants: { amount: 0, currency: 'USD' },
      cogsCost: { amount: 3200, currency: 'USD' },
      rentCost: { amount: 4500, currency: 'USD' },
      laborCost: { amount: 5000, currency: 'USD' },
      utilityCost: { amount: 800, currency: 'USD' },
      taxCost: { amount: 400, currency: 'USD' },
      otherOpex: { amount: 900, currency: 'USD' },
      existingDebtMonthlyPayment: { amount: 0, currency: 'USD' },
      cashAndLiquidAssets: { amount: 40000, currency: 'USD' },
      inventoryValue: { amount: 3000, currency: 'USD' },
      operatingMonthsCount: 18,
      fullTimeEmployeesCount: 1
    }
  },
  {
    id: 'mobile_medical',
    name: '🚐 流动巡回医疗车与急救站',
    tag: '偏远巡诊 · 慢病筛查 · 送医下乡',
    industry: 'medical_health',
    desc: '月进账/补贴 2.9万 · 药物及器械耗材 1.1万 · 油费场地 3000 · 备用金 3.5万',
    data: {
      projectName: '好撒玛利亚人流动医疗车',
      industry: 'medical_health',
      businessType: '偏远乡村巡诊与急救护理',
      monthlyRevenue: { amount: 29000, currency: 'USD' },
      monthlyRealOperatingRevenue: { amount: 29000, currency: 'USD' },
      monthlyExternalGrants: { amount: 0, currency: 'USD' },
      cogsCost: { amount: 11000, currency: 'USD' },
      rentCost: { amount: 3000, currency: 'USD' },
      laborCost: { amount: 4200, currency: 'USD' },
      utilityCost: { amount: 1200, currency: 'USD' },
      taxCost: { amount: 200, currency: 'USD' },
      otherOpex: { amount: 700, currency: 'USD' },
      existingDebtMonthlyPayment: { amount: 0, currency: 'USD' },
      cashAndLiquidAssets: { amount: 35000, currency: 'USD' },
      inventoryValue: { amount: 8000, currency: 'USD' },
      operatingMonthsCount: 20,
      fullTimeEmployeesCount: 2
    }
  },
  {
    id: 'vocational_school',
    name: '🛠️ 职业技能与计算机培训班',
    tag: '电脑IT · 缝纫电工 · 帮助贫困青年就业',
    industry: 'education_training',
    desc: '月学费 4.6万 · 实训耗材 1.2万 · 教室租金 5500 · 备用金 5万',
    data: {
      projectName: '希望之光青年职业技能学校',
      industry: 'education_training',
      businessType: '计算机应用与职业实用技能培训',
      monthlyRevenue: { amount: 46000, currency: 'USD' },
      monthlyRealOperatingRevenue: { amount: 46000, currency: 'USD' },
      monthlyExternalGrants: { amount: 0, currency: 'USD' },
      cogsCost: { amount: 12000, currency: 'USD' },
      rentCost: { amount: 5500, currency: 'USD' },
      laborCost: { amount: 6000, currency: 'USD' },
      utilityCost: { amount: 1100, currency: 'USD' },
      taxCost: { amount: 300, currency: 'USD' },
      otherOpex: { amount: 1200, currency: 'USD' },
      existingDebtMonthlyPayment: { amount: 0, currency: 'USD' },
      cashAndLiquidAssets: { amount: 50000, currency: 'USD' },
      inventoryValue: { amount: 15000, currency: 'USD' },
      operatingMonthsCount: 30,
      fullTimeEmployeesCount: 3
    }
  },
  {
    id: 'preschool_care',
    name: '🧒 贫困社区儿童日托与幼教点',
    tag: '幼儿启蒙 · 营养辅餐 · 帮助双职工家庭',
    industry: 'education_training',
    desc: '月托费 2.6万 · 食材教具 7500 · 场地租金 2800 · 备用金 3万',
    data: {
      projectName: '百合花社区儿童日托中心',
      industry: 'education_training',
      businessType: '社区学龄前关怀与幼儿教育',
      monthlyRevenue: { amount: 26000, currency: 'USD' },
      monthlyRealOperatingRevenue: { amount: 26000, currency: 'USD' },
      monthlyExternalGrants: { amount: 0, currency: 'USD' },
      cogsCost: { amount: 7500, currency: 'USD' },
      rentCost: { amount: 2800, currency: 'USD' },
      laborCost: { amount: 4000, currency: 'USD' },
      utilityCost: { amount: 600, currency: 'USD' },
      taxCost: { amount: 200, currency: 'USD' },
      otherOpex: { amount: 900, currency: 'USD' },
      existingDebtMonthlyPayment: { amount: 0, currency: 'USD' },
      cashAndLiquidAssets: { amount: 30000, currency: 'USD' },
      inventoryValue: { amount: 4000, currency: 'USD' },
      operatingMonthsCount: 16,
      fullTimeEmployeesCount: 2
    }
  }
];

export const IndustryTemplatesBar: React.FC<IndustryTemplatesBarProps> = ({
  onSelectTemplate,
  baseCurrency
}) => {
  const handleApplyTemplate = (tpl: typeof REAL_TEMPLATES[0]) => {
    const cur = baseCurrency || 'USD';
    const raw = tpl.data;

    // Apply template with current base currency
    const adapted: Partial<BusinessFormData> = {
      projectName: raw.projectName,
      industry: raw.industry,
      businessType: raw.businessType,
      monthlyRevenue: { amount: raw.monthlyRevenue.amount, currency: cur },
      monthlyRealOperatingRevenue: { amount: raw.monthlyRealOperatingRevenue.amount, currency: cur },
      monthlyExternalGrants: { amount: 0, currency: cur },
      cogsCost: { amount: raw.cogsCost.amount, currency: cur },
      rentCost: { amount: raw.rentCost.amount, currency: cur },
      laborCost: { amount: raw.laborCost.amount, currency: cur },
      utilityCost: { amount: raw.utilityCost.amount, currency: cur },
      taxCost: { amount: raw.taxCost.amount, currency: cur },
      otherOpex: { amount: raw.otherOpex.amount, currency: cur },
      existingDebtMonthlyPayment: { amount: raw.existingDebtMonthlyPayment.amount, currency: cur },
      cashAndLiquidAssets: { amount: raw.cashAndLiquidAssets.amount, currency: cur },
      inventoryValue: { amount: raw.inventoryValue.amount, currency: cur },
      operatingMonthsCount: raw.operatingMonthsCount,
      fullTimeEmployeesCount: raw.fullTimeEmployeesCount,
      monthlyBreakdowns: [
        { month: '2026-01', revenue: { amount: Math.round(raw.monthlyRevenue.amount * 0.92), currency: cur } },
        { month: '2026-02', revenue: { amount: Math.round(raw.monthlyRevenue.amount * 0.98), currency: cur } },
        { month: '2026-03', revenue: { amount: Math.round(raw.monthlyRevenue.amount * 0.95), currency: cur } },
        { month: '2026-04', revenue: { amount: Math.round(raw.monthlyRevenue.amount * 1.05), currency: cur } },
        { month: '2026-05', revenue: { amount: Math.round(raw.monthlyRevenue.amount * 1.02), currency: cur } },
        { month: '2026-06', revenue: { amount: Math.round(raw.monthlyRevenue.amount * 1.08), currency: cur } }
      ]
    };

    onSelectTemplate(adapted);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-neutral-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
            🌱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                1秒一键套用工场服事范本
              </span>
              <span className="text-xs text-neutral-600 font-bold">医疗与教育服事 · 帮助当地人</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-neutral-900 mt-0.5">
              选用常见医疗诊所与教育培训服事真实范本
            </h3>
          </div>
        </div>
        <span className="text-xs sm:text-sm text-neutral-500 font-medium">点击任意服事项目，自动填好成套真实运转收支数据</span>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {REAL_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => handleApplyTemplate(tpl)}
            className="p-4 rounded-2xl bg-neutral-50 hover:bg-indigo-50 border-2 border-neutral-200 hover:border-indigo-400 text-left transition-all cursor-pointer group hover:scale-102 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-sm text-neutral-900 group-hover:text-indigo-950">
                  {tpl.name}
                </span>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-md bg-white border border-neutral-300 text-xs font-bold text-neutral-700 mb-2">
                {tpl.tag}
              </span>
              <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                {tpl.desc}
              </p>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-neutral-200/80 flex items-center justify-between text-xs text-indigo-700 font-bold">
              <span>一键套用</span>
              <Zap className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-amber-500" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
