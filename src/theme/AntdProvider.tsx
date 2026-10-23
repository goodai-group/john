import React, { useMemo } from 'react';
import { ConfigProvider, theme as antdTheme, type ThemeConfig } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { Language } from '../types';

/**
 * 全站统一的 antd 设计令牌。
 *
 * 品牌主色沿用侧边栏的深青色（teal-700），其余（间距、字号阶梯、状态色、阴影）
 * 全部使用 antd 默认值，新写的页面直接用 antd 组件即可与之保持一致，
 * 不要再在组件里手写一套圆角/字号/配色。
 */
export const BRAND = {
  primary: '#0f766e',
  sider: '#134e4a',
  layoutBg: '#f7f3ec'
} as const;

export const antdThemeConfig: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: BRAND.primary,
    colorLink: BRAND.primary,
    colorBgLayout: BRAND.layoutBg,
    borderRadius: 8,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'
  },
  components: {
    Menu: {
      darkItemBg: BRAND.sider,
      darkSubMenuItemBg: BRAND.sider,
      darkItemSelectedBg: '#ffffff',
      darkItemSelectedColor: BRAND.sider,
      darkItemColor: 'rgba(255,255,255,0.78)',
      darkItemHoverBg: 'rgba(255,255,255,0.10)',
      darkItemHoverColor: '#ffffff',
      itemBorderRadius: 8
    },
    Card: {
      headerFontSize: 16
    },
    Statistic: {
      contentFontSize: 24
    }
  }
};

/**
 * antd 样式放进 `@layer antd`（见 index.css 顶部的层级声明）：
 * 位于 Tailwind 的 base 之后、utilities 之前——既不会被 Tailwind preflight 重置掉，
 * 又允许在 antd 组件上用 Tailwind 工具类做少量布局微调。
 */
export function AntdProvider({
  language,
  largeFont = false,
  highContrast = false,
  children
}: {
  language: Language;
  /** 无障碍「大字模式」：antd 组件用 px 字号，不会跟着 Tailwind 的 text-* 放大，需单独调令牌 */
  largeFont?: boolean;
  /** 无障碍「高对比度」：加深正文/次要文字与边框颜色 */
  highContrast?: boolean;
  children: React.ReactNode;
}) {
  const theme = useMemo<ThemeConfig>(
    () => ({
      ...antdThemeConfig,
      token: {
        ...antdThemeConfig.token,
        ...(largeFont ? { fontSize: 16, controlHeight: 36 } : {}),
        ...(highContrast
          ? {
              colorText: '#000000',
              colorTextSecondary: 'rgba(0,0,0,0.78)',
              colorTextTertiary: 'rgba(0,0,0,0.65)',
              colorBorder: '#8c8c8c',
              colorBorderSecondary: '#bfbfbf'
            }
          : {})
      }
    }),
    [largeFont, highContrast]
  );
  return (
    <StyleProvider layer>
      <ConfigProvider theme={theme} locale={language === 'en' ? enUS : zhCN}>
        {children}
      </ConfigProvider>
    </StyleProvider>
  );
}
