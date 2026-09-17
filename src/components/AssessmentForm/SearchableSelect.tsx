import React from 'react';
import Select, { type StylesConfig, components as RSComponents } from 'react-select';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  /** 附加在最外层容器上的 className，用于控制宽度等布局（尺寸/圆角/边框由 controlClassName 决定） */
  className?: string;
  /** 控件（未展开时可见的那一条）的 className，需与原生 <select> 的视觉风格对齐 */
  controlClassName?: string;
  isClearable?: boolean;
  noOptionsMessage?: string;
}

/**
 * 国家/省州/币种这类几十上百个选项的下拉框统一换成带搜索的 react-select（成熟的现成组件，
 * 而不是自己写一套搜索下拉逻辑），选项少（几项）的原生 <select> 不受影响、无需改造。
 * 用 unstyled + classNames 把 react-select 的视觉完全交给 Tailwind，和原生 <select> 保持一致观感。
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  controlClassName = 'w-full p-2 border border-slate-300 rounded-lg font-medium text-slate-800 bg-white',
  isClearable = false,
  noOptionsMessage
}: SearchableSelectProps) {
  const selected = options.find((o) => o.value === value) || null;

  // 保留最基础的尺寸/浮层 z-index 用内联样式兜底，其余外观全部走 classNames（Tailwind），
  // 避免 react-select 默认的 emotion 内联样式和页面已有的 Tailwind 视觉冲突。
  const styles: StylesConfig<SearchableSelectOption, false> = {
    control: (base) => ({ ...base, minHeight: 'unset' }),
    menuPortal: (base) => ({ ...base, zIndex: 60 })
  };

  return (
    <Select<SearchableSelectOption, false>
      className={className}
      classNamePrefix="ss"
      unstyled
      isClearable={isClearable}
      value={selected}
      onChange={(opt) => onChange(opt ? opt.value : '')}
      options={options}
      placeholder={placeholder}
      noOptionsMessage={() => noOptionsMessage || (options.length ? '无匹配结果' : '暂无选项')}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      styles={styles}
      components={{ IndicatorSeparator: () => null }}
      classNames={{
        control: ({ isFocused }) =>
          `${controlClassName} ${isFocused ? 'ring-1 ring-teal-500' : ''} cursor-text`,
        valueContainer: () => 'overflow-visible',
        placeholder: () => 'text-slate-400 font-normal whitespace-nowrap',
        input: () => 'text-inherit',
        singleValue: () => 'text-inherit whitespace-nowrap',
        menu: () => 'mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden',
        menuList: () => 'max-h-64 overflow-y-auto py-1',
        option: ({ isFocused, isSelected }) =>
          `px-3 py-2 text-sm cursor-pointer whitespace-nowrap ${
            isSelected ? 'bg-teal-600 text-white font-bold' : isFocused ? 'bg-teal-50 text-slate-900' : 'text-slate-800'
          }`,
        indicatorsContainer: () => 'text-slate-400 pl-0.5',
        clearIndicator: () => 'cursor-pointer hover:text-rose-500 px-1',
        dropdownIndicator: () => 'cursor-pointer hover:text-slate-600 pl-1'
      }}
    />
  );
}
