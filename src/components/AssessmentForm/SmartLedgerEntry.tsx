import { Button, Input, Select } from 'antd';
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

// 这个组件目前只嵌在「花费清单」卡片里，只处理支出——收入走表单里已有的收入模块，
// 不在这里重复提供收/支切换（避免花费清单区域出现"这笔是收入"这种矛盾选项）。
const ROW_TYPE = 'expense' as const;
// 分类下拉框同理只列支出类科目，不出现 REAL_REVENUE/EXTERNAL_GRANT 这两个收入类选项
const EXPENSE_LEDGER_CATEGORIES = (Object.keys(LEDGER_CATEGORY_LABELS) as LedgerCategory[]).filter(
  (cat) => cat !== 'REAL_REVENUE' && cat !== 'EXTERNAL_GRANT'
);

interface DraftRow {
  id: string;
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
 * 智能记账入口（花费清单专用，只处理支出）：用户填完一行「名称+金额+周期」，停手不到一秒
 * 就自动分类并记入，不需要点按钮、也不需要自己选会计科目——置信度够高时整个过程对用户
 * 基本无感（与 types.ts 里 LedgerItem 的设计注释一致）。只有低置信度/高风险判断（如
 * 一次性支出 vs 应折旧的资本性支出）才会弹出来让用户确认或改分类，确认后才真正记入。
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
      type: ROW_TYPE,
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
      const item = { id: rowId, type: ROW_TYPE, name: row.name.trim(), amount: row.amount, currency: baseCurrency, cycle: row.cycle };
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

  const updateRow = (id: string, patch: Partial<Pick<DraftRow, 'name' | 'amount' | 'cycle'>>) => {
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
    <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200 space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <span className="text-[13px] font-bold text-teal-950 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          {language === 'en' ? 'Smart ledger entry (AI auto-categorizes)' : '智能记账（AI 自动分类，无需自己选科目）'}
        </span>
      </div>
      <p className="text-[11px] text-teal-800/80 leading-relaxed">
        {language === 'en'
          ? "Just type what it is, how much, and how often — it's filed automatically as soon as you finish a line. You'll only be asked when something is uncertain (e.g. one-time cost vs. something to depreciate)."
          : '只填「这是什么、多少钱、多久一次」，填完一行就自动记入，不用你自己选科目；只有拿不准的情况（比如该按一次性算还是要分摊折旧）才会让你确认一下。'}
      </p>

      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.id}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Input size="small" className="basis-full sm:basis-0 sm:flex-1 min-w-[8rem]"

                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
                placeholder={language === 'en' ? 'e.g. Coffee beans / Shop rent / Utilities' : '例如：咖啡豆 / 铺租 / 水电费'}
                />
              <NumberField
                value={row.amount}
                onChange={(v) => updateRow(row.id, { amount: v })}
                placeholder={language === 'en' ? 'Amount' : '金额'}
                className="w-24 shrink-0 p-1.5 border border-neutral-200 rounded-lg tabular-nums text-right"
              />
              <span className="text-[11px] text-neutral-500 shrink-0">{baseCurrency}</span>
              <Select
                size="small"
                className="shrink-0"
                popupMatchSelectWidth={false}
                value={row.cycle}
                onChange={(v) => updateRow(row.id, { cycle: v as BillingCycle })}
                options={(['monthly', 'quarterly', 'annual', 'one_time'] as BillingCycle[]).map((c) => ({
                  value: c,
                  label: BILLING_CYCLE_LABELS[c][language]
                }))}
              />
              {row.classifying && <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin shrink-0" />}
              <Button size="small" type="text" danger icon={<Trash2 className="w-3.5 h-3.5" />} className="shrink-0" onClick={() => removeRow(row.id)} />
            </div>
            {row.error && (
              <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 pl-1 pt-0.5">
                <span>⚠️</span>
                <span>{row.error}</span>
                <Button size="small" type="link" className="px-0" onClick={() => runClassify(row.id)}>
                  {language === 'en' ? 'Retry' : '重试'}
                </Button>
              </p>
            )}
          </div>
        ))}
        <Button size="small" onClick={addRow}>
          {language === 'en' ? '+ Add a line' : '＋ 添加一行'}
        </Button>
      </div>

      {pendingConfirm.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[12px] text-amber-700 font-bold">
            {language === 'en'
              ? `${pendingConfirm.length} item(s) need your confirmation (low confidence, or one-time vs. depreciable).`
              : `有 ${pendingConfirm.length} 项需要你确认分类（置信度较低，或涉及"一次性/应折旧"这类关键判断）。`}
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
                <span className="text-[13px] font-bold text-neutral-800">
                  {entry.row.name} · {entry.row.amount.toLocaleString()} {baseCurrency} · {BILLING_CYCLE_LABELS[entry.row.cycle][language]}
                </span>
                <Select
                  size="small"
                  status="warning"
                  popupMatchSelectWidth={false}
                  value={entry.classification.category}
                  onChange={(v) => updatePendingClassification(index, { category: v as LedgerCategory })}
                  options={EXPENSE_LEDGER_CATEGORIES.map((cat) => ({ value: cat, label: LEDGER_CATEGORY_LABELS[cat][language] }))}
                />
              </div>
              <p className="text-[11px] text-neutral-500">
                {entry.classification.reasoning} · {language === 'en' ? 'confidence' : '置信度'} {Math.round(entry.classification.confidence * 100)}%
              </p>
              {entry.classification.category === 'CAPEX_DEPRECIATION' && entry.row.cycle === 'one_time' && (
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                  <span>{language === 'en' ? 'Amortize over' : '分摊到未来'}</span>
                  <NumberField
                    min={1}
                    value={entry.classification.suggestedAmortizationMonths || 24}
                    onChange={(v) => updatePendingClassification(index, { suggestedAmortizationMonths: Math.max(1, Math.round(v || 24)) })}
                    className="w-14 p-1 border border-neutral-200 rounded tabular-nums text-right"
                  />
                  <span>{language === 'en' ? 'months' : '个月'}</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-0.5">
                <Button size="small" type="primary" icon={<CheckCircle2 className="w-3.5 h-3.5" />}

                  onClick={() => confirmPending(index)}

                >{language === 'en' ? 'Confirm & record' : '确认并记入'}
                </Button>
                <Button size="small"

                  onClick={() => discardPending(index)}

                >
                  {language === 'en' ? 'Discard' : '不记录'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {appliedLog.length > 0 && (
        <p className="text-[11px] text-neutral-500">
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
