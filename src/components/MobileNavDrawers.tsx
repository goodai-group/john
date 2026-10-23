import React from 'react';
import { Button, Drawer, Flex, Typography } from 'antd';
import { Accessibility, ChevronRight, Globe, HelpCircle, LogIn, LogOut } from 'lucide-react';
import { ActiveTab, AppUser, Language } from '../types';
import { CHINA_VPN_URL, shouldOfferChinaVpn } from './ChinaNetworkTip';
import type { IconType } from './Navbar';

interface MobileNavDrawersProps {
  language: Language;
  toolItems: { key: string; icon: IconType; label: string; desc: string }[];
  toolsOpen: boolean;
  meOpen: boolean;
  onCloseTools: () => void;
  onCloseMe: () => void;
  onTabChange: (tab: ActiveTab) => void;
  currentUser: AppUser | null;
  userName: string;
  avatar: React.ReactNode;
  languageSwitch: React.ReactNode;
  onOpenAuth?: () => void;
  onOpenAccessibility: () => void;
  onOpenAppGuide?: () => void;
  onLogout: () => void;
}

/** 移动端底部标签栏的「工具」「我的」两个底部抽屉（按需加载，见 Navbar.tsx） */
export function MobileNavDrawers({
  language,
  toolItems,
  toolsOpen,
  meOpen,
  onCloseTools,
  onCloseMe,
  onTabChange,
  currentUser,
  userName,
  avatar,
  languageSwitch,
  onOpenAuth,
  onOpenAccessibility,
  onOpenAppGuide,
  onLogout
}: MobileNavDrawersProps) {
  const t = (zh: string, en: string) => (language === 'en' ? en : zh);

  const drawerRow = (key: string, Icon: IconType, label: React.ReactNode, desc: React.ReactNode, onClick: () => void) => (
    <button
      key={key}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-1 py-3 border-b border-neutral-100 last:border-b-0 text-left cursor-pointer"
    >
      <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-medium text-neutral-900">{label}</span>
        {desc && <span className="block text-xs text-neutral-500">{desc}</span>}
      </span>
      <ChevronRight className="w-4 h-4 text-neutral-300" />
    </button>
  );

  const drawerStyles = { body: { paddingTop: 4, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' } };

  return (
    <>
      <Drawer
        placement="bottom"
        open={toolsOpen}
        onClose={() => onCloseTools()}
        title={t('工具', 'Tools')}
        size="auto"
        styles={drawerStyles}
      >
        {toolItems.map((item) =>
          drawerRow(item.key, item.icon, item.label, item.desc, () => {
            onCloseTools();
            onTabChange(item.key as ActiveTab);
          })
        )}
      </Drawer>

      <Drawer
        placement="bottom"
        open={meOpen}
        onClose={() => onCloseMe()}
        title={t('我的', 'Me')}
        size="auto"
        styles={drawerStyles}
      >
        {currentUser ? (
          <Flex align="center" gap={12} className="py-3 border-b border-neutral-100">
            {avatar}
            <div className="min-w-0">
              <Typography.Text strong className="block truncate">
                {userName}
              </Typography.Text>
              <Typography.Text type="secondary" className="block truncate text-xs">
                {currentUser.email}
              </Typography.Text>
            </div>
          </Flex>
        ) : (
          <Button
            type="primary"
            block
            className="my-3"
            icon={<LogIn className="w-4 h-4" />}
            onClick={() => {
              onCloseMe();
              onOpenAuth?.();
            }}
          >
            {t('登录同步存档', 'Sign in to sync')}
          </Button>
        )}
        <Flex align="center" justify="space-between" className="py-3 border-b border-neutral-100">
          <span className="font-medium text-neutral-900">{t('语言', 'Language')}</span>
          {languageSwitch}
        </Flex>
        {drawerRow('a11y', Accessibility, t('大字 / 高对比度', 'Large text / high contrast'), null, () => {
          onCloseMe();
          onOpenAccessibility();
        })}
        {onOpenAppGuide &&
          drawerRow('guide', HelpCircle, t('使用指南', 'Guide'), null, () => {
            onCloseMe();
            onOpenAppGuide();
          })}
        {shouldOfferChinaVpn(language) &&
          drawerRow(
            'vpn',
            Globe,
            t('大陆网络加速推荐', 'Network accelerator'),
            t('AI 功能加载失败时可尝试', 'Try this if AI features fail to load'),
            () => window.open(CHINA_VPN_URL, '_blank', 'noopener,noreferrer')
          )}
        {currentUser && (
          <Button
            danger
            block
            className="mt-4"
            icon={<LogOut className="w-4 h-4" />}
            onClick={() => {
              onCloseMe();
              onLogout();
            }}
          >
            {t('退出登录', 'Sign out')}
          </Button>
        )}
      </Drawer>
    </>
  );
}
