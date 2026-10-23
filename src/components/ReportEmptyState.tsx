import React from 'react';
import { Button, Card, Empty, Flex, Typography } from 'antd';
import { Heart } from 'lucide-react';
import { Language } from '../types';

interface ReportEmptyStateProps {
  language: Language;
  /** 是否已有当前项目（决定标题是「这个项目还没有」还是「暂无」） */
  hasProject: boolean;
  onGoToForm: () => void;
  onGoToFeasibility: () => void;
}

/** 体检报告页的空状态：当前项目还没生成过报告时显示 */
export function ReportEmptyState({ language, hasProject, onGoToForm, onGoToFeasibility }: ReportEmptyStateProps) {
  const t = (zh: string, en: string) => (language === 'en' ? en : zh);
  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <Card variant="borderless" className="shadow-xs">
        <Empty
          image={<Heart className="w-12 h-12 mx-auto text-teal-600" />}
          description={
            <>
              <Typography.Title level={5}>
                {hasProject
                  ? t('这个项目还没有体检报告', 'No health report for this project yet')
                  : t('暂无体检报告', 'No health report yet')}
              </Typography.Title>
              <Typography.Text type="secondary">
                {t(
                  '填完收入与开销后点「生成体检报告」，这里会显示红线检查与 5 个维度的诊断。还没开业的项目可以先看「开业测算」。',
                  'Enter revenue and costs, then click "Generate report" to see the gate checks and a 5-dimension diagnosis. Not launched yet? Try the launch brief.'
                )}
              </Typography.Text>
            </>
          }
        >
          <Flex gap={8} justify="center" wrap>
            <Button type="primary" onClick={onGoToForm}>
              {t('去填写数据', 'Enter numbers')}
            </Button>
            <Button onClick={onGoToFeasibility}>{t('看开业测算', 'Launch brief')}</Button>
          </Flex>
        </Empty>
      </Card>
    </div>
  );
}
