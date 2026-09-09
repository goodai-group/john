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
  MoreHorizontal,
  CheckCircle2,
  GraduationCap
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
  // ⚠️ 桌面端与移动端各有一个「更多」容器，必须使用两个独立 ref：
  // 共用同一个 ref 时 React 只会保留最后挂载的节点，导致桌面端点击菜单项被误判为「点击外部」，
  // 下拉在 mousedown 阶段就被关闭，click 永远触发不到 → 表现为菜单项点不动
  const desktopMoreRef = useRef<HTMLDivElement>(null);
  const mobileMoreRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      const insideMoreMenu = [desktopMoreRef.current, mobileMoreRef.current].some(
        (el) => el && el.contains(target)
      );
      if (!insideMoreMenu) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 全部 6 大核心功能标签平铺展示在桌面端主导航栏
  const navItems: { id: ActiveTab; label: string; icon: any }[] = [
    { id: 'form', label: language === 'zh' ? '快速体检' : 'Assessment', icon: FileText },
    { id: 'report', label: language === 'zh' ? '体检报告' : 'Report', icon: Sparkles },
    { id: 'simulator', label: language === 'zh' ? '沙盒试算' : 'Simulator', icon: Calculator },
    { id: 'standards', label: language === 'zh' ? '评分规则' : 'Rules', icon: BookOpen },
    { id: 'learning', label: language === 'zh' ? '商业学习' : 'Learn', icon: GraduationCap },
    { id: 'projects', label: language === 'zh' ? '我的项目' : 'Projects', icon: FolderKanban }
  ];

  // 移动端屏幕宽度装不下全部 6 个标签（原先横向滚动但没有滚动提示，
  // "我的项目"会被裁切到看不见也点不到）。改为固定底部 5 个高频标签，
  // "评分规则"通过头部图标按钮单独触达，不占用底部空间。
  const mobileBottomNavItems = navItems.filter((item) => item.id !== 'standards');

  return (
    <>
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
              {language === 'zh' ? '商业财务测算' : 'BAM Financial Health'}
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
            {/* 顶部不再放 AI 答疑：统一交由右下角悬浮入口触发，避免双入口冗余 */}

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

            {/* "评分规则" 不在移动端底部导航中，改由此图标入口触达，避免底部标签超过 5 个 */}
            <button
              onClick={() => onTabChange('standards')}
              className={`md:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer ${
                activeTab === 'standards' ? 'text-indigo-600 bg-indigo-50' : 'text-neutral-500'
              }`}
              title={language === 'zh' ? '评分规则' : 'Scoring Rules'}
            >
              <BookOpen className="w-4 h-4" />
            </button>

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
                  <span className="text-xs font-bold text-indigo-950 hidden sm:inline max-w-[120px] truncate">
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

      </div>
    </header>

    {/* Mobile Fixed Bottom Tab Bar：固定 5 个高频标签，永远全部可见可点，
        不再依赖会被裁切、且没有滚动提示的横向滚动条。
        AI 答疑已有全局右下角悬浮入口（见 App.tsx），此处不再重复放置，
        避免与其余标签抢位导致溢出。 */}
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-neutral-200 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {mobileBottomNavItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors cursor-pointer ${
              isActive ? 'text-indigo-600' : 'text-neutral-500'
            }`}
          >
            <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-indigo-600' : 'text-neutral-400'}`} />
            <span className={isActive ? 'font-bold' : ''}>{item.label}</span>
          </button>
        );
      })}
    </nav>
    </>
  );
};
