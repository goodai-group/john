import React, { useEffect, useRef, useState } from 'react';
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

// 填完一行后等这么久没有再改动才发起分类请求，避免用户还在打字时就一个字一个字地调接口
const CLASSIFY_DEBOUNCE_MS = 900;

interface DraftRow {
  id: string;
  type: 'income' | 'expense';
  name: string;
  amount: number;
  cycle: BillingCycle;
  classifying: boolean;
  error: string | null;
}

interface PendingConfirmEntry {
  row: DraftRow;
  classification: LedgerClassification;
  unavailableNote: string | null;
}

interface AppliedLogEntry {
  id: string;
  name: string;
  amount: number;
  cycle: BillingCycle;
}

function emptyRow(): DraftRow {
  return {
    id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'expense',
    name: '',
    amount: 0,
    cycle: 'monthly',
    classifying: false,
    error: null
  };
}

interface SmartLedgerEntryProps {
  language: Language;
  baseCurrency: CurrencyCode;
  projectName: string;
  industryHint: string;
  /** 单条流水分类完成（无论是自动记入还是用户确认后）时调用，把换算好的表单补丁交给上层
   * 合并进主表单（累加，不覆盖既有数据） */
  onApply: (patch: Partial<BusinessFormData>) => void;
}

/**
 * 智能记账入口：用户填完一行「名称+金额+周期+收入或支出」，停手不到一秒就自动分类并记入，
 * 不需要点按钮、也不需要自己选会计科目——置信度够高时整个过程对用户基本无感（与
 * types.ts 里 LedgerItem 的设计注释一致）。只有低置信度/高风险判断（真实收入 vs 外部
 * 捐赠、一次性 vs 应折旧）才会弹出来让用户确认或改分类，确认后才真正记入，避免这类会
 * 直接影响 Gate-1 判断的错误被静默吞掉。
 */
export function SmartLedgerEntry({ language, baseCurrency, projectName, industryHint, onApply }: SmartLedgerEntryProps) {
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmEntry[]>([]);
  const [appliedLog, setAppliedLog] = useState<AppliedLogEntry[]>([]);

  // 每行一个 debounce 定时器 + 请求版本号：请求发出后用户可能又改了这一行甚至删掉它，
  // 版本号不匹配的迟到响应直接丢弃，不静默记错数据。
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const requestVersion = useRef<Record<string, number>>({});
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    const timersAtMount = timers.current;
    return () => {
      Object.values(timersAtMount).forEach((t) => clearTimeout(t));
    };
  }, []);

  const applyClassification = (row: DraftRow, classification: LedgerClassification) => {
    const item: LedgerItem = {
      id: row.id,
      type: row.type,
      name: row.name.trim(),
      amount: row.amount,
      currency: baseCurrency,
      cycle: row.cycle
    };
    const { formPatch } = mapClassifiedLedgerToForm([item], [classification], baseCurrency);
    onApply(formPatch);
    setAppliedLog((prev) => [{ id: row.id, name: item.name, amount: item.amount, cycle: item.cycle }, ...prev].slice(0, 6));
  };

  const removeRow = (id: string) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    setRows((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      // 草稿区始终留至少一行可填——不管这一行是被自动记入、被用户点了确认，还是被手动删除
      return remaining.length === 0 ? [emptyRow()] : remaining;
    });
  };

  const runClassify = async (rowId: string) => {
    const row = rowsRef.current.find((r) => r.id === rowId);
    if (!row || !row.name.trim() || row.amount <= 0) return;
    const version = (requestVersion.current[rowId] || 0) + 1;
    requestVersion.current[rowId] = version;

    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, classifying: true, error: null } : r)));

    try {
      const item = { id: rowId, type: row.type, name: row.name.trim(), amount: row.amount, currency: baseCurrency, cycle: row.cycle };
      const res = await fetch('/api/ai/classify-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ items: [item], projectName, industryHint, baseCurrency })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok && !data) throw new Error(`HTTP ${res.status}`);
      if (!data || data.success === false || !Array.isArray(data.classifications) || !data.classifications[0]) {
        throw new Error(data?.reason || (language === 'en' ? 'Classification failed' : 'AI 分类失败'));
      }
      if (requestVersion.current[rowId] !== version) return; // 已过期的响应，丢弃
      const latestRow = rowsRef.current.find((r) => r.id === rowId);
      if (!latestRow) return; // 这一行已经不在草稿区了（比如被手动删除）

      const classification: LedgerClassification = data.classifications[0];
      const unavailableNote = data.unavailable
        ? data.reason ||
          (language === 'en'
            ? 'AI is unavailable right now — used local rule-based classification instead.'
            : 'AI 暂时不可用，已用本地规则分类。')
        : null;

      if (classification.needsUserConfirmation) {
        setPendingConfirm((prev) => [...prev, { row: latestRow, classification, unavailableNote }]);
      } else {
        applyClassification(latestRow, classification);
      }
      removeRow(rowId);
    } catch (err: any) {
      if (requestVersion.current[rowId] !== version) return;
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, classifying: false, error: err?.message || (language === 'en' ? 'Classification failed, please retry.' : '分类失败，请重试。') }
            : r
        )
      );
    }
  };

  const scheduleClassify = (rowId: string) => {
    if (timers.current[rowId]) clearTimeout(timers.current[rowId]);
    timers.current[rowId] = setTimeout(() => runClassify(rowId), CLASSIFY_DEBOUNCE_MS);
  };

  const updateRow = (id: string, patch: Partial<Pick<DraftRow, 'type' | 'name' | 'amount' | 'cycle'>>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch, error: null } : r));
      const row = next.find((r) => r.id === id);
      if (row && row.name.trim() && row.amount > 0) {
        scheduleClassify(id);
      } else if (timers.current[id]) {
        clearTimeout(timers.current[id]);
      }
      return next;
    });
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const updatePendingClassification = (index: number, patch: Partial<LedgerClassification>) => {
    setPendingConfirm((prev) => prev.map((entry, i) => (i === index ? { ...entry, classification: { ...entry.classification, ...patch } } : entry)));
  };

  const confirmPending = (index: number) => {
    const entry = pendingConfirm[index];
    if (!entry) return;
    applyClassification(entry.row, { ...entry.classification, needsUserConfirmation: false });
    setPendingConfirm((prev) => prev.filter((_, i) => i !== index));
  };

  const discardPending = (index: number) => {
    setPendingConfirm((prev) => prev.filter((_, i) => i !== index));
  };

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
          ? "Just type what it is, how much, and how often — it's filed automatically as soon as you finish a line. You'll only be asked when something is uncertain (e.g. real revenue vs. a grant)."
          : '只填「这是什么、多少钱、多久一次」，填完一行就自动记入，不用你自己选科目；只有拿不准的情况（比如真实收入还是外部资助）才会让你确认一下。'}
      </p>

      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.id}>
            <div className="flex items-center gap-1.5 flex-wrap">
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
              {row.classifying && <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin shrink-0" />}
              <button type="button" onClick={() => removeRow(row.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {row.error && (
              <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 pl-1 pt-0.5">
                <span>⚠️</span>
                <span>{row.error}</span>
                <button type="button" onClick={() => runClassify(row.id)} className="underline hover:text-rose-700 cursor-pointer">
                  {language === 'en' ? 'Retry' : '重试'}
                </button>
              </p>
            )}
          </div>
        ))}
        <button type="button" onClick={addRow} className="text-[12px] px-2 py-1 rounded border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer">
          {language === 'en' ? '+ Add a line' : '＋ 添加一行'}
        </button>
      </div>

      {pendingConfirm.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[12px] text-amber-700 font-bold">
            {language === 'en'
              ? `${pendingConfirm.length} item(s) need your confirmation (low confidence, or revenue vs. grant / one-time vs. depreciable).`
              : `有 ${pendingConfirm.length} 项需要你确认分类（置信度较低，或涉及"真实收入/外部资助""一次性/应折旧"这类关键判断）。`}
          </p>
          {pendingConfirm.map((entry, index) => (
            <div key={entry.row.id} className="p-2 rounded-lg border border-amber-300 bg-amber-50/60 space-y-1">
              {entry.unavailableNote && (
                <p className="text-[11px] text-amber-700 flex items-start gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{entry.unavailableNote}</span>
                </p>
              )}
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-[13px] font-bold text-slate-800">
                  {entry.row.name} · {entry.row.amount.toLocaleString()} {baseCurrency} · {BILLING_CYCLE_LABELS[entry.row.cycle][language]}
                </span>
                <select
                  value={entry.classification.category}
                  onChange={(e) => updatePendingClassification(index, { category: e.target.value as LedgerCategory })}
                  className="p-1.5 border border-amber-400 rounded-lg text-[12px] font-bold text-amber-800 bg-white cursor-pointer"
                >
                  {(Object.keys(LEDGER_CATEGORY_LABELS) as LedgerCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {LEDGER_CATEGORY_LABELS[cat][language]}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500">
                {entry.classification.reasoning} · {language === 'en' ? 'confidence' : '置信度'} {Math.round(entry.classification.confidence * 100)}%
              </p>
              {entry.classification.category === 'CAPEX_DEPRECIATION' && entry.row.cycle === 'one_time' && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <span>{language === 'en' ? 'Amortize over' : '分摊到未来'}</span>
                  <NumberField
                    min={1}
                    value={entry.classification.suggestedAmortizationMonths || 24}
                    onChange={(v) => updatePendingClassification(index, { suggestedAmortizationMonths: Math.max(1, Math.round(v || 24)) })}
                    className="w-14 p-1 border border-slate-200 rounded font-mono text-right"
                  />
                  <span>{language === 'en' ? 'months' : '个月'}</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => confirmPending(index)}
                  className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Confirm & record' : '确认并记入'}
                </button>
                <button
                  type="button"
                  onClick={() => discardPending(index)}
                  className="text-[12px] px-2 py-1 rounded border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  {language === 'en' ? 'Discard' : '不记录'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {appliedLog.length > 0 && (
        <p className="text-[11px] text-slate-500">
          {language === 'en' ? 'Recorded: ' : '已记入：'}
          {appliedLog.map((e, i) => (
            <span key={e.id}>
              {i > 0 && '、'}
              {e.name} ({e.amount.toLocaleString()} {baseCurrency}/{BILLING_CYCLE_LABELS[e.cycle][language]})
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
