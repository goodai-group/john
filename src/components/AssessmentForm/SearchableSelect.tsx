import React from 'react';
import { Select } from 'antd';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  /** 附加在最外层容器上的 className，用于控制宽度等布局 */
  className?: string;
  /**
   * 旧版（react-select）控件外观 className。现在外观统一由 antd 决定，
   * 这里只读取其中的 `w-full`（是否撑满）与 `text-xs`（紧凑尺寸）两个信号。
   */
  controlClassName?: string;
  isClearable?: boolean;
  noOptionsMessage?: string;
}

/**
 * 国家/省州/币种这类几十上百个选项的下拉框：antd Select + 输入即搜索。
 * 选项少（几项）的场景直接用 antd Select / Segmented，不需要这个包装。
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  controlClassName = 'w-full',
  isClearable = false,
  noOptionsMessage
}: SearchableSelectProps) {
  const fullWidth = /\bw-full\b/.test(controlClassName);
  const compact = /\btext-xs\b/.test(controlClassName);

  return (
    <Select
      className={`${fullWidth ? 'w-full' : 'min-w-28'} ${className || ''}`.trim()}
      size={compact ? 'small' : 'middle'}
      showSearch
      optionFilterProp="label"
      allowClear={isClearable}
      value={value || undefined}
      onChange={(v) => onChange(v ?? '')}
      options={options}
      placeholder={placeholder}
      popupMatchSelectWidth={fullWidth}
      notFoundContent={noOptionsMessage || (options.length ? '无匹配结果' : '暂无选项')}
    />
  );
}
