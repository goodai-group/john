import React, { useState } from 'react';
import { Sparkles, Trash2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  BillingCycle,
  BILLING_CYCLE_LABELS,
  BusinessFormData,
  CurrencyCode,
  Language,
  LedgerCategory,
  LedgerClassification,
  LedgerItem,
  LEDGER_CATEGORY_LABELS
} from '../../types';
import { mapClassifiedLedgerToForm } from '../../lib/ledgerMapping';
import { getAuthHeaders } from '../../lib/supabaseClient';
import { NumberField } from './NumberField';

interface DraftRow {
  id: string;
  type: 'income' | 'expense';
  name: string;
  amount: number;
  cycle: BillingCycle;
}

function emptyRow(): DraftRow {
  return { id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'expense', name: '', amount: 0, cycle: 'monthly' };
}

interface SmartLedgerEntryProps {
  language: Language;
  baseCurrency: CurrencyCode;
  projectName: string;
  industryHint: string;
  /** 用户确认「记入花费清单」后，把换算好的表单补丁交给上层合并进主表单（累加，不覆盖既有数据） */
  onApply: (patch: Partial<BusinessFormData>) => void;
}

/**
 * 智能记账入口：用户只填「名称+金额+周期+收入或支出」，不用自己选会计科目。
 * 调 /api/ai/classify-ledger（src/agents/ledgerClassifier.ts）分类，低置信度/高风险判断
 * （如真实收入 vs 外部捐赠）会标出来让用户在下拉框里改，用户确认后才真正记入花费清单——
 * 分类结果只是建议，不直接静默写入表单（与 ledgerClassifier.ts 的角色边界一致）。
 */
export function SmartLedgerEntry({ language, baseCurrency, projectName, industryHint, onApply }: SmartLedgerEntryProps) {
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailableNote, setUnavailableNote] = useState<string | null>(null);
  // 分类结果快照：与发起分类请求时的 rows 绑定，避免用户在结果展示期间又改草稿行导致对不上
  const [classifiedRows, setClassifiedRows] = useState<DraftRow[] | null>(null);
  const [classifications, setClassifications] = useState<Record<string, LedgerClassification>>({});
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  const updateRow = (id: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (id: string) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const overrideClassification = (id: string, patch: Partial<LedgerClassification>) => {
    setClassifications((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch, needsUserConfirmation: false } // 用户已经看过并改过/确认过，不再需要提示确认
    }));
  };

  const validRows = rows.filter((r) => r.name.trim() && r.amount > 0);

  const handleClassify = async () => {
    if (validRows.length === 0) return;
    setClassifying(true);
    setError(null);
    setAppliedCount(null);
    try {
      const items = validRows.map((r) => ({
        id: r.id,
        type: r.type,
        name: r.name.trim(),
        amount: r.amount,
        currency: baseCurrency,
        cycle: r.cycle
      }));
      const res = await fetch('/api/ai/classify-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ items, projectName, industryHint, baseCurrency })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok && !data) throw new Error(`HTTP ${res.status}`);
      if (!data || data.success === false || !Array.isArray(data.classifications)) {
        throw new Error(data?.reason || (language === 'en' ? 'Classification failed' : 'AI 分类失败'));
      }
      const map: Record<string, LedgerClassification> = {};
      (data.classifications as LedgerClassification[]).forEach((c) => {
        map[c.id] = c;
      });
      setClassifiedRows(validRows);
      setClassifications(map);
      setUnavailableNote(
        data.unavailable
          ? data.reason ||
              (language === 'en'
                ? 'AI is unavailable right now — used local rule-based classification instead. Please double-check each item.'
                : 'AI 暂时不可用，已用本地规则粗略分类，建议逐条核对后再记入。')
          : null
      );
    } catch (err: any) {
      setError(err?.message || (language === 'en' ? 'Classification failed, please retry.' : '分类失败，请重试。'));
    } finally {
      setClassifying(false);
    }
  };

  const handleApply = () => {
    if (!classifiedRows) return;
    const items: LedgerItem[] = classifiedRows.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name.trim(),
      amount: r.amount,
      currency: baseCurrency,
      cycle: r.cycle
    }));
    const classificationList = classifiedRows.map((r) => classifications[r.id]).filter(Boolean) as LedgerClassification[];
    const { formPatch } = mapClassifiedLedgerToForm(items, classificationList, baseCurrency);
    onApply(formPatch);
    setAppliedCount(classifiedRows.length);
    setRows([emptyRow()]);
    setClassifiedRows(null);
    setClassifications({});
    setUnavailableNote(null);
  };

  const pendingConfirmCount = classifiedRows
    ? classifiedRows.filter((r) => classifications[r.id]?.needsUserConfirmation).length
    : 0;

  return (
    <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <span className="text-[13px] font-black text-teal-950 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          {language === 'en' ? 'Smart ledger entry (AI auto-categorizes)' : '智能记账（AI 自动分类，无需自己选科目）'}
        </span>
      </div>
      <p className="text-[11px] text-teal-800/80 leading-relaxed">
        {language === 'en'
          ? 'Just type what it is, how much, and how often — AI figures out which category it belongs to. Low-confidence items are flagged for you to confirm before anything is added.'
          : '只填「这是什么、多少钱、多久一次」，AI 会自动判断该记到哪个科目；拿不准的会标出来，你确认后才真正记入花费清单。'}
      </p>

      {!classifiedRows && (
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-1.5 flex-wrap">
              <div className="flex shrink-0 rounded-lg border border-slate-200 overflow-hidden text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => updateRow(row.id, { type: 'expense' })}
                  className={`px-2 py-1.5 cursor-pointer ${row.type === 'expense' ? 'bg-rose-600 text-white' : 'bg-white text-slate-500'}`}
                >
                  {language === 'en' ? 'Expense' : '支出'}
                </button>
                <button
                  type="button"
                  onClick={() => updateRow(row.id, { type: 'income' })}
                  className={`px-2 py-1.5 cursor-pointer ${row.type === 'income' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500'}`}
                >
                  {language === 'en' ? 'Income' : '收入'}
                </button>
              </div>
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
                placeholder={language === 'en' ? 'e.g. Coffee beans / Shop rent / Church donation' : '例如：咖啡豆 / 铺租 / 教会资助'}
                className="flex-1 min-w-[8rem] p-1.5 border border-slate-200 rounded-lg font-semibold text-slate-800"
              />
              <NumberField
                value={row.amount}
                onChange={(v) => updateRow(row.id, { amount: v })}
                placeholder={language === 'en' ? 'Amount' : '金额'}
                className="w-24 shrink-0 p-1.5 border border-slate-200 rounded-lg font-mono text-right"
              />
              <span className="text-[11px] text-slate-500 shrink-0">{baseCurrency}</span>
              <select
                value={row.cycle}
                onChange={(e) => updateRow(row.id, { cycle: e.target.value as BillingCycle })}
                className="p-1.5 border border-slate-200 rounded-lg text-[12px] font-semibold text-slate-700 bg-white cursor-pointer shrink-0"
              >
                {(['monthly', 'quarterly', 'annual', 'one_time'] as BillingCycle[]).map((c) => (
                  <option key={c} value={c}>
                    {BILLING_CYCLE_LABELS[c][language]}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => removeRow(row.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <button type="button" onClick={addRow} className="text-[12px] px-2 py-1 rounded border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer">
              {language === 'en' ? '+ Add a line' : '＋ 添加一行'}
            </button>
            <button
              type="button"
              onClick={handleClassify}
              disabled={validRows.length === 0 || classifying}
              className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {classifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {language === 'en' ? 'AI auto-categorize' : 'AI 自动分类'}
            </button>
            {appliedCount != null && (
              <span className="text-[12px] text-emerald-700 font-bold inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {language === 'en' ? `${appliedCount} item(s) added to your expense list.` : `已记入 ${appliedCount} 条到花费清单。`}
              </span>
            )}
          </div>
          {error && (
            <p className="text-[12px] text-rose-600 font-bold flex items-start gap-1">
              <span>⚠️</span>
              <span>{error}</span>
            </p>
          )}
        </div>
      )}

      {classifiedRows && (
        <div className="space-y-2">
          {unavailableNote && (
            <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-1.5 leading-relaxed font-semibold flex items-start gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{unavailableNote}</span>
            </p>
          )}
          {pendingConfirmCount > 0 && (
            <p className="text-[12px] text-amber-700 font-bold">
              {language === 'en'
                ? `${pendingConfirmCount} item(s) need your confirmation below (low confidence, or revenue vs. grant / one-time vs. depreciable).`
                : `有 ${pendingConfirmCount} 项需要你在下方确认分类（置信度较低，或涉及"真实收入/外部资助""一次性/应折旧"这类关键判断）。`}
            </p>
          )}
          <div className="space-y-1.5">
            {classifiedRows.map((row) => {
              const c = classifications[row.id];
              if (!c) return null;
              return (
                <div
                  key={row.id}
                  className={`p-2 rounded-lg border space-y-1 ${c.needsUserConfirmation ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <span className="text-[13px] font-bold text-slate-800">
                      {row.name} · {row.amount.toLocaleString()} {baseCurrency} · {BILLING_CYCLE_LABELS[row.cycle][language]}
                    </span>
                    <select
                      value={c.category}
                      onChange={(e) => overrideClassification(row.id, { category: e.target.value as LedgerCategory })}
                      className={`p-1.5 border rounded-lg text-[12px] font-bold bg-white cursor-pointer ${c.needsUserConfirmation ? 'border-amber-400 text-amber-800' : 'border-slate-200 text-slate-700'}`}
                    >
                      {(Object.keys(LEDGER_CATEGORY_LABELS) as LedgerCategory[]).map((cat) => (
                        <option key={cat} value={cat}>
                          {LEDGER_CATEGORY_LABELS[cat][language]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {c.reasoning} · {language === 'en' ? 'confidence' : '置信度'} {Math.round(c.confidence * 100)}%
                  </p>
                  {c.category === 'CAPEX_DEPRECIATION' && row.cycle === 'one_time' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <span>{language === 'en' ? 'Amortize over' : '分摊到未来'}</span>
                      <NumberField
                        min={1}
                        value={c.suggestedAmortizationMonths || 24}
                        onChange={(v) => overrideClassification(row.id, { suggestedAmortizationMonths: Math.max(1, Math.round(v || 24)) })}
                        className="w-14 p-1 border border-slate-200 rounded font-mono text-right"
                      />
                      <span>{language === 'en' ? 'months' : '个月'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {language === 'en' ? 'Confirm & add to expense list' : '确认并记入花费清单'}
            </button>
            <button
              type="button"
              onClick={() => {
                setClassifiedRows(null);
                setClassifications({});
                setUnavailableNote(null);
              }}
              className="text-[12px] px-2 py-1 rounded border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
            >
              {language === 'en' ? 'Back to edit' : '返回修改'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
