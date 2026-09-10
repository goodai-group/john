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
          title={language === 'zh' ? '关闭说明' : 'Close guide'}
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
              <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                USER GUIDE & APP OVERVIEW
              </span>
              <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {language === 'zh' ? '零基础大白话版' : 'Plain-Language, No Experience Needed'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-950 tracking-tight mt-0.5">
              {language === 'zh'
                ? '3分钟看懂：微小企业商业健康体检仪'
                : 'Understand in 3 Minutes: Micro-Business Health Checkup Tool'}
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
            {language === 'zh' ? '1. 这是什么工具？' : '1. What is this tool?'}
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'steps'
                ? 'bg-white text-teal-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {language === 'zh' ? '2. 三步极简使用流程' : '2. Three Simple Steps'}
          </button>
          <button
            onClick={() => setActiveTab('glossary')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'glossary'
                ? 'bg-white text-teal-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {language === 'zh' ? '3. 大白话名词对照' : '3. Plain-Language Glossary'}
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'faq'
                ? 'bg-white text-teal-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {language === 'zh' ? '4. 常见顾虑答疑' : '4. Common Questions'}
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
                  <span>
                    {language === 'zh'
                      ? '给宣教同工与工场爱心服事的「全自动财务健康体检仪」'
                      : 'An Automated Financial Health Checkup for Mission Workers & Field Ministries'}
                  </span>
                </h3>
                {language === 'zh' ? (
                  <>
                    <p className="text-neutral-700 leading-relaxed">
                      在工场开办爱心便民门诊、语言学习班、计算机实训学校或社区扶贫服事，同工常面临三个现实考验：
                      <strong>「每月的看诊或学费能否抵消药品与场地成本？」、「如果遭遇突发情况，账上现金能抗几个月？」、「是否过度依赖外部奉献或面临资金链断裂风险？」</strong>
                    </p>
                    <p className="text-neutral-700 leading-relaxed">
                      本系统无需懂任何复杂财务报表，只需选一个最接近的真实范本或随手打几笔收支，<strong>计算引擎即刻为您出具 5 维度健康雷达图、存活现金跑道预警与针对性良性运营建议</strong>。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-neutral-700 leading-relaxed">
                      Running a low-cost clinic, language class, computer training school, or community outreach in the field, workers often face three real questions:
                      <strong> "Do this month's fees cover medicine and venue costs?", "If something unexpected happens, how many months can our cash cover?", "Are we too dependent on outside donations, or at risk of running out of funds?"</strong>
                    </p>
                    <p className="text-neutral-700 leading-relaxed">
                      No complex financial statements needed — just pick the closest real-world template or jot down a few income/expense numbers, and <strong>the engine instantly produces a 5-dimension health radar chart, a cash-runway warning, and tailored recommendations</strong>.
                    </p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-emerald-950 mb-1">
                    {language === 'zh' ? '公开透明 · 零门槛' : 'Open & Transparent · No Barrier'}
                  </h4>
                  <p className="text-emerald-800 text-[13px] leading-relaxed">
                    {language === 'zh'
                      ? '没有复杂的财务术语，所有评分规则、安全水位与 5 道否决红线完全公开清晰。'
                      : 'No complex financial jargon — every scoring rule, safety threshold, and the 5 hard limits are fully disclosed.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-2">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-amber-950 mb-1">
                    {language === 'zh' ? '1秒套用工场真实范本' : 'Apply a Real Field Template Instantly'}
                  </h4>
                  <p className="text-amber-800 text-[13px] leading-relaxed">
                    {language === 'zh'
                      ? '内置医疗门诊、语言辅导、技能培训等真实工场模型，无需手动算数字即可直接自测。'
                      : 'Built-in real-world models for clinics, language tutoring, and skills training — self-assess instantly without manual math.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200">
                  <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center mb-2">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sky-950 mb-1">
                    {language === 'zh' ? '工场安全与隐私保护' : 'Field Safety & Privacy Protection'}
                  </h4>
                  <p className="text-sky-800 text-[13px] leading-relaxed">
                    {language === 'zh'
                      ? '支持脱敏安全模式；随时可在「我的项目」中一键彻底粉碎删除，或安全保存。'
                      : 'Supports a sensitive-data-safe mode; permanently delete or securely save at any time from "My Projects".'}
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
                  <h4 className="font-bold text-neutral-900 text-xs">
                    {language === 'zh' ? '第 1 步：选范本或随手说（3 种轻松方式任选）' : 'Step 1: Pick a Template or Just Describe It (3 Easy Ways)'}
                  </h4>
                  {language === 'zh' ? (
                    <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">
                      • <strong>方式 A（最推荐）</strong>：点击【常用服事范本】，直接载入医疗诊所、语言学校、技能培训的真实数字；<br />
                      • <strong>方式 B（口语随手写）</strong>：在【AI 随手写】里输入大白话（如“我们在工场办门诊月进账3万8，进药1万5，房租3500”），AI 自动识别；<br />
                      • <strong>方式 C</strong>：手动填几笔核心收支。
                    </p>
                  ) : (
                    <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">
                      • <strong>Option A (recommended)</strong>: Click "Common Ministry Templates" to load real numbers for a clinic, language school, or skills training program;<br />
                      • <strong>Option B (plain-language)</strong>: Type in plain words under "AI Quick Entry" (e.g. "Our clinic brings in 38,000 a month, spends 15,000 on medicine, rent is 3,500") and AI picks it up automatically;<br />
                      • <strong>Option C</strong>: Manually fill in a few core income/expense figures.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border-2 border-neutral-200 hover:border-teal-300 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 text-xs">
                    {language === 'zh' ? '第 2 步：看实时晴雨表（1 秒测算出存活跑道）' : 'Step 2: Check the Live Dashboard (Runway Calculated Instantly)'}
                  </h4>
                  {language === 'zh' ? (
                    <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">
                      • <strong>救命现金电池</strong>：显示如果一分钱不进账，手头的应急备用金能维持几个月房租同工；<br />
                      • <strong>每 100 元进账去向</strong>：进药教材耗材占几成、房租同工占几成、结余留存几成；<br />
                      • <strong>综合评级预估</strong>：AA 级（稳健良性）、BB 级（有风险需改善）。
                    </p>
                  ) : (
                    <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">
                      • <strong>Cash-Runway Battery</strong>: shows how many months your emergency reserve can cover rent and staff if income stops completely;<br />
                      • <strong>Where every $100 goes</strong>: share spent on supplies, share on rent/staff, share kept as savings;<br />
                      • <strong>Overall rating estimate</strong>: Grade AA (healthy and stable), Grade BB (at risk, needs improvement).
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border-2 border-neutral-200 hover:border-teal-300 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 text-xs">
                    {language === 'zh' ? '第 3 步：生成体检报告与沙盒试算' : 'Step 3: Generate the Report & Try the Simulator'}
                  </h4>
                  {language === 'zh' ? (
                    <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">
                      • 查看 5 维度健康雷达图与 5 道否决安全红线筛查结果；<br />
                      • 在沙盒试算器中模拟“如果药品降低采购价”、“如果多存备用金”对安全跑道的影响。
                    </p>
                  ) : (
                    <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">
                      • View the 5-dimension health radar chart and the results against the 5 hard safety limits;<br />
                      • Use the simulator to test how "lower supply costs" or "a bigger reserve" would affect your safety runway.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GLOSSARY */}
          {activeTab === 'glossary' && (
            <div className="space-y-2.5">
              <p className="text-[13px] text-neutral-500 font-medium">
                {language === 'zh'
                  ? '财务专业名词太绕？这里全换成工场大白话：'
                  : 'Financial jargon too confusing? Here it is in plain field language:'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 text-[12px]">
                      {language === 'zh' ? '门诊/学费进账' : 'Clinic/tuition income'}
                    </span>
                    <span>{language === 'zh' ? '= 当月看诊费与服务收入' : '= this month\'s visit fees and service income'}</span>
                  </div>
                  <p className="text-neutral-600 text-[13px]">
                    {language === 'zh'
                      ? '门诊挂号、平价药品售出、学生辅导学费等来自服务对象的实际流水进账。'
                      : 'Actual income received from those you serve — registration fees, affordable medicine sales, tutoring tuition, and the like.'}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[12px]">
                      {language === 'zh' ? '采购直接耗材' : 'Direct supply costs'}
                    </span>
                    <span>{language === 'zh' ? '= 药品 / 教材 / 耗材进货价' : '= purchase cost of medicine / teaching materials / supplies'}</span>
                  </div>
                  <p className="text-neutral-600 text-[13px]">
                    {language === 'zh'
                      ? '采购常用药品、针剂注射耗材、急救包、教材教具与实训耗材的直接进价花费。'
                      : 'Direct purchase cost of common medicines, injection supplies, first-aid kits, teaching materials, and training supplies.'}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[12px]">
                      {language === 'zh' ? '固定运转开销' : 'Fixed operating costs'}
                    </span>
                    <span>{language === 'zh' ? '= 房租 + 同工补贴 + 水电' : '= rent + staff stipends + utilities'}</span>
                  </div>
                  <p className="text-neutral-600 text-[13px]">
                    {language === 'zh'
                      ? '不管今天有没有病人或学生，每个月都必须支出的诊所房租、本地助理护士/老师薪资与水电网费。'
                      : 'Costs you must pay every month regardless of patients or students that day — clinic rent, local assistant/teacher wages, and utilities.'}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[12px]">
                      {language === 'zh' ? '应急水库与跑道' : 'Emergency reserve & runway'}
                    </span>
                    <span>{language === 'zh' ? '= 手头活钱与能撑几个月' : '= cash on hand and how many months it lasts'}</span>
                  </div>
                  <p className="text-neutral-600 text-[13px]">
                    {language === 'zh'
                      ? '卡里或手头随时能动的急用备用金。如果遇到动荡或停业，这笔钱能保障服事维持运转几个月。'
                      : 'Readily available emergency funds. If disruption or closure hits, this money keeps the ministry running for a number of months.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <h4 className="font-bold text-neutral-900 text-xs">
                  {language === 'zh'
                    ? 'Q1：我只有手写记账本或者微信收款码截图，会被扣分吗？'
                    : 'Q1: I only have a handwritten ledger or payment-app screenshots — will that cost me points?'}
                </h4>
                <p className="text-neutral-600 text-[13px] leading-relaxed">
                  {language === 'zh' ? (
                    <>
                      <strong>绝对不会！</strong> 本系统的核心原则是「凭证平等」。无论是正规银行盖章流水、手写日记本、还是完全无凭证手动填写 14 项数字，打分引擎基于同一套数学模型计算，不以凭证形式为由扣减任何分数。
                    </>
                  ) : (
                    <>
                      <strong>Absolutely not!</strong> Our core principle is "equal treatment of evidence." Whether it's a stamped bank statement, a handwritten ledger, or manually entering 14 figures with no documentation at all, the scoring engine uses the same math model and never deducts points based on evidence type.
                    </>
                  )}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <h4 className="font-bold text-neutral-900 text-xs">
                  {language === 'zh'
                    ? 'Q2：如果有些月份流水断了或者记不清怎么办？'
                    : 'Q2: What if I\'m missing income data for some months, or can\'t remember it clearly?'}
                </h4>
                <p className="text-neutral-600 text-[13px] leading-relaxed">
                  {language === 'zh'
                    ? '系统提供【AI 断点流水自动均摊补齐】功能，会自动根据前后相邻月份的平均值进行智能平滑估算，无需凭空捏造。'
                    : 'The system offers "AI Gap-Filling" — it automatically smooths and estimates missing months based on the average of neighboring months, so you never have to guess blindly.'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <h4 className="font-bold text-neutral-900 text-xs">
                  {language === 'zh' ? 'Q3：提交自测会产生费用吗？' : 'Q3: Does submitting a self-assessment cost anything?'}
                </h4>
                <p className="text-neutral-600 text-[13px] leading-relaxed">
                  {language === 'zh'
                    ? '本自测工具 100% 免费开放，零门槛、零中介费、零隐形收费。'
                    : 'This self-assessment tool is 100% free — no barrier to entry, no middleman fees, no hidden charges.'}
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
                  onOpenAiHelper(language === 'zh' ? '新手如何看懂体检报告与得分？' : 'As a beginner, how do I read the checkup report and score?');
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'zh' ? '呼叫 AI 大白话助手答疑' : 'Ask the AI Plain-Language Assistant'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-200 transition-all cursor-pointer hover:scale-102 flex items-center gap-1.5"
            >
              <span>{language === 'zh' ? '我明白了，开始自测' : 'Got it, start the assessment'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
