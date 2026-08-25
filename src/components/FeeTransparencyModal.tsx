import React from 'react';
import { X, CheckCircle2, ShieldAlert, Sparkles, Download, RefreshCw, Layers } from 'lucide-react';
import { Language } from '../types';

interface FeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const FeeTransparencyModal: React.FC<FeeModalProps> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {language === 'zh' ? '平台费用与权益透明度说明' : 'Fee Transparency & Policy'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'zh' ? '依据 BAM-PRD-2026-V1.4 规范第 12 节' : 'BAM-PRD-2026-V1.4 Section 12 Specification'}
            </p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% 永久免费使用承诺（零隐形收费 · 无强制捆绑）</span>
          </div>
          <p className="text-xs text-emerald-700 leading-relaxed">
            为了支持海外小微经营者自主开展商业模式自测与自我提升，本平台的核心功能全部开放免费使用，无任何后续追溯收费。
          </p>
        </div>

        <div className="space-y-3 mb-6 text-xs text-slate-600">
          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <RefreshCw className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900">无限次自测与更新评估：</span>
              <span> 用户可随时根据实际经营情况反复更新数字、重新评估、对比历史版本（v1, v2, v3...），无需担忧次数限制产生扣费。</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <Download className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900">无门槛报告打印与导出：</span>
              <span> 生成的诊断报告、雷达图与逐项明细表支持一键免费打印、保存为 PDF 或 JSON 备份，不设"按份收费"门槛。</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <Layers className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900">无凭证用户同等对待：</span>
              <span> 无凭证纯手动填报与上传正规银行流水享有 100% 相同打分逻辑，绝不因凭证类型增设付费解锁机制。</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            前置告知保障用户知情权
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            我已知晓，继续使用
          </button>
        </div>
      </div>
    </div>
  );
};
