import React from 'react';
import { CheckCircle2, Sparkles, Wand2 } from 'lucide-react';
import { Language } from '../types';

/**
 * 字段溯源徽章 —— 把「这个数字是谁填的」变成用户一眼能看见的信息。
 *
 * 【为什么需要它】后端已经用 ProjectDossier 把字段分成三态
 * （confirmed / suggested / estimated），且只有 confirmed 才进评分引擎。
 * 但这件事此前对用户是隐形的：表单用占位符呈现 AI 建议，用户不一定意识到
 * 「这个灰字只是建议，我不填它就不算数」。
 *
 * 徽章把这层语义显性化，也是确认闸门在界面上的落点。
 *
 * 三态与呈现：
 *   confirmed  你已填写   —— 绿色，会计入评分
 *   suggested  AI 建议    —— 琥珀色，待你确认，不计分
 *   estimated  系统估算   —— 蓝色，按规则推算（如流水断点补全），待你核对，不计分
 */
export type FieldConfidence = 'confirmed' | 'suggested' | 'estimated';

const STYLES: Record<
  FieldConfidence,
  { icon: typeof CheckCircle2; cls: string; zh: string; en: string; titleZh: string; titleEn: string }
> = {
  confirmed: {
    icon: CheckCircle2,
    cls: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    zh: '你已填写',
    en: 'Your entry',
    titleZh: '这是你自己填的数字，会计入评分。',
    titleEn: 'You entered this figure yourself; it counts towards the score.'
  },
  suggested: {
    icon: Sparkles,
    cls: 'text-amber-700 bg-amber-50 border-amber-200',
    zh: 'AI 建议 · 待确认',
    en: 'AI suggestion · unconfirmed',
    titleZh: 'AI 推断的参考值，仅作占位提示。你不填写就不会计入评分。',
    titleEn: 'An AI-inferred reference value shown as a placeholder only. Until you enter it, it does not count towards the score.'
  },
  estimated: {
    icon: Wand2,
    cls: 'text-sky-700 bg-sky-50 border-sky-200',
    zh: '系统估算 · 待核对',
    en: 'System estimate · unverified',
    titleZh: '系统按前后月份自动推算的参考值，请核对后再采纳。未核对前不计入评分。',
    titleEn: 'Interpolated from neighbouring months. Please verify before adopting; it does not count towards the score until you do.'
  }
};

export function FieldProvenanceBadge({
  confidence,
  language,
  note
}: {
  confidence: FieldConfidence;
  language: Language;
  /** 依据说明，例如「肯尼亚小微企业营业执照年费区间」 */
  note?: string;
}) {
  const s = STYLES[confidence];
  const Icon = s.icon;
  const label = language === 'en' ? s.en : s.zh;
  const title = [language === 'en' ? s.titleEn : s.titleZh, note].filter(Boolean).join('\n');

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-bold whitespace-nowrap ${s.cls}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}

/**
 * 待确认汇总条 —— 让用户知道「还有几项 AI 建议没被采纳」。
 *
 * 刻意不自动采纳：一条幻觉数字到不了评分引擎的前提，就是必须由用户亲自确认。
 */
export function PendingConfirmationsBar({
  count,
  language,
  onDismiss
}: {
  count: number;
  language: Language;
  onDismiss?: () => void;
}) {
  if (count <= 0) return null;
  const isEn = language === 'en';

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-amber-900">
          {isEn
            ? `${count} AI suggestion${count > 1 ? 's' : ''} waiting for you`
            : `有 ${count} 项 AI 建议等你确认`}
        </p>
        <p className="text-[12px] text-amber-800 mt-0.5">
          {isEn
            ? 'They are shown as greyed placeholders. Nothing is counted towards your score until you type the real figure in yourself.'
            : '它们以灰色占位提示显示。在你亲手填入真实数字之前，一律不计入评分。'}
        </p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[12px] font-bold text-amber-700 hover:text-amber-900 shrink-0 cursor-pointer"
        >
          {isEn ? 'Got it' : '知道了'}
        </button>
      )}
    </div>
  );
}
