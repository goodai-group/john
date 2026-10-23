import React, { useEffect, useState } from 'react';
import { InputNumber } from 'antd';

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  /** 显式允许负数（本表单目前没有任何金额/数量/月数字段需要负数，默认关闭）。 */
  allowNegative?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  'aria-label'?: string;
  'aria-describedby'?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
}

// BUG-07 修复：本表单里的 NumberField 全部是金额/数量/月数一类只应为非负数的字段，
// 此前既没有下限也没有上限校验——沙盘试算"税金"输入 -300 被静默改 0、输入 1e12 被直接接受，
// 算出"月到手纯利 -999,999,999,500"这类荒谬结果。这里在共用组件层面统一兜底：
// 默认下限 0（除非调用方传 allowNegative 或自定义 min），默认上限 1 亿（可用 max 覆盖），
// 越界时钳位并通过 title 提示 + 红色描边就地反馈，而不是像以前那样悄悄改数、什么都不说。
const DEFAULT_MAX_AMOUNT = 100_000_000;

/**
 * 调用方的 className 里还留着旧的 Tailwind 输入框外观（padding/边框/圆角/字重），
 * 套在 antd InputNumber 上会和组件自身样式打架；这里只保留尺寸与弹性布局相关的类。
 */
const LAYOUT_CLASS = /^(w-|min-w-|max-w-|flex|shrink|grow|basis-|self-|col-span|hidden|sm:|md:|lg:)/;
const layoutClasses = (className?: string) =>
  (className || '')
    .split(/\s+/)
    .filter((c) => LAYOUT_CLASS.test(c))
    .join(' ');

/**
 * 受控数字输入（antd InputNumber）。内部维护一份独立于外部数值的草稿，只在外部 value 真正变化时
 * （AI 重新填充、切换项目等）才用它覆盖草稿，用户自己打字期间不会被每次 render 打断。
 *
 * 0 显示为空白输入框（未填写），但用户主动输入 "0" 时不会被立刻吃掉。
 */
export function NumberField({
  value,
  onChange,
  allowNegative,
  min,
  max,
  step,
  title,
  className,
  style,
  ...rest
}: NumberFieldProps) {
  const [draft, setDraft] = useState<number | null>(() => (value === 0 ? null : value));
  const [outOfRangeMessage, setOutOfRangeMessage] = useState<string | null>(null);

  useEffect(() => {
    if ((draft ?? 0) !== value) setDraft(value === 0 ? null : value);
    // 仅在外部 value 变化时重新同步草稿，草稿自身变化不应触发这个 effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const effectiveMin = min !== undefined ? Number(min) : allowNegative ? -Infinity : 0;
  const effectiveMax = max !== undefined ? Number(max) : DEFAULT_MAX_AMOUNT;
  // 旧调用方用 p-1 / p-1.5 / p-0.5 表示「清单行内的紧凑输入框」，对应 antd 的 small 尺寸
  const compact = /\bp-(0\.5|1|1\.5)\b/.test(className || '');
  const alignRight = /\btext-right\b/.test(className || '');
  const alignCenter = /\btext-center\b/.test(className || '');

  return (
    <InputNumber
      {...rest}
      className={`${layoutClasses(className)} ${/\bw-/.test(className || '') ? '' : 'w-full'}`.trim()}
      style={style}
      step={step === undefined ? undefined : Number(step)}
      controls={false}
      size={compact ? 'small' : 'middle'}
      value={draft}
      status={outOfRangeMessage ? 'error' : undefined}
      title={outOfRangeMessage ? `${outOfRangeMessage}${title ? ` · ${title}` : ''}` : title}
      styles={alignRight || alignCenter ? { input: { textAlign: alignRight ? 'right' : 'center' } } : undefined}
      onChange={(v) => {
        const parsed = typeof v === 'number' && !Number.isNaN(v) ? v : null;
        setDraft(parsed);
        const n = parsed ?? 0;
        if (n < effectiveMin) {
          setOutOfRangeMessage(`不能小于 ${effectiveMin}，已按 ${effectiveMin} 计算`);
          onChange(effectiveMin);
          return;
        }
        if (n > effectiveMax) {
          setOutOfRangeMessage(`超过合理上限，已按 ${effectiveMax.toLocaleString()} 计算`);
          onChange(effectiveMax);
          return;
        }
        setOutOfRangeMessage(null);
        onChange(n);
      }}
    />
  );
}
