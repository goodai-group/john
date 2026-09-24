import React, { useEffect, useState } from 'react';

interface NumberFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (value: number) => void;
  /** 显式允许负数（本表单目前没有任何金额/数量/月数字段需要负数，默认关闭）。 */
  allowNegative?: boolean;
}

// BUG-07 修复：本表单里的 NumberField 全部是金额/数量/月数一类只应为非负数的字段，
// 此前既没有下限也没有上限校验——沙盘试算"税金"输入 -300 被静默改 0、输入 1e12 被直接接受，
// 算出"月到手纯利 -999,999,999,500"这类荒谬结果。这里在共用组件层面统一兜底：
// 默认下限 0（除非调用方传 allowNegative 或自定义 min），默认上限 1 亿（可用 max 覆盖），
// 越界时钳位并通过 title 提示 + 红色描边就地反馈，而不是像以前那样悄悄改数、什么都不说。
const DEFAULT_MAX_AMOUNT = 100_000_000;

/** 去掉多余的前导 0（"012" -> "12"），但保留单独的 "0" 与小数点前的 "0"（"0.5"） */
function stripLeadingZeros(raw: string): string {
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  const match = body.match(/^0+(\d.*)$/);
  const normalized = match ? match[1] : body;
  return negative ? `-${normalized}` : normalized;
}

/**
 * 受控数字输入框，内部维护一份独立于外部数值的文本草稿，只在外部 value 真正变化时
 * （AI 重新填充、切换项目等）才用它覆盖草稿，用户自己打字期间不会被每次 render 打断。
 *
 * 原生 <input type="number" value={amount}> 直接绑定数字的问题：清空后 Number('') 变成 0，
 * React 又把 DOM 值强制渲染回字面量 "0"——这个 "0" 删不掉，用户接着输入就会变成 "0546"
 * 这类带前导 0 的错误值；而单纯用 value={amount || ''} 派生显示值又会导致用户主动输入 "0"
 * 的瞬间被吃成空白。用本地草稿把「输入中的文本」和「已提交的数值」分开即可两者都不再发生。
 */
export function NumberField({ value, onChange, allowNegative, min, max, title, style, ...rest }: NumberFieldProps) {
  const [draft, setDraft] = useState(() => (value === 0 ? '' : String(value)));
  const [outOfRangeMessage, setOutOfRangeMessage] = useState<string | null>(null);

  useEffect(() => {
    const parsed = draft === '' ? 0 : Number(draft);
    if (Number.isNaN(parsed) || parsed !== value) {
      setDraft(value === 0 ? '' : String(value));
    }
    // 仅在外部 value 变化时重新同步草稿，草稿自身变化不应触发这个 effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const effectiveMin = min !== undefined ? Number(min) : allowNegative ? -Infinity : 0;
  const effectiveMax = max !== undefined ? Number(max) : DEFAULT_MAX_AMOUNT;

  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={draft}
      title={outOfRangeMessage ? `${outOfRangeMessage}${title ? ` · ${title}` : ''}` : title}
      style={outOfRangeMessage ? { ...style, borderColor: '#e11d48', boxShadow: '0 0 0 1px #e11d48' } : style}
      onChange={(e) => {
        const raw = stripLeadingZeros(e.target.value);
        setDraft(raw);
        const parsed = raw === '' ? 0 : Number(raw);
        if (Number.isNaN(parsed)) return;
        if (parsed < effectiveMin) {
          setOutOfRangeMessage(`不能小于 ${effectiveMin}，已按 ${effectiveMin} 计算`);
          onChange(effectiveMin);
          return;
        }
        if (parsed > effectiveMax) {
          setOutOfRangeMessage(`超过合理上限，已按 ${effectiveMax.toLocaleString()} 计算`);
          onChange(effectiveMax);
          return;
        }
        setOutOfRangeMessage(null);
        onChange(parsed);
      }}
    />
  );
}
