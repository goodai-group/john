import React from 'react';
import { Button, Flex, Segmented, Select, Typography } from 'antd';
import { Plus } from 'lucide-react';
import { ActiveTab, BusinessFormData, Language } from '../types';

interface ProjectContextBarProps {
  language: Language;
  activeTab: ActiveTab;
  projects: BusinessFormData[];
  activeProjectId: string | undefined;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onTabChange: (tab: ActiveTab) => void;
}

/**
 * 「当前项目」条：填写数据 / 体检报告 / 开业测算三个页面都针对同一个项目，
 * 此前页面上看不出正在操作哪个项目，也没法就地切换。统一放在这三个页面顶部。
 * 结果页额外给出「体检报告 / 开业测算」切换，两种结果都能看到。
 */
export function ProjectContextBar({
  language,
  activeTab,
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onTabChange
}: ProjectContextBarProps) {
  const t = (zh: string, en: string) => (language === 'en' ? en : zh);
  const isResult = activeTab === 'report' || activeTab === 'feasibility';

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 print:hidden">
      <Flex wrap gap={8} align="center" className="bg-white rounded-lg shadow-xs px-3 py-2">
        <Typography.Text type="secondary" className="shrink-0">
          {t('当前项目', 'Project')}
        </Typography.Text>
        <Select
          className="flex-1 min-w-40 sm:max-w-80"
          variant="borderless"
          value={projects.length ? activeProjectId : undefined}
          placeholder={t('还没有项目', 'No project yet')}
          onChange={onSelectProject}
          options={projects.map((p) => ({
            value: p.id,
            label: p.projectName?.trim() || t('（未命名项目）', '(untitled)')
          }))}
          aria-label={t('切换当前项目', 'Switch project')}
          showSearch={projects.length > 6}
          optionFilterProp="label"
        />
        <Button size="small" type="text" icon={<Plus className="w-4 h-4" />} onClick={onNewProject}>
          {t('新建', 'New')}
        </Button>
        {isResult && (
          <Segmented
            className="w-full sm:w-auto sm:ml-auto"
            block
            value={activeTab}
            onChange={(v) => onTabChange(v as ActiveTab)}
            options={[
              { value: 'report', label: t('体检报告', 'Health report') },
              { value: 'feasibility', label: t('开业测算', 'Launch brief') }
            ]}
          />
        )}
      </Flex>
    </div>
  );
}
