import React from 'react';
import { LogIn, ShieldCheck, Loader2 } from 'lucide-react';
import { Language } from '../types';

interface LoginRequiredGateProps {
  language: Language;
  onOpenAuth: () => void;
  isSigningIn?: boolean;
}

/**
 * 全站登录门槛：未登录时，所有功能页统一展示此引导，替代原本的页面内容。
 * 保留顶部导航栏（语言切换、无障碍、登录入口）可用，但页面主体只允许登录后访问。
 */
export const LoginRequiredGate: React.FC<LoginRequiredGateProps> = ({
  language,
  onOpenAuth,
  isSigningIn = false
}) => {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-neutral-200 shadow-xs space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-100 shadow-xs">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-black text-neutral-900">
            {language === 'zh' ? '请先登录后使用' : 'Please Sign In to Continue'}
          </h3>
          <p className="text-xs text-neutral-500 font-medium max-w-sm mx-auto mt-2 leading-relaxed">
            {language === 'zh'
              ? '为了保护您的商业数据并支持云端存档同步，本平台的全部功能（体检评估、AI 答疑、商业学习等）均需登录后才能使用。支持 Google 或邮箱密码登录，全程免费。'
              : 'To protect your business data and enable cloud sync, every feature on this platform (assessment, AI Q&A, learning center, etc.) requires signing in first. Sign in with Google or email — it is completely free.'}
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          disabled={isSigningIn}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white rounded-2xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
        >
          {isSigningIn ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          <span>{language === 'zh' ? '立即登录 / 注册' : 'Sign In / Sign Up'}</span>
        </button>
      </div>
    </div>
  );
};
