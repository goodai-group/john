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
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-200 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
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
                ? 'bg-white text-teal-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            1. 这是什么工具？
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'steps'
                ? 'bg-white text-teal-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            2. 三步极简使用流程
          </button>
          <button
            onClick={() => setActiveTab('glossary')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'glossary'
                ? 'bg-white text-teal-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            3. 大白话名词对照
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'faq'
                ? 'bg-white text-teal-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            4. 常见顾虑答疑
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
          {/* TAB 1: INTRO */}
          {activeTab === 'intro' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-teal-50/70 border-2 border-teal-100 text-teal-950 space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-teal-900">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>给宣教同工与工场爱心服事的「全自动财务健康体检仪」</span>
                </h3>
                <p className="text-neutral-700 leading-relaxed">
                  在工场开办爱心便民门诊、语言学习班、计算机实训学校或社区扶贫服事，同工常面临三个现实考验：
                  <strong>「每月的看诊或学费能否抵消药品与场地成本？」、「如果遭遇突发情况，账上现金能抗几个月？」、「是否过度依赖外部奉献或面临资金链断裂风险？」</strong>
                </p>
                <p className="text-neutral-700 leading-relaxed">
                  本系统无需懂任何复杂财务报表，只需选一个最接近的真实范本或随手打几笔收支，<strong>计算引擎即刻为您出具 5 维度健康雷达图、存活现金跑道预警与针对性良性运营建议</strong>。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-emerald-950 mb-1">公开透明 · 零门槛</h4>
                  <p className="text-emerald-800 text-[11px] leading-relaxed">
                    没有复杂的财务术语，所有评分规则、安全水位与 5 道否决红线完全公开清晰。
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-2">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-amber-950 mb-1">1秒套用工场真实范本</h4>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    内置医疗门诊、语言辅导、技能培训等真实工场模型，无需手动算数字即可直接自测。
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200">
                  <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center mb-2">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sky-950 mb-1">工场安全与隐私保护</h4>
                  <p className="text-sky-800 text-[11px] leading-relaxed">
                    支持脱敏安全模式；随时可在「我的项目」中一键彻底粉碎删除，或安全保存。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STEPS */}
          {activeTab === 'steps' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border-2 border-neutral-200 hover:border-teal-300 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 text-xs">第 1 步：选范本或随手说（3 种轻松方式任选）</h4>
                  <p className="text-neutral-600 text-[11px] mt-1 leading-relaxed">
                    • <strong>方式 A（最推荐）</strong>：点击【常用服事范本】，直接载入医疗诊所、语言学校、技能培训的真实数字；<br />
                    • <strong>方式 B（口语随手写）</strong>：在【AI 随手写】里输入大白话（如“我们在工场办门诊月进账3万8，进药1万5，房租3500”），AI 自动识别；<br />
                    • <strong>方式 C</strong>：手动填几笔核心收支。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border-2 border-neutral-200 hover:border-teal-300 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 text-xs">第 2 步：看实时晴雨表（1 秒测算出存活跑道）</h4>
                  <p className="text-neutral-600 text-[11px] mt-1 leading-relaxed">
                    • <strong>救命现金电池</strong>：显示如果一分钱不进账，手头的应急备用金能维持几个月房租同工；<br />
                    • <strong>每 100 元进账去向</strong>：进药教材耗材占几成、房租同工占几成、结余留存几成；<br />
                    • <strong>综合评级预估</strong>：AA 级（稳健良性）、BB 级（有风险需改善）。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border-2 border-neutral-200 hover:border-teal-300 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 text-xs">第 3 步：生成体检报告与沙盒试算</h4>
                  <p className="text-neutral-600 text-[11px] mt-1 leading-relaxed">
                    • 查看 5 维度健康雷达图与 5 道否决安全红线筛查结果；<br />
                    • 在沙盒试算器中模拟“如果药品降低采购价”、“如果多存备用金”对安全跑道的影响。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GLOSSARY */}
          {activeTab === 'glossary' && (
            <div className="space-y-2.5">
              <p className="text-[11px] text-neutral-500 font-medium">
                财务专业名词太绕？这里全换成工场大白话：
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 text-[10px]">门诊/学费进账</span>
                    <span>= 当月看诊费与服务收入</span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    门诊挂号、平价药品售出、学生辅导学费等来自服务对象的实际流水进账。
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px]">采购直接耗材</span>
                    <span>= 药品 / 教材 / 耗材进货价</span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    采购常用药品、针剂注射耗材、急救包、教材教具与实训耗材的直接进价花费。
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px]">固定运转开销</span>
                    <span>= 房租 + 同工补贴 + 水电</span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    不管今天有没有病人或学生，每个月都必须支出的诊所房租、本地助理护士/老师薪资与水电网费。
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px]">应急水库与跑道</span>
                    <span>= 手头活钱与能撑几个月</span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">
                    卡里或手头随时能动的急用备用金。如果遇到动荡或停业，这笔钱能保障服事维持运转几个月。
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
              className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-200 transition-all cursor-pointer hover:scale-102 flex items-center gap-1.5"
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
