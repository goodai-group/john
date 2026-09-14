// Guardian 合规官 —— 只有否决权
//
// 【Phase 3】检查四件事：
//   1. 数值与确定性引擎是否一致（模型有没有偷改分数/增益）
//   2. 有无越界承诺（投融资建议、收益保证）
//   3. 敏感地区脱敏有无被违反
//   4. 有无 PII 外泄
//
// 【最重要的设计约束】它是**校验器，不是编辑器**。
// 拦下来就退回原 Agent 重做，绝不自己动手改内容 ——
// 能改内容的守门人 = 又一个会幻觉的 Agent，而且它的输出没有人再审。
//
// 产物：pass 或 block + reason。每次拦截写入 audit_logs。
import type { ClaimType } from './types.js';

export interface GuardianVerdict {
  pass: boolean;
  /** 拦截原因；pass 时为空数组 */
  reasons: string[];
  /** 被拦截的具体位置，便于定位 */
  violations: Array<{ rule: string; detail: string; path?: string }>;
}

export interface GuardianSubject {
  /** 产出该内容的角色 */
  agent: string;
  claimType: ClaimType;
  /** 待检内容 */
  output: unknown;
  /** 校验依据：确定性引擎的权威数值 */
  authoritative?: {
    totalScore?: number;
    /** 杠杆 id -> 引擎算出的真实增益 */
    leverGains?: Record<string, number>;
    /** 报告里真实存在的指标锚点 */
    validAnchors?: string[];
  };
  /** 该项目是否开启了敏感地区脱敏模式 */
  isSensitiveRegion?: boolean;
}

/** 越界承诺：平台明确不提供投融资建议，也绝不保证收益 */
const OVERREACH_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  { rule: 'no_investment_advice', pattern: /建议(你|您)?(去)?(投资|加杠杆|借高利贷|炒|买入|股票|加密货币|数字货币)/ },
  { rule: 'no_investment_advice', pattern: /\b(invest in|buy)\s+(stocks?|crypto|shares?)\b/i },
  // 承诺词与收益词之间通常隔着若干字（「保证三个月回本」），因此不能要求两者紧邻。
  // 限定在同一句内（不跨句号/问号/感叹号），避免跨句误伤。
  {
    rule: 'no_guaranteed_return',
    pattern: /(保证|必定|一定|肯定|承诺)[^。！!？?\n]{0,14}(赚|回本|盈利|收益|翻倍|不赔|不亏)/
  },
  // 本身即完整承诺语的固定说法
  { rule: 'no_guaranteed_return', pattern: /(稳赚|包赚|包回本|稳赢|躺赚|旱涝保收)/ },
  {
    rule: 'no_guaranteed_return',
    pattern: /\bguarantee[sd]?\b[^.!?\n]{0,20}\b(return|profit|payback|income)\b/i
  },
  { rule: 'no_loan_solicitation', pattern: /(推荐|介绍)(你|您)?(去)?(网贷|小额贷|放款|借款平台)/ }
];

/** PII：敏感地区模式下尤其不能出现精确联系方式 */
const PII_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  { rule: 'pii_email', pattern: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
  { rule: 'pii_phone', pattern: /(?:\+?\d[\d\s-]{9,}\d)/ }
];

function collectStrings(value: unknown, path = '', out: Array<{ path: string; text: string }> = []) {
  if (typeof value === 'string') {
    out.push({ path, text: value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      collectStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

/**
 * 审查一份 Agent 产物。
 *
 * 注意它只返回判决，**不修改 subject.output 的任何一个字节**。
 */
export function review(subject: GuardianSubject): GuardianVerdict {
  const violations: GuardianVerdict['violations'] = [];
  const strings = collectStrings(subject.output);

  // —— 1. 越界承诺 ——
  for (const { path, text } of strings) {
    for (const { rule, pattern } of OVERREACH_PATTERNS) {
      if (pattern.test(text)) {
        violations.push({ rule, detail: text.slice(0, 120), path });
      }
    }
  }

  // —— 2. PII 外泄（敏感地区模式下从严） ——
  if (subject.isSensitiveRegion) {
    for (const { path, text } of strings) {
      for (const { rule, pattern } of PII_PATTERNS) {
        if (pattern.test(text)) {
          violations.push({ rule, detail: '敏感地区模式下产物中出现了精确联系方式', path });
        }
      }
    }
  }

  // —— 3. 数值与确定性引擎不一致 ——
  const auth = subject.authoritative;
  if (auth?.leverGains) {
    const actions = (subject.output as any)?.actions;
    if (Array.isArray(actions)) {
      for (const a of actions) {
        const expected = auth.leverGains[a?.id];
        if (expected === undefined) {
          violations.push({
            rule: 'action_not_simulated',
            detail: `行动项 "${a?.id}" 不在引擎回验过的杠杆集合里`,
            path: `actions.${a?.id}`
          });
        } else if (Number(a?.expectedScoreGain) !== expected) {
          violations.push({
            rule: 'score_gain_tampered',
            detail: `行动项 "${a?.id}" 的增益被改为 ${a?.expectedScoreGain}，引擎算出的是 ${expected}`,
            path: `actions.${a?.id}.expectedScoreGain`
          });
        }
      }
    }
  }

  // —— 4. 解释类断言必须有真实锚点 ——
  if (subject.claimType === 'interpretation' && auth?.validAnchors) {
    const findings = (subject.output as any)?.findings;
    if (Array.isArray(findings)) {
      for (const f of findings) {
        if (!auth.validAnchors.includes(String(f?.metricRef))) {
          violations.push({
            rule: 'finding_unanchored',
            detail: `结论引用了报告里不存在的指标 "${f?.metricRef}"`,
            path: `findings.${f?.metricRef}`
          });
        }
      }
    }
  }

  // —— 5. 外部事实必须带来源 ——
  if (subject.claimType === 'external_fact') {
    const facts = (subject.output as any)?.facts;
    if (Array.isArray(facts)) {
      for (const fact of facts) {
        if (!fact?.sourceRef) {
          violations.push({
            rule: 'external_fact_without_source',
            detail: `外部事实 "${fact?.key}" 没有出处`,
            path: `facts.${fact?.key}`
          });
        }
      }
    }
  }

  return {
    pass: violations.length === 0,
    reasons: violations.map((v) => `${v.rule}: ${v.detail}`),
    violations
  };
}

/** 审计日志条目（写入 audit_logs 表） */
export interface GuardianAuditEntry {
  action: 'guardian_block';
  field_name: string;
  actor_email: string;
  detail: string;
}

/** 把一次拦截转成审计记录 */
export function toAuditEntries(
  agent: string,
  verdict: GuardianVerdict,
  actorEmail = 'system'
): GuardianAuditEntry[] {
  return verdict.violations.map((v) => ({
    action: 'guardian_block' as const,
    field_name: v.path || agent,
    actor_email: actorEmail,
    detail: `[${agent}] ${v.rule}: ${v.detail}`
  }));
}
