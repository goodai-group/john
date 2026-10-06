import React, { useState } from 'react';
import { Globe, X, ExternalLink } from 'lucide-react';
import type { Language } from '../types';

/** 中国大陆访问 Gemini 等海外 AI 服务需要网络加速，统一使用这一个推荐链接 */
export const CHINA_VPN_URL = 'https://www.kaitu.io/s/2KQCB6';

const DISMISS_KEY = 'bam_china_network_tip_dismissed';

// 按系统时区判断是否位于中国大陆：本系统用户多为海外华人，界面语言是中文并不代表人在大陆，
// 时区比语言可靠得多；港澳台各有独立时区，不在此列。
const MAINLAND_CHINA_TIMEZONES = ['Asia/Shanghai', 'Asia/Chongqing', 'Asia/Chungking', 'Asia/Harbin', 'Asia/Urumqi', 'Asia/Kashgar', 'PRC'];

export function isLikelyMainlandChina(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return MAINLAND_CHINA_TIMEZONES.includes(tz);
  } catch {
    return false;
  }
}

/** 行内小链接：放在「AI 暂时不可用」一类提示旁边 */
export function ChinaVpnInlineLink({ language }: { language: Language }) {
  if (!isLikelyMainlandChina()) return null;
  return (
    <a
      href={CHINA_VPN_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="ml-1 underline font-bold text-violet-700 hover:text-violet-600"
    >
      {language === 'en' ? 'In mainland China? Try a network accelerator' : '在中国大陆？推荐使用网络加速'}
    </a>
  );
}

/** 顶部提示条：仅对中国大陆时区的访问者展示，可关闭（关闭状态记在本机） */
export function ChinaNetworkTip({ language }: { language: Language }) {
  const [visible, setVisible] = useState(() => {
    if (!isLikelyMainlandChina()) return false;
    try {
      return localStorage.getItem(DISMISS_KEY) !== '1';
    } catch {
      return true;
    }
  });
  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // 无痕模式等场景写不进去也无妨，本次会话内已关闭
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 mt-3">
      <div
        role="status"
        className="px-4 py-2.5 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold border bg-violet-50 border-violet-200 text-violet-900"
      >
        <Globe className="w-4 h-4 text-violet-600 shrink-0" />
        <span className="flex-1 leading-relaxed">
          {language === 'en'
            ? 'You appear to be in mainland China. AI inference and AI Q&A rely on overseas services — if they fail to load, a network accelerator is recommended.'
            : '检测到你在中国大陆：AI 推算与 AI 答疑依赖海外服务，如出现加载失败或「AI 暂时不可用」，推荐使用网络加速。'}
        </span>
        <a
          href={CHINA_VPN_URL}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white font-bold text-[13px] sm:text-xs hover:bg-violet-700 transition-colors"
        >
          {language === 'en' ? 'Recommended VPN' : '推荐加速器'}
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label={language === 'en' ? 'Dismiss' : '关闭提示'}
          className="shrink-0 rounded-md p-1 hover:bg-violet-200 text-violet-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
