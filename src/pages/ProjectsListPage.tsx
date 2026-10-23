import React, { useState } from 'react';
import { Alert, Button, Card, Col, Empty, Flex, Input, Popconfirm, Row, Statistic, Tag, Typography } from 'antd';
import { AlertCircle, FolderKanban, Mail, Plus, RotateCcw, ShieldAlert, Trash2, UserPlus, Users } from 'lucide-react';
import { BusinessFormData, AssessmentReport, Language, AppUser, proofTypeLabel } from '../types';
import { formatMoney } from '../lib/currencies';
import { INDUSTRY_BENCHMARKS } from '../lib/industryBenchmarks';
import { HEALTH_LEVEL_META, healthLabel, healthLevelOf, tierLabel } from '../lib/healthStatus';
import { PageContainer, PageHeader } from '../components/ui/PageHeader';

interface ProjectsListProps {
  projects: BusinessFormData[];
  reports: AssessmentReport[];
  language: Language;
  onNewProject: () => void;
  onSelectProject: (id: string) => void;
  onSelectReport: (reportId: string) => void;
  onDeleteProject: (id: string) => void;
  onUpdateProject?: (id: string, patch: Partial<BusinessFormData>) => void;
  isCloudDatabaseReady: boolean;
  onTriggerSync: () => void;
  /** 已存本机但还没成功同步到云端的项目 id */
  unsyncedProjectIds?: string[];
  currentUser?: AppUser | null;
  /** 打开登录/注册弹窗（Google + 邮箱密码双通道） */
  onOpenAuth?: () => void;
}

export const ProjectsListPage: React.FC<ProjectsListProps> = ({
  projects,
  reports,
  language,
  onNewProject,
  onSelectProject,
  onSelectReport,
  onDeleteProject,
  onUpdateProject,
  isCloudDatabaseReady,
  onTriggerSync,
  unsyncedProjectIds = [],
  currentUser,
  onOpenAuth
}) => {
  const isEn = language === 'en';
  const t = (zh: string, en: string) => (isEn ? en : zh);

  // —— 协作者管理（原表单第 5 步，体检后挪到项目管理界面）——
  const [collabOpenId, setCollabOpenId] = useState<string | null>(null);
  const [collabEmail, setCollabEmail] = useState('');
  const [collabError, setCollabError] = useState<string | null>(null);

  const handleAddCollab = (projId: string) => {
    const email = collabEmail.trim();
    if (!email || !email.includes('@')) {
      setCollabError(t('请输入有效邮箱（例如 partner@example.com）', 'Please enter a valid email (e.g. partner@example.com)'));
      return;
    }
    const proj = projects.find((p) => p.id === projId);
    const existing = proj?.collaborators || [];
    if (existing.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
      setCollabError(t('该邮箱已在协作者列表中', 'This email is already a collaborator'));
      return;
    }
    onUpdateProject?.(projId, {
      collaborators: [...existing, { email, role: 'editor', invitedAt: new Date().toISOString(), sectionAccess: ['all'] }]
    });
    setCollabEmail('');
    setCollabError(null);
  };

  const handleRemoveCollab = (projId: string, email: string) => {
    const proj = projects.find((p) => p.id === projId);
    if (!proj) return;
    onUpdateProject?.(projId, { collaborators: proj.collaborators.filter((c) => c.email !== email) });
  };

  const industryName = (p: BusinessFormData) => {
    const bench = INDUSTRY_BENCHMARKS.find((b) => b.id === p.industry);
    if (bench) return isEn ? bench.nameEn : bench.nameZh.split(' (')[0];
    return p.customIndustryName || p.businessType || '';
  };

  return (
    <PageContainer>
      <PageHeader
        icon={<FolderKanban className="w-5 h-5" />}
        title={t('我的项目', 'My projects')}
        description={t(
          '每个项目保存一份生意的数据和历次体检结果。登录后可在任何设备找回。',
          'Each project keeps one business’s numbers and every assessment result. Sign in to access them on any device.'
        )}
        extra={
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={onNewProject}>
            {t('新建项目', 'New project')}
          </Button>
        }
      />

      <Alert
        type={currentUser ? 'success' : 'info'}
        showIcon
        title={
          currentUser
            ? t(`已登录：${currentUser.displayName || currentUser.email}`, `Signed in as ${currentUser.displayName || currentUser.email}`)
            : t('未登录：数据只存在这台设备的浏览器里', 'Not signed in: data is stored in this browser only')
        }
        description={
          currentUser
            ? t('项目和报告会自动同步到你的账号。', 'Projects and reports sync to your account automatically.')
            : t('登录后项目会保存到云端，换手机或电脑也能找回。', 'Sign in to save projects to the cloud and access them from any device.')
        }
        action={
          <Flex gap={8} wrap>
            {!currentUser && onOpenAuth && (
              <Button size="small" type="primary" onClick={onOpenAuth}>
                {t('登录 / 注册', 'Sign in')}
              </Button>
            )}
            <Button size="small" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={onTriggerSync}>
              {t('立即同步', 'Sync now')}
            </Button>
          </Flex>
        }
      />

      {projects.length === 0 ? (
        <Card variant="borderless" className="shadow-xs">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t(
              '还没有项目。新建一个，填上收入和开销，就能看到体检结果。',
              'No projects yet. Create one, enter revenue and costs, and see your results.'
            )}
          >
            <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={onNewProject}>
              {t('新建项目', 'New project')}
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {projects.map((proj, idx) => {
            // 不能直接取第 0 项当"最新报告"——云端合并后数组顺序不保证按版本排序，必须显式取 version 最大值
            const latestReport = reports
              .filter((r) => r.projectId === proj.id)
              .reduce<AssessmentReport | undefined>((latest, r) => (!latest || r.version > latest.version ? r : latest), undefined);
            const level = latestReport ? healthLevelOf(latestReport) : null;
            const unsynced = isCloudDatabaseReady && currentUser && unsyncedProjectIds.includes(proj.id);

            return (
              <Col xs={24} md={12} key={`${proj.id}-${idx}`}>
                <Card
                  variant="borderless"
                  className="shadow-xs h-full"
                  styles={{ body: { display: 'flex', flexDirection: 'column', gap: 12, height: '100%' } }}
                >
                  <Flex justify="space-between" align="flex-start" gap={12}>
                    <div className="min-w-0">
                      <Typography.Title level={5} style={{ margin: 0 }} ellipsis>
                        {proj.projectName || t('未命名项目', 'Untitled project')}
                      </Typography.Title>
                      <Typography.Text type="secondary" className="text-xs">
                        {[industryName(proj), proj.baseCurrency, new Date(proj.updatedAt).toLocaleDateString(isEn ? 'en-US' : 'zh-CN')]
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography.Text>
                    </div>
                    {level ? (
                      <Tag color={HEALTH_LEVEL_META[level].color} className="me-0 shrink-0">
                        {healthLabel(level, language)}
                      </Tag>
                    ) : (
                      <Tag className="me-0 shrink-0">{t('还没出报告', 'No report yet')}</Tag>
                    )}
                  </Flex>

                  {(proj.isSensitiveRegion || unsynced) && (
                    <Flex gap={6} wrap>
                      {proj.isSensitiveRegion && (
                        <Tag color="warning" icon={<ShieldAlert className="w-3 h-3 inline mr-1" />}>
                          {t('敏感地区 · 已脱敏', 'Sensitive region · redacted')}
                        </Tag>
                      )}
                      {unsynced && (
                        <Tag
                          color="error"
                          icon={<AlertCircle className="w-3 h-3 inline mr-1" />}
                          className="cursor-pointer"
                          onClick={onTriggerSync}
                          title={t('这个项目只存在本机，换设备或退出登录前请先同步', 'This project only exists on this device — sync before switching devices or signing out')}
                        >
                          {t('未同步到云端 · 点击重试', 'Not synced · tap to retry')}
                        </Tag>
                      )}
                    </Flex>
                  )}

                  <Row gutter={12}>
                    <Col span={12}>
                      <Statistic
                        title={t('月均总流水', 'Monthly revenue')}
                        value={formatMoney(proj.monthlyRevenue.amount, proj.monthlyRevenue.currency)}
                        styles={{ content: { fontSize: 18 } }}
                      />
                    </Col>
                    <Col span={12}>
                      {latestReport ? (
                        <Statistic
                          title={t('最新得分', 'Latest score')}
                          value={latestReport.totalScore}
                          suffix={
                            <span className="text-xs text-neutral-500">
                              / 100 · {tierLabel(latestReport.tier, language)}
                            </span>
                          }
                          styles={{ content: { fontSize: 18, color: level ? HEALTH_LEVEL_META[level].hex : undefined } }}
                        />
                      ) : (
                        <Statistic
                          title={t('凭证方式', 'Proof')}
                          value={proofTypeLabel(proj.proofType, language)}
                          styles={{ content: { fontSize: 16 } }}
                        />
                      )}
                    </Col>
                  </Row>

                  <div>
                    <Button
                      type="link"
                      size="small"
                      className="px-0"
                      icon={<Users className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setCollabOpenId(collabOpenId === proj.id ? null : proj.id);
                        setCollabError(null);
                      }}
                    >
                      {proj.collaborators.length > 0
                        ? t(`协作者 ${proj.collaborators.length} 人`, `${proj.collaborators.length} collaborator(s)`)
                        : t('邀请协作者', 'Invite collaborator')}
                    </Button>

                    {collabOpenId === proj.id && (
                      <div className="mt-2 p-3 rounded-lg bg-neutral-50 border border-neutral-100 flex flex-col gap-2">
                        {proj.collaborators.length > 0 ? (
                          proj.collaborators.map((c) => (
                            <Flex key={c.email} align="center" justify="space-between" gap={8} className="bg-white rounded-md px-2 py-1.5">
                              <Flex align="center" gap={6} className="min-w-0">
                                <Mail className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                <span className="text-xs truncate">{c.email}</span>
                                <Tag className="me-0 shrink-0">{t('可编辑', 'Editor')}</Tag>
                              </Flex>
                              <Popconfirm
                                title={t('移除这位协作者？', 'Remove this collaborator?')}
                                okText={t('移除', 'Remove')}
                                cancelText={t('取消', 'Cancel')}
                                onConfirm={() => handleRemoveCollab(proj.id, c.email)}
                              >
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<Trash2 className="w-3.5 h-3.5" />}
                                  aria-label={t('移除协作者', 'Remove collaborator')}
                                />
                              </Popconfirm>
                            </Flex>
                          ))
                        ) : (
                          <Typography.Text type="secondary" className="text-xs">
                            {t('可邀请配偶、当地同工一起核对数据。', 'Invite a spouse or local teammate to review the data together.')}
                          </Typography.Text>
                        )}
                        <Flex gap={8}>
                          <Input
                            type="email"
                            size="small"
                            placeholder={t('协作者邮箱', "Collaborator's email")}
                            value={collabEmail}
                            status={collabError ? 'error' : undefined}
                            onChange={(e) => {
                              setCollabEmail(e.target.value);
                              setCollabError(null);
                            }}
                            onPressEnter={() => handleAddCollab(proj.id)}
                          />
                          <Button size="small" type="primary" icon={<UserPlus className="w-3.5 h-3.5" />} onClick={() => handleAddCollab(proj.id)}>
                            {t('添加', 'Add')}
                          </Button>
                        </Flex>
                        {collabError && (
                          <Typography.Text type="danger" className="text-xs">
                            {collabError}
                          </Typography.Text>
                        )}
                      </div>
                    )}
                  </div>

                  <Flex justify="space-between" align="center" gap={8} className="mt-auto pt-3 border-t border-neutral-100">
                    {/* 删除不可恢复（本地与云端一起删），必须二次确认；此前点一下垃圾桶就直接删掉了 */}
                    <Popconfirm
                      title={t('删除这个项目？', 'Delete this project?')}
                      description={t('项目和它的全部报告会一起删除，无法恢复。', 'The project and all its reports will be deleted. This cannot be undone.')}
                      okText={t('删除', 'Delete')}
                      okButtonProps={{ danger: true }}
                      cancelText={t('取消', 'Cancel')}
                      onConfirm={() => onDeleteProject(proj.id)}
                    >
                      <Button type="text" danger icon={<Trash2 className="w-4 h-4" />} aria-label={t('删除此项目', 'Delete this project')} />
                    </Popconfirm>
                    <Flex gap={8}>
                      <Button onClick={() => onSelectProject(proj.id)}>{t('编辑数据', 'Edit numbers')}</Button>
                      {latestReport && (
                        <Button type="primary" onClick={() => onSelectReport(latestReport.id)}>
                          {t('查看报告', 'View report')}
                        </Button>
                      )}
                    </Flex>
                  </Flex>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </PageContainer>
  );
};
