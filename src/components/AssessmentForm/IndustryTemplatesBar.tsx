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
    id: 'fnb_tea',
    name: '🥤 街边茶饮 / 咖啡馆',
    tag: '毛利高 · 房租重',
    industry: 'food_beverage',
    desc: '月流水 4.2万 · 原料 1.6万 · 房租 4500 · 备用金 3.5万',
    data: {
      projectName: '阳光茶饮与咖啡小馆',
      industry: 'food_beverage',
      businessType: '茶饮与轻食',
      monthlyRevenue: { amount: 42000, currency: 'USD' },
      monthlyRealOperatingRevenue: { amount: 42000, currency: 'USD' },
      monthlyExternalGrants: { amount: 0, currency: 'USD' },
      cogsCost: { amount: 16800, currency: 'USD' },
      rentCost: { amount: 4500, currency: 'USD' },
      laborCost: { amount: 5000, currency: 'USD' },
      utilityCost: { amount: 900, currency: 'USD' },
      taxCost: { amount: 600, currency: 'USD' },
      otherOpex: { amount: 800, currency: 'USD' },
      existingDebtMonthlyPayment: { amount: 0, currency: 'USD' },
      cashAndLiquidAssets: { amount: 35000, currency: 'USD' },
      inventoryValue: { amount: 8000, currency: 'USD' },
      operatingMonthsCount: 20,
      fullTimeEmployeesCount: 2
    }
  },
  {
    id: 'retail_grocery',
    name: '🛒 社区便利店 / 杂货',
    tag: '走量微利 · 进货重',
    industry: 'retail',
    desc: '月流水 7.5万 · 进货 5.2万 · 房租 6000 · 备用金 4万',
    data: {
      projectName: '百家惠便民社区超市',
      industry: 'retail',
      businessType: '日用零售与副食',
      monthlyRevenue: { amount: 75000, currency: 'USD' },
      monthlyRealOperatingRevenue: { amount: 75000, currency: 'USD' },
      monthlyExternalGrants: { amount: 0, currency: 'USD' },
      cogsCost: { amount: 52000, currency: 'USD' },
      rentCost: { amount: 6000, currency: 'USD' },
      laborCost: { amount: 4000, currency: 'USD' },
      utilityCost: { amount: 1200, currency: 'USD' },
      taxCost: { amount: 800, currency: 'USD' },
      otherOpex: { amount: 1000, currency: 'USD' },
      existingDebtMonthlyPayment: { amount: 500, currency: 'USD' },
      cashAndLiquidAssets: { amount: 40000, currency: 'USD' },
      inventoryValue: { amount: 35000, currency: 'USD' },
      operatingMonthsCount: 36,
      fullTimeEmployeesCount: 1
    }
  },
  {
    id: 'ecom_store',
    name: '📦 跨境网店 / 外贸',
    tag: '采购运费 · 周转快',
    industry: 'ecommerce',
    desc: '月流水 11万 · 采购 5.8万 · 营销 1.2万 · 备用金 7万',
    data: {
      projectName: 'GlobalDirect 跨境选品小店',
      industry: 'ecommerce',
      businessType: '海外独立网店',
      monthlyRevenue: { amount: 110000, currency: 'USD' },
      monthlyRealOperatingRevenue: { amount: 110000, currency: 'USD' },
      monthlyExternalGrants: { amount: 0, currency: 'USD' },
      cogsCost: { amount: 58000, currency: 'USD' },
      rentCost: { amount: 2000, currency: 'USD' },
      laborCost: { amount: 6000, currency: 'USD' },
      utilityCost: { amount: 500, currency: 'USD' },
      taxCost: { amount: 1500, currency: 'USD' },
      otherOpex: { amount: 12000, currency: 'USD' },
      existingDebtMonthlyPayment: { amount: 0, currency: 'USD' },
      cashAndLiquidAssets: { amount: 70000, currency: 'USD' },
      inventoryValue: { amount: 25000, currency: 'USD' },
      operatingMonthsCount: 16,
      fullTimeEmployeesCount: 2
    }
  },
  {
    id: 'service_salon',
    name: '✂️ 社区美发 / 便民家政',
    tag: '手艺为主 · 耗材轻',
    industry: 'local_service',
    desc: '月流水 3.2万 · 耗材 3500 · 租金 5000 · 备用金 2.8万',
    data: {
      projectName: '新尚艺社区造型服务馆',
      industry: 'local_service',
      businessType: '生活美容美发',
      monthlyRevenue: { amount: 32000, currency: 'USD' },
      monthlyRealOperatingRevenue: { amount: 32000, currency: 'USD' },
      monthlyExternalGrants: { amount: 0, currency: 'USD' },
      cogsCost: { amount: 3500, currency: 'USD' },
      rentCost: { amount: 5000, currency: 'USD' },
      laborCost: { amount: 11000, currency: 'USD' },
      utilityCost: { amount: 800, currency: 'USD' },
      taxCost: { amount: 400, currency: 'USD' },
      otherOpex: { amount: 700, currency: 'USD' },
      existingDebtMonthlyPayment: { amount: 0, currency: 'USD' },
      cashAndLiquidAssets: { amount: 28000, currency: 'USD' },
      inventoryValue: { amount: 4000, currency: 'USD' },
      operatingMonthsCount: 24,
      fullTimeEmployeesCount: 2
    }
  },
  {
    id: 'freelance_studio',
    name: '💻 自由职业 / 独立工作室',
    tag: '轻资产 · 利润高',
    industry: 'craft_workshop',
    desc: '月流水 2.5万 · 耗材 1500 · 工位 2500 · 备用金 4.5万',
    data: {
      projectName: '灵感工坊创意设计工作室',
      industry: 'craft_workshop',
      businessType: '设计与数字制作',
      monthlyRevenue: { amount: 25000, currency: 'USD' },
      monthlyRealOperatingRevenue: { amount: 25000, currency: 'USD' },
      monthlyExternalGrants: { amount: 0, currency: 'USD' },
      cogsCost: { amount: 1500, currency: 'USD' },
      rentCost: { amount: 2500, currency: 'USD' },
      laborCost: { amount: 2000, currency: 'USD' },
      utilityCost: { amount: 300, currency: 'USD' },
      taxCost: { amount: 500, currency: 'USD' },
      otherOpex: { amount: 1500, currency: 'USD' },
      existingDebtMonthlyPayment: { amount: 0, currency: 'USD' },
      cashAndLiquidAssets: { amount: 45000, currency: 'USD' },
      inventoryValue: { amount: 2000, currency: 'USD' },
      operatingMonthsCount: 18,
      fullTimeEmployeesCount: 1
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
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-neutral-200 shadow-xs space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
            👶
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                1-CLICK TEMPLATES
              </span>
              <span className="text-[10px] text-neutral-500 font-bold">零商业基础极简上手</span>
            </div>
            <h3 className="text-sm font-black text-neutral-900 mt-0.5">
              一键载入真实行业参考范本
            </h3>
          </div>
        </div>
        <span className="text-xs text-neutral-400">点击任意行业，自动填好成套真实数据</span>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {REAL_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => handleApplyTemplate(tpl)}
            className="p-3 rounded-2xl bg-neutral-50 hover:bg-indigo-50 border-2 border-neutral-200 hover:border-indigo-400 text-left transition-all cursor-pointer group hover:scale-102 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-neutral-900 group-hover:text-indigo-950">
                  {tpl.name}
                </span>
              </div>
              <span className="inline-block px-1.5 py-0.5 rounded-md bg-white border border-neutral-200 text-[10px] font-bold text-neutral-600 mb-2">
                {tpl.tag}
              </span>
              <p className="text-[11px] text-neutral-500 leading-tight">
                {tpl.desc}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[11px] text-indigo-600 font-bold">
              <span>一键套用</span>
              <Zap className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
