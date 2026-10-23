import { Language } from '../types.js';

/**
 * 面向用户的健康状态：三色 + 人话，代替直接展示 AAA / BBB / REJECT 这类银行评级字母。
 * 评级字母仍保留在报告中作为次要信息（与评分规则页的档位表一一对应）。
 *
 * 划分与 scoringEngine 的 overallStatus 一致：
 *   红线未过 → 有风险；红线全过且 ≥ 70 分（A 及以上）→ 健康；其余 → 需关注。
 */
export type HealthLevel = 'healthy' | 'watch' | 'risk';

export const HEALTH_LEVEL_META: Record<HealthLevel, { zh: string; en: string; color: 'success' | 'warning' | 'error'; hex: string }> = {
  healthy: { zh: '健康', en: 'Healthy', color: 'success', hex: '#389e0d' },
  watch: { zh: '需关注', en: 'Needs attention', color: 'warning', hex: '#d48806' },
  risk: { zh: '有风险', en: 'At risk', color: 'error', hex: '#cf1322' }
};

export function healthLevelOf(report: { gatePassed: boolean; totalScore: number }): HealthLevel {
  if (!report.gatePassed) return 'risk';
  return report.totalScore >= 70 ? 'healthy' : 'watch';
}

export function healthLabel(level: HealthLevel, language: Language): string {
  return language === 'en' ? HEALTH_LEVEL_META[level].en : HEALTH_LEVEL_META[level].zh;
}

/** 评级字母的展示文案：REJECT 对小店主过于刺眼，改为「未评级（红线未过）」 */
export function tierLabel(tier: string, language: Language): string {
  if (tier === 'REJECT') return language === 'en' ? 'Unrated (gate failed)' : '未评级（红线未过）';
  return tier;
}

/** 红线编号的展示文案：GATE-1 → 中文「红线 1」/ 英文「Gate 1」 */
export function gateCodeLabel(code: string, language: Language): string {
  const n = code.replace(/^gate-?/i, '');
  return language === 'en' ? `Gate ${n}` : `红线 ${n}`;
}
