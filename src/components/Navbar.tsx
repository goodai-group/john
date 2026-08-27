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
  Info,
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
  onOpenOnboarding: () => void;
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
  onOpenOnboarding,
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
    { id: 'form', label: language === 'zh' ? '自测申报' : 'Assessment', icon: FileText },
    { id: 'report', label: language === 'zh' ? '体检报告' : 'Report & Radar', icon: Sparkles },
    { id: 'simulator', label: language === 'zh' ? '沙盒试算器' : 'Simulator', icon: Calculator, tag: '不记录' },
    { id: 'standards', label: language === 'zh' ? '评分标准库' : 'Standards', icon: BookOpen },
    { id: 'projects', label: language === 'zh' ? '我的项目' : 'Projects', icon: FolderKanban }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b-2 border-neutral-200 shadow-xs">
      {/* Bento Top Status Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-neutral-100">
        <div className="flex items-center flex-wrap gap-2">
          {/* Status Badge 1: AI Scoring */}
          <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[11px] font-bold text-emerald-800 tracking-wider">
              {language === 'zh' ? '100% AI 自动化打分' : '100% AI Automated'}
            </span>
          </div>

          {/* Status Badge 2: Cloud Sync Status */}
          <div className="flex items-center space-x-1.5 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            <Cloud className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold text-indigo-700">
              {currentUser ? '云端数据库已连通' : '支持 Google 账号跨设备同步'}
            </span>
          </div>

          {/* Fee Free Pill */}
          <button
            onClick={onOpenFeeModal}
            className="flex items-center space-x-1.5 bg-neutral-100 hover:bg-neutral-200/80 px-3 py-1 rounded-full border border-neutral-200 text-neutral-700 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            <span>💎 费用透明声明：永久免费</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* App Guide & Overview */}
          {onOpenAppGuide && (
            <button
              onClick={onOpenAppGuide}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold border border-indigo-200 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>{language === 'zh' ? '📖 3分钟使用说明' : 'User Guide'}</span>
            </button>
          )}

          {/* Guide Tour */}
          <button
            onClick={onOpenOnboarding}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 text-[11px] font-bold border border-neutral-200 transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span>{language === 'zh' ? '新手指南' : 'Guide'}</span>
          </button>

          {/* Accessibility */}
          <button
            onClick={onOpenAccessibility}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 text-[11px] font-bold border border-neutral-200 transition-colors cursor-pointer"
            title="无障碍工具箱：大字号 / 高对比度 / 弱网省流"
          >
            <Eye className="w-3.5 h-3.5 text-sky-600" />
            <span>{largeFont ? '大字号' : '无障碍'}</span>
          </button>

          {/* Language Switch */}
          <button
            onClick={() => onLanguageChange(language === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 text-[11px] font-bold border border-neutral-200 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>{language === 'zh' ? 'EN' : '中文'}</span>
          </button>
        </div>
      </div>

      {/* Main Bento Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Brand Box */}
          <div
            className="flex items-center space-x-3 cursor-pointer group shrink-0"
            onClick={() => onTabChange('form')}
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                  {language === 'zh' ? '小微商业自测评估' : 'MicroBiz Assessment'}
                </h1>
                <span className="text-[10px] font-mono font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-lg">
                  v1.4.1
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium hidden sm:block">
                BAM-PRD-2026-V1.4 标准 · 零财务门槛 · 云端持久化
              </p>
            </div>
          </div>

          {/* Center Bento Nav Pill Tabs */}
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
                      ? 'bg-white text-indigo-700 shadow-sm border border-neutral-200/80'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-neutral-500'}`} />
                  <span>{item.label}</span>
                  {item.tag && (
                    <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md font-bold">
                      {item.tag}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Area: Google Login + AI Q&A */}
          <div className="flex items-center gap-2.5">
            {/* Google Login / Account Component */}
            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200 transition-all cursor-pointer"
                  title="账号管理与云端同步状态"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover border border-indigo-300"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left hidden lg:block max-w-[120px] truncate">
                    <p className="text-xs font-bold text-indigo-950 truncate">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>云端已同步</span>
                    </p>
                  </div>
                </button>

                {/* Account Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border-2 border-neutral-200 shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="pb-3 border-b border-neutral-100">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {currentUser.displayName || 'Google 用户'}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {currentUser.email}
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>数据已与该 Google 账号绑定</span>
                      </div>
                    </div>

                    <div className="py-2 space-y-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onTabChange('projects');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <FolderKanban className="w-4 h-4 text-indigo-600" />
                        <span>查看我的自测项目与报告</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-neutral-100">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>退出 Google 登录</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLoginWithGoogle}
                disabled={isSigningIn}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold border-2 border-neutral-300 hover:border-indigo-400 shadow-xs transition-all cursor-pointer hover:scale-102 disabled:opacity-50"
                title="使用 Google 账号登录，随时在其他设备查看您的自测数据"
              >
                {isSigningIn ? (
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span className="hidden sm:inline">Google 登录存盘</span>
                <span className="sm:hidden">登录</span>
              </button>
            )}

            {/* Right Action Bento Button: AI Rule Assistant */}
            <button
              onClick={() => onOpenAiHelper()}
              className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-md shadow-neutral-900/10 border-2 border-neutral-800 transition-all cursor-pointer hover:scale-102 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">AI 大白话答疑</span>
              <span className="sm:hidden">AI 答疑</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Scrollbar */}
        <div className="md:hidden flex overflow-x-auto pt-2.5 gap-1.5 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};


