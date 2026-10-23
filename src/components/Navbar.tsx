import React, { Suspense, lazy, useState } from 'react';
import { Avatar, Button, Dropdown, Flex, Menu, Segmented, type MenuProps } from 'antd';
import {
  Accessibility,
  BookOpen,
  Calculator,
  CheckCircle2,
  FileText,
  FolderKanban,
  GraduationCap,
  HelpCircle,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRound
} from 'lucide-react';
import { Language, ActiveTab, AppUser } from '../types';
import { ChinaVpnSidebarLink } from './ChinaNetworkTip';
import { isSuperAdmin } from '../lib/supabaseClient';

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
  /** 「查看结果」进入哪一页：已有营收的项目看体检报告，尚未开业的看开业测算 */
  resultTab: 'report' | 'feasibility';
}

/** 侧边栏宽度：与 App.tsx 中内容区的 md:pl-56 保持一致 */
export const SIDEBAR_WIDTH_CLASS = 'md:w-56';

const RESULT_TABS = ['report', 'feasibility'];
const TOOL_TABS = ['simulator', 'standards', 'learning', 'admin'];

export type IconType = React.ComponentType<{ className?: string }>;

const MobileNavDrawers = lazy(() => import('./MobileNavDrawers').then((m) => ({ default: m.MobileNavDrawers })));

/**
 * 导航按「用户要办的事」组织，而不是按功能平铺：
 *   我的生意：我的项目 → 填写数据 → 查看结果（体检报告 / 开业测算按项目阶段自动选择）
 *   工具：沙盒试算、评分规则、商业学习（超级账户另有全部项目）
 * 桌面端是左侧分组菜单；移动端是 5 个底部标签（项目 / 填写 / 结果 / 工具 / 我的），
 * 工具与「我的」（语言、无障碍、指南、账号）收进底部抽屉，顶栏只保留品牌与 AI 答疑入口。
 */
export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  language,
  onLanguageChange,
  onOpenAppGuide,
  onOpenAccessibility,
  onOpenAiHelper,
  currentUser,
  onOpenAuth,
  onLogout,
  isSigningIn = false,
  justSignedIn = false,
  resultTab
}) => {
  const t = (zh: string, en: string) => (language === 'en' ? en : zh);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [meOpen, setMeOpen] = useState(false);
  const [drawersLoaded, setDrawersLoaded] = useState(false);
  const openDrawer = (which: 'tools' | 'me') => {
    setDrawersLoaded(true);
    (which === 'tools' ? setToolsOpen : setMeOpen)(true);
  };
  const isAdmin = isSuperAdmin(currentUser);

  const selectedKey = RESULT_TABS.includes(activeTab) ? 'result' : activeTab;
  const go = (key: string) => onTabChange((key === 'result' ? resultTab : key) as ActiveTab);

  const toolItems: { key: string; icon: IconType; label: string; desc: string }[] = [
    {
      key: 'simulator',
      icon: Calculator,
      label: t('沙盒试算', 'Simulator'),
      desc: t('改改数字，看分数怎么变', 'Try numbers and watch the score change')
    },
    {
      key: 'standards',
      icon: BookOpen,
      label: t('评分规则', 'Scoring rules'),
      desc: t('每一分是怎么算出来的', 'How every point is calculated')
    },
    {
      key: 'learning',
      icon: GraduationCap,
      label: t('商业学习', 'Learn'),
      desc: t('小课程：看懂毛利、保本与现金', 'Short lessons on margin, break-even and cash')
    },
    ...(isAdmin
      ? [
          {
            key: 'admin',
            icon: ShieldCheck,
            label: t('全部项目', 'All projects'),
            desc: t('超级账户：查看所有用户项目', 'Super account: all users’ projects')
          }
        ]
      : [])
  ];

  const menuItems: MenuProps['items'] = [
    {
      type: 'group',
      label: t('我的生意', 'My business'),
      children: [
        { key: 'projects', icon: <FolderKanban className="w-4 h-4" />, label: t('我的项目', 'Projects') },
        { key: 'form', icon: <FileText className="w-4 h-4" />, label: t('填写数据', 'Enter numbers') },
        { key: 'result', icon: <Sparkles className="w-4 h-4" />, label: t('查看结果', 'Results') }
      ]
    },
    {
      type: 'group',
      label: t('工具', 'Tools'),
      children: toolItems.map((item) => {
        const Icon = item.icon;
        return { key: item.key, icon: <Icon className="w-4 h-4" />, label: item.label };
      })
    }
  ];

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';
  const avatar = (size: number) =>
    currentUser?.photoURL ? (
      <Avatar size={size} src={currentUser.photoURL} alt={userName} />
    ) : (
      <Avatar size={size} style={{ background: '#0f766e' }}>
        {(userName || 'U').charAt(0).toUpperCase()}
      </Avatar>
    );

  const languageSwitch = (
    <Segmented
      size="small"
      value={language}
      onChange={(v) => onLanguageChange(v as Language)}
      options={[
        { value: 'zh', label: '中文' },
        { value: 'en', label: 'EN' }
      ]}
    />
  );

  // —— 桌面端账号区 ——
  const desktopAccount = currentUser ? (
    justSignedIn ? (
      <Flex align="center" gap={6} className="px-3 py-2 rounded-lg bg-white/10 text-emerald-200 text-xs font-bold">
        <CheckCircle2 className="w-4 h-4" />
        {t('登录成功', 'Signed in')}
      </Flex>
    ) : (
      <Dropdown
        trigger={['click']}
        placement="topLeft"
        menu={{
          items: [
            { key: 'email', label: <span className="text-neutral-500">{currentUser.email}</span>, disabled: true },
            { type: 'divider' },
            { key: 'projects', icon: <FolderKanban className="w-4 h-4" />, label: t('我的所有项目', 'My projects') },
            { key: 'logout', icon: <LogOut className="w-4 h-4" />, label: t('退出登录', 'Sign out'), danger: true }
          ],
          onClick: ({ key }) => {
            if (key === 'logout') onLogout();
            else if (key === 'projects') onTabChange('projects');
          }
        }}
      >
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 cursor-pointer text-left">
          {avatar(24)}
          <span className="text-xs font-bold text-white truncate">{userName}</span>
        </button>
      </Dropdown>
    )
  ) : (
    <Button
      block
      ghost
      icon={isSigningIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
      disabled={isSigningIn || !onOpenAuth}
      onClick={onOpenAuth}
    >
      {t('登录同步存档', 'Sign in to sync')}
    </Button>
  );

  const bottomTabs: { key: string; icon: IconType; label: string }[] = [
    { key: 'projects', icon: FolderKanban, label: t('项目', 'Projects') },
    { key: 'form', icon: FileText, label: t('填写', 'Enter') },
    { key: 'result', icon: Sparkles, label: t('结果', 'Results') },
    { key: 'tools', icon: LayoutGrid, label: t('工具', 'Tools') },
    { key: 'me', icon: UserRound, label: t('我的', 'Me') }
  ];
  const isBottomActive = (key: string) =>
    key === 'tools' ? TOOL_TABS.includes(activeTab) : key === 'me' ? false : selectedKey === key;


  return (
    <>
      {/* ============ 桌面端侧边栏 ============ */}
      <aside
        className={`hidden md:flex md:flex-col ${SIDEBAR_WIDTH_CLASS} md:fixed md:inset-y-0 md:left-0 z-40 bg-teal-900 text-white px-3 py-5 overflow-y-auto`}
      >
        <button
          className="flex items-center gap-2.5 cursor-pointer shrink-0 mb-4 px-2 text-left"
          onClick={() => onTabChange('projects')}
        >
          <span className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck className="w-[18px] h-[18px]" />
          </span>
          <span className="text-sm font-bold leading-tight">{t('商宣商业模式检验', 'BAM Financial Health')}</span>
        </button>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => go(key)}
          items={menuItems}
          className="flex-1 border-e-0 bg-transparent"
        />

        <Button
          block
          icon={<MessageCircle className="w-4 h-4" />}
          className="mt-3"
          onClick={() => (currentUser ? onOpenAiHelper() : onOpenAuth?.())}
        >
          {t('AI 答疑', 'Ask AI')}
        </Button>

        <div className="pt-3 mt-3 border-t border-white/10 flex flex-col gap-3">
          <ChinaVpnSidebarLink language={language} />
          <Flex align="center" gap={4}>
            <Button
              type="text"
              size="small"
              icon={<Accessibility className="w-4 h-4 text-teal-100" />}
              onClick={onOpenAccessibility}
              title={t('大字 / 高对比度', 'Large text / high contrast')}
              aria-label={t('大字 / 高对比度', 'Large text / high contrast')}
            />
            {onOpenAppGuide && (
              <Button
                type="text"
                size="small"
                icon={<HelpCircle className="w-4 h-4 text-teal-100" />}
                onClick={onOpenAppGuide}
                title={t('使用指南', 'Guide')}
                aria-label={t('使用指南', 'Guide')}
              />
            )}
            <span className="ml-auto">{languageSwitch}</span>
          </Flex>
          {desktopAccount}
        </div>
      </aside>

      {/* ============ 移动端顶栏：只留品牌与 AI 答疑 ============ */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="px-4 py-2.5 flex items-center justify-between gap-3">
          <button className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={() => onTabChange('projects')}>
            <span className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-sm font-bold text-neutral-900 truncate">
              {t('商宣商业模式检验', 'BAM Financial Health')}
            </span>
          </button>
          {currentUser ? (
            <Button type="primary" size="small" icon={<MessageCircle className="w-4 h-4" />} onClick={() => onOpenAiHelper()}>
              {t('问 AI', 'Ask AI')}
            </Button>
          ) : (
            <Button size="small" icon={<LogIn className="w-4 h-4" />} onClick={onOpenAuth} disabled={isSigningIn}>
              {t('登录', 'Sign in')}
            </Button>
          )}
        </div>
      </header>

      {/* ============ 移动端底部标签栏（5 个） ============ */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-neutral-200 flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label={t('主导航', 'Main navigation')}
      >
        {bottomTabs.map((item) => {
          const active = isBottomActive(item.key);
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() =>
                item.key === 'tools' ? openDrawer('tools') : item.key === 'me' ? openDrawer('me') : go(item.key)
              }
              aria-current={active ? 'page' : undefined}
              className={`flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-xs cursor-pointer ${
                active ? 'text-teal-700 font-bold' : 'text-neutral-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 抽屉只在第一次打开时才加载（antd Drawer 体积不小），不占首屏 JS */}
      {drawersLoaded && (
        <Suspense fallback={null}>
          <MobileNavDrawers
            language={language}
            toolItems={toolItems}
            toolsOpen={toolsOpen}
            meOpen={meOpen}
            onCloseTools={() => setToolsOpen(false)}
            onCloseMe={() => setMeOpen(false)}
            onTabChange={onTabChange}
            currentUser={currentUser}
            userName={userName}
            avatar={avatar(40)}
            languageSwitch={languageSwitch}
            onOpenAuth={onOpenAuth}
            onOpenAccessibility={onOpenAccessibility}
            onOpenAppGuide={onOpenAppGuide}
            onLogout={onLogout}
          />
        </Suspense>
      )}
    </>
  );
};
