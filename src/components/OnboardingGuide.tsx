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
  Lightbulb,
  Zap,
  BatteryCharging
} from 'lucide-react';
import { Language } from '../types';

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onStartAssessment: () => void;
  onStartWithTemplate?: (templateId: string) => void;
}

export const OnboardingGuide: React.FC<OnboardingProps> = ({
  isOpen,
  onClose,
  language,
  onStartAssessment,
  onStartWithTemplate
}) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: '30秒大白话：这个体检仪是干什么的？',
      subtitle: '专为餐饮、小超市、网店、个体户打造的「生意健康体检仪」',
      icon: Sparkles,
      color: 'bg-indigo-600 text-white',
      bullets: [
        '✨ 无需懂复杂的财务报表，主要帮你测清：“我到底赚不赚钱？”、“如果没生意我账上的钱能撑几个月？”；',
        '✨ 100% 由公开透明的数学引擎计算，没有人工卡脖子，标准人人平等；',
        '✨ 测算结果当场出具 5 维雷达图与具体改善建议，并支持沙盒模拟涨价或降租。'
      ],
      tip: '💡 重点：不管是路边小摊还是公司网店，都能一键生成权威健康体检分！'
    },
    {
      title: '没有银行盖章流水？哪怕手写本也能测！',
      subtitle: '凭证形式完全平等，甚至选无凭证手输得分也 100% 一样',
      icon: DollarSign,
      color: 'bg-emerald-600 text-white',
      bullets: [
        '📋 支持微信扫码明细、手写记账本、甚至选【无凭证纯手输 14 个数字】；',
        '🤖 如果某些月份流水断断续续，AI 会根据前后月均值自动算好参考值，不用您瞎猜；',
        '💯 打分引擎只看您的收支真实逻辑，绝不因为没有银行盖章就扣任何分数。'
      ],
      tip: '💡 放心：即使没有任何纸质凭证，直接填数字也享受同等的打分权威度！'
    },
    {
      title: '信息敏感与隐私？开启数据最小化安全模式',
      subtitle: '不查具体地址，提取数字后即刻销毁原图',
      icon: ShieldCheck,
      color: 'bg-amber-600 text-white',
      bullets: [
        '🛡️ 勾选【敏感地区安全模式】，城市地址自动脱敏为仅大区，联系方式支持匿名代号；',
        '🖼️ 上传的图片识别完数字后即刻在内存中物理粉碎，云端零留存；',
        '🗑️ 提交后在“我的项目”中可随时一键彻底粉碎删除，绝无痕迹。'
      ],
      tip: '💡 安全：您的商业收支数据完全属于您自己，随时可一键彻底注销抹除。'
    },
    {
      title: '三种超简单的填报方式任您选',
      subtitle: '零基础小白推荐直接点击「一键范本」或「告诉 AI 帮我填」',
      icon: Zap,
      color: 'bg-indigo-600 text-white',
      bullets: [
        '1️⃣ 👶 选项一（最推荐）：直接点击表单顶部的餐饮、零售、网店范本，自动填好成套数据！',
        '2️⃣ 💬 选项二：在【AI 帮我填】里随手打一句话（如“我开小吃店月流水3万进货1万”），AI 自动提取；',
        '3️⃣ 📊 选项三：按 5 步向导逐项手动填写，右侧还配有实时晴雨表和现金电池。'
      ],
      tip: '💡 提示：进入表单后，随时可以查看右上角「3分钟使用说明」与呼叫「AI 助手」！'
    }
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border-2 border-neutral-200 text-neutral-800 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-700 p-2 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
          title="关闭引导"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-10 bg-indigo-600' : 'w-2.5 bg-neutral-200'
              }`}
            />
          ))}
          <span className="text-[11px] text-neutral-400 font-bold ml-2">
            {step + 1} / {steps.length}
          </span>
        </div>

        <div className="flex items-center gap-3.5 mb-4">
          <div className={`w-12 h-12 rounded-2xl ${current.color} flex items-center justify-center shrink-0 shadow-md`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              QUICK ONBOARDING
            </span>
            <h2 className="text-base sm:text-lg font-black text-neutral-950 leading-snug mt-0.5">
              {current.title}
            </h2>
            <p className="text-xs text-neutral-500 font-medium">{current.subtitle}</p>
          </div>
        </div>

        <div className="bg-neutral-50 border-2 border-neutral-200/80 rounded-2xl p-4 mb-4 space-y-2.5">
          {current.bullets.map((b, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-700 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>{b}</span>
            </div>
          ))}
        </div>

        {/* Tip banner */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold mb-6 flex items-center gap-2">
          <span>{current.tip}</span>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 px-4 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>上一步</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-xs font-bold text-neutral-400 hover:text-neutral-700 px-3 py-2 cursor-pointer"
            >
              跳过引导
            </button>
          )}

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer hover:scale-102"
            >
              <span>下一步</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                onStartAssessment();
              }}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-200 transition-all cursor-pointer hover:scale-102"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>看懂了，立即开始自测</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
