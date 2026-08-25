import React from 'react';
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
  Info
} from 'lucide-react';
import { Language, ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab | string;
  onTabChange: (tab: ActiveTab) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenFeeModal: () => void;
  onOpenOnboarding: () => void;
  onOpenAccessibility: () => void;
  onOpenAiHelper: (topic?: string) => void;
  largeFont?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  language,
  onLanguageChange,
  onOpenFeeModal,
  onOpenOnboarding,
  onOpenAccessibility,
  onOpenAiHelper,
  largeFont
}) => {
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

          {/* Status Badge 2: Equal Rules */}
          <div className="flex items-center space-x-1.5 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold text-indigo-700">
              {language === 'zh' ? '凭证平等 · 无歧视规则' : 'Zero Proof Bias'}
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
        <div className="flex items-center justify-between">
          {/* Brand Box */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
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
                BAM-PRD-2026-V1.4 标准 · 零财务门槛 · 5项红线核验
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

          {/* Right Action Bento Button: AI Rule Assistant */}
          <button
            onClick={() => onOpenAiHelper()}
            className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-md shadow-neutral-900/10 border-2 border-neutral-800 transition-all cursor-pointer hover:scale-102"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>AI 大白话答疑</span>
          </button>
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

