import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, DollarSign, Calculator, ArrowRight, ArrowLeft } from 'lucide-react';
import { Language } from '../types';

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onStartAssessment: () => void;
}

export const OnboardingGuide: React.FC<OnboardingProps> = ({
  isOpen,
  onClose,
  language,
  onStartAssessment
}) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: '30秒看懂：这个平台是干什么的？',
      subtitle: '专为海外小微经营者打造的无门槛自测工具',
      icon: Sparkles,
      color: 'bg-indigo-100 text-indigo-700',
      bullets: [
        '✨ 100% 由 AI 全自动完成打分与诊断，全程无真人初审员或评分委员；',
        '✨ 测的是生意的“自我造血与抗风险能力”（毛利够不够、能不能包住租金人工）；',
        '✨ 平台完全公开透明，所有评分标准和否决红线（Gate）对所有人一视同仁。'
      ]
    },
    {
      title: '没有正规银行流水？完全没关系！',
      subtitle: '凭证有无只影响录入方便度，绝不影响分数',
      icon: DollarSign,
      color: 'bg-emerald-100 text-emerald-700',
      bullets: [
        '📋 支持上传：手写记账本照片、移动支付（M-Pesa/微信等）截图、教会/机构流水；',
        '🤖 如果流水月份断断续续，AI 会自动按前后月均值估算参考值，无需凭空猜测；',
        '💯 无法提供任何凭证？直接选择【无凭证纯手动填写 14 项数字】，得分完全一致！'
      ]
    },
    {
      title: '信息敏感地区？开启数据最小化',
      subtitle: '源头少采集，用完不存图，提交后可随时彻底撤回',
      icon: ShieldCheck,
      color: 'bg-amber-100 text-amber-700',
      bullets: [
        '🛡️ 勾选【敏感地区模式】，城市信息自动脱敏为仅大区，联系方式支持匿名代号；',
        '🖼️ OCR 识别完成后立即销毁原图，仅提取必要数字，服务器零原图留存；',
        '🗑️ 提交后在“我的项目”中可随时一键彻底删除所有数据，全程无需联系任何人。'
      ]
    },
    {
      title: '多币种自动折算与“不提交不记录”试算器',
      subtitle: '支持自报汇率，还有随心推演的沙盒试算器',
      icon: Calculator,
      color: 'bg-sky-100 text-sky-700',
      bullets: [
        '💱 每个金额框独立选币种，当地有民间/非官方汇率可直接自报汇率折算；',
        '🧪 如果只想测算“调高售价或租金后会怎样”，可直接使用【试算器】，不提交不留痕；',
        '💬 遇到看不懂的术语，右侧随时唤起【AI 大白话助手】提问，安全提问不影响得分！'
      ]
    }
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
          <span className="text-[11px] text-slate-400 font-medium ml-2">
            步骤 {step + 1} / {steps.length}
          </span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-2xl ${current.color} flex items-center justify-center shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{current.title}</h2>
            <p className="text-xs text-slate-500">{current.subtitle}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 space-y-3">
          {current.bullets.map((b, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>{b}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              上一步
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              跳过向导
            </button>
          )}

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
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
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
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
