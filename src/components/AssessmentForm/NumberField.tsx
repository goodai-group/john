import React, { useEffect, useState } from 'react';

interface NumberFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (value: number) => void;
}

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
export function NumberField({ value, onChange, ...rest }: NumberFieldProps) {
  const [draft, setDraft] = useState(() => (value === 0 ? '' : String(value)));

  useEffect(() => {
    const parsed = draft === '' ? 0 : Number(draft);
    if (Number.isNaN(parsed) || parsed !== value) {
      setDraft(value === 0 ? '' : String(value));
    }
    // 仅在外部 value 变化时重新同步草稿，草稿自身变化不应触发这个 effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      {...rest}
      type="number"
      value={draft}
      onChange={(e) => {
        const raw = stripLeadingZeros(e.target.value);
        setDraft(raw);
        const parsed = raw === '' ? 0 : Number(raw);
        if (!Number.isNaN(parsed)) onChange(parsed);
      }}
    />
  );
}
