import type { AssessmentReport, BusinessFormData } from '../types';
import { formatMoney } from './currencies';
import { INDUSTRY_BENCHMARKS } from './industryBenchmarks';
import { calculateAssessmentReport } from './scoringEngine';
import { healthLabel, healthLevelOf, tierLabel } from './healthStatus';

/**
 * 文件名转成 ASCII 安全版本。
 * Chromium 的下载管理器不认 <a download> 里的非 ASCII 字符（项目名多含中文 / 泰文等），
 * 一旦出现会静默丢弃预设文件名、退回通用的 "download"。先按 Unicode 规范分解去掉音调符号，
 * 再剔除其余非 ASCII 字符；纯表意文字会被完全剔除，此时退回 fallback 占位词。
 */
export function asciiSafeFileName(name: string, fallback = 'Business-Project'): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '') || fallback
  );
}

export function downloadTextFile(fileName: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', fileName);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 把报告渲染成一份人能直接读的 Markdown（超级账户下载用；完整数据请用 JSON） */
export function reportToMarkdown(report: AssessmentReport, meta: { ownerEmail?: string | null } = {}): string {
  const cur = report.baseCurrency;
  const fin = report.normalizedFinancials;
  const level = healthLabel(healthLevelOf(report), 'zh');
  const lines: string[] = [
    `# ${report.projectName} · 体检报告 v${report.version}`,
    '',
    `- 行业：${INDUSTRY_BENCHMARKS.find((b) => b.id === report.industry)?.nameZh.split(' (')[0] ?? report.industry}${report.marginProfile ? `（细分业态：${report.marginProfile.nameZh}）` : ''}`,
    ...(meta.ownerEmail ? [`- 提交人：${meta.ownerEmail}`] : []),
    `- 生成时间：${report.createdAt}`,
    `- 综合评级：${level} · ${report.totalScore} 分 · ${tierLabel(report.tier, 'zh')}`,
    '',
    '## 一句话结论',
    '',
    report.summaryPlainLanguage,
    '',
    '## 红线检查',
    '',
    '| 红线 | 实测 | 门槛 | 结论 |',
    '| --- | --- | --- | --- |',
    ...report.gates.map(
      (g) =>
        `| ${g.plainName || g.name} | ${g.currentValue} | ${g.threshold} | ${g.status === 'PASS' ? '通过' : g.status === 'WARNING' ? '预警' : '未通过'} |`
    ),
    '',
    '## 月度经营数据',
    '',
    `- 月真实主营收入：${formatMoney(fin.monthlyRealRevenue, cur)}`,
    `- 月营业成本：${formatMoney(fin.monthlyCogs, cur)}`,
    `- 毛利润 / 毛利率：${formatMoney(fin.grossProfit, cur)} / ${fin.grossMarginPercent}%`,
    `- 月固定开销：${formatMoney(fin.monthlyOpex, cur)}`,
    `- 月净利润：${formatMoney(fin.netProfit, cur)}（净利率 ${fin.netProfitMarginPercent}%）`,
    `- 备用金可撑：${fin.cashRunwayMonths} 个月`,
    '',
    '## 分项得分',
    '',
    '| 指标 | 得分 | 实测 |',
    '| --- | --- | --- |',
    ...report.metrics.map((m) => `| ${m.plainName || m.name} | ${m.score} | ${m.actualValue} |`),
    '',
    '## 改进建议',
    '',
    ...(report.aiActionableAdvice.length ? report.aiActionableAdvice.map((a) => `- ${a}`) : ['- 暂无']),
    ''
  ];
  return lines.join('\n');
}

export type ReportFileFormat = 'json' | 'md';

/** 为一个项目现算一份最新口径的报告并下载。返回生成的报告，便于调用方提示。 */
export function downloadProjectReport(
  project: BusinessFormData,
  format: ReportFileFormat,
  meta: { ownerEmail?: string | null } = {}
): AssessmentReport {
  const report = calculateAssessmentReport(project);
  const base = `${asciiSafeFileName(project.projectName || '')}-Assessment-Report-v${report.version}`;
  if (format === 'md') {
    downloadTextFile(`${base}.md`, reportToMarkdown(report, meta), 'text/markdown');
  } else {
    downloadTextFile(`${base}.json`, JSON.stringify(report, null, 2), 'application/json');
  }
  return report;
}
