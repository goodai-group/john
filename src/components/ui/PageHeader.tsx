import React from 'react';
import { Card, Flex, Typography } from 'antd';

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** 标题右侧的小标签（如「不提交 · 不记录」） */
  tags?: React.ReactNode;
  description?: React.ReactNode;
  /** 右侧操作区（按钮）；移动端自动换行到标题下方 */
  extra?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * 页面级标题卡片：开业测算 / 沙盒试算 / 评分规则等页面统一使用，
 * 保证标题字号、图标尺寸、间距与移动端换行行为一致。
 */
export function PageHeader({ icon, title, tags, description, extra, children }: PageHeaderProps) {
  return (
    <Card variant="borderless" className="shadow-xs">
      <Flex wrap gap={16} justify="space-between" align="center">
        <Flex gap={12} align="flex-start" className="min-w-0 flex-1 basis-72">
          {icon && (
            <div className="w-10 h-10 shrink-0 rounded-lg bg-teal-700 text-white flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <Flex wrap gap={8} align="center">
              <Typography.Title level={4} style={{ margin: 0 }}>
                {title}
              </Typography.Title>
              {tags}
            </Flex>
            {description && (
              <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                {description}
              </Typography.Paragraph>
            )}
          </div>
        </Flex>
        {extra && (
          <Flex wrap gap={8} className="w-full sm:w-auto">
            {extra}
          </Flex>
        )}
      </Flex>
      {children}
    </Card>
  );
}

/** 页面内容容器：统一最大宽度与左右留白（移动端 12px，桌面 24px） */
export function PageContainer({ children, width = 'max-w-6xl' }: { children: React.ReactNode; width?: string }) {
  return <div className={`${width} mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4`}>{children}</div>;
}
