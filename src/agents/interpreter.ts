// Interpreter 解读员 —— 只解释现状
//
// 【Phase 3】从 deepDiagnosis 拆出解释部分（建议部分归 Strategist）。
//
// 拆分理由（见《方案》第 05 章）：诊断与处方混在一起就无法分别追责 ——
// 一条错建议，你分不清是「看错了」还是「开错药」。
//
// 铁律：**每条结论必须携带 metricRef —— 产生它的那条 Gate 或那个权重指标。**
// 无指标支撑的判断句一律不许输出。这是 interpretation 类断言的校验方式。
//
// 禁止：
//   ✕ 给任何建议（一句「建议…」都不许）
//   ✕ 谈未来
//   ✕ 引用没进过引擎的数字
import type { AgentDefinition } from './types.js';
import { AgentDegradedError, AgentInputError } from './types.js';
import type { AssessmentReport } from '../types.js';
import { classifyGeminiError, generateGeminiContent, getGeminiClient } from '../server/gemini.js';

export interface InterpreterInput {
  report: AssessmentReport;
  language: string;
}

export interface Finding {
  /** 产生这条结论的指标锚点：Gate 编号或权重指标 key。**必填** */
  metricRef: string;
  /** 该指标的实际取值，直接取自引擎，不允许模型改写 */
  metricValue: string;
  /** 大白话结论 */
  statement: string;
  severity: 'critical' | 'warning' | 'ok';
}

export interface InterpreterOutput {
  success: true;
  headline: string;
  findings: Finding[];
  /** 有多少条模型产出的结论因为缺少指标锚点而被丢弃 —— 可观测性 */
  droppedUnanchored: number;
}

const SYSTEM_INSTRUCTION = `
你是一位资深的全球小微商业财务体检解读专家。

【你的唯一职责是「解释现状」】
严禁给出任何建议、行动方案或对未来的预测 —— 那是另一个角色的职责。
一句「建议…」「可以考虑…」「未来应该…」都不许出现。

【硬性要求】
用户会给你一份由确定性财务引擎算出的体检报告，其中包含若干 Gate（红线）与加权指标。
你输出的每一条结论，都必须标注它是从哪一条 Gate 或哪一个指标读出来的（metricRef）。
没有指标支撑的判断，一律不要输出。

【语言要求】
只用普通做买卖的老板听得懂的话。不要用生僻财务术语。
例如说「每卖 100 块能剩下多少」而不是「净利率」，说「手头的钱还能顶几个月」而不是「现金跑道」。
使用与 language 字段一致的语言。

返回合法 JSON：
{
  "headline": "一句话核心定性",
  "findings": [
    {
      "metricRef": "报告里该 Gate 的 code 或该指标的 key，原样引用",
      "statement": "大白话结论，只讲现状",
      "severity": "critical" | "warning" | "ok"
    }
  ]
}
`;

/** 报告里所有可被引用的锚点：Gate code + 指标 key */
function anchorsOf(report: AssessmentReport): Map<string, string> {
  const map = new Map<string, string>();
  for (const g of report.gates || []) {
    map.set(g.code, `${g.plainName || g.name}：${g.currentValue}（门槛 ${g.threshold}）`);
  }
  for (const m of report.metrics || []) {
    map.set(m.key, `${m.plainName || m.name}：${m.actualValue}（基准 ${m.benchmarkValue}）`);
  }
  return map;
}

/** 本地确定性解读：直接从 Gate 与指标生成结论，天然带锚点 */
function localFindings(report: AssessmentReport, language: string): Finding[] {
  const isEn = language === 'en';
  const findings: Finding[] = [];

  for (const g of report.gates || []) {
    if (g.status === 'PASS') continue;
    findings.push({
      metricRef: g.code,
      metricValue: `${g.currentValue}（门槛 ${g.threshold}）`,
      statement: isEn
        ? `${g.plainName || g.name} did not clear the safety line: currently ${g.currentValue}, the line is ${g.threshold}.`
        : `${g.plainName || g.name}没过安全线：现在是 ${g.currentValue}，线画在 ${g.threshold}。`,
      severity: 'critical'
    });
  }

  for (const m of report.metrics || []) {
    if (m.status === 'excellent' || m.status === 'good') continue;
    findings.push({
      metricRef: m.key,
      metricValue: `${m.actualValue}（基准 ${m.benchmarkValue}）`,
      statement: isEn
        ? `${m.plainName || m.name} is below the healthy range: currently ${m.actualValue}, the benchmark is ${m.benchmarkValue}.`
        : `${m.plainName || m.name}低于健康区间：现在是 ${m.actualValue}，行业基准是 ${m.benchmarkValue}。`,
      severity: m.status === 'poor' ? 'warning' : 'ok'
    });
  }

  if (findings.length === 0) {
    const anchor = report.metrics?.[0];
    findings.push({
      metricRef: anchor?.key || 'totalScore',
      metricValue: `${report.totalScore} / 100`,
      statement: isEn
        ? `All safety lines cleared and every weighted metric sits in its healthy range.`
        : `全部安全线通过，各项加权指标都落在健康区间内。`,
      severity: 'ok'
    });
  }

  return findings;
}

function localHeadline(report: AssessmentReport, language: string): string {
  const isEn = language === 'en';
  if (!report.gatePassed) {
    return isEn
      ? 'Some safety lines were triggered — cost or liquidity is under pressure'
      : '触发了安全红线 —— 成本或资金流动性正在承压';
  }
  return isEn
    ? 'All safety lines cleared; the business sustains itself'
    : '安全红线全部通过，这门生意能自己养活自己';
}

export const interpreterAgent: AgentDefinition<InterpreterInput, InterpreterOutput> = {
  name: 'interpreter',
  claimType: 'interpretation',
  futureRole: 'Interpreter 解读员',
  tools: [],
  timeoutMs: 27000,

  parseInput(raw) {
    const body: any = (raw && typeof raw === 'object' ? raw : {}) || {};
    if (!body.report) throw new AgentInputError('Report object is required');
    return { report: body.report, language: body.language ?? 'zh' };
  },

  async run(input) {
    const ai = getGeminiClient();
    if (!ai) throw new AgentDegradedError('Gemini API key not configured', null, false);

    const { report } = input;
    const anchors = anchorsOf(report);

    let replyText: string;
    try {
      replyText = await generateGeminiContent(
        `language: ${input.language}\n体检报告: ${JSON.stringify({
          totalScore: report.totalScore,
          tier: report.tier,
          gatePassed: report.gatePassed,
          gates: (report.gates || []).map((g) => ({
            code: g.code,
            plainName: g.plainName,
            status: g.status,
            currentValue: g.currentValue,
            threshold: g.threshold
          })),
          metrics: (report.metrics || []).map((m) => ({
            key: m.key,
            plainName: m.plainName,
            status: m.status,
            actualValue: m.actualValue,
            benchmarkValue: m.benchmarkValue
          })),
          financials: report.normalizedFinancials
        })}`,
        SYSTEM_INSTRUCTION
      );
    } catch (err: any) {
      console.warn('Interpreter: Gemini failed, falling back:', err?.message || err);
      const { message, kind } = classifyGeminiError(err);
      throw new AgentDegradedError(message, kind);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(replyText || '{}');
    } catch {
      throw new AgentDegradedError('Gemini returned malformed JSON', null);
    }

    // 【锚点校验】模型给出的每条结论必须引用报告里真实存在的 Gate code 或指标 key。
    // 引用不存在的锚点 = 这条结论没有数据支撑 = 丢弃。
    // metricValue 一律取引擎原值，模型改不动。
    const raw = Array.isArray(parsed.findings) ? parsed.findings : [];
    const findings: Finding[] = [];
    let droppedUnanchored = 0;

    for (const f of raw) {
      const ref = String(f?.metricRef || '');
      const metricValue = anchors.get(ref);
      if (!metricValue || !f?.statement) {
        droppedUnanchored++;
        continue;
      }
      findings.push({
        metricRef: ref,
        metricValue,
        statement: String(f.statement),
        severity: ['critical', 'warning', 'ok'].includes(f.severity) ? f.severity : 'warning'
      });
    }

    // 全部结论都没有锚点 —— 视为云端产出不可用，退回确定性解读
    if (findings.length === 0) {
      throw new AgentDegradedError('All Gemini findings lacked a valid metric anchor', null);
    }

    return {
      success: true,
      headline: String(parsed.headline || localHeadline(report, input.language)),
      findings,
      droppedUnanchored
    };
  },

  fallback(input) {
    return {
      success: true,
      headline: localHeadline(input.report, input.language),
      findings: localFindings(input.report, input.language),
      droppedUnanchored: 0
    };
  }
};
