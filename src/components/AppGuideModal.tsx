import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Calculator,
  ArrowRight,
  ArrowLeft,
  Store,
  PieChart,
  HelpCircle,
  Zap,
  TrendingUp,
  HeartHandshake,
  Lock,
  Compass,
  Layers,
  BatteryCharging,
  FileSpreadsheet
} from 'lucide-react';
import { Language } from '../types';

interface AppGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onStartWithTemplate?: (templateId: string) => void;
  onOpenAiHelper?: (topic?: string) => void;
}

export const AppGuideModal: React.FC<AppGuideModalProps> = ({
  isOpen,
  onClose,
  language,
  onStartWithTemplate,
  onOpenAiHelper
}) => {
  const [activeTab, setActiveTab] = useState<'intro' | 'steps' | 'glossary' | 'faq'>('intro');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border-2 border-neutral-200 text-neutral-800 relative my-6 max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-700 p-2 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer z-10"
          title="关闭说明"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                USER GUIDE & APP OVERVIEW
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                零基础大白话版
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-950 tracking-tight mt-0.5">
              3分钟看懂：微小企业商业健康体检仪
            </h2>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-2xl mb-4 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('intro')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'intro'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            🌟 1. 这是什么工具？
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'steps'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            🚀 2. 三步极简使用流程
          </button>
          <button
            onClick={() => setActiveTab('glossary')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'glossary'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            📖 3. 大白话名词对照
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'faq'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            💡 4. 常见顾虑答疑
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
          {/* TAB 1: INTRO */}
          {activeTab === 'intro' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border-2 border-indigo-100 text-indigo-950 space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-indigo-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>给小店主、个体户、摆摊创业者的「全自动生意体检仪」</span>
                </h3>
                <p className="text-neutral-700 leading-relaxed">
                  平时开餐饮小吃、便利杂货、跨境电商或做手艺维修，经常会遇到三个最核心的困惑：
                  <strong>「我到底赚不赚钱？」、「如果不进账我能撑几个月？」、「我的房租和人工成本有没有过高？」</strong>
                </p>
                <p className="text-neutral-700 leading-relaxed">
                  本工具无需您懂复杂的财务报表，只要输入您日常收支的几笔关键数字，<strong>AI 计算引擎将在 1 秒内为您出具 5 维度健康雷达图、存活现金跑道预警与定制改善建议</strong>。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs mb-2">
                    💯
                  </div>
                  <h4 className="font-bold text-emerald-950 mb-1">100% 公开透明</h4>
                  <p className="text-emerald-800 text-[11px] leading-relaxed">
                    没有复杂的财务门槛，所有评分规则、通过线与 5 道否决红线完全公开，人人平等。
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs mb-2">
                    📝
                  </div>
                  <h4 className="font-bold text-amber-950 mb-1">凭证零歧视</h4>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    微信收款截图、手写账本、移动钱包或纯手动输入均可，凭证类型绝不扣减一分。
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200">
                  <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs mb-2">
                    🛡️
                  </div>
                  <h4 className="font-bold text-sky-950 mb-1">隐私与云端随心选</h4>
                  <p className="text-sky-800 text-[11px] leading-relaxed">
                    支持脱敏安全模式；随时可在「我的项目」中一键彻底粉碎删除，或者登录 Google 跨设备找回。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STEPS */}
          {activeTab === 'steps' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border-2 border-neutral-200 hover:border-indigo-300 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 text-xs">第 1 步：报数字（三种超简单方式任选）</h4>
                  <p className="text-neutral-600 text-[11px] mt-1 leading-relaxed">
                    • <strong>方式 A（最推荐）</strong>：点击表单顶部的【👶 一键行业范本】，直接载入餐饮、零售、电商的真实数字改动；<br />
                    • <strong>方式 B（动口不动手）</strong>：在【✨ AI 帮我填】里随手打一句话（如“我开小吃店月流水3万进货1万”），AI 自动提取填入；<br />
                    • <strong>方式 C</strong>：按步骤直接填写。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border-2 border-neutral-200 hover:border-indigo-300 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 text-xs">第 2 步：看体检（1 秒生成 5 维雷达体检报告）</h4>
                  <p className="text-neutral-600 text-[11px] mt-1 leading-relaxed">
                    • <strong>综合得分与评级</strong>：AAA（极优）、AA/A（稳健）、BBB/BB（有短板需改善）、B/REJECT（高危）；<br />
                    • <strong>救命现金电池</strong>：显示如果一分钱不进账，你账上的备用金能抗几个月；<br />
                    • <strong>5 道红线筛查</strong>：是否毛利倒挂、是否被房租压死、是否过度依赖补贴。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border-2 border-neutral-200 hover:border-indigo-300 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 text-xs">第 3 步：调方案（沙盒试算器与 AI 锦囊）</h4>
                  <p className="text-neutral-600 text-[11px] mt-1 leading-relaxed">
                    • 进入【沙盒试算器】，滑动拉杆模拟“如果提价 10%”、“如果房租谈下 500 块”、“如果多存 1 万备用金”后分数会如何提升；<br />
                    • 获取 AI 根据您的具体行业生成的 3 条立即可落地的改善行动方案。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GLOSSARY */}
          {activeTab === 'glossary' && (
            <div className="space-y-2.5">
              <p className="text-[11px] text-neutral-500 font-medium">
                财务专业名词太绕？这里全换成菜市场做买卖的人话：
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px]">营业收入</span>
                    <span>= 顾客付的总钱数</span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    本月收到的全部营业进账流水，包含现金、扫码与转账。
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px]">COGS 营业成本</span>
                    <span>= 买原材料 / 进货进价</span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    卖出一杯奶茶用的茶叶、奶、杯子；卖一件衣服的拿货批发价。不卖这件东西就不会花这笔钱。
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px]">OPEX 运营开销</span>
                    <span>= 雷打不动的固定支出</span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    不管今天有没有客人进门，都必须交的房东房租、员工底薪、水电费和网费。
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px]">备用金与现金跑道</span>
                    <span>= 救命钱与能撑几个月</span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    银行卡里随时能动的活钱。如果明天起停业一分钱不进，这笔钱能扛几个月的房租和工资。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <h4 className="font-bold text-neutral-900 text-xs">Q1：我只有手写记账本或者微信收款码截图，会被扣分吗？</h4>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  <strong>绝对不会！</strong> 本系统的核心原则是「凭证平等」。无论是正规银行盖章流水、手写日记本、还是完全无凭证手动填写 14 项数字，打分引擎基于同一套数学模型计算，不以凭证形式为由扣减任何分数。
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <h4 className="font-bold text-neutral-900 text-xs">Q2：如果有些月份流水断了或者记不清怎么办？</h4>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  系统提供【AI 断点流水自动均摊补齐】功能，会自动根据前后相邻月份的平均值进行智能平滑估算，无需凭空捏造。
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <h4 className="font-bold text-neutral-900 text-xs">Q3：提交自测会产生费用吗？</h4>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  本自测工具 100% 免费开放，零门槛、零中介费、零隐形收费。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onOpenAiHelper && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAiHelper('新手如何看懂体检报告与得分？');
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>呼叫 AI 大白话助手答疑</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer hover:scale-102 flex items-center gap-1.5"
            >
              <span>我明白了，开始自测</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
