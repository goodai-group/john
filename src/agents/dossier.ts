// ProjectDossier —— 带字段级溯源的项目档案
//
// 这是所有 Agent 共享的唯一状态。设计要点（见《方案》第 07 章）：
//
//   **只有 confirmed 的字段进入 scoringEngine。**
//
// 这条规则是「误差沿链传导」的解药：Registrar 猜错行业 → 套错基准 → Interpreter 说错话
// → Strategist 开错方。阻断点不在事后审查，而在每个阶段之间的用户确认闸门。
//
// 【与既有结构的关系】刻意不替换 BusinessFormData。它已经是事实上的项目状态，
// 存在 projects.form_data JSONB 与 localStorage 里，替换掉的代价和风险都不可接受。
// Dossier = BusinessFormData（原样）+ 一份平行的溯源表。
//
// 【关键迁移语义】历史数据没有溯源记录。缺省必须视为 confirmed —— 那些数字本来就是
// 用户一个个敲进去的。否则所有存量项目会在一夜之间「零 confirmed 字段」而得 0 分。
import type { BusinessFormData, MoneyField } from '../types.js';

/**
 * 字段可信度三态。
 *   confirmed  用户已确认（或用户亲手填写）—— 唯一允许进入评分引擎的状态
 *   suggested  Agent 给出的建议值，等待用户确认
 *   estimated  系统按规则推算的占位值（如流水断点插值），等待用户核对
 */
export type ConfidenceLevel = 'confirmed' | 'suggested' | 'estimated';

/** 谁写的这个值 */
export type ProvenanceSource = 'user' | 'engine' | `agent:${string}`;

/**
 * 【当前 form 值】的溯源。回答的是「这个字段现在的值可不可信」。
 */
export interface FieldProvenance {
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
  /** 依据说明，例如「肯尼亚小微企业营业执照年费区间」 */
  note?: string;
  /** 外部事实专用：出处 */
  sourceRef?: string;
  /** 外部事实专用：该事实的时效 */
  asOf?: string;
  /** 用户确认的时间戳 */
  confirmedAt?: string;
}

/**
 * 【待确认的建议】。回答的是「有没有人建议把它改成别的值」。
 *
 * 刻意与 FieldProvenance 分开存放 —— 这两件事混在一个字段里会造成一个很隐蔽的错误：
 * Agent 对一个「用户已确认」的字段提建议时，会把该字段整体标记成未确认，
 * 于是确认闸门把**用户原本的值**也一并中和掉。
 * 实测中这让房租被归零、分数反而从 86 涨到 89。
 *
 * 正确语义：建议在用户确认之前，完全不影响当前值。
 */
export interface FieldSuggestion {
  source: ProvenanceSource;
  confidence: Exclude<ConfidenceLevel, 'confirmed'>;
  /** 建议值。未确认前只存在这里，**绝不写进 form** */
  suggestedValue: number | string;
  note?: string;
  sourceRef?: string;
  asOf?: string;
}

/**
 * 外部世界事实 —— Scout 的唯一产物形态。
 * 无来源不得输出：sourceRef 为必填。
 */
export interface ExternalFact {
  key: string;
  value: number | string;
  unit?: string;
  /** 出处。这是 Scout 与其他角色最根本的区别：它的产物必须可追溯 */
  sourceRef: string;
  /** 事实的时效（属地费率会变） */
  asOf?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ProjectDossier {
  /** 既有表单结构，原样保留 */
  form: BusinessFormData;
  /** 字段路径 -> 当前值的溯源。缺省（无记录）即视为 confirmed */
  provenance: Record<string, FieldProvenance>;
  /** 字段路径 -> 待确认的建议。不影响 form，也不影响评分 */
  suggestions: Record<string, FieldSuggestion>;
  /** Scout 产物，按 key 索引 */
  externalFacts: Record<string, ExternalFact>;
}

/** 从既有表单数据构造 Dossier（存量数据走这条路，全部字段按 confirmed 处理） */
export function dossierFromForm(
  form: BusinessFormData,
  provenance: Record<string, FieldProvenance> = {},
  suggestions: Record<string, FieldSuggestion> = {},
  externalFacts: Record<string, ExternalFact> = {}
): ProjectDossier {
  return { form, provenance, suggestions, externalFacts };
}

/**
 * 查询某字段的可信度。
 * 无溯源记录 = confirmed —— 见文件头的迁移语义说明。
 */
export function confidenceOf(dossier: ProjectDossier, path: string): ConfidenceLevel {
  return dossier.provenance[path]?.confidence ?? 'confirmed';
}

/** 该字段是否可进入评分引擎 */
export function isConfirmed(dossier: ProjectDossier, path: string): boolean {
  return confidenceOf(dossier, path) === 'confirmed';
}

/**
 * Agent 提出一个建议值。
 *
 * 【这是 Agent 唯一被允许的写入方式】建议值只落在 suggestions 里，form 与 provenance
 * 都不受影响，因此一条幻觉数字无论如何都到不了评分引擎 —— 除非用户亲自确认它。
 */
export function proposeValue(
  dossier: ProjectDossier,
  path: string,
  value: number | string,
  meta: {
    source: ProvenanceSource;
    confidence: Exclude<ConfidenceLevel, 'confirmed'>;
    note?: string;
    sourceRef?: string;
    asOf?: string;
  }
): void {
  // 只写 suggestions，绝不碰 provenance —— 用户此前确认过的值继续有效、继续计分。
  dossier.suggestions[path] = {
    source: meta.source,
    confidence: meta.confidence,
    suggestedValue: value,
    note: meta.note,
    sourceRef: meta.sourceRef,
    asOf: meta.asOf
  };
}

/** 待确认清单：所有等待用户确认的建议 */
export function pendingConfirmations(
  dossier: ProjectDossier
): Array<{ path: string } & FieldSuggestion> {
  return Object.entries(dossier.suggestions).map(([path, s]) => ({ path, ...s }));
}

/**
 * 用户确认一个建议值 —— 建议值此刻才写入 form，成为可计分的数据。
 * 返回是否真的发生了写入（路径不可识别时返回 false，不静默吞掉）。
 */
export function confirmValue(dossier: ProjectDossier, path: string): boolean {
  const sug = dossier.suggestions[path];
  if (!sug) return false;

  const written = writeFormField(dossier.form, path, sug.suggestedValue);
  if (!written) return false;

  dossier.provenance[path] = {
    source: sug.source,
    confidence: 'confirmed',
    note: sug.note,
    sourceRef: sug.sourceRef,
    asOf: sug.asOf,
    confirmedAt: new Date().toISOString()
  };
  delete dossier.suggestions[path];
  return true;
}

/**
 * 用户否决一条建议。
 * 【为什么必须记录】不记否决，Agent 每月会重复推荐同一条被拒绝的建议，用户迅速失去信任。
 * 否决记录由调用方落到 agent_facts 表（fact_type='rejected_suggestion'）。
 */
export function rejectSuggestion(dossier: ProjectDossier, path: string): FieldSuggestion | null {
  const sug = dossier.suggestions[path];
  if (!sug) return null;
  delete dossier.suggestions[path];
  return sug;
}

/**
 * 防御性闸门：产出一份「只含 confirmed 数据」的表单副本供评分引擎使用。
 *
 * 正常情况下这个函数不该改变任何东西 —— 因为 Agent 根本写不进 form。
 * 它的作用是兜住「将来某个 Agent 绕过 proposeValue 直接改了 form」这类回归，
 * 把约定升级成可执行的检查。
 */
export function confirmedFormOnly(dossier: ProjectDossier): BusinessFormData {
  const unconfirmed = Object.entries(dossier.provenance).filter(
    ([, p]) => p.confidence !== 'confirmed'
  );
  if (unconfirmed.length === 0) return dossier.form;

  const clone: BusinessFormData = JSON.parse(JSON.stringify(dossier.form));
  for (const [path] of unconfirmed) {
    neutralizeFormField(clone, path);
  }
  return clone;
}

// ============================================================
// 字段路径读写
//
// 支持两种路径形态：
//   'rentCost'                    顶层 MoneyField
//   'dynamicCogsItems.cogs_1'     动态成本/开支明细项（按 id 定位）
// ============================================================

const DYNAMIC_PREFIXES = ['dynamicCogsItems', 'dynamicOpexItems'] as const;

function isMoneyField(v: unknown): v is MoneyField {
  return Boolean(v && typeof v === 'object' && 'amount' in (v as any));
}

function writeFormField(form: BusinessFormData, path: string, value: number | string): boolean {
  const [head, id] = path.split('.');

  if (DYNAMIC_PREFIXES.includes(head as (typeof DYNAMIC_PREFIXES)[number]) && id) {
    const list = (form as any)[head] as Array<{ id: string; value: number }> | undefined;
    const item = list?.find((it) => it.id === id);
    if (!item) return false;
    item.value = Number(value) || 0;
    return true;
  }

  const target = (form as any)[head];
  if (isMoneyField(target)) {
    target.amount = Number(value) || 0;
    return true;
  }
  if (head in form && (typeof target === 'number' || typeof target === 'string')) {
    (form as any)[head] = value;
    return true;
  }
  return false;
}

function neutralizeFormField(form: BusinessFormData, path: string): void {
  const [head, id] = path.split('.');

  if (DYNAMIC_PREFIXES.includes(head as (typeof DYNAMIC_PREFIXES)[number]) && id) {
    const list = (form as any)[head] as Array<{ id: string; value: number }> | undefined;
    const item = list?.find((it) => it.id === id);
    if (item) item.value = 0;
    return;
  }

  const target = (form as any)[head];
  if (isMoneyField(target)) {
    target.amount = 0;
  }
  // 非金额字段（行业、币种等）不做中和：把它们清空只会让引擎拿到更坏的输入，
  // 而它们本身不直接参与加减运算。
}
