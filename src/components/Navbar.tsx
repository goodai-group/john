import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  FileText,
  Sparkles,
  Calculator,
  BookOpen,
  FolderKanban,
  HelpCircle,
  Globe,
  LogOut,
  LogIn,
  User as UserIcon,
  Loader2,
  ShieldCheck,
  MessageCircle,
  MoreHorizontal,
  CheckCircle2
} from 'lucide-react';
import { Language, ActiveTab, AppUser } from '../types';

interface NavbarProps {
  activeTab: ActiveTab | string;
  onTabChange: (tab: ActiveTab) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenFeeModal: () => void;
  onOpenAppGuide?: () => void;
  onOpenAccessibility: () => void;
  onOpenAiHelper: (topic?: string) => void;
  largeFont?: boolean;
  currentUser: AppUser | null;
  /** 打开登录/注册弹窗（Google + 邮箱密码双通道） */
  onOpenAuth?: () => void;
  onLogout: () => void;
  isSigningIn?: boolean;
  /** 登录成功后的短暂过渡标记：为 true 时显示「✓ 登录成功」，代替登录按钮/头像 */
  justSignedIn?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  language,
  onLanguageChange,
  onOpenFeeModal,
  onOpenAppGuide,
  onOpenAccessibility,
  onOpenAiHelper,
  largeFont,
  currentUser,
  onOpenAuth,
  onLogout,
  isSigningIn = false,
  justSignedIn = false
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 全部 5 大核心功能标签直接平铺展示在主导航栏
  const navItems: { id: ActiveTab; label: string; icon: any }[] = [
    { id: 'form', label: language === 'zh' ? '快速体检' : 'Assessment', icon: FileText },
    { id: 'report', label: language === 'zh' ? '体检报告' : 'Report', icon: Sparkles },
    { id: 'simulator', label: language === 'zh' ? '沙盒试算' : 'Simulator', icon: Calculator },
    { id: 'standards', label: language === 'zh' ? '评分规则' : 'Rules', icon: BookOpen },
    { id: 'projects', label: language === 'zh' ? '我的项目' : 'Projects', icon: FolderKanban }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Brand */}
          <div
            className="flex items-center gap-2.5 cursor-pointer shrink-0"
            onClick={() => onTabChange('form')}
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Heart className="w-4 h-4" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
              {language === 'zh' ? '商业宣教财务测算' : 'BAM Financial Health'}
            </h1>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-indigo-700 bg-indigo-50 font-bold'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Area */}
          <div className="flex items-center gap-1">
            {/* Free & transparent (quiet badge) */}
            <button
              onClick={onOpenFeeModal}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              title={language === 'zh' ? '查看费用透明度说明' : 'View fee transparency details'}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'zh' ? '永久免费' : 'Free'}</span>
            </button>

            {/* AI 答疑：任何不懂的地方都能问 */}
            <button
              onClick={() => onOpenAiHelper()}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-sm hover:from-violet-500 hover:to-indigo-500 hover:shadow transition-all cursor-pointer"
              title={language === 'zh' ? 'AI 答疑：任何不懂的地方都能问' : 'Ask AI anything'}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{language === 'zh' ? 'AI 答疑' : 'Ask AI'}</span>
            </button>

            {/* 无障碍辅助按钮 (D-04) */}
            {onOpenAccessibility && (
              <button
                onClick={onOpenAccessibility}
                className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors cursor-pointer"
                title={language === 'zh' ? '无障碍 / 大字模式' : 'Accessibility / Large Font'}
              >
                <Globe className="w-4 h-4 text-indigo-600" />
              </button>
            )}

            {onOpenAppGuide && (
              <button
                onClick={onOpenAppGuide}
                className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors cursor-pointer"
                title={language === 'zh' ? '使用指南' : 'Guide'}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => onLanguageChange(language === 'zh' ? 'en' : 'zh')}
              className="px-2 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 text-xs font-medium transition-colors cursor-pointer"
            >
              <span>{language === 'zh' ? 'EN' : '中文'}</span>
            </button>

            {currentUser ? (
              justSignedIn ? (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold whitespace-nowrap animate-in fade-in cursor-default"
                  title={language === 'zh' ? '您已成功登录' : 'You are signed in'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'zh' ? '登录成功' : 'Signed in'}</span>
                </div>
              ) : (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover border border-indigo-300"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-indigo-950 hidden lg:inline max-w-[100px] truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-neutral-200 shadow-xl p-3 z-50 animate-in fade-in">
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      {currentUser.displayName || 'Google 用户'}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate mb-2">
                      {currentUser.email}
                    </p>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onTabChange('projects');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-neutral-100 text-neutral-700 text-xs font-semibold"
                    >
                      <FolderKanban className="w-4 h-4 text-indigo-600" />
                      <span>{language === 'zh' ? '查看我的所有项目' : 'View all my projects'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-rose-50 text-rose-700 text-xs font-semibold mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{language === 'zh' ? '退出登录' : 'Sign out'}</span>
                    </button>
                  </div>
                )}
              </div>
              )
            ) : (
              <button
                onClick={onOpenAuth}
                disabled={isSigningIn || !onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold border border-neutral-300 shadow-xs transition-all cursor-pointer"
                title={language === 'zh' ? '登录账号（支持 Google 或邮箱密码），自动备份您的自测档案' : 'Sign in to back up your assessments to the cloud'}
              >
                {isSigningIn ? (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>{language === 'zh' ? '登录' : 'Sign in'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Row */}
        <div className="md:hidden flex overflow-x-auto pt-2 gap-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap font-medium transition-all min-h-[32px] ${
                  isActive
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          {/* AI 答疑移动端入口 */}
          <button
            onClick={() => onOpenAiHelper()}
            className="px-3 py-2 rounded-lg text-xs whitespace-nowrap font-bold min-h-[32px] bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:from-violet-500 hover:to-indigo-500 transition-all cursor-pointer"
          >
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              AI 答疑
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
