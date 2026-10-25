import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Dropdown, Empty, Flex, Grid, Input, Segmented, Spin, Table, Tag, Typography, type TableColumnsType } from 'antd';
import { Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { AppUser, Language } from '../types';
import { AdminProjectRow, fetchAllProjectsForAdmin, isSuperAdmin } from '../lib/supabaseClient';
import { formatMoney } from '../lib/currencies';
import { INDUSTRY_BENCHMARKS } from '../lib/industryBenchmarks';
import { downloadProjectReport, type ReportFileFormat } from '../lib/reportDownload';
import { PageContainer, PageHeader } from '../components/ui/PageHeader';

type HealthKey = 'PASS' | 'REVIEW' | 'FAIL' | 'NONE';

const healthKeyOf = (r: AdminProjectRow): HealthKey => r.health?.status ?? 'NONE';

const HEALTH_META: Record<HealthKey, { zh: string; en: string; color: string }> = {
  PASS: { zh: '健康', en: 'Healthy', color: 'success' },
  REVIEW: { zh: '需关注', en: 'Needs review', color: 'warning' },
  FAIL: { zh: '不达标', en: 'At risk', color: 'error' },
  NONE: { zh: '未评估', en: 'Not assessed', color: 'default' }
};
const HEALTH_ORDER: HealthKey[] = ['FAIL', 'REVIEW', 'PASS', 'NONE'];

interface AdminProjectsPageProps {
  currentUser: AppUser | null;
  language: Language;
}

/** 超级账户专用：只读查看所有用户提交的项目 */
export const AdminProjectsPage: React.FC<AdminProjectsPageProps> = ({ currentUser, language }) => {
  const isEn = language === 'en';
  const t = (zh: string, en: string) => (isEn ? en : zh);
  const [rows, setRows] = useState<AdminProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [onlySubmitted, setOnlySubmitted] = useState(false);
  const [healthFilter, setHealthFilter] = useState<HealthKey | 'ALL'>('ALL');

  const allowed = isSuperAdmin(currentUser);
  const screens = Grid.useBreakpoint();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAllProjectsForAdmin(currentUser));
    } catch (e: any) {
      setError(e?.message || t('读取失败', 'Failed to load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, currentUser?.uid]);

  // 行业字段存的是内部 key（如 food_beverage），展示时换成可读名称
  const industryLabel = (r: AdminProjectRow) => {
    const id = r.data.industry;
    const bench = INDUSTRY_BENCHMARKS.find((b) => b.id === id);
    if (bench) return isEn ? bench.nameEn : bench.nameZh.split(' (')[0];
    if (r.data.customIndustryName) return r.data.customIndustryName;
    // 不在基准库里的行业 key（如 artisan_handicraft）至少转成可读的单词
    return (id || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // 按当前评分口径现算一份报告再下载，因此草稿 / 从未生成过报告的项目也能导出
  const handleDownload = (r: AdminProjectRow, format: ReportFileFormat) => {
    try {
      downloadProjectReport(r.data, format, { ownerEmail: r.ownerEmail || r.data.ownerEmail });
    } catch (e: any) {
      setError(t(`下载失败：${e?.message || '无法生成报告'}`, `Download failed: ${e?.message || 'could not build the report'}`));
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlySubmitted && !r.isSubmitted) return false;
      if (healthFilter !== 'ALL' && healthKeyOf(r) !== healthFilter) return false;
      if (!q) return true;
      return [r.data.projectName, r.data.industry, industryLabel(r), r.ownerEmail, r.data.regionCountry].some((s) =>
        (s || '').toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, onlySubmitted, healthFilter, language]);

  const counts = useMemo(() => {
    const c: Record<HealthKey, number> = { PASS: 0, REVIEW: 0, FAIL: 0, NONE: 0 };
    rows.forEach((r) => {
      c[healthKeyOf(r)] += 1;
    });
    return c;
  }, [rows]);

  if (!allowed) {
    return (
      <PageContainer width="max-w-3xl">
        <Alert type="warning" showIcon title={t('仅超级账户可访问此页面。', 'This page is for super accounts only.')} />
      </PageContainer>
    );
  }

  // 单元格渲染：桌面表格与移动端卡片共用同一套
  const cell = {
    name: (r: AdminProjectRow) => (
      <>
        <Typography.Text strong>{r.data.projectName || t('（未命名）', '(untitled)')}</Typography.Text>
        <Typography.Text type="secondary" className="ml-1 text-xs">
          v{r.data.version}
        </Typography.Text>
      </>
    ),
    owner: (r: AdminProjectRow) => r.ownerEmail || r.data.ownerEmail || '—',
    industry: (r: AdminProjectRow) => (
      <>
        <div>{industryLabel(r) || '—'}</div>
        {r.data.regionCountry && <div className="text-xs text-neutral-500">{r.data.regionCountry}</div>}
      </>
    ),
    revenue: (r: AdminProjectRow) => (
      <span className="tabular-nums whitespace-nowrap">
        {r.data.monthlyRevenue?.amount != null
          ? formatMoney(Number(r.data.monthlyRevenue.amount), r.data.monthlyRevenue.currency || r.data.baseCurrency)
          : '—'}
      </span>
    ),
    health: (r: AdminProjectRow) => {
      const meta = HEALTH_META[healthKeyOf(r)];
      return (
        <Flex vertical gap={2} align="flex-start">
          <Tag color={meta.color} className="me-0">
            {isEn ? meta.en : meta.zh}
          </Tag>
          {r.health && (
            <span className="text-xs text-neutral-500 tabular-nums whitespace-nowrap">
              {r.health.score ?? '—'}
              {t('分', ' pts')} · {r.health.tier ?? '—'}
              {r.health.gatePassed === false && (
                <Typography.Text type="danger" className="ml-1 text-xs">
                  {t('红线未过', 'Gate failed')}
                </Typography.Text>
              )}
            </span>
          )}
        </Flex>
      );
    },
    status: (r: AdminProjectRow) =>
      r.isSubmitted ? (
        <Tag color="success" className="me-0">
          {t('已提交', 'Submitted')}
        </Tag>
      ) : (
        <Tag className="me-0">{t('草稿', 'Draft')}</Tag>
      ),
    download: (r: AdminProjectRow) => (
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'md', label: t('可读报告（Markdown）', 'Readable report (Markdown)') },
            { key: 'json', label: t('完整数据（JSON）', 'Full data (JSON)') }
          ],
          onClick: ({ key }) => handleDownload(r, key as ReportFileFormat)
        }}
      >
        <Button size="small" icon={<Download className="w-4 h-4" />}>
          {t('下载报告', 'Download')}
        </Button>
      </Dropdown>
    ),
    updated: (r: AdminProjectRow) => (
      <span className="whitespace-nowrap text-neutral-500">
        {r.updatedAt ? new Date(r.updatedAt).toLocaleString(isEn ? 'en-US' : 'zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }) : '—'}
      </span>
    )
  };

  const columns: TableColumnsType<AdminProjectRow> = [
    { title: t('项目', 'Project'), key: 'name', width: 180, render: (_, r) => cell.name(r) },
    { title: t('提交人', 'Owner'), key: 'owner', width: 180, ellipsis: true, render: (_, r) => cell.owner(r) },
    { title: t('行业 / 地区', 'Industry / Region'), key: 'industry', width: 160, render: (_, r) => cell.industry(r) },
    { title: t('月流水', 'Monthly revenue'), key: 'revenue', align: 'right', render: (_, r) => cell.revenue(r) },
    { title: t('健康状况', 'Health'), key: 'health', render: (_, r) => cell.health(r) },
    { title: t('状态', 'Status'), key: 'status', render: (_, r) => cell.status(r) },
    {
      title: t('更新时间', 'Updated'),
      key: 'updatedAt',
      sorter: (a, b) => new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime(),
      defaultSortOrder: 'descend',
      render: (_, r) => cell.updated(r)
    },
    { title: t('报告', 'Report'), key: 'download', fixed: 'right', render: (_, r) => cell.download(r) }
  ];

  return (
    <PageContainer>
      <PageHeader
        icon={<ShieldCheck className="w-5 h-5" />}
        title={t('全部用户项目', 'All users’ projects')}
        tags={<Tag>{t('只读', 'Read-only')}</Tag>}
        description={t(`共 ${rows.length} 个项目，当前显示 ${filtered.length} 个`, `${rows.length} projects, showing ${filtered.length}`)}
        extra={
          <Button icon={<RefreshCw className="w-4 h-4" />} loading={loading} onClick={load}>
            {t('刷新', 'Refresh')}
          </Button>
        }
      />

      <div className="overflow-x-auto -mx-1 px-1">
        <Segmented
          value={healthFilter}
          onChange={(v) => setHealthFilter(v as HealthKey | 'ALL')}
          options={[
            { value: 'ALL', label: `${t('全部', 'All')} ${rows.length}` },
            ...HEALTH_ORDER.map((k) => ({
              value: k,
              label: `${isEn ? HEALTH_META[k].en : HEALTH_META[k].zh} ${counts[k]}`
            }))
          ]}
        />
      </div>

      <Flex wrap gap={12} align="center">
        <Input.Search
          allowClear
          className="flex-1 min-w-56"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('搜索项目名 / 行业 / 提交人邮箱 / 国家', 'Search name / industry / owner email / country')}
        />
        <Checkbox checked={onlySubmitted} onChange={(e) => setOnlySubmitted(e.target.checked)}>
          {t('仅已提交', 'Submitted only')}
        </Checkbox>
      </Flex>

      {error && <Alert type="error" showIcon title={error} />}

      {screens.md === false ? (
        <Spin spinning={loading}>
          {filtered.length === 0 ? (
            <Card variant="borderless">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无项目', 'No projects')} />
            </Card>
          ) : (
            <Flex vertical gap={12}>
              {filtered.map((r) => (
                <Card key={r.data.id} size="small" variant="borderless" className="shadow-xs">
                  <Flex justify="space-between" align="flex-start" gap={8}>
                    <div className="min-w-0">{cell.name(r)}</div>
                    {cell.status(r)}
                  </Flex>
                  <div className="text-neutral-500 text-xs truncate mt-0.5">{cell.owner(r)}</div>
                  <div className="mt-2 text-sm">{cell.industry(r)}</div>
                  <Flex justify="space-between" align="flex-end" gap={8} className="mt-2">
                    {cell.health(r)}
                    <div className="text-right">{cell.revenue(r)}</div>
                  </Flex>
                  <Flex justify="space-between" align="center" gap={8} className="mt-2 text-xs">
                    {cell.updated(r)}
                    {cell.download(r)}
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}
        </Spin>
      ) : (
        <Table
          rowKey={(r) => r.data.id}
          columns={columns}
          dataSource={filtered}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
          locale={{ emptyText: t('暂无项目', 'No projects') }}
          className="rounded-lg overflow-hidden shadow-xs"
        />
      )}
    </PageContainer>
  );
};
