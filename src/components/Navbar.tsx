import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Calculator,
  FileText,
  FolderKanban,
  BookOpen,
  HelpCircle,
  Sparkles,
  Globe,
  SlidersHorizontal,
  Eye,
  LogOut,
  User as UserIcon,
  Cloud,
  CheckCircle2,
  Loader2
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
  onLoginWithGoogle: () => void;
  onLogout: () => void;
  isSigningIn?: boolean;
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
  onLoginWithGoogle,
  onLogout,
  isSigningIn = false
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { id: ActiveTab; label: string; icon: any; tag?: string }[] = [
    { id: 'form', label: language === 'zh' ? '📋 快速体检' : 'Assessment', icon: FileText },
    { id: 'report', label: language === 'zh' ? '📊 体检报告' : 'Report', icon: Sparkles },
    { id: 'simulator', label: language === 'zh' ? '🧮 沙盒试算' : 'Simulator', icon: Calculator },
    { id: 'standards', label: language === 'zh' ? '📖 评分规则' : 'Rules', icon: BookOpen },
    { id: 'projects', label: language === 'zh' ? '📁 我的项目' : 'Projects', icon: FolderKanban }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs">
      {/* Top Utility Bar (Clean & Lightweight) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs border-b border-neutral-100">
        <div className="flex items-center gap-2 sm:gap-3 text-neutral-600">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>智能自动体检</span>
          </span>
          <span className="hidden md:inline text-neutral-400">|</span>
          <span className="hidden md:inline text-neutral-500 font-medium">
            专为宣教工场爱心门诊、辅导中心与营商服事量身定制 · 永久免费
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAppGuide && (
            <button
              onClick={onOpenAppGuide}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold transition-colors cursor-pointer border border-indigo-100"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>{language === 'zh' ? '使用指南 (3分钟看懂)' : 'User Guide'}</span>
            </button>
          )}

          <button
            onClick={() => onLanguageChange(language === 'zh' ? 'en' : 'zh')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-100 text-neutral-600 font-medium transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-neutral-500" />
            <span>{language === 'zh' ? 'EN' : '中文'}</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer group shrink-0"
            onClick={() => onTabChange('form')}
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform text-white font-black text-lg">
              ✝️
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                {language === 'zh' ? '商业宣教商业模型财务测算' : 'BAM Financial Health Assessment'}
              </h1>
              <p className="text-xs text-neutral-500 font-medium hidden sm:block">
                {language === 'zh' ? '评估商业宣教项目的财务健康度、现金跑道与抗风险能力' : 'Assess financial sustainability, runway, and risk resilience'}
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center p-1 bg-neutral-100 border border-neutral-200 rounded-2xl space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs border border-neutral-200/80'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-neutral-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Area: Google Sync + AI Assistant */}
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer"
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

                {/* Dropdown */}
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
                      <span>查看我的所有项目</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-rose-50 text-rose-700 text-xs font-semibold mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>退出登录</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLoginWithGoogle}
                disabled={isSigningIn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold border border-neutral-300 shadow-xs transition-all cursor-pointer"
                title="登录 Google 账号，自动备份您的自测档案"
              >
                {isSigningIn ? (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>云端备份</span>
              </button>
            )}

            <button
              onClick={() => onOpenAiHelper()}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI 答疑</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Row */}
        <div className="md:hidden flex overflow-x-auto pt-2 gap-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-xl text-xs whitespace-nowrap font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};


