import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, ShieldCheck, AlertCircle } from 'lucide-react';
import { AppUser, Language } from '../types';
import { AdminProjectRow, fetchAllProjectsForAdmin, isSuperAdmin } from '../lib/supabaseClient';
import { formatMoney } from '../lib/currencies';

interface AdminProjectsPageProps {
  currentUser: AppUser | null;
  language: Language;
}

/** 超级账户专用：只读查看所有用户提交的项目 */
export const AdminProjectsPage: React.FC<AdminProjectsPageProps> = ({ currentUser, language }) => {
  const t = (zh: string, en: string) => (language === 'en' ? en : zh);
  const [rows, setRows] = useState<AdminProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [onlySubmitted, setOnlySubmitted] = useState(false);

  const allowed = isSuperAdmin(currentUser);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlySubmitted && !r.isSubmitted) return false;
      if (!q) return true;
      return [r.data.projectName, r.data.industry, r.ownerEmail, r.data.regionCountry]
        .some((s) => (s || '').toLowerCase().includes(q));
    });
  }, [rows, query, onlySubmitted]);

  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-neutral-500 text-sm">
        {t('仅超级账户可访问此页面。', 'This page is for super accounts only.')}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
      <div className="bg-white rounded-3xl p-6 border-2 border-neutral-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-[12px] font-mono font-bold uppercase tracking-wider text-teal-700">
            <ShieldCheck className="w-4 h-4" /> SUPER ACCOUNT
          </div>
          <h2 className="text-xl font-black text-neutral-900">{t('全部用户项目（只读）', 'All Users’ Projects (read-only)')}</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t(`共 ${rows.length} 个项目，当前显示 ${filtered.length} 个`, `${rows.length} projects, showing ${filtered.length}`)}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-300 text-sm font-bold hover:bg-neutral-50 disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {t('刷新', 'Refresh')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('搜索项目名 / 行业 / 提交人邮箱 / 国家', 'Search name / industry / owner email / country')}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 text-sm"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
          <input type="checkbox" checked={onlySubmitted} onChange={(e) => setOnlySubmitted(e.target.checked)} />
          {t('仅已提交', 'Submitted only')}
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white rounded-3xl border-2 border-neutral-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-xs text-left">
            <tr>
              <th className="px-4 py-3">{t('项目', 'Project')}</th>
              <th className="px-4 py-3">{t('提交人', 'Owner')}</th>
              <th className="px-4 py-3">{t('行业 / 地区', 'Industry / Region')}</th>
              <th className="px-4 py-3 text-right">{t('月流水', 'Monthly revenue')}</th>
              <th className="px-4 py-3">{t('状态', 'Status')}</th>
              <th className="px-4 py-3">{t('更新时间', 'Updated')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((r) => (
              <tr key={r.data.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-bold text-neutral-900">
                  {r.data.projectName || t('（未命名）', '(untitled)')}
                  <span className="ml-1 text-xs font-normal text-neutral-400">v{r.data.version}</span>
                </td>
                <td className="px-4 py-3 text-neutral-700">{r.ownerEmail || r.data.ownerEmail || '—'}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {[r.data.industry, r.data.regionCountry].filter(Boolean).join(' / ') || '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.data.monthlyRevenue?.amount != null
                    ? formatMoney(Number(r.data.monthlyRevenue.amount), r.data.monthlyRevenue.currency || r.data.baseCurrency)
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      r.isSubmitted ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {r.isSubmitted ? t('已提交', 'Submitted') : t('草稿', 'Draft')}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                  {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  {t('暂无项目', 'No projects')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
